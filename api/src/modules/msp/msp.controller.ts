/**
 * Nebula DNS - MSP Controller
 * Provides endpoints for MSP users to manage their client organizations
 */

import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentTenant } from '@/common/decorators/tenant.decorator';
import { MspService, ClientOrganization, CreateClientDto, UpdateClientDto } from './msp.service';

@ApiTags('msp')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('msp')
export class MspController {
  constructor(private readonly mspService: MspService) {}

  @Get('clients')
  @ApiOperation({ summary: 'Get all client organizations for MSP user' })
  @ApiResponse({ status: 200, description: 'Client organizations retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not an MSP user' })
  async getClients(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ): Promise<{ clients: ClientOrganization[] }> {
    const clients = await this.mspService.getClientOrganizations(user.id, tenantId);
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
  @ApiResponse({ status: 200, description: 'Switched to organization, new tokens returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not authorized to access this organization' })
  async switchOrganization(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Body() body: { organizationId: string },
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    return this.mspService.switchOrganization(user.id, tenantId, body.organizationId);
  }
}

