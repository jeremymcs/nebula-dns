// Nebula DNS - Admin Authentication Service
// Handles admin login, logout, and credential validation
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { Admin } from './entities/admin.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminLoginResponseDto } from './dto/admin-response.dto';
import {
  TenantSearchQueryDto,
  TenantSearchResponseDto,
  TenantSearchResultDto,
} from './dto/tenant-search.dto';
import { AdminSessionService, AdminDeviceInfo } from './admin-session.service';

/**
 * Request context for admin login operations
 */
export interface AdminLoginContext {
  userAgent: string;
  ipAddress: string;
}

/**
 * Admin Service
 *
 * Handles admin authentication with:
 * - Password validation using bcrypt
 * - Failed login attempt tracking
 * - Automatic lockout after threshold
 * - Session management via AdminSessionService
 * - JWT token generation with 'nebula-admin' issuer
 */
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly maxFailedAttempts: number;
  private readonly lockoutDurationMinutes: number;

  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly jwtService: JwtService,
    private readonly adminSessionService: AdminSessionService,
    private readonly configService: ConfigService,
  ) {
    // Lockout configuration
    this.maxFailedAttempts = this.configService.get<number>(
      'ADMIN_MAX_FAILED_ATTEMPTS',
      5,
    );
    this.lockoutDurationMinutes = this.configService.get<number>(
      'ADMIN_LOCKOUT_DURATION_MINUTES',
      30,
    );
  }

  /**
   * Authenticate an admin and return JWT token
   */
  async login(
    dto: AdminLoginDto,
    context: AdminLoginContext,
  ): Promise<AdminLoginResponseDto> {
    const { email, password } = dto;

    // Find admin by email (case-insensitive)
    const admin = await this.adminRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!admin) {
      this.logger.warn(`Admin login attempt for non-existent email: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      this.logger.warn(`Admin login attempt for locked account: ${email}`);
      throw new UnauthorizedException(
        `Account locked. Try again after ${admin.lockedUntil.toISOString()}`,
      );
    }

    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);

    if (!isPasswordValid) {
      await this.handleFailedLogin(admin);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if admin is suspended
    if (admin.status === 'suspended') {
      this.logger.warn(`Admin login attempt for suspended account: ${email}`);
      throw new UnauthorizedException('Account is suspended');
    }

    // Reset failed attempts on successful login
    await this.adminRepository.update(admin.id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    });

    // Generate token and create session
    return this.generateTokenAndSession(admin, context);
  }

  /**
   * Logout an admin by blacklisting their token
   */
  async logout(adminId: string, jti: string): Promise<void> {
    await this.adminSessionService.blacklistToken(jti);
    this.logger.log(`Admin ${adminId} logged out`);
  }

  /**
   * Get admin by ID
   */
  async findById(id: string): Promise<Admin | null> {
    return this.adminRepository.findOne({ where: { id } });
  }

  /**
   * Get admin by email
   */
  async findByEmail(email: string): Promise<Admin | null> {
    return this.adminRepository.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  /**
   * Check if a token JTI is blacklisted
   * Used by AdminJwtStrategy for token validation
   */
  async isTokenBlacklisted(jti: string): Promise<boolean> {
    return this.adminSessionService.isTokenBlacklisted(jti);
  }

  /**
   * Get all active sessions for an admin
   */
  async getSessions(adminId: string, currentJti?: string) {
    return this.adminSessionService.getSessions(adminId, currentJti);
  }

  /**
   * Revoke all sessions for an admin except current
   */
  async revokeAllSessions(
    adminId: string,
    currentJti?: string,
  ): Promise<number> {
    return this.adminSessionService.revokeAllSessions(adminId, currentJti);
  }

  /**
   * Handle failed login attempt
   * Increment counter and lock account if threshold exceeded
   */
  private async handleFailedLogin(admin: Admin): Promise<void> {
    const attempts = (admin.failedLoginAttempts || 0) + 1;

    const updateData: Partial<Admin> = {
      failedLoginAttempts: attempts,
    };

    if (attempts >= this.maxFailedAttempts) {
      const lockoutUntil = new Date();
      lockoutUntil.setMinutes(
        lockoutUntil.getMinutes() + this.lockoutDurationMinutes,
      );
      updateData.lockedUntil = lockoutUntil;
      this.logger.warn(
        `Admin account locked due to too many failed attempts: ${admin.email}`,
      );
    }

    await this.adminRepository.update(admin.id, updateData);
  }

  /**
   * Generate JWT token and create session
   */
  private async generateTokenAndSession(
    admin: Admin,
    context: AdminLoginContext,
  ): Promise<AdminLoginResponseDto> {
    const jti = uuidv4();

    // JWT payload with admin-specific claims
    const payload = {
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      iss: 'nebula-admin', // Critical: distinguishes from tenant tokens
      jti,
      mfaVerified: admin.mfaSetupComplete,
    };

    // Sign the token (uses ADMIN_JWT_SECRET configured in AdminModule)
    const accessToken = this.jwtService.sign(payload);

    // Create session in Redis
    const deviceInfo: AdminDeviceInfo =
      this.adminSessionService.parseDeviceInfo(context.userAgent);

    try {
      await this.adminSessionService.createSession(
        admin.id,
        jti,
        deviceInfo,
        context.ipAddress,
      );
    } catch (error) {
      // Log but don't fail login if session creation fails
      this.logger.warn(
        `Failed to create session for admin ${admin.id}: ${(error as Error).message}`,
      );
    }

    // Get token expiry time from JWT config (8 hours default)
    const expiresIn = 8 * 60 * 60; // 28800 seconds = 8 hours

    return {
      accessToken,
      expiresIn,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        status: admin.status,
        mfaSetupComplete: admin.mfaSetupComplete,
      },
    };
  }

  // ============================================
  // Tenant Search Methods
  // ============================================

  /**
   * Search tenants by ID, email, or name
   * Auto-detects query type based on format
   */
  async searchTenants(
    query: TenantSearchQueryDto,
  ): Promise<TenantSearchResponseDto> {
    const searchTerm = query.q.trim();
    const limit = query.limit ?? 20;
    const offset = query.cursor ? parseInt(query.cursor, 10) : 0;
    const queryType = this.detectQueryType(searchTerm);

    this.logger.debug(
      `Tenant search: query="${searchTerm}", type=${queryType}, limit=${limit}, offset=${offset}`,
    );

    switch (queryType) {
      case 'id':
        return this.searchByTenantId(searchTerm);
      case 'email':
        return this.searchByEmail(searchTerm, limit, offset);
      case 'name':
      default:
        return this.searchByName(searchTerm, limit, offset);
    }
  }

  /**
   * Detect query type based on format
   * - UUID v4: tenant ID search
   * - Email pattern: user email search
   * - Otherwise: name search
   */
  private detectQueryType(query: string): 'id' | 'email' | 'name' {
    // UUID v4 pattern
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(query)) {
      return 'id';
    }

    // Email pattern
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(query)) {
      return 'email';
    }

    return 'name';
  }

  /**
   * Map tenant entity to search result DTO
   */
  private toSearchResult(
    tenant: Tenant,
    matchedEmail?: string,
  ): TenantSearchResultDto {
    return {
      id: tenant.id,
      name: tenant.name,
      status: tenant.status,
      tier: tenant.tier,
      ...(matchedEmail && { matchedEmail }),
    };
  }

  /**
   * Search by exact tenant ID (UUID)
   */
  private async searchByTenantId(id: string): Promise<TenantSearchResponseDto> {
    const tenant = await this.tenantRepository.findOne({
      where: { id },
      select: ['id', 'name', 'status', 'tier'],
    });

    return {
      data: tenant ? [this.toSearchResult(tenant)] : [],
      pagination: {
        cursor: null,
        hasMore: false,
        total: tenant ? 1 : 0,
      },
    };
  }

  /**
   * Search tenants by user email
   * Joins users table and matches case-insensitively
   */
  private async searchByEmail(
    email: string,
    limit: number,
    offset: number,
  ): Promise<TenantSearchResponseDto> {
    const normalizedEmail = email.toLowerCase();

    // Get total count
    const totalQuery = this.tenantRepository
      .createQueryBuilder('tenant')
      .leftJoin('tenant.users', 'user')
      .where('LOWER(user.email) = :email', { email: normalizedEmail });

    const total = await totalQuery.getCount();

    // Get paginated results
    const results = await this.tenantRepository
      .createQueryBuilder('tenant')
      .leftJoin('tenant.users', 'user')
      .select(['tenant.id', 'tenant.name', 'tenant.status', 'tenant.tier'])
      .addSelect('user.email', 'matchedEmail')
      .where('LOWER(user.email) = :email', { email: normalizedEmail })
      .orderBy('tenant.name', 'ASC')
      .skip(offset)
      .take(limit + 1)
      .getRawMany();

    const hasMore = results.length > limit;
    const data = results.slice(0, limit).map((row) => ({
      id: row.tenant_id,
      name: row.tenant_name,
      status: row.tenant_status,
      tier: row.tenant_tier,
      matchedEmail: row.matchedEmail,
    }));

    return {
      data,
      pagination: {
        cursor: hasMore ? String(offset + limit) : null,
        hasMore,
        total,
      },
    };
  }

  /**
   * Search tenants by name (partial, case-insensitive)
   */
  private async searchByName(
    name: string,
    limit: number,
    offset: number,
  ): Promise<TenantSearchResponseDto> {
    // Get total count
    const totalQuery = this.tenantRepository
      .createQueryBuilder('tenant')
      .where('tenant.name ILIKE :search', { search: `%${name}%` });

    const total = await totalQuery.getCount();

    // Get paginated results
    const results = await this.tenantRepository
      .createQueryBuilder('tenant')
      .select(['tenant.id', 'tenant.name', 'tenant.status', 'tenant.tier'])
      .where('tenant.name ILIKE :search', { search: `%${name}%` })
      .orderBy('tenant.name', 'ASC')
      .skip(offset)
      .take(limit + 1)
      .getMany();

    const hasMore = results.length > limit;
    const data = results
      .slice(0, limit)
      .map((tenant) => this.toSearchResult(tenant));

    return {
      data,
      pagination: {
        cursor: hasMore ? String(offset + limit) : null,
        hasMore,
        total,
      },
    };
  }
}
