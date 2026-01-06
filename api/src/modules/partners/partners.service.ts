import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Partner } from './entities/partner.entity';
import { PartnerUser } from './entities/partner-user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import {
  CreatePartnerDto,
  UpdatePartnerDto,
  CreatePartnerUserDto,
  UpdatePartnerUserDto,
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from './dto/partner.dto';

@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);
  private readonly encryptionKey: Buffer;

  constructor(
    @InjectRepository(Partner)
    private partnersRepository: Repository<Partner>,
    @InjectRepository(PartnerUser)
    private partnerUsersRepository: Repository<PartnerUser>,
    @InjectRepository(Tenant)
    private tenantsRepository: Repository<Tenant>,
    private configService: ConfigService,
  ) {
    // Use a 32-byte key for AES-256 (same as MfaService)
    const key = this.configService.get(
      'MFA_ENCRYPTION_KEY',
      'default-key-change-in-production!',
    );
    this.encryptionKey = crypto.scryptSync(key, 'salt', 32);
  }

  // ==================== MFA HELPERS ====================

  // Decrypt the MFA secret
  private decrypt(encryptedText: string): string {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      this.encryptionKey,
      iv,
    );
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Generate TOTP code for a given secret and time
  private generateTOTP(secret: string, time?: number): string {
    const counter = Math.floor((time || Date.now()) / 30000);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter));

    // Decode base32 secret
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const secretBytes: number[] = [];
    let bits = 0;
    let value = 0;

    for (const char of secret.toUpperCase()) {
      const index = base32Chars.indexOf(char);
      if (index === -1) continue;
      value = (value << 5) | index;
      bits += 5;
      if (bits >= 8) {
        secretBytes.push((value >> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }

    const keyBuffer = Buffer.from(secretBytes);
    const hmac = crypto.createHmac('sha1', keyBuffer);
    hmac.update(counterBuffer);
    const hash = hmac.digest();

    const offset = hash[hash.length - 1] & 0xf;
    const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  }

  // Verify TOTP code (with window for clock drift)
  private verifyTOTP(secret: string, code: string): boolean {
    const now = Date.now();
    // Check current time and ±1 interval for clock drift
    for (let i = -1; i <= 1; i++) {
      const time = now + i * 30000;
      if (this.generateTOTP(secret, time) === code) {
        return true;
      }
    }
    return false;
  }

  // Verify MFA code for a partner user
  async verifyPartnerMfaCode(userId: string, code: string): Promise<boolean> {
    const user = await this.partnerUsersRepository.findOne({
      where: { id: userId },
    });

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('MFA is not enabled for this user');
    }

    try {
      const secret = this.decrypt(user.mfaSecret);
      return this.verifyTOTP(secret, code);
    } catch (error) {
      this.logger.error(`Failed to verify MFA code for user ${userId}`, error);
      return false;
    }
  }

  // ==================== PASSWORD RESET ====================

  // In-memory store for password reset tokens (in production, use Redis or DB)
  private passwordResetTokens = new Map<
    string,
    { userId: string; expiresAt: Date }
  >();

  // Generate a password reset token
  async generatePasswordResetToken(
    email: string,
  ): Promise<{ token: string; user: PartnerUser } | null> {
    const user = await this.findUserByEmail(email);
    if (!user) {
      return null; // Don't reveal if user exists
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store the token
    this.passwordResetTokens.set(token, { userId: user.id, expiresAt });

    // Clean up expired tokens periodically
    this.cleanupExpiredResetTokens();

    return { token, user };
  }

  // Validate a password reset token
  async validatePasswordResetToken(token: string): Promise<PartnerUser | null> {
    const tokenData = this.passwordResetTokens.get(token);
    if (!tokenData) {
      return null;
    }

    if (tokenData.expiresAt < new Date()) {
      this.passwordResetTokens.delete(token);
      return null;
    }

    const user = await this.partnerUsersRepository.findOne({
      where: { id: tokenData.userId },
    });
    return user;
  }

  // Reset password using token
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const user = await this.validatePasswordResetToken(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update the user
    user.passwordHash = passwordHash;
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await this.partnerUsersRepository.save(user);

    // Invalidate the token
    this.passwordResetTokens.delete(token);

    this.logger.log(`Password reset successful for user ${user.id}`);
    return true;
  }

  // Clean up expired tokens
  private cleanupExpiredResetTokens(): void {
    const now = new Date();
    for (const [token, data] of this.passwordResetTokens.entries()) {
      if (data.expiresAt < now) {
        this.passwordResetTokens.delete(token);
      }
    }
  }

  // ==================== PARTNER CRUD ====================

  async findAll(): Promise<Partner[]> {
    return this.partnersRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Partner> {
    const partner = await this.partnersRepository.findOne({ where: { id } });
    if (!partner) {
      throw new NotFoundException(`Partner ${id} not found`);
    }
    return partner;
  }

  async findBySlug(slug: string): Promise<Partner | null> {
    return this.partnersRepository.findOne({ where: { slug } });
  }

  async create(dto: CreatePartnerDto): Promise<Partner> {
    // Check slug uniqueness
    const existing = await this.findBySlug(dto.slug);
    if (existing) {
      throw new BadRequestException(
        `Partner with slug "${dto.slug}" already exists`,
      );
    }

    const partner = this.partnersRepository.create(dto);
    const saved = await this.partnersRepository.save(partner);
    this.logger.log(`Created partner ${saved.id}: ${saved.name}`);
    return saved;
  }

  async update(id: string, dto: UpdatePartnerDto): Promise<Partner> {
    const partner = await this.findOne(id);
    Object.assign(partner, dto);
    const saved = await this.partnersRepository.save(partner);
    this.logger.log(`Updated partner ${id}`);
    return saved;
  }

  async delete(id: string): Promise<void> {
    const partner = await this.findOne(id);
    await this.partnersRepository.remove(partner);
    this.logger.log(`Deleted partner ${id}`);
  }

  // ==================== PARTNER USER CRUD ====================

  async findAllUsers(partnerId: string): Promise<PartnerUser[]> {
    return this.partnerUsersRepository.find({
      where: { partnerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findUserById(partnerId: string, userId: string): Promise<PartnerUser> {
    const user = await this.partnerUsersRepository.findOne({
      where: { id: userId, partnerId },
    });
    if (!user) {
      throw new NotFoundException(`Partner user ${userId} not found`);
    }
    return user;
  }

  async findUserByEmail(email: string): Promise<PartnerUser | null> {
    return this.partnerUsersRepository.findOne({
      where: { email },
      relations: ['partner'],
    });
  }

  async createUser(
    partnerId: string,
    dto: CreatePartnerUserDto,
  ): Promise<PartnerUser> {
    // Check email uniqueness
    const existing = await this.findUserByEmail(dto.email);
    if (existing) {
      throw new BadRequestException(
        `User with email "${dto.email}" already exists`,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.partnerUsersRepository.create({
      partnerId,
      email: dto.email,
      name: dto.name,
      passwordHash,
      role: dto.role,
      status: 'active',
    });

    const saved = await this.partnerUsersRepository.save(user);
    this.logger.log(
      `Created partner user ${saved.id} for partner ${partnerId}`,
    );
    return saved;
  }

  async updateUser(
    partnerId: string,
    userId: string,
    dto: UpdatePartnerUserDto,
  ): Promise<PartnerUser> {
    const user = await this.findUserById(partnerId, userId);
    Object.assign(user, dto);
    const saved = await this.partnerUsersRepository.save(user);
    this.logger.log(`Updated partner user ${userId}`);
    return saved;
  }

  async deleteUser(partnerId: string, userId: string): Promise<void> {
    const user = await this.findUserById(partnerId, userId);
    await this.partnerUsersRepository.remove(user);
    this.logger.log(`Deleted partner user ${userId}`);
  }

  // ==================== ORGANIZATION MANAGEMENT ====================

  async getOrganizations(partnerId: string): Promise<Tenant[]> {
    return this.tenantsRepository.find({
      where: { partnerId },
      order: { createdAt: 'DESC' },
    });
  }

  async getOrganizationCount(partnerId: string): Promise<number> {
    return this.tenantsRepository.count({ where: { partnerId } });
  }

  async getOrganization(partnerId: string, orgId: string): Promise<Tenant> {
    const org = await this.tenantsRepository.findOne({
      where: { id: orgId, partnerId },
      relations: ['locations'],
    });
    if (!org) {
      throw new NotFoundException(
        `Organization ${orgId} not found or not accessible`,
      );
    }
    return org;
  }

  async getOrganizationLocations(
    partnerId: string,
    orgId: string,
  ): Promise<any[]> {
    const org = await this.tenantsRepository.findOne({
      where: { id: orgId, partnerId },
      relations: ['locations'],
    });
    if (!org) {
      throw new NotFoundException(
        `Organization ${orgId} not found or not accessible`,
      );
    }
    return org.locations || [];
  }

  async createOrganization(
    partnerId: string,
    dto: CreateOrganizationDto,
  ): Promise<Tenant> {
    // Check partner limits
    const partner = await this.findOne(partnerId);
    const currentCount = await this.getOrganizationCount(partnerId);
    const maxOrgs = partner.settings?.maxOrganizations || 100;

    if (currentCount >= maxOrgs) {
      throw new BadRequestException(
        `Organization limit (${maxOrgs}) reached for this partner`,
      );
    }

    // Generate unique slug
    const baseSlug = dto.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    let slug = baseSlug;
    let counter = 1;

    while (await this.tenantsRepository.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const org = this.tenantsRepository.create({
      partnerId,
      name: dto.name,
      slug,
      status: 'active',
      plan: dto.plan || 'free',
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      address: dto.address,
      industry: dto.industry,
      companySize: dto.companySize,
      settings: {
        timezone: 'UTC',
        blockPageEnabled: true,
      },
    });

    const saved = await this.tenantsRepository.save(org);
    this.logger.log(
      `Created organization ${saved.id} for partner ${partnerId}`,
    );
    return saved;
  }

  async updateOrganization(
    partnerId: string,
    orgId: string,
    dto: UpdateOrganizationDto,
  ): Promise<Tenant> {
    const org = await this.getOrganization(partnerId, orgId);
    Object.assign(org, dto);
    const saved = await this.tenantsRepository.save(org);
    this.logger.log(`Updated organization ${orgId}`);
    return saved;
  }

  async deleteOrganization(partnerId: string, orgId: string): Promise<void> {
    const org = await this.getOrganization(partnerId, orgId);
    await this.tenantsRepository.remove(org);
    this.logger.log(`Deleted organization ${orgId}`);
  }

  // ==================== AUTHENTICATION ====================

  async validatePartnerUser(
    email: string,
    password: string,
  ): Promise<PartnerUser> {
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account is temporarily locked');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      // Increment failed attempts
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      }
      await this.partnerUsersRepository.save(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed attempts on successful login
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    await this.partnerUsersRepository.save(user);

    return user;
  }

  // ==================== IMPERSONATION ====================

  async startImpersonation(
    partnerId: string,
    userId: string,
    orgId: string,
  ): Promise<Tenant> {
    // Verify the organization belongs to this partner
    const org = await this.getOrganization(partnerId, orgId);

    // Update the partner user's impersonating org
    await this.partnerUsersRepository.update(userId, {
      impersonatingOrgId: orgId,
    });

    this.logger.log(
      `Partner user ${userId} started impersonating org ${orgId}`,
    );
    return org;
  }

  async stopImpersonation(userId: string): Promise<void> {
    await this.partnerUsersRepository.update(userId, {
      impersonatingOrgId: null,
    });
    this.logger.log(`Partner user ${userId} stopped impersonating`);
  }

  async getCurrentImpersonation(userId: string): Promise<Tenant | null> {
    const user = await this.partnerUsersRepository.findOne({
      where: { id: userId },
    });
    if (!user?.impersonatingOrgId) {
      return null;
    }
    return this.tenantsRepository.findOne({
      where: { id: user.impersonatingOrgId },
    });
  }

  // ==================== AGGREGATE STATS ====================

  async getPartnerStats(partnerId: string): Promise<{
    totalOrganizations: number;
    activeOrganizations: number;
    suspendedOrganizations: number;
    totalLocations: number;
    activeLocations: number;
    totalUsers: number;
    planBreakdown: Record<string, number>;
  }> {
    const orgs = await this.tenantsRepository.find({
      where: { partnerId },
      relations: ['locations', 'users'],
    });

    const planBreakdown: Record<string, number> = {};
    orgs.forEach((org) => {
      planBreakdown[org.plan] = (planBreakdown[org.plan] || 0) + 1;
    });

    return {
      totalOrganizations: orgs.length,
      activeOrganizations: orgs.filter((o) => o.status === 'active').length,
      suspendedOrganizations: orgs.filter((o) => o.status === 'suspended')
        .length,
      totalLocations: orgs.reduce(
        (sum, o) => sum + (o.locations?.length || 0),
        0,
      ),
      activeLocations: orgs.reduce(
        (sum, o) =>
          sum + (o.locations?.filter((l) => l.status === 'active').length || 0),
        0,
      ),
      totalUsers: orgs.reduce((sum, o) => sum + (o.users?.length || 0), 0),
      planBreakdown,
    };
  }

  async getPartnerOrganizationsSummary(partnerId: string): Promise<
    Array<{
      id: string;
      name: string;
      slug: string;
      status: string;
      plan: string;
      locationCount: number;
      userCount: number;
      createdAt: Date;
    }>
  > {
    const orgs = await this.tenantsRepository.find({
      where: { partnerId },
      relations: ['locations', 'users'],
      order: { createdAt: 'DESC' },
    });

    return orgs.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status,
      plan: org.plan,
      locationCount: org.locations?.length || 0,
      userCount: org.users?.length || 0,
      createdAt: org.createdAt,
    }));
  }
}
