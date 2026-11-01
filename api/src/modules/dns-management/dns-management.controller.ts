// Nebula DNS - DNS Management Tenant Controller
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net

import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DnsManagementService } from './dns-management.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@/common/guards/roles.guard';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';
import {
  DnsRecordResponseDto,
  TenantZoneResponseDto,
} from './dto/dns-management.dto';

@ApiTags('DNS Management')
@Controller('dns-management')
export class DnsManagementController {
  constructor(private readonly dnsManagementService: DnsManagementService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('zones')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'List DNS zones assigned to the current tenant' })
  @ApiResponse({ status: 200, type: [TenantZoneResponseDto] })
  listZones(
    @CurrentTenant() tenantId: string,
  ): Promise<TenantZoneResponseDto[]> {
    return this.dnsManagementService.listTenantZones(tenantId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('zones/:zoneId/records')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({
    summary: 'List DNS records for an assigned zone (zoneId = assignment UUID)',
  })
  @ApiResponse({ status: 200, type: [DnsRecordResponseDto] })
  @ApiResponse({ status: 404, description: 'Zone not found for tenant' })
  listRecords(
    @CurrentTenant() tenantId: string,
    @Param('zoneId') zoneId: string,
  ): Promise<DnsRecordResponseDto[]> {
    return this.dnsManagementService.listTenantRecords(tenantId, zoneId);
  }
}
