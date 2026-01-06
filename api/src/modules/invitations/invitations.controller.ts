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

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  // ==================== PUBLIC ENDPOINTS ====================

  // Get invitation info by token (for accept page)
  @Get('info')
  async getInvitationInfo(@Query('token') token: string) {
    const info = await this.invitationsService.findByToken(token);
    return { data: info };
  }

  // Accept invitation (create account)
  @Post('accept')
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
  async findAll(@CurrentTenant() tenantId: string) {
    const invitations = await this.invitationsService.findAll(tenantId);
    return { data: invitations };
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  async findPending(@CurrentTenant() tenantId: string) {
    const invitations = await this.invitationsService.findPending(tenantId);
    return { data: invitations };
  }

  @Post(':id/resend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
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
  async revoke(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.invitationsService.revoke(tenantId, id);
    return { success: true, message: 'Invitation revoked' };
  }
}
