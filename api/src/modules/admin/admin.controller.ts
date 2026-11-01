// Nebula DNS - Admin Authentication Controller
// Admin login, logout, profile, and session management endpoints
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
  Req,
  Res,
  Ip,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Request, Response } from 'express';

import { AdminService, AdminLoginContext } from './admin.service';
import { AdminHealthService } from './admin-health.service';
import { AdminBillingService } from './admin-billing.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminMfaService } from './admin-mfa.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import {
  AdminLoginResponseDto,
  AdminProfileResponseDto,
  AdminMessageResponseDto,
  RevokeSessionsResponseDto,
} from './dto/admin-response.dto';
import {
  TenantSearchQueryDto,
  TenantSearchResponseDto,
} from './dto/tenant-search.dto';
import {
  MspListingQueryDto,
  MspListingResponseDto,
} from './dto/msp-listing.dto';
import {
  MspDetailQueryDto,
  MspDetailResponseDto,
  MspClientListQueryDto,
  MspClientListResponseDto,
} from './dto/msp-detail.dto';
import {
  StartImpersonationResponseDto,
  EndImpersonationResponseDto,
} from './dto/impersonation.dto';
import {
  CreateMspTenantDto,
  MspTenantCreatedResponseDto,
} from './dto/msp-onboarding.dto';
import {
  SystemHealthResponseDto,
  QueryVolumeDto,
  RecentErrorDto,
} from './dto/system-health.dto';
import { AdminDashboardStatsResponseDto } from './dto/admin-dashboard.dto';
import {
  SubscriptionStatusResponseDto,
  InvoiceListQueryDto,
  InvoiceListResponseDto,
  ApplyCreditDto,
  CreditAppliedResponseDto,
  ChangeTierDto,
  TierChangeResponseDto,
  ExtendTrialDto,
  ExtendGracePeriodDto,
  ExtensionResponseDto,
  PaymentMethodListResponseDto,
  CreateSetupIntentResponseDto,
  SetDefaultPaymentMethodDto,
  SetDefaultPaymentMethodResponseDto,
  DeletePaymentMethodResponseDto,
} from './dto/billing.dto';
import {
  AdminMfaCodeDto,
  AdminMfaEnrollStartResponseDto,
  AdminMfaVerifyResponseDto,
} from './dto/admin-mfa.dto';
import {
  AdminRefreshTokenDto,
  StartImpersonationBodyDto,
} from '../mobile/dto/mobile.dto';
import { AdminSessionResponse } from './admin-session.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { AdminRolesGuard } from './guards/admin-roles.guard';
import { AdminMfaGuard } from './guards/admin-mfa.guard';
import { SkipAdminMfa } from './decorators/skip-admin-mfa.decorator';
import { AdminRoles } from './decorators/admin-roles.decorator';
import { AdminRole } from './enums/admin-role.enum';
import { AdminUser } from './dto/admin-jwt-payload.dto';

/**
 * Admin Controller
 *
 * Provides authentication endpoints for internal administrators.
 * All routes under /api/admin/*
 *
 * Protected routes use AdminAuthGuard (not JwtAuthGuard) to ensure
 * only admin tokens are accepted.
 */
@ApiTags('Admin')
@Controller('admin')
@UseGuards(AdminMfaGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adminHealthService: AdminHealthService,
    private readonly adminBillingService: AdminBillingService,
    private readonly adminDashboardService: AdminDashboardService,
    private readonly adminMfaService: AdminMfaService,
  ) {}

  /**
   * Admin login
   * Authenticates admin credentials and returns JWT token
   */
  @Post('login')
  @SkipAdminMfa()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin login',
    description:
      'Authenticates an admin with email and password. Returns JWT access token on success. ' +
      'Admins require 14+ character passwords with mixed case, numbers, and symbols.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful - returns access token and admin info',
    type: AdminLoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or account locked',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - password requirements not met',
  })
  async login(
    @Body() loginDto: AdminLoginDto,
    @Req() req: Request,
    @Ip() ip: string,
  ): Promise<AdminLoginResponseDto> {
    const context: AdminLoginContext = {
      userAgent: req.headers['user-agent'] || 'Unknown',
      ipAddress: this.getClientIp(req, ip),
      externalDeviceId: this.getExternalDeviceId(req),
    };
    return this.adminService.login(loginDto, context);
  }

  @Post('refresh')
  @SkipAdminMfa()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh admin access token using rotating refresh token' })
  async refreshAdminTokens(
    @Body() dto: AdminRefreshTokenDto,
    @Req() req: Request,
    @Ip() ip: string,
  ): Promise<AdminLoginResponseDto> {
    const context: AdminLoginContext = {
      userAgent: req.headers['user-agent'] || 'Unknown',
      ipAddress: this.getClientIp(req, ip),
      externalDeviceId: this.getExternalDeviceId(req),
    };
    return this.adminService.refreshAdminSession(dto.refreshToken, context);
  }

  @Get('sessions')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.VIEWER)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({ summary: 'List active admin sessions' })
  async listSessions(
    @Req() req: Request,
    @Query('adminId', new ParseUUIDPipe({ optional: true })) targetAdminId?: string,
  ): Promise<{ data: AdminSessionResponse[] }> {
    const user = req.user as AdminUser;
    const adminId =
      targetAdminId &&
      (user.role === AdminRole.SUPER_ADMIN || user.role === AdminRole.ADMIN)
        ? targetAdminId
        : user.adminId;

    if (targetAdminId && targetAdminId !== user.adminId && user.role === AdminRole.VIEWER) {
      throw new BadRequestException('Viewers may only list their own sessions');
    }

    const sessions = await this.adminService.getSessions(adminId, user.jti);
    return { data: sessions };
  }

  @Delete('sessions/:sessionId')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiBearerAuth('admin-jwt')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSession(
    @Req() req: Request,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Query('adminId', new ParseUUIDPipe({ optional: true })) targetAdminId?: string,
  ): Promise<void> {
    const user = req.user as AdminUser;
    const adminId = targetAdminId ?? user.adminId;

    if (
      targetAdminId &&
      targetAdminId !== user.adminId &&
      user.role !== AdminRole.SUPER_ADMIN
    ) {
      throw new BadRequestException(
        'Only super_admin may revoke another admin session',
      );
    }

    await this.adminService.revokeSession(adminId, sessionId, user.jti);
  }

  /**
   * Start MFA enrollment (QR / secret) for admins who have not completed setup.
   */
  @Post('mfa/enroll/start')
  @SkipAdminMfa()
  @UseGuards(AdminAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({ summary: 'Start admin MFA enrollment' })
  async startMfaEnrollment(
    @Req() req: Request,
  ): Promise<AdminMfaEnrollStartResponseDto> {
    const user = req.user as AdminUser;
    return this.adminMfaService.startEnrollment(user.adminId);
  }

  /**
   * Complete MFA enrollment with TOTP verification code.
   */
  @Post('mfa/enroll/verify')
  @SkipAdminMfa()
  @UseGuards(AdminAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({ summary: 'Verify admin MFA enrollment' })
  async verifyMfaEnrollment(
    @Body() dto: AdminMfaCodeDto,
    @Req() req: Request,
    @Ip() ip: string,
  ): Promise<AdminMfaVerifyResponseDto> {
    const user = req.user as AdminUser;
    await this.adminMfaService.completeEnrollment(user.adminId, dto.code);
    const admin = await this.adminService.findById(user.adminId);
    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }
    const context: AdminLoginContext = {
      userAgent: req.headers['user-agent'] || 'Unknown',
      ipAddress: this.getClientIp(req, ip),
      externalDeviceId: this.getExternalDeviceId(req),
    };
    return this.adminService.createMfaVerifiedSession(admin, context);
  }

  /**
   * Verify TOTP (or backup code) after password login for enrolled admins.
   */
  @Post('mfa/verify')
  @SkipAdminMfa()
  @UseGuards(AdminAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({ summary: 'Verify admin MFA challenge' })
  async verifyMfaChallenge(
    @Body() dto: AdminMfaCodeDto,
    @Req() req: Request,
    @Ip() ip: string,
  ): Promise<AdminMfaVerifyResponseDto> {
    const user = req.user as AdminUser;
    const admin = await this.adminService.findById(user.adminId);
    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }
    if (!admin.mfaSetupComplete) {
      throw new BadRequestException(
        'MFA enrollment required. Use /admin/mfa/enroll/start first.',
      );
    }
    const valid = await this.adminMfaService.verifyChallenge(
      user.adminId,
      dto.code,
    );
    if (!valid) {
      throw new UnauthorizedException('Invalid MFA code');
    }
    const context: AdminLoginContext = {
      userAgent: req.headers['user-agent'] || 'Unknown',
      ipAddress: this.getClientIp(req, ip),
      externalDeviceId: this.getExternalDeviceId(req),
    };
    return this.adminService.createMfaVerifiedSession(admin, context);
  }

  /**
   * Search tenants
   * Auto-detects query type (UUID, email, or name)
   */
  @Get('tenants/search')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.VIEWER)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Search tenants',
    description:
      'Search tenants by ID, email, or name. Auto-detects query type based on format. ' +
      'UUID returns exact match, email joins users table, name uses partial matching.',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results with pagination',
    type: TenantSearchResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Query too short or invalid',
  })
  @ApiResponse({
    status: 401,
    description: 'Admin authentication required',
  })
  async searchTenants(
    @Query() query: TenantSearchQueryDto,
  ): Promise<TenantSearchResponseDto> {
    return this.adminService.searchTenants(query);
  }

  /**
   * Dashboard aggregate stats for the admin home page
   */
  @Get('dashboard/stats')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.VIEWER)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Get admin dashboard stats',
    description:
      'Returns MSP/tenant counts, active tenants (7d), revenue, and demo tenant metrics for the admin home dashboard.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard stats',
    type: AdminDashboardStatsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Admin authentication required',
  })
  async getDashboardStats(): Promise<AdminDashboardStatsResponseDto> {
    return this.adminDashboardService.getStats();
  }

  /**
   * Create new MSP tenant
   * Creates MSP account with initial admin user and sends welcome email
   */
  @Post('msp/tenants')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Create new MSP tenant',
    description:
      'Creates a new MSP tenant account with initial admin user. ' +
      'Sends welcome email with temporary password to the admin. ' +
      'The new MSP appears in MSP listing immediately.',
  })
  @ApiResponse({
    status: 201,
    description: 'MSP tenant created successfully',
    type: MspTenantCreatedResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already in use',
  })
  @ApiResponse({
    status: 401,
    description: 'Admin authentication required',
  })
  async createMspTenant(
    @Body() dto: CreateMspTenantDto,
    @Req() req: Request,
  ): Promise<MspTenantCreatedResponseDto> {
    const admin = req.user as AdminUser;
    return this.adminService.createMspTenant(dto, admin.adminId);
  }

  /**
   * List all MSP tenants
   * Returns paginated list of MSP-tier tenants with client counts
   */
  @Get('msp/tenants')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.VIEWER)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'List MSP tenants',
    description:
      'List all MSP-tier tenants with client organization counts. ' +
      'Returns paginated results ordered by name.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of MSP tenants with pagination',
    type: MspListingResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Admin authentication required',
  })
  async listMspTenants(
    @Query() query: MspListingQueryDto,
  ): Promise<MspListingResponseDto> {
    return this.adminService.listMspTenants(query);
  }

  /**
   * Get MSP tenant details
   * Returns detailed information including client, location, and user counts
   */
  @Get('msp/tenants/:mspId')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.VIEWER)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Get MSP tenant details',
    description:
      'Get detailed information about an MSP including client, location, and user counts.',
  })
  @ApiParam({ name: 'mspId', description: 'MSP tenant UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    type: MspDetailResponseDto,
    description: 'MSP details retrieved',
  })
  @ApiResponse({
    status: 400,
    description: 'Tenant is not an MSP',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  async getMspDetail(
    @Param('mspId', ParseUUIDPipe) mspId: string,
    @Query() query: MspDetailQueryDto,
  ): Promise<MspDetailResponseDto> {
    return this.adminService.getMspDetail(mspId, query);
  }

  /**
   * List MSP client organizations
   * Returns paginated list of all clients managed by an MSP
   */
  @Get('msp/tenants/:mspId/clients')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.VIEWER)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'List MSP client organizations',
    description:
      'List all client organizations managed by an MSP with location and user counts.',
  })
  @ApiParam({ name: 'mspId', description: 'MSP tenant UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    type: MspClientListResponseDto,
    description: 'Client list retrieved',
  })
  @ApiResponse({
    status: 400,
    description: 'Tenant is not an MSP',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  async getMspClients(
    @Param('mspId', ParseUUIDPipe) mspId: string,
    @Query() query: MspClientListQueryDto,
  ): Promise<MspClientListResponseDto> {
    return this.adminService.getMspClients(mspId, query);
  }

  /**
   * End impersonation session
   * Blacklists the impersonation token and logs the end event
   * NOTE: This route must be before /impersonate/:tenantId to avoid route conflicts
   */
  @Post('impersonate/end')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth() // Uses the impersonation token (tenant JWT), not admin JWT
  @ApiOperation({
    summary: 'End impersonation session',
    description:
      'End the current impersonation session by blacklisting the impersonation token. ' +
      'The admin should then use their original admin token to continue. ' +
      'Returns the duration of the impersonation session.',
  })
  @ApiResponse({
    status: 200,
    description: 'Impersonation session ended',
    type: EndImpersonationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Not an impersonation token',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired token',
  })
  async endImpersonation(
    @Req() req: Request,
    @Ip() ip: string,
  ): Promise<EndImpersonationResponseDto> {
    // Extract token from Authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }
    const token = authHeader.replace('Bearer ', '');
    return this.adminService.endImpersonation(token, this.getClientIp(req, ip));
  }

  /**
   * Start impersonation session
   * Generates a tenant-scoped JWT for accessing tenant dashboard
   */
  @Post('impersonate/:tenantId')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Start impersonation session',
    description:
      "Generate a JWT token to access the target tenant's dashboard as admin. " +
      'The token is scoped to the tenant and grants full admin access. ' +
      'Impersonation sessions are limited to 1 hour and are fully audit-logged.',
  })
  @ApiResponse({
    status: 200,
    description: 'Impersonation token generated successfully',
    type: StartImpersonationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Admin authentication required',
  })
  async startImpersonation(
    @Param('tenantId') tenantId: string,
    @Body() body: StartImpersonationBodyDto,
    @Req() req: Request,
    @Ip() ip: string,
  ): Promise<StartImpersonationResponseDto> {
    const adminUser = req.user as AdminUser;
    const externalDeviceId = this.getExternalDeviceId(req);
    return this.adminService.startImpersonation(
      adminUser,
      tenantId,
      this.getClientIp(req, ip),
      {
        reason: body?.reason,
        externalDeviceId,
        appVersion:
          typeof req.headers['x-app-version'] === 'string'
            ? req.headers['x-app-version']
            : undefined,
      },
    );
  }

  /**
   * Admin logout
   * Blacklists the current token
   */
  @Post('logout')
  @SkipAdminMfa()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.VIEWER)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Admin logout',
    description:
      'Logs out the admin by blacklisting the current JWT token. ' +
      'The token will be invalid for the remainder of its lifetime.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
    type: AdminMessageResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Admin authentication required',
  })
  async logout(@Req() req: Request): Promise<AdminMessageResponseDto> {
    const user = req.user as AdminUser;
    await this.adminService.logout(
      user.adminId,
      user.jti,
      this.getClientIp(req, req.ip || '0.0.0.0'),
    );
    return { message: 'Logged out successfully' };
  }

  /**
   * Get current admin profile
   * Returns admin information from the JWT
   */
  @Get('me')
  @SkipAdminMfa()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.VIEWER)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Get admin profile',
    description:
      'Returns the profile of the currently authenticated admin. ' +
      'Uses the JWT token to identify the admin.',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin profile retrieved successfully',
    type: AdminProfileResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Admin authentication required',
  })
  async getProfile(@Req() req: Request): Promise<AdminProfileResponseDto> {
    const user = req.user as AdminUser;
    const admin = await this.adminService.findById(user.adminId);

    if (!admin) {
      // Should not happen if JWT is valid, but handle gracefully
      return {
        id: user.adminId,
        email: user.email,
        name: user.name,
        status: 'active',
        lastLoginAt: null,
        mfaVerified: user.mfaVerified,
        role: user.role,
      };
    }

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      status: admin.status,
      lastLoginAt: admin.lastLoginAt,
      mfaVerified: user.mfaVerified,
      role: admin.role,
    };
  }

  /**
   * Revoke all other sessions
   * Blacklists all tokens except the current one
   */
  @Post('sessions/revoke-all')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Revoke all other sessions',
    description:
      'Revokes all admin sessions except the current one. ' +
      'Useful for security when an admin suspects unauthorized access.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sessions revoked successfully',
    type: RevokeSessionsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Admin authentication required',
  })
  async revokeAllSessions(
    @Req() req: Request,
  ): Promise<RevokeSessionsResponseDto> {
    const user = req.user as AdminUser;
    const revokedCount = await this.adminService.revokeAllSessions(
      user.adminId,
      user.jti,
    );
    return {
      revokedCount,
      message: `Successfully revoked ${revokedCount} session(s)`,
    };
  }

  // ===== System Health Endpoints =====

  /**
   * Get combined system health status
   * Returns DNS services, storage connections, error rates, and query volume
   */
  @Get('system/health')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.VIEWER)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Get system health status',
    description:
      'Returns combined health status of DNS services, storage connections, error rates, and query volume.',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['1h', '24h'],
    description: 'Time period for error rates and query volume (default 24h)',
  })
  @ApiResponse({
    status: 200,
    description: 'System health status',
    type: SystemHealthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Admin authentication required',
  })
  async getSystemHealth(
    @Query('period') period: '1h' | '24h' = '24h',
  ): Promise<SystemHealthResponseDto> {
    return this.adminHealthService.getSystemHealth(period);
  }

  /**
   * Get recent error entries
   * Returns DNS query errors from ClickHouse logs
   */
  @Get('system/errors')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.VIEWER)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Get recent error entries',
    description:
      'Returns recent DNS query errors from the log. Limit defaults to 20.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum entries to return (default 20, max 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent error entries',
    type: [RecentErrorDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Admin authentication required',
  })
  async getRecentErrors(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<RecentErrorDto[]> {
    // Enforce maximum limit
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    return this.adminHealthService.getRecentErrors(safeLimit);
  }

  /**
   * Get aggregate query volume
   * Returns total query counts across all tenants
   */
  @Get('system/query-volume')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.VIEWER)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Get aggregate query volume',
    description:
      'Returns total query counts across all tenants for specified period.',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['1h', '24h'],
    description: 'Time period (default 24h)',
  })
  @ApiResponse({
    status: 200,
    description: 'Aggregate query volume',
    type: QueryVolumeDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Admin authentication required',
  })
  async getQueryVolume(
    @Query('period') period: '1h' | '24h' = '24h',
  ): Promise<QueryVolumeDto> {
    return this.adminHealthService.getQueryVolume(period);
  }

  // ===== Billing Endpoints =====

  /**
   * Get tenant subscription status
   * Returns comprehensive billing information including Stripe data
   */
  @Get('tenants/:tenantId/billing/subscription')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.VIEWER)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Get tenant subscription status',
    description:
      'Returns comprehensive subscription status including Stripe customer data, ' +
      'trial status, grace period info, and payment method details.',
  })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Subscription status retrieved',
    type: SubscriptionStatusResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Admin authentication required',
  })
  async getSubscriptionStatus(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ): Promise<SubscriptionStatusResponseDto> {
    return this.adminBillingService.getSubscriptionStatus(tenantId);
  }

  /**
   * List tenant invoices
   * Returns paginated list of Stripe invoices
   */
  @Get('tenants/:tenantId/billing/invoices')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.VIEWER)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'List tenant invoices',
    description:
      'Returns paginated list of Stripe invoices for the tenant. ' +
      'Includes payment status, amounts, and PDF availability.',
  })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Invoices retrieved',
    type: InvoiceListResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Admin authentication required',
  })
  async listInvoices(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query() query: InvoiceListQueryDto,
  ): Promise<InvoiceListResponseDto> {
    return this.adminBillingService.listInvoices(tenantId, query);
  }

  /**
   * Download invoice PDF
   * Streams the PDF from Stripe with ownership validation
   */
  @Get('tenants/:tenantId/billing/invoices/:invoiceId/pdf')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.VIEWER)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Download invoice PDF',
    description:
      'Streams the invoice PDF from Stripe. Validates that the invoice ' +
      'belongs to the specified tenant before serving.',
  })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID', type: 'string' })
  @ApiParam({
    name: 'invoiceId',
    description: 'Stripe invoice ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF stream',
    content: { 'application/pdf': {} },
  })
  @ApiResponse({
    status: 404,
    description: 'Invoice not found or no billing info',
  })
  @ApiResponse({
    status: 401,
    description: 'Admin authentication required',
  })
  async downloadInvoicePdf(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('invoiceId') invoiceId: string,
    @Res() res: Response,
  ): Promise<void> {
    return this.adminBillingService.streamInvoicePdf(tenantId, invoiceId, res);
  }

  /**
   * Apply credit to tenant account
   * Creates a Stripe balance transaction (credit)
   */
  @Post('tenants/:tenantId/billing/credits')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Apply credit to tenant account',
    description:
      "Applies a credit to the tenant's Stripe account balance. " +
      'Credits reduce the amount due on the next invoice. ' +
      'Maximum credit per transaction is $10,000.',
  })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID', type: 'string' })
  @ApiResponse({
    status: 201,
    description: 'Credit applied successfully',
    type: CreditAppliedResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or no billing configured',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Admin authentication required',
  })
  async applyCredit(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: ApplyCreditDto,
    @Req() req: Request,
  ): Promise<CreditAppliedResponseDto> {
    const admin = req.user as AdminUser;
    return this.adminBillingService.applyCredit(tenantId, dto, admin.adminId);
  }

  /**
   * Change tenant subscription tier
   * Updates subscription in Stripe and local database
   */
  @Post('tenants/:tenantId/billing/tier')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Change tenant subscription tier',
    description:
      "Changes the tenant's subscription tier. Can be applied immediately " +
      '(with proration) or at the end of the current billing period.',
  })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Tier change successful',
    type: TierChangeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or no subscription',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Admin authentication required',
  })
  async changeTier(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: ChangeTierDto,
    @Req() req: Request,
  ): Promise<TierChangeResponseDto> {
    const admin = req.user as AdminUser;
    return this.adminBillingService.changeTier(tenantId, dto, admin.adminId);
  }

  /**
   * Extend tenant trial period
   * Extends an active trial via Stripe subscription update
   */
  @Post('tenants/:tenantId/billing/trial/extend')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Extend tenant trial period',
    description:
      'Extend an active trial for the specified number of days. ' +
      'Requires the tenant to have an active trial subscription in Stripe. ' +
      'Optionally sends a notification email to the tenant.',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'Tenant UUID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Trial extended successfully',
    type: ExtensionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Tenant does not have an active trial or no Stripe subscription',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Admin authentication required',
  })
  async extendTrial(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: ExtendTrialDto,
    @Req() req: Request,
  ): Promise<ExtensionResponseDto> {
    const admin = req.user as AdminUser;
    return this.adminBillingService.extendTrial(tenantId, dto, admin.adminId);
  }

  /**
   * Extend tenant grace period
   * Extends the grace period for a tenant in subscription lapse
   */
  @Post('tenants/:tenantId/billing/grace/extend')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Extend tenant grace period',
    description:
      'Extend the grace period for a tenant whose subscription has lapsed. ' +
      'Only applicable when the tenant is currently in grace period status. ' +
      'Optionally sends a notification email to the tenant.',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'Tenant UUID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Grace period extended successfully',
    type: ExtensionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Tenant is not in grace period',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Admin authentication required',
  })
  async extendGracePeriod(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: ExtendGracePeriodDto,
    @Req() req: Request,
  ): Promise<ExtensionResponseDto> {
    const admin = req.user as AdminUser;
    return this.adminBillingService.extendGracePeriod(
      tenantId,
      dto,
      admin.adminId,
    );
  }

  // ===== Payment Method Endpoints =====

  /**
   * List tenant payment methods
   * Returns all payment methods attached to tenant's Stripe customer
   */
  @Get('tenants/:tenantId/billing/payment-methods')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.VIEWER)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'List tenant payment methods',
    description:
      "Returns all payment methods attached to the tenant's Stripe customer. " +
      'Returns empty list if tenant has no billing setup.',
  })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Payment methods retrieved',
    type: PaymentMethodListResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Admin authentication required',
  })
  async listPaymentMethods(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ): Promise<PaymentMethodListResponseDto> {
    return this.adminBillingService.listPaymentMethods(tenantId);
  }

  /**
   * Create SetupIntent for adding payment method
   * Returns client_secret for Stripe.js to collect card details
   */
  @Post('tenants/:tenantId/billing/payment-methods')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Create SetupIntent for adding payment method',
    description:
      'Returns client_secret for Stripe.js to collect card details. ' +
      'Payment method is auto-attached to customer on confirmation. ' +
      'Creates Stripe customer if tenant has none.',
  })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID', type: 'string' })
  @ApiResponse({
    status: 201,
    description: 'SetupIntent created',
    type: CreateSetupIntentResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Admin authentication required',
  })
  async createSetupIntent(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Req() req: Request,
  ): Promise<CreateSetupIntentResponseDto> {
    const admin = req.user as AdminUser;
    return this.adminBillingService.createSetupIntent(tenantId, admin.adminId);
  }

  /**
   * Set default payment method
   * Sets the specified payment method as default for future invoices
   */
  @Patch('tenants/:tenantId/billing/payment-methods/default')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Set default payment method',
    description:
      'Sets the specified payment method as default for future invoices. ' +
      'Payment method must belong to the tenant.',
  })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Default payment method set',
    type: SetDefaultPaymentMethodResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or payment method not owned by tenant',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant or payment method not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Admin authentication required',
  })
  async setDefaultPaymentMethod(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: SetDefaultPaymentMethodDto,
    @Req() req: Request,
  ): Promise<SetDefaultPaymentMethodResponseDto> {
    const admin = req.user as AdminUser;
    return this.adminBillingService.setDefaultPaymentMethod(
      tenantId,
      dto.paymentMethodId,
      admin.adminId,
    );
  }

  /**
   * Delete payment method
   * Removes a payment method from tenant's Stripe customer
   */
  @Delete('tenants/:tenantId/billing/payment-methods/:paymentMethodId')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Delete payment method',
    description:
      'Removes a payment method from the tenant. ' +
      'Cannot delete the default payment method or the only payment method.',
  })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID', type: 'string' })
  @ApiParam({
    name: 'paymentMethodId',
    description: 'Stripe payment method ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment method deleted',
    type: DeletePaymentMethodResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete default or only payment method',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant or payment method not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Admin authentication required',
  })
  async deletePaymentMethod(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('paymentMethodId') paymentMethodId: string,
    @Req() req: Request,
  ): Promise<DeletePaymentMethodResponseDto> {
    const admin = req.user as AdminUser;
    return this.adminBillingService.deletePaymentMethod(
      tenantId,
      paymentMethodId,
      admin.adminId,
    );
  }

  /**
   * Extract client IP from request, handling proxies
   */
  private getClientIp(req: Request, defaultIp: string): string {
    // Check for forwarded headers (when behind proxy/load balancer)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded.split(',')[0];
      return ips.trim();
    }

    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    return defaultIp || req.ip || '0.0.0.0';
  }

  private getExternalDeviceId(req: Request): string | undefined {
    const header = req.headers['x-device-id'];
    if (typeof header === 'string' && header.length > 0) {
      return header.slice(0, 128);
    }
    return undefined;
  }
}
