/**
 * Nebula DNS - MSP Controller
 * Provides endpoints for MSP users to manage their client organizations and templates
 * Including versioning (US-034), rollback (US-035), and client application (US-036)
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { tryGetClientIp } from '@/common/http/client-ip';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CurrentUser,
  CurrentTenant,
} from '@/common/decorators/tenant.decorator';
import {
  MspService,
  ClientOrganization,
  CreateClientDto,
  UpdateClientDto,
} from './msp.service';
import { MspTemplatesService } from './msp-templates.service';
import {
  CreateMspTemplateDto,
  UpdateMspTemplateDto,
  DeployTemplateDto,
  MspTemplateResponseDto,
  DeploymentResultDto,
} from './dto/template.dto';
import {
  TemplateVersionResponseDto,
  TemplateVersionListResponseDto,
  RollbackTemplateDto,
  RollbackResponseDto,
  ApplyTemplateToClientsDto,
  ApplyJobResponseDto,
  ClientsUsingTemplateResponseDto,
  ConfigDiffResponseDto,
  RetryApplicationDto,
} from './dto/template-version.dto';
import {
  ContextSwitchResponseDto,
  SwitchBackResponseDto,
} from './dto/context-switch.dto';
import { MspTemplateDeployment } from './entities/msp-template.entity';

@ApiTags('msp')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('msp')
export class MspController {
  constructor(
    private readonly mspService: MspService,
    private readonly mspTemplatesService: MspTemplatesService,
  ) {}

  // ============================================
  // Client Organization Endpoints
  // ============================================

  @Get('clients')
  @ApiOperation({ summary: 'Get all client organizations for MSP user' })
  @ApiResponse({ status: 200, description: 'Client organizations retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not an MSP user' })
  async getClients(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ): Promise<{ clients: ClientOrganization[] }> {
    const clients = await this.mspService.getClientOrganizations(
      user.id,
      tenantId,
    );
    return { clients };
  }

  @Post('clients')
  @ApiOperation({ summary: 'Create a new client organization' })
  @ApiResponse({ status: 201, description: 'Client organization created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not an MSP user' })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  async createClient(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateClientDto,
  ): Promise<ClientOrganization> {
    return this.mspService.createClient(user.id, tenantId, dto);
  }

  @Get('clients/:id')
  @ApiOperation({ summary: 'Get a client organization by ID' })
  @ApiResponse({ status: 200, description: 'Client organization retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not an MSP user' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  async getClient(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Param('id') clientId: string,
  ): Promise<ClientOrganization> {
    return this.mspService.getClient(user.id, tenantId, clientId);
  }

  @Patch('clients/:id')
  @ApiOperation({ summary: 'Update a client organization' })
  @ApiResponse({ status: 200, description: 'Client organization updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not an MSP user' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  async updateClient(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Param('id') clientId: string,
    @Body() dto: UpdateClientDto,
  ): Promise<ClientOrganization> {
    return this.mspService.updateClient(user.id, tenantId, clientId, dto);
  }

  @Delete('clients/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a client organization' })
  @ApiResponse({ status: 204, description: 'Client organization deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not an MSP user' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  async deleteClient(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Param('id') clientId: string,
  ): Promise<void> {
    await this.mspService.deleteClient(user.id, tenantId, clientId);
  }

  @Post('switch')
  @ApiOperation({ summary: 'Switch to a different client organization' })
  @ApiResponse({
    status: 200,
    description: 'Switched to organization, new tokens returned',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to access this organization',
  })
  async switchOrganization(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Body() body: { organizationId: string },
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    return this.mspService.switchOrganization(
      user.id,
      tenantId,
      body.organizationId,
    );
  }

  // ============================================
  // Context Switch Endpoints (US-007)
  // ============================================

  @Post('clients/:id/switch')
  @ApiOperation({
    summary: 'Switch into a client context (US-007)',
    description:
      'Returns a new JWT scoped to the client tenant with MSP attribution claims. ' +
      'The new token includes mspParentTenantId, mspUserId, and tier claims.',
  })
  @ApiParam({ name: 'id', description: 'Client tenant ID to switch to' })
  @ApiResponse({
    status: 200,
    description: 'Successfully switched to client context',
    type: ContextSwitchResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Not an MSP tier tenant or not authorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Client not found or not owned by this MSP',
  })
  async switchToClient(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Param('id') clientId: string,
    @Req() req: Request,
  ): Promise<ContextSwitchResponseDto> {
    const ipAddress = tryGetClientIp(req);
    return this.mspService.switchToClient(
      user.id,
      tenantId,
      clientId,
      ipAddress,
    );
  }

  @Post('switch-back')
  @ApiOperation({
    summary: 'Switch back to MSP context (US-007)',
    description:
      'Returns a new JWT scoped to the original MSP tenant. ' +
      'Must be called from a switched client context (token must have mspParentTenantId claim).',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully switched back to MSP context',
    type: SwitchBackResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Not in a switched client context' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'MSP tenant not found' })
  async switchBackToMsp(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Req() req: Request,
  ): Promise<SwitchBackResponseDto> {
    const ipAddress = tryGetClientIp(req);
    // Extract mspParentTenantId from the user object (set by JWT strategy)
    const mspParentTenantId = user.mspParentTenantId;
    return this.mspService.switchBackToMsp(
      user.id,
      tenantId,
      mspParentTenantId,
      ipAddress,
    );
  }

  @Get('context')
  @ApiOperation({
    summary: 'Get current MSP context info',
    description:
      'Returns information about the current MSP context, including whether ' +
      'the user is in a switched client context.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current MSP context information',
  })
  async getMspContext(@CurrentUser() user: any): Promise<{
    isInSwitchedContext: boolean;
    mspParentTenantId?: string;
    mspUserId?: string;
    clientTier?: string;
  }> {
    return this.mspService.getMspContextInfo(user);
  }

  // ============================================
  // Template Endpoints
  // ============================================

  @Get('templates')
  @ApiOperation({ summary: 'Get all templates for the MSP partner' })
  @ApiResponse({
    status: 200,
    description: 'Templates retrieved',
    type: [MspTemplateResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not an MSP user' })
  async getTemplates(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ): Promise<{ templates: MspTemplateResponseDto[] }> {
    const templates = await this.mspTemplatesService.findAll(user.id, tenantId);
    return { templates };
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create a new policy template' })
  @ApiResponse({
    status: 201,
    description: 'Template created',
    type: MspTemplateResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not an MSP user' })
  @ApiResponse({ status: 409, description: 'Template name already exists' })
  async createTemplate(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateMspTemplateDto,
    @Req() req: Request,
  ): Promise<MspTemplateResponseDto> {
    const ipAddress = tryGetClientIp(req);
    return this.mspTemplatesService.create(user.id, tenantId, dto, ipAddress);
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get a template by ID' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: 200,
    description: 'Template retrieved',
    type: MspTemplateResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not an MSP user' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async getTemplate(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Param('id') templateId: string,
  ): Promise<MspTemplateResponseDto> {
    return this.mspTemplatesService.findOne(user.id, tenantId, templateId);
  }

  @Patch('templates/:id')
  @ApiOperation({ summary: 'Update a template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: 200,
    description: 'Template updated',
    type: MspTemplateResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not an MSP user' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 409, description: 'Template name already exists' })
  async updateTemplate(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Param('id') templateId: string,
    @Body() dto: UpdateMspTemplateDto,
    @Req() req: Request,
  ): Promise<MspTemplateResponseDto> {
    const ipAddress = tryGetClientIp(req);
    return this.mspTemplatesService.update(
      user.id,
      tenantId,
      templateId,
      dto,
      ipAddress,
    );
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 204, description: 'Template deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not an MSP user' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async deleteTemplate(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Param('id') templateId: string,
    @Req() req: Request,
  ): Promise<void> {
    const ipAddress = tryGetClientIp(req);
    await this.mspTemplatesService.remove(
      user.id,
      tenantId,
      templateId,
      ipAddress,
    );
  }

  @Post('templates/:id/deploy')
  @ApiOperation({ summary: 'Deploy a template to multiple tenants' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: 200,
    description: 'Deployment result',
    type: DeploymentResultDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not an MSP user' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({
    status: 400,
    description: 'Invalid tenant IDs or tenants not owned by partner',
  })
  async deployTemplate(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Param('id') templateId: string,
    @Body() dto: DeployTemplateDto,
    @Req() req: Request,
  ): Promise<DeploymentResultDto> {
    const ipAddress = tryGetClientIp(req);
    return this.mspTemplatesService.deploy(
      user.id,
      tenantId,
      templateId,
      dto,
      ipAddress,
    );
  }

  @Get('templates/:id/deployments')
  @ApiOperation({ summary: 'Get deployment history for a template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max number of results',
  })
  @ApiResponse({
    status: 200,
    description: 'Deployment history retrieved',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not an MSP user' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async getDeploymentHistory(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Param('id') templateId: string,
    @Query('limit') limit?: number,
  ): Promise<{ deployments: MspTemplateDeployment[] }> {
    const deployments = await this.mspTemplatesService.getDeploymentHistory(
      user.id,
      tenantId,
      templateId,
      limit,
    );
    return { deployments };
  }

  // ============================================
  // Template Version Endpoints (US-034)
  // ============================================

  @Get('templates/:id/versions')
  @ApiOperation({
    summary: 'Get all versions for a template (US-034)',
    description: 'Returns version history with timestamps and creators',
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: 200,
    description: 'Version list retrieved',
    type: TemplateVersionListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not an MSP user' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async getTemplateVersions(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Param('id') templateId: string,
  ): Promise<TemplateVersionListResponseDto> {
    return this.mspTemplatesService.getVersions(user.id, tenantId, templateId);
  }

  @Get('templates/:id/versions/:versionId')
  @ApiOperation({
    summary: 'Get a specific version (US-034)',
    description: 'Returns detailed information about a specific version',
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiParam({ name: 'versionId', description: 'Version ID' })
  @ApiResponse({
    status: 200,
    description: 'Version retrieved',
    type: TemplateVersionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not an MSP user' })
  @ApiResponse({ status: 404, description: 'Template or version not found' })
  async getTemplateVersion(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Param('id') templateId: string,
    @Param('versionId') versionId: string,
  ): Promise<TemplateVersionResponseDto> {
    return this.mspTemplatesService.getVersion(
      user.id,
      tenantId,
      templateId,
      versionId,
    );
  }

  @Get('templates/:id/versions/:versionNumber/diff')
  @ApiOperation({
    summary: 'Get diff between a version and current (US-034)',
    description:
      'Returns structured diff showing added, removed, and changed fields',
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiParam({ name: 'versionNumber', description: 'Version number to compare' })
  @ApiResponse({
    status: 200,
    description: 'Diff retrieved',
    type: ConfigDiffResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not an MSP user' })
  @ApiResponse({ status: 404, description: 'Template or version not found' })
  async getVersionDiff(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Param('id') templateId: string,
    @Param('versionNumber') versionNumber: number,
  ): Promise<ConfigDiffResponseDto> {
    return this.mspTemplatesService.getVersionDiff(
      user.id,
      tenantId,
      templateId,
      versionNumber,
    );
  }

  // ============================================
  // Template Rollback Endpoints (US-035)
  // ============================================

  @Post('templates/:id/rollback/:versionId')
  @ApiOperation({
    summary: 'Rollback template to a previous version (US-035)',
    description:
      'Creates a new version with the configuration from the target version. ' +
      'Optionally re-applies the template to all clients using it.',
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiParam({ name: 'versionId', description: 'Version ID to rollback to' })
  @ApiResponse({
    status: 200,
    description: 'Rollback successful',
    type: RollbackResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot rollback to current version',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not an MSP user' })
  @ApiResponse({ status: 404, description: 'Template or version not found' })
  async rollbackTemplate(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Param('id') templateId: string,
    @Param('versionId') versionId: string,
    @Body() dto: RollbackTemplateDto,
    @Req() req: Request,
  ): Promise<RollbackResponseDto> {
    const ipAddress = tryGetClientIp(req);
    return this.mspTemplatesService.rollbackToVersion(
      user.id,
      tenantId,
      templateId,
      versionId,
      dto.reapplyToClients || false,
      ipAddress,
    );
  }

  // ============================================
  // Template Client Application Endpoints (US-036)
  // ============================================

  @Get('templates/:id/clients')
  @ApiOperation({
    summary: 'Get clients using this template (US-036)',
    description:
      'Returns list of clients with their current applied version and status',
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: 200,
    description: 'Clients list retrieved',
    type: ClientsUsingTemplateResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not an MSP user' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async getClientsUsingTemplate(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Param('id') templateId: string,
  ): Promise<ClientsUsingTemplateResponseDto> {
    return this.mspTemplatesService.getClientsUsingTemplate(
      user.id,
      tenantId,
      templateId,
    );
  }

  @Post('templates/:id/apply')
  @ApiOperation({
    summary: 'Apply template to clients (US-036)',
    description:
      'Starts an async job to apply the current template version to selected clients. ' +
      'Use "all" to apply to all clients currently using this template.',
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: 200,
    description: 'Apply job started',
    type: ApplyJobResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'No clients specified or no clients using template',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not an MSP user' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async applyTemplateToClients(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Param('id') templateId: string,
    @Body() dto: ApplyTemplateToClientsDto,
    @Req() req: Request,
  ): Promise<ApplyJobResponseDto> {
    const ipAddress = tryGetClientIp(req);
    return this.mspTemplatesService.startApplyJob(
      user.id,
      tenantId,
      templateId,
      dto.clientIds || 'all',
      ipAddress,
    );
  }

  @Get('templates/:id/apply/:jobId')
  @ApiOperation({
    summary: 'Get apply job status (US-036)',
    description: 'Returns current status and progress of an apply job',
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiParam({ name: 'jobId', description: 'Apply job ID' })
  @ApiResponse({
    status: 200,
    description: 'Job status retrieved',
    type: ApplyJobResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not an MSP user' })
  @ApiResponse({ status: 404, description: 'Template or job not found' })
  async getApplyJobStatus(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Param('id') templateId: string,
    @Param('jobId') jobId: string,
  ): Promise<ApplyJobResponseDto> {
    return this.mspTemplatesService.getApplyJobStatus(
      user.id,
      tenantId,
      templateId,
      jobId,
    );
  }

  @Post('templates/:id/retry')
  @ApiOperation({
    summary: 'Retry failed applications (US-036)',
    description:
      'Retries applying the template to clients that previously failed',
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: 200,
    description: 'Retry job started',
    type: ApplyJobResponseDto,
  })
  @ApiResponse({ status: 400, description: 'No failed applications found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not an MSP user' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async retryFailedApplications(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Param('id') templateId: string,
    @Body() dto: RetryApplicationDto,
    @Req() req: Request,
  ): Promise<ApplyJobResponseDto> {
    const ipAddress = tryGetClientIp(req);
    return this.mspTemplatesService.retryFailedApplications(
      user.id,
      tenantId,
      templateId,
      dto.clientIds,
      ipAddress,
    );
  }
}
