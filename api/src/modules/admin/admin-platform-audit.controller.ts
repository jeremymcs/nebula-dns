// Flux Shield - Platform audit log API
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminPlatformAuditService } from './admin-platform-audit.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { AdminRolesGuard } from './guards/admin-roles.guard';
import { AdminRoles } from './decorators/admin-roles.decorator';
import { AdminRole } from './enums/admin-role.enum';
import {
  AdminPlatformAuditQueryDto,
  AdminPlatformAuditResponseDto,
} from './dto/admin-platform-audit.dto';

@ApiTags('Admin Audit')
@Controller('admin/audit')
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@ApiBearerAuth('admin-jwt')
export class AdminPlatformAuditController {
  constructor(
    private readonly adminPlatformAuditService: AdminPlatformAuditService,
  ) {}

  @Get('logs')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.VIEWER)
  @ApiOperation({
    summary: 'Platform audit log viewer (admin activity + tenant audit logs)',
  })
  @ApiResponse({ status: 200, type: AdminPlatformAuditResponseDto })
  getAuditLogs(
    @Query() query: AdminPlatformAuditQueryDto,
  ): Promise<AdminPlatformAuditResponseDto> {
    return this.adminPlatformAuditService.queryLogs(query);
  }
}
