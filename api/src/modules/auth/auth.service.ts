// Nebula DNS - Authentication Service
// Updated to use the unified tier system (US-022, US-023)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

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
import {
  LoginDto,
  LoginResponseDto,
  MfaRequiredResponseDto,
  MfaVerifyLoginDto,
} from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { MfaService } from '../mfa/mfa.service';
import { SessionService, SessionResponse } from './session.service';

/**
 * Request context for login operations
 */
export interface LoginContext {
  userAgent: string;
  ipAddress: string;
}

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
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => MfaService))
    private readonly mfaService: MfaService,
    private readonly sessionService: SessionService,
  ) {}

  async login(
    loginDto: LoginDto,
    context?: LoginContext,
  ): Promise<LoginResponseDto | MfaRequiredResponseDto> {
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
      // Include context info for session creation after MFA
      const tempToken = this.jwtService.sign(
        {
          sub: user.id,
          type: 'mfa_pending',
          email: user.email,
          tenantId: user.tenantId,
          // Store context for post-MFA session creation
          loginContext: context
            ? {
                userAgent: context.userAgent,
                ipAddress: context.ipAddress,
              }
            : undefined,
        },
        { expiresIn: '2m' }, // Short-lived token for MFA step (2 min for security)
      );

      this.logger.log(`MFA required for user: ${email}`);

      return {
        mfaRequired: true,
        tempToken,
        message: 'MFA verification required',
      };
    }

    // No MFA - complete login with session creation
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });
    return this.generateTokens(user, false, context);
  }

  async verifyMfaLogin(dto: MfaVerifyLoginDto): Promise<LoginResponseDto> {
    const { tempToken, code } = dto;

    try {
      const payload = this.jwtService.verify(tempToken, {
        secret: this.configService.get<string>('jwt.secret'),
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

      // Extract login context from temp token if available
      const loginContext: LoginContext | undefined = payload.loginContext
        ? {
            userAgent: payload.loginContext.userAgent || '',
            ipAddress: payload.loginContext.ipAddress || '',
          }
        : undefined;

      this.logger.log(`MFA verification successful for user: ${user.email}`);
      return this.generateTokens(user, true, loginContext); // MFA was verified
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.warn(`MFA verification failed: ${(error as Error).message}`);
      throw new UnauthorizedException('Invalid or expired MFA token');
    }
  }

  async refreshToken(
    refreshToken: string,
    context?: LoginContext,
  ): Promise<LoginResponseDto> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Check if token JTI is blacklisted
      if (payload.jti) {
        const isBlacklisted = await this.sessionService.isTokenBlacklisted(
          payload.jti,
        );
        if (isBlacklisted) {
          this.logger.warn(
            `Attempted to use blacklisted refresh token for user ${payload.sub}`,
          );
          throw new UnauthorizedException('Token has been revoked');
        }
      }

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        relations: ['tenant'],
      });

      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Update session activity if we have a JTI
      if (payload.jti) {
        await this.sessionService.updateSessionActivity(user.id, payload.jti);
      }

      // Preserve MFA verification status from the refresh token
      return this.generateTokens(user, payload.mfaVerified || false, context);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, jti?: string): Promise<void> {
    // Blacklist the current token if JTI provided
    if (jti) {
      await this.sessionService.blacklistToken(jti);
    }
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
   * Uses the new tier-based system via managedByMspId (US-022, US-023)
   */
  async getManagedOrganizations(
    userId: string,
    tenantId: string,
  ): Promise<{
    isMsp: boolean;
    partnerId: string | null; // Kept for backwards compatibility
    currentOrg: { id: string; name: string; slug: string } | null;
    organizations: Array<{
      id: string;
      name: string;
      slug: string;
      status: string;
    }>;
  }> {
    // First get the current tenant
    const currentTenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!currentTenant) {
      return {
        isMsp: false,
        partnerId: null,
        currentOrg: null,
        organizations: [],
      };
    }

    // Check if this tenant is an MSP tier
    if (currentTenant.tier !== 'msp') {
      return {
        isMsp: false,
        partnerId: null,
        currentOrg: {
          id: currentTenant.id,
          name: currentTenant.name,
          slug: currentTenant.slug,
        },
        organizations: [],
      };
    }

    // Get all organizations managed by this MSP tenant
    const managedOrgs = await this.tenantRepository.find({
      where: { managedByMspId: tenantId },
      order: { name: 'ASC' },
    });

    return {
      isMsp: true,
      partnerId: tenantId, // For backwards compatibility, use the MSP tenant ID
      currentOrg: {
        id: currentTenant.id,
        name: currentTenant.name,
        slug: currentTenant.slug,
      },
      organizations: managedOrgs.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        status: org.status,
      })),
    };
  }

  /**
   * Switch to a different tenant/organization for MSP users
   * Uses the new tier-based system (US-022, US-023)
   */
  async switchTenant(
    userId: string,
    currentTenantId: string,
    targetTenantId: string,
  ): Promise<LoginResponseDto> {
    // Get the current tenant to check MSP access
    const currentTenant = await this.tenantRepository.findOne({
      where: { id: currentTenantId },
    });

    if (!currentTenant || currentTenant.tier !== 'msp') {
      throw new ForbiddenException(
        'Only MSP users can switch between organizations',
      );
    }

    // Check if target tenant is managed by this MSP
    const targetTenant = await this.tenantRepository.findOne({
      where: { id: targetTenantId, managedByMspId: currentTenantId },
    });

    if (!targetTenant) {
      throw new ForbiddenException(
        'You do not have access to this organization',
      );
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
      {
        sub: user.id,
        type: 'refresh',
        jti: uuidv4(),
        mfaVerified: true,
        tenantId: targetTenantId,
      },
      {
        expiresIn:
          this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
      },
    );

    this.logger.log(
      `User ${userId} switched from tenant ${currentTenantId} to ${targetTenantId}`,
    );

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

  private async generateTokens(
    user: User,
    mfaVerified = false,
    context?: LoginContext,
  ): Promise<LoginResponseDto> {
    const jti = uuidv4();

    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      jti, // Include JTI in access token for blacklist checking
      mfaVerified, // Track if MFA was verified for this session
      tier: user.tenant?.tier, // Include tier for frontend feature gating
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        type: 'refresh',
        jti,
        mfaVerified,
        tenantId: user.tenantId,
      },
      {
        expiresIn:
          this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
      },
    );

    // Create session in Redis if context is provided
    if (context) {
      try {
        const deviceInfo = this.sessionService.parseDeviceInfo(
          context.userAgent,
        );
        await this.sessionService.createSession(
          user.id,
          user.tenantId,
          jti,
          deviceInfo,
          context.ipAddress,
        );
      } catch (error) {
        // Log but don't fail login if session creation fails
        this.logger.warn(
          `Failed to create session for user ${user.id}: ${(error as Error).message}`,
        );
      }
    }

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
        tenantTier: user.tenant?.tier,
      },
    };
  }

  /**
   * Get all active sessions for a user
   */
  async getSessions(
    userId: string,
    currentJti?: string,
  ): Promise<{ data: SessionResponse[] }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const sessions = await this.sessionService.getSessions(userId, currentJti);
    return { data: sessions };
  }

  /**
   * Revoke a specific session by ID
   */
  async revokeSession(
    userId: string,
    sessionId: string,
    currentJti?: string,
  ): Promise<void> {
    await this.sessionService.revokeSession(userId, sessionId, currentJti);
  }

  /**
   * Revoke all sessions for a user except the current one
   */
  async revokeAllSessions(
    userId: string,
    currentJti?: string,
  ): Promise<number> {
    return this.sessionService.revokeAllSessions(userId, currentJti);
  }

  /**
   * Check if a token JTI is blacklisted
   */
  async isTokenBlacklisted(jti: string): Promise<boolean> {
    return this.sessionService.isTokenBlacklisted(jti);
  }
}
