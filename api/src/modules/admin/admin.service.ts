// Nebula DNS - Admin Authentication Service
// Handles admin login, logout, and credential validation
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import { Admin } from './entities/admin.entity';
import { AdminRole, ADMIN_ROLE_HIERARCHY } from './enums/admin-role.enum';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Location } from '../locations/entities/location.entity';
import { User } from '../users/entities/user.entity';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminLoginResponseDto } from './dto/admin-response.dto';
import {
  TenantSearchQueryDto,
  TenantSearchResponseDto,
  TenantSearchResultDto,
} from './dto/tenant-search.dto';
import {
  MspListingQueryDto,
  MspListingResponseDto,
} from './dto/msp-listing.dto';
import {
  CreateMspTenantDto,
  MspTenantCreatedResponseDto,
} from './dto/msp-onboarding.dto';
import {
  MspDetailQueryDto,
  MspDetailResponseDto,
  MspClientListQueryDto,
  MspClientListResponseDto,
  MspUsageMetricsDto,
  MetricPeriod,
} from './dto/msp-detail.dto';
import { ClickHouseService } from '../clickhouse/clickhouse.service';
import {
  StartImpersonationResponseDto,
  EndImpersonationResponseDto,
} from './dto/impersonation.dto';
import { AdminSessionService, AdminDeviceInfo } from './admin-session.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  AuditAction,
  AuditResourceType,
} from '../audit-logs/entities/audit-log.entity';
import { AdminUser } from './dto/admin-jwt-payload.dto';
import { EmailService } from '../email/email.service';
import { AlertDispatcherService } from '../alerting/alert-dispatcher.service';

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
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly adminSessionService: AdminSessionService,
    private readonly configService: ConfigService,
    private readonly auditLogsService: AuditLogsService,
    private readonly clickhouseService: ClickHouseService,
    private readonly emailService: EmailService,
    @Optional()
    private readonly alertDispatcher?: AlertDispatcherService,
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

  // Impersonation tracking for suspicious activity detection
  private impersonationCounts: Map<
    string,
    { count: number; windowStart: number }
  > = new Map();
  private readonly IMPERSONATION_WINDOW_MS = 60 * 60 * 1000; // 1 hour
  private readonly IMPERSONATION_THRESHOLD = 3; // 3+ in 1 hour = suspicious

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
   * Update an admin's role with security protections
   * - Prevents self-escalation (cannot increase own role)
   * - Prevents demoting the last super_admin
   * - Invalidates all sessions on role change
   * - Audit logs the change
   *
   * @param requesterId - ID of admin making the change
   * @param targetId - ID of admin being changed
   * @param newRole - New role to assign
   * @param ipAddress - IP address for audit logging
   * @throws ForbiddenException if self-escalation or last super_admin demotion
   * @throws NotFoundException if target admin not found
   */
  async updateAdminRole(
    requesterId: string,
    targetId: string,
    newRole: AdminRole,
    ipAddress?: string,
  ): Promise<{ success: boolean; previousRole: AdminRole; newRole: AdminRole }> {
    // 1. Load both admins
    const requester = await this.findById(requesterId);
    const target = await this.findById(targetId);

    if (!target) {
      throw new NotFoundException('Target admin not found');
    }

    const previousRole = target.role;

    // 2. Prevent self-escalation
    if (requesterId === targetId) {
      if (ADMIN_ROLE_HIERARCHY[newRole] > ADMIN_ROLE_HIERARCHY[previousRole]) {
        this.logger.warn(
          `Admin ${requesterId} attempted self-escalation from ${previousRole} to ${newRole}`,
        );
        throw new ForbiddenException('Cannot escalate your own role');
      }
    }

    // 3. Prevent demoting the last super_admin
    if (previousRole === AdminRole.SUPER_ADMIN && newRole !== AdminRole.SUPER_ADMIN) {
      const superAdminCount = await this.adminRepository.count({
        where: { role: AdminRole.SUPER_ADMIN },
      });
      if (superAdminCount <= 1) {
        this.logger.warn(
          `Attempted to demote last super_admin ${targetId}`,
        );
        throw new ForbiddenException(
          'Cannot demote the last super_admin. Promote another admin first.',
        );
      }
    }

    // 4. Update the role
    await this.adminRepository.update(targetId, { role: newRole });

    // 5. Invalidate all sessions for the target admin (security: force re-login with new role)
    const revokedCount = await this.revokeAllSessions(targetId);
    this.logger.log(
      `Admin ${targetId} role changed from ${previousRole} to ${newRole}, ${revokedCount} sessions revoked`,
    );

    // 6. Audit log the change
    // Note: Using a synthetic tenant ID for admin audit logs since admins are not tenant-scoped
    // In production, consider a dedicated admin audit log table
    await this.auditLogsService.log({
      tenantId: '00000000-0000-0000-0000-000000000000', // System tenant placeholder
      userId: null,
      action: 'admin_role_changed' as AuditAction,
      resourceType: 'admin' as AuditResourceType,
      resourceId: targetId,
      resourceName: target.email,
      oldValue: { role: previousRole },
      newValue: { role: newRole },
      ipAddress: ipAddress || null,
      metadata: {
        changedBy: requesterId,
        changedByEmail: requester?.email,
      },
    });

    return {
      success: true,
      previousRole,
      newRole,
    };
  }

  /**
   * Find admins by role
   * Used for break-glass validation
   */
  async findByRole(role: AdminRole): Promise<Admin[]> {
    return this.adminRepository.find({ where: { role } });
  }

  /**
   * Count super_admin accounts
   * Used for break-glass and last-admin protection
   */
  async countSuperAdmins(): Promise<number> {
    return this.adminRepository.count({
      where: { role: AdminRole.SUPER_ADMIN },
    });
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
    // Note: 'iss' (issuer) is set by JwtModule options in admin.module.ts
    const payload = {
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      jti,
      mfaVerified: admin.mfaSetupComplete,
      role: admin.role,
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
        role: admin.role,
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

  // ============================================
  // MSP Listing Methods
  // ============================================

  /**
   * List all MSP tenants with client counts
   * Uses LEFT JOIN to count managed clients per MSP
   * Supports optional search (by name/UUID) and status filtering
   */
  async listMspTenants(
    query: MspListingQueryDto,
  ): Promise<MspListingResponseDto> {
    const limit = query.limit ?? 20;
    const offset = query.cursor ? parseInt(query.cursor, 10) : 0;

    // Build query with client count aggregation using self-join
    // tenant.managed_by_msp_id references another tenant with tier='msp'
    const queryBuilder = this.tenantRepository
      .createQueryBuilder('msp')
      .leftJoin(Tenant, 'client', 'client.managed_by_msp_id = msp.id')
      .select([
        'msp.id AS id',
        'msp.name AS name',
        'msp.status AS status',
        'msp.contact_email AS "contactEmail"',
      ])
      .addSelect('COUNT(DISTINCT client.id)', 'clientCount')
      .where('msp.tier = :tier', { tier: 'msp' })
      .groupBy('msp.id')
      .addGroupBy('msp.name')
      .addGroupBy('msp.status')
      .addGroupBy('msp.contact_email');

    // Apply status filter if provided
    if (query.status) {
      queryBuilder.andWhere('msp.status = :status', { status: query.status });
    }

    // Apply search filter if provided (name or UUID)
    if (query.q) {
      const searchTerm = query.q.trim();
      const queryType = this.detectQueryType(searchTerm);

      if (queryType === 'id') {
        // Exact UUID match
        queryBuilder.andWhere('msp.id = :id', { id: searchTerm });
      } else {
        // Name partial match (case-insensitive)
        queryBuilder.andWhere('msp.name ILIKE :search', {
          search: `%${searchTerm}%`,
        });
      }
    }

    // Apply ordering and pagination
    queryBuilder
      .orderBy('msp.name', 'ASC')
      .offset(offset)
      .limit(limit + 1);

    const rawResults = await queryBuilder.getRawMany();

    // Get total count with same filters applied
    const countQueryBuilder = this.tenantRepository
      .createQueryBuilder('msp')
      .where('msp.tier = :tier', { tier: 'msp' });

    if (query.status) {
      countQueryBuilder.andWhere('msp.status = :status', {
        status: query.status,
      });
    }

    if (query.q) {
      const searchTerm = query.q.trim();
      const queryType = this.detectQueryType(searchTerm);

      if (queryType === 'id') {
        countQueryBuilder.andWhere('msp.id = :id', { id: searchTerm });
      } else {
        countQueryBuilder.andWhere('msp.name ILIKE :search', {
          search: `%${searchTerm}%`,
        });
      }
    }

    const total = await countQueryBuilder.getCount();

    const hasMore = rawResults.length > limit;
    const data = rawResults.slice(0, limit).map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      clientCount: parseInt(row.clientCount, 10) || 0,
      contactEmail: row.contactEmail || undefined,
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

  // ============================================
  // MSP Detail Methods
  // ============================================

  /**
   * Verify that a tenant exists and is an MSP
   * Returns the tenant if valid, throws appropriate exceptions otherwise
   */
  private async verifyMspTenant(mspId: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: mspId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (tenant.tier !== 'msp') {
      throw new BadRequestException('Tenant is not an MSP');
    }

    return tenant;
  }

  /**
   * Convert period string to start/end dates
   */
  private getPeriodDates(period: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate: now };
  }

  /**
   * Aggregate usage metrics across all clients managed by an MSP
   * Fetches stats from ClickHouse and sums across all client tenants
   */
  private async aggregateUsageForMsp(
    mspId: string,
    period: MetricPeriod = '30d',
  ): Promise<MspUsageMetricsDto> {
    // Get all client tenant IDs
    const clients = await this.tenantRepository.find({
      where: { managedByMspId: mspId },
      select: ['id'],
    });

    const { startDate, endDate } = this.getPeriodDates(period);
    const isMockData = this.clickhouseService.isUsingMockData();

    let totalQueries = 0;
    let blockedQueries = 0;
    let threatsBlocked = 0;

    // Aggregate across all clients
    for (const client of clients) {
      try {
        const stats = await this.clickhouseService.getSummaryStats(
          client.id,
          period,
        );
        totalQueries += Number(stats.totalQueries) || 0;
        blockedQueries += Number(stats.blockedQueries) || 0;
        threatsBlocked += Number(stats.threatsBlocked) || 0;
      } catch (error) {
        this.logger.warn(
          `Failed to get stats for client ${client.id}: ${(error as Error).message}`,
        );
      }
    }

    return {
      totalQueries,
      blockedQueries,
      threatsBlocked,
      blockRate:
        totalQueries > 0
          ? Math.round((blockedQueries / totalQueries) * 1000) / 10
          : 0,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      isMockData,
    };
  }

  /**
   * Get usage metrics for a single client tenant
   */
  private async getClientUsage(
    tenantId: string,
    period: MetricPeriod = '30d',
  ): Promise<{ totalQueries: number; blockedQueries: number }> {
    try {
      const stats = await this.clickhouseService.getSummaryStats(
        tenantId,
        period,
      );
      return {
        totalQueries: Number(stats.totalQueries) || 0,
        blockedQueries: Number(stats.blockedQueries) || 0,
      };
    } catch (error) {
      this.logger.warn(`Failed to get usage for tenant ${tenantId}`);
      return { totalQueries: 0, blockedQueries: 0 };
    }
  }

  /**
   * Get detailed information about an MSP tenant
   * Includes aggregated counts of clients, locations, users, and usage metrics
   */
  async getMspDetail(
    mspId: string,
    query: MspDetailQueryDto,
  ): Promise<MspDetailResponseDto> {
    // Verify the tenant exists and is an MSP
    const msp = await this.verifyMspTenant(mspId);

    // Count clients managed by this MSP
    const clientCount = await this.tenantRepository.count({
      where: { managedByMspId: mspId },
    });

    // Count locations across all managed clients
    // Using subquery to get all tenant IDs managed by this MSP
    const locationCount = await this.locationRepository
      .createQueryBuilder('location')
      .innerJoin('location.tenant', 'tenant')
      .where('tenant.managed_by_msp_id = :mspId', { mspId })
      .getCount();

    // Count users across all managed clients
    const userCount = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.tenant', 'tenant')
      .where('tenant.managed_by_msp_id = :mspId', { mspId })
      .getCount();

    // Aggregate usage metrics from ClickHouse
    const usage = await this.aggregateUsageForMsp(mspId, query.period || '30d');

    this.logger.debug(
      `MSP detail for ${msp.name}: clients=${clientCount}, locations=${locationCount}, users=${userCount}, queries=${usage.totalQueries}`,
    );

    return {
      id: msp.id,
      name: msp.name,
      status: msp.status,
      contactEmail: msp.contactEmail || undefined,
      tier: 'msp',
      clientCount,
      locationCount,
      userCount,
      createdAt: msp.createdAt.toISOString(),
      usage,
    };
  }

  /**
   * List all client organizations managed by an MSP
   * Supports search, status filtering, pagination, and per-client usage metrics
   */
  async getMspClients(
    mspId: string,
    query: MspClientListQueryDto,
  ): Promise<MspClientListResponseDto> {
    // Verify the tenant exists and is an MSP
    await this.verifyMspTenant(mspId);

    const limit = query.limit ?? 20;
    const offset = query.cursor ? parseInt(query.cursor, 10) : 0;
    const period = query.period || '30d';

    // Build query with location/user counts using LEFT JOINs
    const queryBuilder = this.tenantRepository
      .createQueryBuilder('client')
      .leftJoin('client.locations', 'location')
      .leftJoin('client.users', 'user')
      .select([
        'client.id AS id',
        'client.name AS name',
        'client.status AS status',
        'client.tier AS tier',
        'client.contact_email AS "contactEmail"',
        'client.created_at AS "createdAt"',
      ])
      .addSelect('COUNT(DISTINCT location.id)', 'locationCount')
      .addSelect('COUNT(DISTINCT user.id)', 'userCount')
      .where('client.managed_by_msp_id = :mspId', { mspId })
      .groupBy('client.id');

    // Clone query builder for count before applying filters
    const countQueryBuilder = this.tenantRepository
      .createQueryBuilder('client')
      .where('client.managed_by_msp_id = :mspId', { mspId });

    // Apply search filter if provided (name partial match)
    if (query.q) {
      const searchTerm = query.q.trim();
      queryBuilder.andWhere('client.name ILIKE :search', {
        search: `%${searchTerm}%`,
      });
      countQueryBuilder.andWhere('client.name ILIKE :search', {
        search: `%${searchTerm}%`,
      });
    }

    // Apply status filter if provided
    if (query.status) {
      queryBuilder.andWhere('client.status = :status', {
        status: query.status,
      });
      countQueryBuilder.andWhere('client.status = :status', {
        status: query.status,
      });
    }

    // Get total count with same filters
    const total = await countQueryBuilder.getCount();

    // Apply ordering and pagination
    queryBuilder
      .orderBy('client.name', 'ASC')
      .offset(offset)
      .limit(limit + 1);

    const rawResults = await queryBuilder.getRawMany();

    const hasMore = rawResults.length > limit;

    // Fetch usage metrics for each client in parallel
    const clients = await Promise.all(
      rawResults.slice(0, limit).map(async (row) => {
        const usage = await this.getClientUsage(row.id, period);
        return {
          id: row.id,
          name: row.name,
          status: row.status,
          tier: row.tier,
          contactEmail: row.contactEmail || undefined,
          locationCount: parseInt(row.locationCount, 10) || 0,
          userCount: parseInt(row.userCount, 10) || 0,
          totalQueries: usage.totalQueries,
          blockedQueries: usage.blockedQueries,
          createdAt: new Date(row.createdAt).toISOString(),
        };
      }),
    );

    return {
      data: clients,
      pagination: {
        cursor: hasMore ? String(offset + limit) : null,
        hasMore,
        total,
      },
    };
  }

  // ============================================
  // Impersonation Methods
  // ============================================

  /**
   * Start impersonation of a tenant
   * Generates a tenant-scoped JWT token with impersonation claims
   */
  async startImpersonation(
    adminUser: AdminUser,
    tenantId: string,
    ipAddress?: string,
  ): Promise<StartImpersonationResponseDto> {
    // 1. Verify tenant exists
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // 2. Generate impersonation token with tenant JWT_SECRET
    const jti = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    const payload = {
      sub: adminUser.adminId, // Admin ID as subject
      email: adminUser.email,
      name: `${adminUser.name} (Impersonating)`, // Admin name with indicator
      tenantId: tenant.id, // Target tenant context
      tier: tenant.tier, // Tenant tier for dashboard features
      role: 'admin', // Full tenant admin access
      jti,
      mfaVerified: true, // Admin already MFA verified
      // Impersonation-specific claims
      impersonatingAdminId: adminUser.adminId,
      impersonatingAdminEmail: adminUser.email,
      impersonationStartTime: now,
    };

    // Sign with tenant secret (JWT_SECRET, NOT ADMIN_JWT_SECRET)
    // Use 1-hour expiry for impersonation (shorter than admin's 8h)
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '1h',
      issuer: 'nebula-dns', // Tenant issuer, not nebula-admin
    });

    // 3. Audit log the start event
    await this.auditLogsService.log({
      tenantId: tenant.id,
      userId: null, // No tenant user - it's an admin action
      action: 'admin_impersonation_start' as AuditAction,
      resourceType: 'tenant' as AuditResourceType,
      resourceId: tenant.id,
      resourceName: tenant.name,
      ipAddress: ipAddress || null,
      metadata: {
        adminId: adminUser.adminId,
        adminEmail: adminUser.email,
        tenantName: tenant.name,
        tenantTier: tenant.tier,
      },
    });

    this.logger.log(
      `Admin ${adminUser.email} started impersonating tenant ${tenant.name} (${tenant.id})`,
    );

    // ALERT-06: Check for suspicious impersonation patterns
    await this.checkSuspiciousImpersonation(adminUser);

    return {
      accessToken,
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantTier: tenant.tier,
      expiresIn: 3600, // 1 hour in seconds
    };
  }

  /**
   * Check for suspicious impersonation activity
   * ALERT-06: Security events trigger alerts
   * Triggers warning if admin has 3+ impersonations in 1 hour window
   */
  private async checkSuspiciousImpersonation(
    adminUser: AdminUser,
  ): Promise<void> {
    if (!this.alertDispatcher) {
      return;
    }

    const now = Date.now();
    const adminId = adminUser.adminId;

    // Get or initialize tracking for this admin
    let tracking = this.impersonationCounts.get(adminId);

    // Reset window if expired
    if (
      !tracking ||
      now - tracking.windowStart > this.IMPERSONATION_WINDOW_MS
    ) {
      tracking = { count: 0, windowStart: now };
      this.impersonationCounts.set(adminId, tracking);
    }

    // Increment count
    tracking.count++;

    // Trigger alert if threshold exceeded
    if (tracking.count >= this.IMPERSONATION_THRESHOLD) {
      await this.alertDispatcher.dispatchSecurity(
        'Suspicious Impersonation Activity',
        `Admin ${adminUser.email} has ${tracking.count} impersonation sessions in the last hour`,
        'warning',
        `suspicious_impersonation_${adminId}`,
      );

      // Reset counter after alerting to avoid spam
      tracking.count = 0;
      tracking.windowStart = now;
    }
  }

  /**
   * End impersonation session
   * Verifies the impersonation token, blacklists it, and logs the end event
   */
  async endImpersonation(
    impersonationToken: string,
    ipAddress?: string,
  ): Promise<EndImpersonationResponseDto> {
    // 1. Verify and decode the impersonation token
    let payload: any;
    try {
      payload = this.jwtService.verify(impersonationToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired impersonation token');
    }

    // 2. Validate it's an impersonation token (has impersonatingAdminId claim)
    if (!payload.impersonatingAdminId) {
      throw new BadRequestException('Not an impersonation token');
    }

    // 3. Blacklist the token using session service
    await this.adminSessionService.blacklistToken(payload.jti);

    // 4. Calculate session duration
    const startTime = payload.impersonationStartTime || 0;
    const endTime = Math.floor(Date.now() / 1000);
    const durationSeconds = endTime - startTime;

    // 5. Audit log the end event
    await this.auditLogsService.log({
      tenantId: payload.tenantId,
      userId: null,
      action: 'admin_impersonation_end' as AuditAction,
      resourceType: 'tenant' as AuditResourceType,
      resourceId: payload.tenantId,
      ipAddress: ipAddress || null,
      metadata: {
        adminId: payload.impersonatingAdminId,
        adminEmail: payload.impersonatingAdminEmail,
        durationSeconds,
        startTime: new Date(startTime * 1000).toISOString(),
        endTime: new Date(endTime * 1000).toISOString(),
      },
    });

    this.logger.log(
      `Admin ${payload.impersonatingAdminEmail} ended impersonation of tenant ${payload.tenantId} after ${durationSeconds}s`,
    );

    return {
      message: 'Impersonation session ended',
      durationSeconds,
    };
  }

  // ============================================
  // MSP Onboarding Methods
  // ============================================

  /**
   * Generate a unique URL-friendly slug from tenant name
   * Appends counter suffix if slug already exists
   */
  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    let slug = baseSlug;
    let counter = 1;
    while (await this.tenantRepository.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    return slug;
  }

  /**
   * Create a new MSP tenant with initial admin user
   * Creates tenant and user atomically in a transaction
   *
   * @param dto - MSP tenant creation data
   * @param createdByAdminId - ID of the admin creating the MSP
   * @returns Created tenant and user details with temporary password
   * @throws ConflictException if admin email already exists
   */
  async createMspTenant(
    dto: CreateMspTenantDto,
    createdByAdminId: string,
  ): Promise<MspTenantCreatedResponseDto> {
    // 1. Check email uniqueness first (before transaction)
    const normalizedEmail = dto.adminEmail.toLowerCase();
    const existingUser = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('Email address already in use');
    }

    // 2. Generate unique slug (use provided or derive from name)
    const slug = dto.slug || (await this.generateUniqueSlug(dto.name));

    // Verify provided slug is unique if explicitly provided
    if (dto.slug) {
      const existingTenant = await this.tenantRepository.findOne({
        where: { slug: dto.slug },
      });
      if (existingTenant) {
        throw new ConflictException('Slug already in use');
      }
    }

    // 3. Start transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedTenant: Tenant;
    let savedUser: User;
    let tempPassword: string;

    try {
      // 4. Create tenant entity
      const tenant = queryRunner.manager.create(Tenant, {
        name: dto.name,
        slug,
        status: 'active',
        tier: 'msp',
        plan: 'enterprise', // MSPs get enterprise plan
        contactEmail: dto.contactEmail || normalizedEmail,
        contactPhone: dto.contactPhone || null,
        locationLimit: dto.locationLimit ?? null,
        clientLimit: dto.clientLimit ?? null,
        subscriptionStatus: 'active',
        managedByMspId: null, // MSP is not managed by another MSP
        settings: {
          timezone: 'UTC',
          blockPageEnabled: true,
          mspDisplayName: dto.name,
        },
      });

      savedTenant = await queryRunner.manager.save(tenant);

      // 5. Create admin user entity
      tempPassword = crypto.randomBytes(16).toString('hex');
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      const user = queryRunner.manager.create(User, {
        tenantId: savedTenant.id,
        email: normalizedEmail,
        name: dto.adminName || `${dto.name} Admin`,
        passwordHash,
        role: 'owner',
        status: 'pending', // Requires password change on first login
      });

      savedUser = await queryRunner.manager.save(user);

      // 6. Commit transaction
      await queryRunner.commitTransaction();

      // 7. Log success
      this.logger.log(
        `Admin ${createdByAdminId} created MSP tenant ${savedTenant.id} (${savedTenant.name})`,
      );
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to create MSP tenant: ${(error as Error).message}`,
      );
      throw error;
    } finally {
      // Release query runner
      await queryRunner.release();
    }

    // 8. Send welcome email after transaction commits
    const loginUrl = this.configService.get<string>(
      'APP_URL',
      'https://app.nebuladns.com',
    );
    let welcomeEmailSent = false;

    try {
      welcomeEmailSent = await this.emailService.sendMspWelcomeEmail({
        to: savedUser.email,
        adminName: savedUser.name,
        mspName: savedTenant.name,
        tempPassword,
        loginUrl: `${loginUrl}/login`,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to send MSP welcome email: ${(error as Error).message}`,
      );
      // Don't fail the operation if email fails
    }

    // 9. Return response (tempPassword excluded from response)
    return {
      id: savedTenant.id,
      name: savedTenant.name,
      slug: savedTenant.slug,
      status: 'active',
      tier: 'msp',
      adminUserId: savedUser.id,
      adminEmail: savedUser.email,
      welcomeEmailSent,
      locationLimit: savedTenant.locationLimit,
      clientLimit: savedTenant.clientLimit,
      createdAt: savedTenant.createdAt.toISOString(),
    };
  }
}
