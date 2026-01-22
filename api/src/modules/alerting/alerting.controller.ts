// Nebula DNS - Alerting Controller
// Admin API endpoints for alert configuration management
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { AlertingService } from './alerting.service';
import { AlertDispatcherService } from './alert-dispatcher.service';
import {
  CreateSlackConfigDto,
  CreatePagerDutyConfigDto,
  UpdateAlertConfigDto,
  AlertConfigResponseDto,
} from './dto/alert-config.dto';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { AdminRolesGuard } from '../admin/guards/admin-roles.guard';
import { AdminRoles } from '../admin/decorators/admin-roles.decorator';
import { AdminRole } from '../admin/enums/admin-role.enum';

/**
 * Test alert response DTO
 */
export class TestAlertResponseDto {
  success: boolean;
  message: string;
  responseTimeMs?: number;
}

/**
 * AlertingController
 *
 * Provides admin-only endpoints for managing alert configurations.
 * All routes under /api/admin/alerting/*
 *
 * Protected routes use AdminAuthGuard + AdminRolesGuard with
 * SUPER_ADMIN or ADMIN role requirement.
 */
@ApiTags('Alerting')
@Controller('admin/alerting')
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
export class AlertingController {
  constructor(
    private readonly alertingService: AlertingService,
    private readonly alertDispatcher: AlertDispatcherService,
  ) {}

  /**
   * Create Slack webhook configuration
   * ALERT-01: Slack webhook integration
   */
  @Post('slack')
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Create Slack alert configuration',
    description: 'Creates a new Slack webhook configuration for alert delivery.',
  })
  @ApiResponse({
    status: 201,
    description: 'Slack configuration created',
    type: AlertConfigResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid webhook URL format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Requires admin role' })
  async createSlack(
    @Body() dto: CreateSlackConfigDto,
  ): Promise<AlertConfigResponseDto> {
    const config = await this.alertingService.createSlack(dto);
    return {
      id: config.id,
      name: config.name,
      providerType: config.providerType,
      isEnabled: config.isEnabled,
      severityFilter: config.severityFilter,
      eventTypes: config.eventTypes,
      lastSentAt: config.lastSentAt,
      lastError: config.lastError,
      errorCount: config.errorCount,
      createdAt: config.createdAt,
    };
  }

  /**
   * Create PagerDuty configuration
   * ALERT-02: PagerDuty Events API v2 integration
   */
  @Post('pagerduty')
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Create PagerDuty alert configuration',
    description:
      'Creates a new PagerDuty configuration using Events API v2 routing key.',
  })
  @ApiResponse({
    status: 201,
    description: 'PagerDuty configuration created',
    type: AlertConfigResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid routing key (must be 32 characters)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Requires admin role' })
  async createPagerDuty(
    @Body() dto: CreatePagerDutyConfigDto,
  ): Promise<AlertConfigResponseDto> {
    const config = await this.alertingService.createPagerDuty(dto);
    return {
      id: config.id,
      name: config.name,
      providerType: config.providerType,
      isEnabled: config.isEnabled,
      severityFilter: config.severityFilter,
      eventTypes: config.eventTypes,
      lastSentAt: config.lastSentAt,
      lastError: config.lastError,
      errorCount: config.errorCount,
      createdAt: config.createdAt,
    };
  }

  /**
   * List all alert configurations
   */
  @Get()
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'List alert configurations',
    description: 'Returns all alert configurations with delivery status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Alert configurations list',
    type: [AlertConfigResponseDto],
  })
  async listAll(): Promise<AlertConfigResponseDto[]> {
    return this.alertingService.findAll();
  }

  /**
   * Get single alert configuration
   */
  @Get(':id')
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Get alert configuration',
    description: 'Returns a single alert configuration by ID.',
  })
  @ApiParam({ name: 'id', description: 'Configuration UUID' })
  @ApiResponse({
    status: 200,
    description: 'Alert configuration',
    type: AlertConfigResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async getOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AlertConfigResponseDto> {
    const config = await this.alertingService.findOne(id);
    return {
      id: config.id,
      name: config.name,
      providerType: config.providerType,
      isEnabled: config.isEnabled,
      severityFilter: config.severityFilter,
      eventTypes: config.eventTypes,
      lastSentAt: config.lastSentAt,
      lastError: config.lastError,
      errorCount: config.errorCount,
      createdAt: config.createdAt,
    };
  }

  /**
   * Update alert configuration
   */
  @Patch(':id')
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Update alert configuration',
    description: 'Updates alert configuration settings (name, filters, enabled).',
  })
  @ApiParam({ name: 'id', description: 'Configuration UUID' })
  @ApiResponse({
    status: 200,
    description: 'Configuration updated',
    type: AlertConfigResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAlertConfigDto,
  ): Promise<AlertConfigResponseDto> {
    const config = await this.alertingService.update(id, dto);
    return {
      id: config.id,
      name: config.name,
      providerType: config.providerType,
      isEnabled: config.isEnabled,
      severityFilter: config.severityFilter,
      eventTypes: config.eventTypes,
      lastSentAt: config.lastSentAt,
      lastError: config.lastError,
      errorCount: config.errorCount,
      createdAt: config.createdAt,
    };
  }

  /**
   * Enable alert configuration
   * ALERT-08: Enable/disable endpoints
   */
  @Post(':id/enable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Enable alert configuration',
    description: 'Enables alert configuration and resets error count.',
  })
  @ApiParam({ name: 'id', description: 'Configuration UUID' })
  @ApiResponse({ status: 200, description: 'Configuration enabled' })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async enable(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.alertingService.enable(id);
    return { message: 'Alert configuration enabled' };
  }

  /**
   * Disable alert configuration
   * ALERT-08: Enable/disable endpoints
   */
  @Post(':id/disable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Disable alert configuration',
    description: 'Disables alert configuration (stops sending alerts).',
  })
  @ApiParam({ name: 'id', description: 'Configuration UUID' })
  @ApiResponse({ status: 200, description: 'Configuration disabled' })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async disable(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.alertingService.disable(id);
    return { message: 'Alert configuration disabled' };
  }

  /**
   * Test alert configuration
   * ALERT-09: Test endpoint sends verification alert
   */
  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Test alert configuration',
    description:
      'Sends a test alert to verify configuration. For PagerDuty, creates and immediately resolves a test incident.',
  })
  @ApiParam({ name: 'id', description: 'Configuration UUID' })
  @ApiResponse({
    status: 200,
    description: 'Test result',
    type: TestAlertResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async test(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TestAlertResponseDto> {
    return this.alertDispatcher.testConfig(id);
  }

  /**
   * Delete alert configuration
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Delete alert configuration',
    description: 'Permanently deletes an alert configuration.',
  })
  @ApiParam({ name: 'id', description: 'Configuration UUID' })
  @ApiResponse({ status: 204, description: 'Configuration deleted' })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.alertingService.delete(id);
  }
}
