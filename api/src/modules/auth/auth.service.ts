import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { PartnerUser } from '../partners/entities/partner-user.entity';
import { LoginDto, LoginResponseDto, MfaRequiredResponseDto, MfaVerifyLoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { MfaService } from '../mfa/mfa.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MINUTES = 15;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(PartnerUser)
    private readonly partnerUserRepository: Repository<PartnerUser>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => MfaService))
    private readonly mfaService: MfaService,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResponseDto | MfaRequiredResponseDto> {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      relations: ['tenant'],
    });

    if (!user) {
      this.logger.warn(`Login attempt for non-existent user: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      this.logger.warn(`Login attempt for locked account: ${email}`);
      throw new UnauthorizedException(
        `Account locked. Try again after ${user.lockedUntil.toISOString()}`,
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      await this.handleFailedLogin(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed attempts on successful login
    await this.userRepository.update(user.id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    // Check if MFA is enabled for this user
    const mfaEnabled = await this.mfaService.isMfaEnabled(user.id);

    if (mfaEnabled) {
      // Generate a temporary token for MFA verification
      const tempToken = this.jwtService.sign(
        {
          sub: user.id,
          type: 'mfa_pending',
          email: user.email,
          tenantId: user.tenantId,
        },
        { expiresIn: '5m' }, // Short-lived token for MFA step
      );

      this.logger.log(`MFA required for user: ${email}`);

      return {
        mfaRequired: true,
        tempToken,
        message: 'MFA verification required',
      };
    }

    // No MFA - complete login
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });
    return this.generateTokens(user);
  }

  async verifyMfaLogin(dto: MfaVerifyLoginDto): Promise<LoginResponseDto> {
    const { tempToken, code } = dto;

    try {
      const payload = this.jwtService.verify(tempToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      if (payload.type !== 'mfa_pending') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        relations: ['tenant'],
      });

      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Verify MFA code
      const isValid = await this.mfaService.verifyMfaCode(user.id, code);

      if (!isValid) {
        throw new UnauthorizedException('Invalid MFA code');
      }

      // Update last login
      await this.userRepository.update(user.id, { lastLoginAt: new Date() });

      this.logger.log(`MFA verification successful for user: ${user.email}`);
      return this.generateTokens(user, true); // MFA was verified
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.warn(`MFA verification failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired MFA token');
    }
  }

  async refreshToken(refreshToken: string): Promise<LoginResponseDto> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        relations: ['tenant'],
      });

      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Preserve MFA verification status from the refresh token
      return this.generateTokens(user, payload.mfaVerified || false);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    // In a production system, you'd invalidate the refresh token in Redis
    this.logger.log(`User ${userId} logged out`);
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.userRepository.update(userId, {
      passwordHash: hashedPassword,
    });

    this.logger.log(`Password changed for user ${userId}`);
  }

  async validateUser(userId: string, tenantId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId, tenantId, status: 'active' },
    });
  }

  /**
   * Get managed organizations for an MSP user
   * Checks if the user's tenant belongs to a partner and returns all partner's orgs
   */
  async getManagedOrganizations(userId: string, tenantId: string): Promise<{
    isMsp: boolean;
    partnerId: string | null;
    currentOrg: { id: string; name: string; slug: string } | null;
    organizations: Array<{ id: string; name: string; slug: string; status: string }>;
  }> {
    // First get the current tenant to check if it belongs to a partner
    const currentTenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      relations: ['partner'],
    });

    if (!currentTenant) {
      return { isMsp: false, partnerId: null, currentOrg: null, organizations: [] };
    }

    // Check if this tenant belongs to a partner (MSP)
    if (!currentTenant.partnerId) {
      // Also check if the user email matches a partner user
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        return {
          isMsp: false,
          partnerId: null,
          currentOrg: { id: currentTenant.id, name: currentTenant.name, slug: currentTenant.slug },
          organizations: []
        };
      }

      // Check if this email belongs to a partner user
      const partnerUser = await this.partnerUserRepository.findOne({
        where: { email: user.email, status: 'active' },
      });

      if (partnerUser) {
        // This user is also an MSP user - get all partner orgs
        const partnerOrgs = await this.tenantRepository.find({
          where: { partnerId: partnerUser.partnerId },
          order: { name: 'ASC' },
        });

        return {
          isMsp: true,
          partnerId: partnerUser.partnerId,
          currentOrg: { id: currentTenant.id, name: currentTenant.name, slug: currentTenant.slug },
          organizations: partnerOrgs.map(org => ({
            id: org.id,
            name: org.name,
            slug: org.slug,
            status: org.status,
          })),
        };
      }

      return {
        isMsp: false,
        partnerId: null,
        currentOrg: { id: currentTenant.id, name: currentTenant.name, slug: currentTenant.slug },
        organizations: []
      };
    }

    // Tenant belongs to a partner - get all organizations for this partner
    const partnerOrgs = await this.tenantRepository.find({
      where: { partnerId: currentTenant.partnerId },
      order: { name: 'ASC' },
    });

    return {
      isMsp: true,
      partnerId: currentTenant.partnerId,
      currentOrg: { id: currentTenant.id, name: currentTenant.name, slug: currentTenant.slug },
      organizations: partnerOrgs.map(org => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        status: org.status,
      })),
    };
  }

  /**
   * Switch to a different tenant/organization for MSP users
   */
  async switchTenant(userId: string, currentTenantId: string, targetTenantId: string): Promise<LoginResponseDto> {
    // First verify the user can switch to this tenant
    const mspInfo = await this.getManagedOrganizations(userId, currentTenantId);

    if (!mspInfo.isMsp) {
      throw new ForbiddenException('Only MSP users can switch between organizations');
    }

    // Check if target tenant is in the list of managed orgs
    const targetOrg = mspInfo.organizations.find(org => org.id === targetTenantId);
    if (!targetOrg) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    // Get the user to generate new tokens
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['tenant'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generate new tokens with the target tenant context
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: targetTenantId,
      role: user.role,
      mfaVerified: true, // Preserve MFA status when switching
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh', jti: uuidv4(), mfaVerified: true, tenantId: targetTenantId },
      {
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
      },
    );

    this.logger.log(`User ${userId} switched from tenant ${currentTenantId} to ${targetTenantId}`);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: targetTenantId,
      },
    };
  }

  private async handleFailedLogin(user: User): Promise<void> {
    const attempts = (user.failedLoginAttempts || 0) + 1;

    const updateData: Partial<User> = {
      failedLoginAttempts: attempts,
    };

    if (attempts >= this.MAX_LOGIN_ATTEMPTS) {
      const lockoutUntil = new Date();
      lockoutUntil.setMinutes(
        lockoutUntil.getMinutes() + this.LOCKOUT_DURATION_MINUTES,
      );
      updateData.lockedUntil = lockoutUntil;
      this.logger.warn(
        `Account locked due to too many failed attempts: ${user.email}`,
      );
    }

    await this.userRepository.update(user.id, updateData);
  }

  private generateTokens(user: User, mfaVerified = false): LoginResponseDto {
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      mfaVerified, // Track if MFA was verified for this session
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh', jti: uuidv4(), mfaVerified },
      {
        expiresIn:
          this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
      },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }
}
