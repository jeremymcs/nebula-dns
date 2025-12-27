import { Injectable, NotFoundException, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
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

  constructor(
    @InjectRepository(Partner)
    private partnersRepository: Repository<Partner>,
    @InjectRepository(PartnerUser)
    private partnerUsersRepository: Repository<PartnerUser>,
    @InjectRepository(Tenant)
    private tenantsRepository: Repository<Tenant>,
  ) {}

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
      throw new BadRequestException(`Partner with slug "${dto.slug}" already exists`);
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

  async createUser(partnerId: string, dto: CreatePartnerUserDto): Promise<PartnerUser> {
    // Check email uniqueness
    const existing = await this.findUserByEmail(dto.email);
    if (existing) {
      throw new BadRequestException(`User with email "${dto.email}" already exists`);
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
    this.logger.log(`Created partner user ${saved.id} for partner ${partnerId}`);
    return saved;
  }

  async updateUser(partnerId: string, userId: string, dto: UpdatePartnerUserDto): Promise<PartnerUser> {
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
    });
    if (!org) {
      throw new NotFoundException(`Organization ${orgId} not found or not accessible`);
    }
    return org;
  }

  async createOrganization(partnerId: string, dto: CreateOrganizationDto): Promise<Tenant> {
    // Check partner limits
    const partner = await this.findOne(partnerId);
    const currentCount = await this.getOrganizationCount(partnerId);
    const maxOrgs = partner.settings?.maxOrganizations || 100;

    if (currentCount >= maxOrgs) {
      throw new BadRequestException(`Organization limit (${maxOrgs}) reached for this partner`);
    }

    // Generate unique slug
    const baseSlug = dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
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
    this.logger.log(`Created organization ${saved.id} for partner ${partnerId}`);
    return saved;
  }

  async updateOrganization(partnerId: string, orgId: string, dto: UpdateOrganizationDto): Promise<Tenant> {
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

  async validatePartnerUser(email: string, password: string): Promise<PartnerUser> {
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

  async startImpersonation(partnerId: string, userId: string, orgId: string): Promise<Tenant> {
    // Verify the organization belongs to this partner
    const org = await this.getOrganization(partnerId, orgId);

    // Update the partner user's impersonating org
    await this.partnerUsersRepository.update(userId, { impersonatingOrgId: orgId });

    this.logger.log(`Partner user ${userId} started impersonating org ${orgId}`);
    return org;
  }

  async stopImpersonation(userId: string): Promise<void> {
    await this.partnerUsersRepository.update(userId, { impersonatingOrgId: null });
    this.logger.log(`Partner user ${userId} stopped impersonating`);
  }

  async getCurrentImpersonation(userId: string): Promise<Tenant | null> {
    const user = await this.partnerUsersRepository.findOne({ where: { id: userId } });
    if (!user?.impersonatingOrgId) {
      return null;
    }
    return this.tenantsRepository.findOne({ where: { id: user.impersonatingOrgId } });
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
    orgs.forEach(org => {
      planBreakdown[org.plan] = (planBreakdown[org.plan] || 0) + 1;
    });

    return {
      totalOrganizations: orgs.length,
      activeOrganizations: orgs.filter(o => o.status === 'active').length,
      suspendedOrganizations: orgs.filter(o => o.status === 'suspended').length,
      totalLocations: orgs.reduce((sum, o) => sum + (o.locations?.length || 0), 0),
      activeLocations: orgs.reduce((sum, o) => sum + (o.locations?.filter(l => l.status === 'active').length || 0), 0),
      totalUsers: orgs.reduce((sum, o) => sum + (o.users?.length || 0), 0),
      planBreakdown,
    };
  }

  async getPartnerOrganizationsSummary(partnerId: string): Promise<Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    plan: string;
    locationCount: number;
    userCount: number;
    createdAt: Date;
  }>> {
    const orgs = await this.tenantsRepository.find({
      where: { partnerId },
      relations: ['locations', 'users'],
      order: { createdAt: 'DESC' },
    });

    return orgs.map(org => ({
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

