// Nebula DNS - Invitations Controller
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import {
  CreateInvitationDto,
  BulkInviteDto,
  AcceptInvitationDto,
} from './dto/invitation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';
import { CurrentUser } from '@/common/decorators/user.decorator';

@ApiTags('invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  // ==================== PUBLIC ENDPOINTS ====================

  @Get('info')
  @ApiOperation({
    summary: 'Get invitation details by token',
    description:
      'Retrieves invitation details using the token from the invitation email. No authentication required. Used to display invitation details on the accept page.',
  })
  @ApiQuery({
    name: 'token',
    description: 'Invitation token from email link',
    type: 'string',
  })
  @ApiResponse({ status: 200, description: 'Invitation details retrieved' })
  @ApiResponse({
    status: 404,
    description: 'Invalid or expired invitation token',
  })
  async getInvitationInfo(@Query('token') token: string) {
    const info = await this.invitationsService.findByToken(token);
    return { data: info };
  }

  @Post('accept')
  @ApiOperation({
    summary: 'Accept invitation and create account',
    description:
      'Accepts an invitation and creates a new user account. The invitation token is consumed and cannot be reused.',
  })
  @ApiResponse({ status: 201, description: 'Account created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid invitation data or password requirements not met',
  })
  @ApiResponse({
    status: 404,
    description: 'Invalid or expired invitation token',
  })
  async accept(@Body() dto: AcceptInvitationDto) {
    const { user, tenant } = await this.invitationsService.accept(dto);
    return {
      success: true,
      message: `Welcome to ${tenant.name}! You can now log in with your email and password.`,
      data: {
        tenantSlug: tenant.slug,
        email: user.email,
      },
    };
  }

  // ==================== ADMIN ENDPOINTS ====================

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create and send invitation',
    description:
      'Creates a new invitation and sends an email to the specified address. The invitation will expire after 7 days.',
  })
  @ApiResponse({ status: 201, description: 'Invitation created and sent' })
  @ApiResponse({
    status: 400,
    description: 'Invalid invitation data or email already exists',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateInvitationDto,
  ) {
    const { invitation, sent } = await this.invitationsService.create(
      tenantId,
      user.id,
      dto,
    );
    return {
      data: invitation,
      message: sent
        ? 'Invitation sent successfully'
        : 'Invitation created but email could not be sent',
    };
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send bulk invitations',
    description:
      'Creates and sends multiple invitations at once. Returns a list of successful and failed invitations.',
  })
  @ApiResponse({ status: 201, description: 'Bulk invitations processed' })
  @ApiResponse({ status: 400, description: 'Invalid bulk invitation data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async bulkInvite(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: BulkInviteDto,
  ) {
    const result = await this.invitationsService.bulkInvite(
      tenantId,
      user.id,
      dto.invitations,
    );
    return {
      data: result,
      message: `${result.successful.length} invitations sent, ${result.failed.length} failed`,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all invitations',
    description:
      'Returns all invitations for the current tenant including pending, accepted, and expired.',
  })
  @ApiResponse({
    status: 200,
    description: 'Invitations retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async findAll(@CurrentTenant() tenantId: string) {
    const invitations = await this.invitationsService.findAll(tenantId);
    return { data: invitations };
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List pending invitations',
    description:
      'Returns only pending invitations that have not been accepted or expired.',
  })
  @ApiResponse({
    status: 200,
    description: 'Pending invitations retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async findPending(@CurrentTenant() tenantId: string) {
    const invitations = await this.invitationsService.findPending(tenantId);
    return { data: invitations };
  }

  @Post(':id/resend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Resend invitation email',
    description:
      'Resends the invitation email to the original recipient. The expiration is not extended.',
  })
  @ApiParam({ name: 'id', description: 'Invitation UUID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Invitation email resent' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Invitation not found or already accepted',
  })
  async resend(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    const { sent } = await this.invitationsService.resend(
      tenantId,
      id,
      user.id,
    );
    return {
      success: true,
      message: sent
        ? 'Invitation resent successfully'
        : 'Failed to resend invitation email',
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Revoke invitation',
    description:
      'Revokes a pending invitation. The token will no longer be valid for account creation.',
  })
  @ApiParam({ name: 'id', description: 'Invitation UUID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Invitation revoked successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async revoke(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.invitationsService.revoke(tenantId, id);
    return { success: true, message: 'Invitation revoked' };
  }
}
