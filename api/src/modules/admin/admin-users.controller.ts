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
   * Suspend an admin
   * USER-06: Super Admin can suspend admin (blocks login)
   */
  @Patch(':id/suspend')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Suspend admin',
    description: 'Suspends admin account, blocking login. Cannot suspend super_admin.',
  })
  @ApiParam({ name: 'id', description: 'Admin UUID to suspend' })
  @ApiResponse({ status: 200, description: 'Admin suspended' })
  @ApiResponse({ status: 400, description: 'Already suspended' })
  @ApiResponse({ status: 403, description: 'Cannot suspend self or super_admin' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  async suspendAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendAdminDto,
    @Req() req: Request,
    @Ip() ip: string,
  ): Promise<AdminMessageResponseDto> {
    const admin = req.user as AdminUser;
    await this.adminUsersService.suspendAdmin(admin.adminId, id, dto, this.getClientIp(req, ip));
    return { message: 'Admin suspended successfully' };
  }

  /**
   * Reactivate a suspended admin
   * USER-07: Super Admin can reactivate suspended admin
   */
  @Patch(':id/reactivate')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Reactivate admin',
    description: 'Reactivates a suspended admin account.',
  })
  @ApiParam({ name: 'id', description: 'Admin UUID to reactivate' })
  @ApiResponse({ status: 200, description: 'Admin reactivated' })
  @ApiResponse({ status: 400, description: 'Admin not suspended' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  async reactivateAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
    @Ip() ip: string,
  ): Promise<AdminMessageResponseDto> {
    const admin = req.user as AdminUser;
    await this.adminUsersService.reactivateAdmin(admin.adminId, id, this.getClientIp(req, ip));
    return { message: 'Admin reactivated successfully' };
  }

  /**
   * Reset admin's MFA
   * USER-08: Super Admin can reset another admin's MFA
   * USER-09: MFA reset sends notification email to target admin
   */
  @Post(':id/mfa/reset')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Reset admin MFA',
    description: 'Resets MFA for specified admin. Invalidates sessions and sends notification.',
  })
  @ApiParam({ name: 'id', description: 'Admin UUID' })
  @ApiResponse({ status: 200, description: 'MFA reset' })
  @ApiResponse({ status: 403, description: 'Cannot reset own MFA' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  async resetMfa(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
    @Ip() ip: string,
  ): Promise<AdminMessageResponseDto> {
    const admin = req.user as AdminUser;
    await this.adminUsersService.resetAdminMfa(admin.adminId, id, this.getClientIp(req, ip));
    return { message: 'MFA reset successfully. Admin will need to set up MFA on next login.' };
  }

  /**
   * Send admin invitation
   * USER-02: Super Admin can invite new admin via email with role assignment
   */
  @Post('invite')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Invite new admin',
    description: 'Sends invitation email to create new admin account with specified role.',
  })
  @ApiResponse({ status: 201, description: 'Invitation sent', type: CreateAdminInvitationResponseDto })
  @ApiResponse({ status: 409, description: 'Email already exists or has pending invite' })
  async sendInvitation(
    @Body() dto: CreateAdminInvitationDto,
    @Req() req: Request,
    @Ip() ip: string,
  ): Promise<CreateAdminInvitationResponseDto> {
    const admin = req.user as AdminUser;
    return this.adminInvitationsService.createInvitation(admin.adminId, dto, this.getClientIp(req, ip));
  }

  /**
   * Accept admin invitation (PUBLIC - no auth)
   * USER-04: Invited admin can accept and set password/MFA
   */
  @Post('invite/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Accept admin invitation',
    description: 'Accepts invitation using token from email. Creates admin account.',
  })
  @ApiResponse({ status: 200, description: 'Account created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid/expired token or invitation already used' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async acceptInvitation(@Body() dto: AcceptAdminInvitationDto): Promise<AdminMessageResponseDto> {
    await this.adminInvitationsService.acceptInvitation(dto);
    return { message: 'Admin account created successfully. Please log in and set up MFA.' };
  }

  /**
   * List pending invitations
   * USER-11: Super Admin can view pending invites with expiry status
   */
  @Get('invites')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'List invitations',
    description: 'Returns paginated list of admin invitations with status.',
  })
  @ApiResponse({ status: 200, description: 'Invitation list', type: ListInvitationsResponseDto })
  async listInvitations(@Query() query: ListInvitationsQueryDto): Promise<ListInvitationsResponseDto> {
    return this.adminInvitationsService.listInvitations(query);
  }

  /**
   * Revoke pending invitation
   * USER-12: Super Admin can revoke pending invites
   */
  @Delete('invites/:id')
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Revoke invitation',
    description: 'Revokes a pending invitation. Cannot revoke already accepted invitations.',
  })
  @ApiParam({ name: 'id', description: 'Invitation UUID' })
  @ApiResponse({ status: 200, description: 'Invitation revoked' })
  @ApiResponse({ status: 400, description: 'Invitation not pending' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async revokeInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
    @Ip() ip: string,
  ): Promise<AdminMessageResponseDto> {
    const admin = req.user as AdminUser;
    await this.adminInvitationsService.revokeInvitation(admin.adminId, id, this.getClientIp(req, ip));
    return { message: 'Invitation revoked successfully' };
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
