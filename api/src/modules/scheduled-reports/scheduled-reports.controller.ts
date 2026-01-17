// Nebula DNS - Scheduled Reports Controller
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Controller,
  Get,
  Post,
  Patch,
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
import { ScheduledReportsService } from './scheduled-reports.service';
import {
  CreateScheduledReportDto,
  UpdateScheduledReportDto,
} from './dto/scheduled-report.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';
import { CurrentUser } from '@/common/decorators/user.decorator';

@ApiTags('scheduled-reports')
@ApiBearerAuth()
@Controller('scheduled-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScheduledReportsController {
  constructor(private readonly reportsService: ScheduledReportsService) {}

  @Post()
  @Roles('admin', 'owner')
  @ApiOperation({
    summary: 'Create scheduled report',
    description:
      'Creates a new scheduled report that will be automatically generated and emailed on the specified schedule.',
  })
  @ApiResponse({
    status: 201,
    description: 'Scheduled report created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid report configuration' })
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
    @Body() dto: CreateScheduledReportDto,
  ) {
    const report = await this.reportsService.create(tenantId, user.id, dto);
    return { data: report };
  }

  @Get()
  @ApiOperation({
    summary: 'List scheduled reports',
    description: 'Returns all scheduled reports for the current tenant.',
  })
  @ApiResponse({
    status: 200,
    description: 'Scheduled reports retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async findAll(@CurrentTenant() tenantId: string) {
    const reports = await this.reportsService.findAll(tenantId);
    return { data: reports };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get scheduled report by ID',
    description:
      'Returns detailed information about a specific scheduled report.',
  })
  @ApiParam({
    name: 'id',
    description: 'Scheduled report UUID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Scheduled report retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'Scheduled report not found' })
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const report = await this.reportsService.findOne(tenantId, id);
    return { data: report };
  }

  @Patch(':id')
  @Roles('admin', 'owner')
  @ApiOperation({
    summary: 'Update scheduled report',
    description: 'Updates an existing scheduled report configuration.',
  })
  @ApiParam({
    name: 'id',
    description: 'Scheduled report UUID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Scheduled report updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid report configuration' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Scheduled report not found' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateScheduledReportDto,
  ) {
    const report = await this.reportsService.update(tenantId, id, dto);
    return { data: report };
  }

  @Delete(':id')
  @Roles('admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete scheduled report',
    description:
      'Permanently deletes a scheduled report. The report will no longer be generated.',
  })
  @ApiParam({
    name: 'id',
    description: 'Scheduled report UUID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Scheduled report deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Scheduled report not found' })
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.reportsService.delete(tenantId, id);
    return { success: true };
  }

  @Get(':id/history')
  @ApiOperation({
    summary: 'Get report execution history',
    description:
      'Returns the execution history for a scheduled report, including past runs and their status.',
  })
  @ApiParam({
    name: 'id',
    description: 'Scheduled report UUID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Report history retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'Scheduled report not found' })
  async getHistory(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const history = await this.reportsService.getHistory(tenantId, id);
    return { data: history };
  }

  @Post(':id/run')
  @Roles('admin', 'owner')
  @ApiOperation({
    summary: 'Run report immediately',
    description:
      'Triggers immediate execution of a scheduled report outside of its normal schedule.',
  })
  @ApiParam({
    name: 'id',
    description: 'Scheduled report UUID',
    type: 'string',
  })
  @ApiResponse({ status: 200, description: 'Report generation started' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Scheduled report not found' })
  async runNow(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const result = await this.reportsService.runReportNow(tenantId, id);
    return {
      message: 'Report generation started',
      data: result,
    };
  }
}
