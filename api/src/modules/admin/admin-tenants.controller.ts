// Flux Shield - Admin tenant management API
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  Ip,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AdminTenantsService } from './admin-tenants.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { AdminRolesGuard } from './guards/admin-roles.guard';
import { AdminRoles } from './decorators/admin-roles.decorator';
import { AdminRole } from './enums/admin-role.enum';
import {
  AdminTenantActionResponseDto,
  AdminTenantDetailDto,
  AdminTenantListQueryDto,
  AdminTenantListResponseDto,
  MspUsageTimeSeriesResponseDto,
  UpdateTenantLimitsDto,
  UpdateTenantModulesDto,
} from './dto/admin-tenant.dto';
import { AdminUser } from './dto/admin-jwt-payload.dto';
import { MetricPeriod } from './dto/msp-detail.dto';

@ApiTags('Admin Tenants')
@Controller('admin')
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@ApiBearerAuth('admin-jwt')
export class AdminTenantsController {
  constructor(private readonly adminTenantsService: AdminTenantsService) {}

  @Get('tenants')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.VIEWER)
  @ApiOperation({ summary: 'List tenants with search and filters' })
  @ApiResponse({ status: 200, type: AdminTenantListResponseDto })
  listTenants(
    @Query() query: AdminTenantListQueryDto,
  ): Promise<AdminTenantListResponseDto> {
    return this.adminTenantsService.listTenants(query);
  }

  @Get('tenants/:id')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.VIEWER)
  @ApiOperation({ summary: 'Get tenant detail for admin console' })
  @ApiResponse({ status: 200, type: AdminTenantDetailDto })
  getTenant(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminTenantDetailDto> {
    return this.adminTenantsService.getTenantDetail(id);
  }

  @Post('tenants/:id/suspend')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiOperation({ summary: 'Suspend a tenant' })
  @ApiResponse({ status: 200, type: AdminTenantActionResponseDto })
  suspendTenant(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: AdminUser },
    @Ip() ip: string,
  ): Promise<AdminTenantActionResponseDto> {
    return this.adminTenantsService.suspendTenant(id, req.user, ip);
  }

  @Post('tenants/:id/reactivate')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiOperation({ summary: 'Reactivate a suspended tenant' })
  @ApiResponse({ status: 200, type: AdminTenantActionResponseDto })
  reactivateTenant(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: AdminUser },
    @Ip() ip: string,
  ): Promise<AdminTenantActionResponseDto> {
    return this.adminTenantsService.reactivateTenant(id, req.user, ip);
  }

  @Patch('tenants/:id/limits')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiOperation({ summary: 'Update tenant plan/limit overrides' })
  @ApiResponse({ status: 200, type: AdminTenantActionResponseDto })
  updateLimits(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantLimitsDto,
    @Req() req: Request & { user: AdminUser },
    @Ip() ip: string,
  ): Promise<AdminTenantActionResponseDto> {
    return this.adminTenantsService.updateLimits(id, dto, req.user, ip);
  }

  @Patch('tenants/:id/modules')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiOperation({ summary: 'Enable or disable product modules for a tenant' })
  @ApiResponse({ status: 200, type: AdminTenantActionResponseDto })
  updateModules(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantModulesDto,
    @Req() req: Request & { user: AdminUser },
    @Ip() ip: string,
  ): Promise<AdminTenantActionResponseDto> {
    return this.adminTenantsService.updateModules(id, dto, req.user, ip);
  }

  @Get('msp/tenants/:id/usage-timeseries')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.VIEWER)
  @ApiOperation({ summary: 'Query volume time series for an MSP and its clients' })
  @ApiResponse({ status: 200, type: MspUsageTimeSeriesResponseDto })
  getMspUsageTimeSeries(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('period') period?: MetricPeriod,
  ): Promise<MspUsageTimeSeriesResponseDto> {
    return this.adminTenantsService.getMspUsageTimeSeries(id, period || '7d');
  }
}
