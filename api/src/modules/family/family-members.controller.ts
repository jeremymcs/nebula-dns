// Nebula DNS - Family Members Controller
// Handles family member invitation and management endpoints for Home tier
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { FamilyMembersService } from './family-members.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@/common/guards/roles.guard';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';
import { CurrentUser } from '@/common/decorators/user.decorator';
import {
  CreateFamilyInvitationDto,
  AcceptFamilyInvitationDto,
  FamilyInvitationResponseDto,
  FamilyInvitationInfoDto,
  FamilyMemberUserDto,
  FamilyOverviewDto,
} from './dto/family-invitation.dto';

@ApiTags('family')
@Controller('family')
export class FamilyMembersController {
  constructor(private readonly familyMembersService: FamilyMembersService) {}

  // ====================================================
  // Protected endpoints (require authentication)
  // ====================================================

  @Get('overview')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  @ApiOperation({
    summary: 'Get family overview with members and pending invitations',
  })
  @ApiResponse({
    status: 200,
    description: 'Family overview retrieved successfully',
    type: FamilyOverviewDto,
  })
  async getOverview(
    @CurrentTenant() tenantId: string,
  ): Promise<{ data: FamilyOverviewDto }> {
    const overview =
      await this.familyMembersService.getFamilyOverview(tenantId);
    return { data: overview };
  }

  @Get('users')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  @ApiOperation({ summary: 'Get all family members (users with member role)' })
  @ApiResponse({
    status: 200,
    description: 'Family members retrieved successfully',
    type: [FamilyMemberUserDto],
  })
  async getMembers(
    @CurrentTenant() tenantId: string,
  ): Promise<{ data: FamilyMemberUserDto[]; total: number }> {
    const members = await this.familyMembersService.getMembers(tenantId);
    return { data: members, total: members.length };
  }

  @Get('invitations')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Get all pending family invitations' })
  @ApiResponse({
    status: 200,
    description: 'Pending invitations retrieved successfully',
    type: [FamilyInvitationResponseDto],
  })
  async getPendingInvitations(
    @CurrentTenant() tenantId: string,
  ): Promise<{ data: FamilyInvitationResponseDto[]; total: number }> {
    const invitations =
      await this.familyMembersService.getPendingInvitations(tenantId);
    return { data: invitations, total: invitations.length };
  }

  @Post('invitations')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Create a family member invitation' })
  @ApiResponse({
    status: 201,
    description: 'Invitation created successfully',
    type: FamilyInvitationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Family member limit reached or invalid request',
  })
  @ApiResponse({
    status: 403,
    description: 'Not a Home tier account',
  })
  @ApiResponse({
    status: 409,
    description: 'User or invitation already exists',
  })
  async createInvitation(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateFamilyInvitationDto,
  ): Promise<{ data: FamilyInvitationResponseDto; sent: boolean }> {
    const { invitation, sent } =
      await this.familyMembersService.createInvitation(tenantId, userId, dto);
    return {
      data: {
        id: invitation.id,
        email: invitation.email,
        displayName: invitation.displayName,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
        invitedBy: null, // Will be populated by frontend if needed
      },
      sent,
    };
  }

  @Delete('invitations/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pending family invitation' })
  @ApiParam({ name: 'id', description: 'Invitation ID' })
  @ApiResponse({
    status: 200,
    description: 'Invitation cancelled successfully',
  })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  @ApiResponse({
    status: 400,
    description: 'Invitation is not pending',
  })
  async cancelInvitation(
    @CurrentTenant() tenantId: string,
    @Param('id') invitationId: string,
  ): Promise<{ message: string }> {
    await this.familyMembersService.cancelInvitation(tenantId, invitationId);
    return { message: 'Invitation cancelled successfully' };
  }

  @Post('invitations/:id/resend')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend a pending family invitation' })
  @ApiParam({ name: 'id', description: 'Invitation ID' })
  @ApiResponse({
    status: 200,
    description: 'Invitation resent successfully',
  })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  @ApiResponse({
    status: 400,
    description: 'Invitation is not pending',
  })
  async resendInvitation(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') invitationId: string,
  ): Promise<{ sent: boolean }> {
    return this.familyMembersService.resendInvitation(
      tenantId,
      invitationId,
      userId,
    );
  }

  @Delete('users/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a family member' })
  @ApiParam({ name: 'id', description: 'Family member user ID' })
  @ApiResponse({
    status: 200,
    description: 'Family member removed successfully',
  })
  @ApiResponse({ status: 404, description: 'Family member not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot remove owner or non-member user',
  })
  async removeMember(
    @CurrentTenant() tenantId: string,
    @Param('id') memberId: string,
  ): Promise<{ message: string }> {
    await this.familyMembersService.removeMember(tenantId, memberId);
    return { message: 'Family member removed successfully' };
  }

  // ====================================================
  // Public endpoints (no authentication required)
  // ====================================================

  @Get('invitations/info/:token')
  @ApiOperation({ summary: 'Get invitation info by token (public)' })
  @ApiParam({ name: 'token', description: 'Invitation token from email' })
  @ApiResponse({
    status: 200,
    description: 'Invitation info retrieved successfully',
    type: FamilyInvitationInfoDto,
  })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async getInvitationInfo(
    @Param('token') token: string,
  ): Promise<{ data: FamilyInvitationInfoDto }> {
    const info = await this.familyMembersService.getInvitationByToken(token);
    return { data: info };
  }

  @Post('invitations/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a family invitation (public)' })
  @ApiResponse({
    status: 200,
    description: 'Invitation accepted successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired invitation' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  @ApiResponse({ status: 409, description: 'Email already has an account' })
  async acceptInvitation(
    @Body() dto: AcceptFamilyInvitationDto,
  ): Promise<{ message: string; tenantName: string }> {
    const { tenant } = await this.familyMembersService.acceptInvitation(dto);
    return {
      message: 'Welcome to the family! You can now log in.',
      tenantName: tenant.name,
    };
  }
}
