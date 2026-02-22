// Nebula DNS - MSP Clients Controller
// API endpoints for MSP client management (US-006)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  ParseUUIDPipe,
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
import { MspTierGuard } from './guards/msp-tier.guard';
import {
  CurrentTenant,
  CurrentUser,
} from '@/common/decorators/tenant.decorator';
import { MspClientsService } from './msp-clients.service';
import {
  CreateMspClientDto,
  UpdateMspClientDto,
  MspClientResponseDto,
  MspClientListResponseDto,
  MspClientQueryDto,
  RemoveMspClientDto,
} from './dto/msp-client.dto';

/**
 * MSP Clients Controller
 *
 * Provides CRUD endpoints for MSP users to manage their client organizations.
 * All endpoints require MSP tier and return 403 for non-MSP tenants.
 *
 * Endpoints:
 * - GET /api/v1/msp/clients - List all clients
 * - POST /api/v1/msp/clients - Create new client
 * - GET /api/v1/msp/clients/:id - Get client details
 * - PATCH /api/v1/msp/clients/:id - Update client
 * - DELETE /api/v1/msp/clients/:id - Remove client
 */
@ApiTags('msp-clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, MspTierGuard)
@Controller('msp/clients')
export class MspClientsController {
  constructor(private readonly mspClientsService: MspClientsService) {}

  /**
   * List all clients for the current MSP tenant
   * GET /api/v1/msp/clients
   */
  @Get()
  @ApiOperation({
    summary: 'List all clients for current MSP tenant',
    description:
      'Returns a list of all client organizations managed by the current MSP tenant. ' +
      'Includes client counts, status, and limit information.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'suspended'],
    description: 'Filter by client status',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search clients by name',
  })
  @ApiResponse({
    status: 200,
    description: 'Client list retrieved successfully',
    type: MspClientListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not an MSP tier tenant',
  })
  async listClients(
    @CurrentTenant() tenantId: string,
    @Query() query: MspClientQueryDto,
  ): Promise<MspClientListResponseDto> {
    return this.mspClientsService.findAllForMsp(tenantId, query);
  }

  /**
   * Create a new client organization
   * POST /api/v1/msp/clients
   */
  @Post()
  @ApiOperation({
    summary: 'Create a new client organization',
    description:
      'Creates a new client tenant with enterprise tier, an admin user, and links it to the MSP. ' +
      'Optionally applies template policies to the new client. ' +
      'Checks client limit before creation.',
  })
  @ApiResponse({
    status: 201,
    description: 'Client organization created successfully',
    type: MspClientResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not an MSP tier tenant or client limit reached',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - slug or admin email already exists',
  })
  async createClient(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateMspClientDto,
    @Req() req: Request,
  ): Promise<MspClientResponseDto> {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    return this.mspClientsService.create(tenantId, dto, user.id, ipAddress);
  }

  /**
   * Get client details by ID
   * GET /api/v1/msp/clients/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get client details',
    description:
      'Returns detailed information about a specific client organization, ' +
      'including location count, user count, and status.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Client tenant ID (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Client details retrieved successfully',
    type: MspClientResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not an MSP tier tenant',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - client does not exist',
  })
  async getClient(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) clientId: string,
  ): Promise<MspClientResponseDto> {
    return this.mspClientsService.findOne(tenantId, clientId);
  }

  /**
   * Update a client organization
   * PATCH /api/v1/msp/clients/:id
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update client organization',
    description:
      'Updates a client organization. Per US-006 spec, only name and status can be updated.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Client tenant ID (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Client updated successfully',
    type: MspClientResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not an MSP tier tenant',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - client does not exist',
  })
  async updateClient(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) clientId: string,
    @Body() dto: UpdateMspClientDto,
  ): Promise<MspClientResponseDto> {
    return this.mspClientsService.update(tenantId, clientId, dto);
  }

  /**
   * Remove client relationship
   * DELETE /api/v1/msp/clients/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove client relationship',
    description:
      'Removes the MSP-client relationship. Optionally deletes the client tenant entirely ' +
      'if the deleteTenant query parameter is set to true.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Client tenant ID (UUID)',
  })
  @ApiQuery({
    name: 'deleteTenant',
    required: false,
    type: Boolean,
    description:
      'If true, permanently deletes the client tenant. If false, only removes the MSP relationship.',
  })
  @ApiResponse({
    status: 204,
    description: 'Client relationship removed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not an MSP tier tenant',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - client does not exist',
  })
  async removeClient(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) clientId: string,
    @Query() query: RemoveMspClientDto,
  ): Promise<void> {
    await this.mspClientsService.remove(tenantId, clientId, query.deleteClient);
  }
}
