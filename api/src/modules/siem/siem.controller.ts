// Nebula DNS - SIEM Controller
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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SiemService } from './siem.service';
import {
  CreateSplunkIntegrationDto,
  CreateElasticIntegrationDto,
  CreateSentinelIntegrationDto,
  CreateSyslogIntegrationDto,
  UpdateSiemIntegrationDto,
} from './dto/siem.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';

@ApiTags('siem')
@ApiBearerAuth()
@Controller('siem')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'owner')
export class SiemController {
  constructor(private readonly siemService: SiemService) {}

  // ==================== CREATE INTEGRATIONS ====================

  @Post('splunk')
  @ApiOperation({
    summary: 'Create Splunk integration',
    description:
      'Creates a new Splunk HEC (HTTP Event Collector) integration for forwarding DNS logs.',
  })
  @ApiResponse({ status: 201, description: 'Splunk integration created' })
  @ApiResponse({ status: 400, description: 'Invalid configuration' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async createSplunk(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateSplunkIntegrationDto,
  ) {
    const integration = await this.siemService.createSplunk(tenantId, dto);
    return {
      data: integration,
      message: 'Splunk integration created successfully',
    };
  }

  @Post('elastic')
  @ApiOperation({
    summary: 'Create Elasticsearch integration',
    description:
      'Creates a new Elasticsearch integration for forwarding DNS logs to an ELK stack.',
  })
  @ApiResponse({
    status: 201,
    description: 'Elasticsearch integration created',
  })
  @ApiResponse({ status: 400, description: 'Invalid configuration' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async createElastic(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateElasticIntegrationDto,
  ) {
    const integration = await this.siemService.createElastic(tenantId, dto);
    return {
      data: integration,
      message: 'Elasticsearch integration created successfully',
    };
  }

  @Post('sentinel')
  @ApiOperation({
    summary: 'Create Microsoft Sentinel integration',
    description:
      'Creates a new Microsoft Sentinel integration for forwarding DNS logs to Azure.',
  })
  @ApiResponse({ status: 201, description: 'Sentinel integration created' })
  @ApiResponse({ status: 400, description: 'Invalid configuration' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async createSentinel(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateSentinelIntegrationDto,
  ) {
    const integration = await this.siemService.createSentinel(tenantId, dto);
    return {
      data: integration,
      message: 'Microsoft Sentinel integration created successfully',
    };
  }

  @Post('syslog')
  @ApiOperation({
    summary: 'Create Syslog integration',
    description:
      'Creates a new Syslog integration for forwarding DNS logs via UDP/TCP syslog protocol.',
  })
  @ApiResponse({ status: 201, description: 'Syslog integration created' })
  @ApiResponse({ status: 400, description: 'Invalid configuration' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async createSyslog(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateSyslogIntegrationDto,
  ) {
    const integration = await this.siemService.createSyslog(tenantId, dto);
    return {
      data: integration,
      message: 'Syslog integration created successfully',
    };
  }

  // ==================== COMMON OPERATIONS ====================

  @Get()
  @ApiOperation({
    summary: 'List all SIEM integrations',
    description:
      'Returns all configured SIEM integrations for the current tenant.',
  })
  @ApiResponse({
    status: 200,
    description: 'Integrations retrieved successfully',
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
    const integrations = await this.siemService.findAll(tenantId);
    return { data: integrations };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get SIEM integration by ID',
    description:
      'Returns detailed configuration for a specific SIEM integration.',
  })
  @ApiParam({ name: 'id', description: 'Integration UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Integration retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const integration = await this.siemService.findOne(tenantId, id);
    return { data: integration };
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update SIEM integration',
    description: 'Updates configuration for an existing SIEM integration.',
  })
  @ApiParam({ name: 'id', description: 'Integration UUID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Integration updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid configuration' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSiemIntegrationDto,
  ) {
    const integration = await this.siemService.update(tenantId, id, dto);
    return { data: integration };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete SIEM integration',
    description:
      'Permanently deletes a SIEM integration. Log forwarding will stop immediately.',
  })
  @ApiParam({ name: 'id', description: 'Integration UUID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Integration deleted successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.siemService.delete(tenantId, id);
    return { success: true };
  }

  @Post(':id/enable')
  @ApiOperation({
    summary: 'Enable SIEM integration',
    description:
      'Enables a disabled SIEM integration. Log forwarding will resume.',
  })
  @ApiParam({ name: 'id', description: 'Integration UUID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Integration enabled' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async enable(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const integration = await this.siemService.enable(tenantId, id);
    return { data: integration, message: 'Integration enabled' };
  }

  @Post(':id/disable')
  @ApiOperation({
    summary: 'Disable SIEM integration',
    description:
      'Disables a SIEM integration without deleting it. Log forwarding will pause.',
  })
  @ApiParam({ name: 'id', description: 'Integration UUID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Integration disabled' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async disable(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const integration = await this.siemService.disable(tenantId, id);
    return { data: integration, message: 'Integration disabled' };
  }

  @Post(':id/test')
  @ApiOperation({
    summary: 'Test SIEM integration',
    description:
      'Sends a test event to verify the SIEM integration is working correctly.',
  })
  @ApiParam({ name: 'id', description: 'Integration UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Test completed - check result for success/failure',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async test(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const result = await this.siemService.test(tenantId, id);
    return { data: result };
  }
}
