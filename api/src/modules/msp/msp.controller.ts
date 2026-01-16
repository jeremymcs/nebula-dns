/**
 * Nebula DNS - MSP Controller
 * Provides endpoints for MSP users to manage their client organizations and templates
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
    const ipAddress = req.ip || req.connection?.remoteAddress;
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
    const ipAddress = req.ip || req.connection?.remoteAddress;
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
    const ipAddress = req.ip || req.connection?.remoteAddress;
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
    const ipAddress = req.ip || req.connection?.remoteAddress;
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
}
