// Nebula DNS - Admin Authentication Controller
// Admin login, logout, profile, and session management endpoints
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
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
  async revokeAllSessions(@Req() req: Request): Promise<RevokeSessionsResponseDto> {
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
