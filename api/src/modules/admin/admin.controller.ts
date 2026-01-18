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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';

import { AdminService, AdminLoginContext } from './admin.service';
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
  StartImpersonationResponseDto,
  EndImpersonationResponseDto,
} from './dto/impersonation.dto';
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
  constructor(private readonly adminService: AdminService) {}

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
