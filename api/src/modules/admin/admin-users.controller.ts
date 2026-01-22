// Nebula DNS - Admin User Management Controller
// Endpoints for managing admin users, invitations, and activity logs
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
  Req,
  Ip,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Request } from 'express';

import { AdminUsersService } from './admin-users.service';
import { AdminInvitationsService } from './admin-invitations.service';
import { AdminActivityService } from './admin-activity.service';
import {
  ListAdminsQueryDto,
  ListAdminsResponseDto,
  AdminDetailDto,
  SuspendAdminDto,
  AdminMessageResponseDto,
} from './dto/admin-user.dto';
import {
  CreateAdminInvitationDto,
  CreateAdminInvitationResponseDto,
  AcceptAdminInvitationDto,
  ListInvitationsQueryDto,
  ListInvitationsResponseDto,
} from './dto/admin-invitation.dto';
import {
  AdminActivityQueryDto,
  AdminActivityResponseDto,
} from './dto/admin-activity.dto';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { AdminRolesGuard } from './guards/admin-roles.guard';
import { AdminRoles } from './decorators/admin-roles.decorator';
import { AdminRole } from './enums/admin-role.enum';
import { AdminUser } from './dto/admin-jwt-payload.dto';

/**
 * Admin Users Controller
 *
 * Provides endpoints for managing admin users, invitations, and activity logs.
 * All routes under /api/admin/users/*
 *
 * Protected routes use AdminAuthGuard + AdminRolesGuard with SUPER_ADMIN role requirement.
 * Accept invitation endpoint is public (no authentication required).
 */
@ApiTags('Admin Users')
@Controller('admin/users')
export class AdminUsersController {
  constructor(
    private readonly adminUsersService: AdminUsersService,
    private readonly adminInvitationsService: AdminInvitationsService,
    private readonly adminActivityService: AdminActivityService,
  ) {}

  /**
   * List all admin users
   * USER-01: Super Admin can view list of all admin users with roles
   */
  @Get()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'List admin users',
    description: 'Returns paginated list of all admin users with role and status.',
  })
  @ApiResponse({ status: 200, description: 'Admin list', type: ListAdminsResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Requires super_admin role' })
  async listAdmins(@Query() query: ListAdminsQueryDto): Promise<ListAdminsResponseDto> {
    return this.adminUsersService.listAdmins(query);
  }

  /**
   * Get admin profile by ID
   * USER-05: Super Admin can view admin profile details
   */
  @Get(':id')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Get admin profile',
    description: 'Returns detailed admin profile including who invited them.',
  })
  @ApiParam({ name: 'id', description: 'Admin UUID' })
  @ApiResponse({ status: 200, description: 'Admin profile', type: AdminDetailDto })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  async getAdmin(@Param('id', ParseUUIDPipe) id: string): Promise<AdminDetailDto> {
    return this.adminUsersService.getAdminById(id);
  }

  /**
   * Extract client IP from request, handling proxies
   */
  private getClientIp(req: Request, ip: string): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
      return ips.trim();
    }
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }
    return ip || req.ip || '0.0.0.0';
  }
}
