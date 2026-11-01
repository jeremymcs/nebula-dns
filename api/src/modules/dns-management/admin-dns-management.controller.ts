// Nebula DNS - Admin DNS Management Controller
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { DnsManagementService } from './dns-management.service';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { AdminRolesGuard } from '../admin/guards/admin-roles.guard';
import { AdminRoles } from '../admin/decorators/admin-roles.decorator';
import { AdminRole } from '../admin/enums/admin-role.enum';
import {
  AssignZoneDto,
  AdminZoneListItemDto,
  CreatePlatformZoneDto,
  PlatformConnectionResponseDto,
  RevokePlatformConnectionDto,
  RotatePlatformConnectionDto,
  SetPlatformConnectionDto,
  TenantZoneResponseDto,
  UpdateZonePermissionsDto,
} from './dto/dns-management.dto';

interface AdminRequestUser {
  adminId: string;
}

@ApiTags('Admin DNS Management')
@Controller('admin/dns-management')
@UseGuards(AdminAuthGuard, AdminRolesGuard)
export class AdminDnsManagementController {
  constructor(private readonly dnsManagementService: DnsManagementService) {}

  private adminId(req: Request): string {
    return (req.user as AdminRequestUser).adminId;
  }

  @Get('connection')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.VIEWER)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Platform Cloudflare connection status (no secret)',
  })
  getConnection(): Promise<PlatformConnectionResponseDto | null> {
    return this.dnsManagementService.getPlatformConnectionStatus();
  }

  @Post('connection')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({ summary: 'Set or replace platform Cloudflare token' })
  setConnection(
    @Body() dto: SetPlatformConnectionDto,
    @Req() req: Request,
  ): Promise<PlatformConnectionResponseDto> {
    return this.dnsManagementService.setPlatformConnection({
      label: dto.label,
      apiToken: dto.apiToken,
      adminId: this.adminId(req),
      ipAddress: req.ip,
    });
  }

  @Post('connection/verify')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiBearerAuth('admin-jwt')
  verifyConnection(
    @Req() req: Request,
  ): Promise<PlatformConnectionResponseDto> {
    return this.dnsManagementService.verifyPlatformConnection(
      this.adminId(req),
    );
  }

  @Post('connection/rotate')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiBearerAuth('admin-jwt')
  rotateConnection(
    @Body() dto: RotatePlatformConnectionDto,
    @Req() req: Request,
  ): Promise<PlatformConnectionResponseDto> {
    return this.dnsManagementService.rotatePlatformConnection({
      apiToken: dto.apiToken,
      adminId: this.adminId(req),
      ipAddress: req.ip,
    });
  }

  @Delete('connection')
  @AdminRoles(AdminRole.SUPER_ADMIN)
  @ApiBearerAuth('admin-jwt')
  revokeConnection(
    @Body() dto: RevokePlatformConnectionDto,
    @Req() req: Request,
  ): Promise<{ success: true }> {
    return this.dnsManagementService
      .revokePlatformConnection({
        confirm: dto.confirm,
        adminId: this.adminId(req),
      })
      .then(() => ({ success: true }));
  }

  @Get('zones')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.VIEWER)
  @ApiBearerAuth('admin-jwt')
  listZones(): Promise<AdminZoneListItemDto[]> {
    return this.dnsManagementService.listAdminZones();
  }

  @Post('zones/sync')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiBearerAuth('admin-jwt')
  syncZones(@Req() req: Request): Promise<AdminZoneListItemDto[]> {
    return this.dnsManagementService.syncPlatformZones(this.adminId(req));
  }

  @Post('zones')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiBearerAuth('admin-jwt')
  createZone(@Body() dto: CreatePlatformZoneDto, @Req() req: Request) {
    return this.dnsManagementService.createPlatformZone({
      dto,
      adminId: this.adminId(req),
      ipAddress: req.ip,
    });
  }

  @Post('zones/:providerZoneId/assign')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiBearerAuth('admin-jwt')
  assignZone(
    @Param('providerZoneId') providerZoneId: string,
    @Body() dto: AssignZoneDto,
    @Req() req: Request,
  ): Promise<TenantZoneResponseDto> {
    return this.dnsManagementService.assignZone({
      providerZoneId,
      dto,
      adminId: this.adminId(req),
      ipAddress: req.ip,
    });
  }

  @Post('zones/:assignmentId/unassign')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiBearerAuth('admin-jwt')
  unassignZone(
    @Param('assignmentId') assignmentId: string,
    @Req() req: Request,
  ): Promise<{ success: true }> {
    return this.dnsManagementService
      .unassignZone({
        assignmentId,
        adminId: this.adminId(req),
        ipAddress: req.ip,
      })
      .then(() => ({ success: true }));
  }

  @Patch('zones/:assignmentId/permissions')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiBearerAuth('admin-jwt')
  updatePermissions(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateZonePermissionsDto,
    @Req() req: Request,
  ): Promise<TenantZoneResponseDto> {
    return this.dnsManagementService.updateZonePermissions(
      assignmentId,
      dto,
      this.adminId(req),
    );
  }
}
