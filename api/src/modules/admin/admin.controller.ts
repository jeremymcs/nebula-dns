// Nebula DNS - Admin Authentication Controller
// Admin login, logout, profile, and session management endpoints
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
  Req,
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
import { Request } from 'express';

import { AdminService, AdminLoginContext } from './admin.service';
import { AdminHealthService } from './admin-health.service';
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
import { AdminAuthGuard } from './guards/admin-auth.guard';
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
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adminHealthService: AdminHealthService,
  ) {}

  /**
   * Admin login
   * Authenticates admin credentials and returns JWT token
   */
  @Post('login')
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
    };
    return this.adminService.login(loginDto, context);
  }

  /**
   * Search tenants
   * Auto-detects query type (UUID, email, or name)
   */
  @Get('tenants/search')
  @UseGuards(AdminAuthGuard)
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
   * Create new MSP tenant
   * Creates MSP account with initial admin user and sends welcome email
   */
  @Post('msp/tenants')
  @UseGuards(AdminAuthGuard)
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
  @UseGuards(AdminAuthGuard)
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
  @UseGuards(AdminAuthGuard)
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
  @UseGuards(AdminAuthGuard)
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
  @UseGuards(AdminAuthGuard)
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
    @Req() req: Request,
    @Ip() ip: string,
  ): Promise<StartImpersonationResponseDto> {
    const adminUser = req.user as AdminUser;
    return this.adminService.startImpersonation(
      adminUser,
      tenantId,
      this.getClientIp(req, ip),
    );
  }

  /**
   * Admin logout
   * Blacklists the current token
   */
  @Post('logout')
  @UseGuards(AdminAuthGuard)
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
    await this.adminService.logout(user.adminId, user.jti);
    return { message: 'Logged out successfully' };
  }

  /**
   * Get current admin profile
   * Returns admin information from the JWT
   */
  @Get('me')
  @UseGuards(AdminAuthGuard)
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
      };
    }

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      status: admin.status,
      lastLoginAt: admin.lastLoginAt,
      mfaVerified: user.mfaVerified,
    };
  }

  /**
   * Revoke all other sessions
   * Blacklists all tokens except the current one
   */
  @Post('sessions/revoke-all')
  @UseGuards(AdminAuthGuard)
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
  @UseGuards(AdminAuthGuard)
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
  @UseGuards(AdminAuthGuard)
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
  @UseGuards(AdminAuthGuard)
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
}
