// Nebula DNS - API Keys Controller
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
import { ApiKeysService } from './api-keys.service';
import {
  CreateApiKeyDto,
  UpdateApiKeyDto,
  RotateApiKeyDto,
  ApiKeyResponseDto,
  NewApiKeyResponseDto,
  ApiKeyUsageStatsDto,
} from './dto/api-key.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';
import { CurrentUser } from '@/common/decorators/user.decorator';

@ApiTags('api-keys')
@ApiBearerAuth()
@Controller('api-keys')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @Roles('admin', 'owner')
  @ApiOperation({
    summary: 'Create a new API key',
    description:
      'Creates a new API key for programmatic access to the Nebula DNS API. The full API key is only returned once at creation time - store it securely.',
  })
  @ApiResponse({
    status: 201,
    description:
      'API key created successfully. The full key is only shown once.',
    type: NewApiKeyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid API key configuration',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Insufficient permissions (requires admin or owner role)',
  })
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateApiKeyDto,
  ) {
    const apiKey = await this.apiKeysService.create(tenantId, user.id, dto);
    return {
      data: apiKey,
      message:
        'API key created. Make sure to copy the key now - it will not be shown again.',
    };
  }

  @Get()
  @ApiOperation({
    summary: 'List all API keys',
    description:
      'Returns all API keys for the current tenant. For security, the full key value is never returned - only the key prefix is shown.',
  })
  @ApiResponse({
    status: 200,
    description: 'API keys retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/ApiKeyResponseDto' },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async findAll(@CurrentTenant() tenantId: string) {
    const apiKeys = await this.apiKeysService.findAll(tenantId);
    return { data: apiKeys };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get API key by ID',
    description:
      'Returns details about a specific API key. For security, the full key value is never returned.',
  })
  @ApiParam({ name: 'id', description: 'API key UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'API key retrieved successfully',
    type: ApiKeyResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const apiKey = await this.apiKeysService.findOne(tenantId, id);
    return { data: apiKey };
  }

  @Get(':id/usage')
  @ApiOperation({
    summary: 'Get API key usage statistics',
    description:
      'Returns usage statistics for a specific API key, including request counts, top endpoints, and error rates.',
  })
  @ApiParam({ name: 'id', description: 'API key UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Usage statistics retrieved successfully',
    type: ApiKeyUsageStatsDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async getUsageStats(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    const stats = await this.apiKeysService.getUsageStats(tenantId, id);
    return { data: stats };
  }

  @Patch(':id')
  @Roles('admin', 'owner')
  @ApiOperation({
    summary: 'Update API key',
    description:
      'Updates an existing API key configuration. You can change the name, scopes, rate limit, and expiration.',
  })
  @ApiParam({ name: 'id', description: 'API key UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'API key updated successfully',
    type: ApiKeyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid API key configuration',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Insufficient permissions (requires admin or owner role)',
  })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateApiKeyDto,
  ) {
    const apiKey = await this.apiKeysService.update(tenantId, id, dto);
    return { data: apiKey };
  }

  @Post(':id/revoke')
  @Roles('admin', 'owner')
  @ApiOperation({
    summary: 'Revoke API key',
    description:
      'Immediately revokes an API key. All requests using this key will be rejected. This action cannot be undone.',
  })
  @ApiParam({ name: 'id', description: 'API key UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'API key revoked successfully',
    type: ApiKeyResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Insufficient permissions (requires admin or owner role)',
  })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async revoke(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const apiKey = await this.apiKeysService.revoke(tenantId, id);
    return { data: apiKey, message: 'API key revoked successfully' };
  }

  @Post(':id/rotate')
  @Roles('admin', 'owner')
  @ApiOperation({
    summary: 'Rotate API key',
    description:
      'Creates a new API key to replace an existing one. The old key remains active during the grace period to allow for seamless migration. The new key is only shown once.',
  })
  @ApiParam({ name: 'id', description: 'API key UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description:
      'API key rotated successfully. The new key is only shown once.',
    type: NewApiKeyResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Insufficient permissions (requires admin or owner role)',
  })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async rotate(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: RotateApiKeyDto,
  ) {
    const newApiKey = await this.apiKeysService.rotate(
      tenantId,
      id,
      dto.gracePeriodHours,
    );
    return {
      data: newApiKey,
      message: `API key rotated. Old key will remain active for ${dto.gracePeriodHours || 24} hours. Make sure to copy the new key now - it will not be shown again.`,
    };
  }

  @Delete(':id')
  @Roles('admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete API key',
    description:
      'Permanently deletes an API key. This action cannot be undone. Use revoke if you may need to restore access later.',
  })
  @ApiParam({ name: 'id', description: 'API key UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'API key deleted successfully',
    schema: {
      type: 'object',
      properties: { success: { type: 'boolean', example: true } },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Insufficient permissions (requires admin or owner role)',
  })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.apiKeysService.delete(tenantId, id);
    return { success: true };
  }
}
