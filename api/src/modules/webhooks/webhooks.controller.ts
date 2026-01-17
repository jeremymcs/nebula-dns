// Nebula DNS - Webhooks Controller with Secret Rotation
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
import { WebhooksService } from './webhooks.service';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  TestWebhookDto,
  WebhookResponseDto,
  TestWebhookResultDto,
  RotateSecretDto,
  RotateSecretResponseDto,
  WebhookSecretStatusDto,
} from './dto/webhook.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';
import { CurrentUser } from '@/common/decorators/user.decorator';

@ApiTags('webhooks')
@ApiBearerAuth()
@Controller('webhooks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get('events')
  @ApiOperation({
    summary: 'Get available webhook events',
    description:
      'Returns a list of all event types that can trigger webhook deliveries. Use these event names when configuring webhook subscriptions.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of available webhook events',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { type: 'string' },
          example: [
            'policy.created',
            'policy.updated',
            'threat.detected',
            'user.created',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  getAvailableEvents() {
    const events = this.webhooksService.getAvailableEvents();
    return { data: events };
  }

  @Post()
  @Roles('admin', 'owner')
  @ApiOperation({
    summary: 'Create a new webhook',
    description:
      'Creates a new webhook endpoint for receiving event notifications. Webhooks can be configured to receive specific event types and include custom headers for authentication.',
  })
  @ApiResponse({
    status: 201,
    description: 'Webhook created successfully',
    type: WebhookResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid webhook configuration',
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
    @Body() dto: CreateWebhookDto,
  ) {
    const webhook = await this.webhooksService.create(tenantId, dto);
    return { data: webhook, message: 'Webhook created successfully' };
  }

  @Get()
  @ApiOperation({
    summary: 'List all webhooks',
    description: 'Returns all webhook configurations for the current tenant.',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhooks retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/WebhookResponseDto' },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async findAll(@CurrentTenant() tenantId: string) {
    const webhooks = await this.webhooksService.findAll(tenantId);
    return { data: webhooks };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get webhook by ID',
    description:
      'Returns detailed information about a specific webhook configuration.',
  })
  @ApiParam({ name: 'id', description: 'Webhook UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Webhook retrieved successfully',
    type: WebhookResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const webhook = await this.webhooksService.findOne(tenantId, id);
    return { data: webhook };
  }

  @Get(':id/deliveries')
  @ApiOperation({
    summary: 'Get webhook delivery history',
    description:
      'Returns the delivery history for a specific webhook, including response status codes and any errors. Useful for debugging webhook issues.',
  })
  @ApiParam({ name: 'id', description: 'Webhook UUID', type: 'string' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of deliveries to return (default: 50)',
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Delivery history retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/WebhookDeliveryResponseDto' },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async getDeliveries(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const deliveries = await this.webhooksService.getDeliveries(
      tenantId,
      id,
      limit ? parseInt(limit) : 50,
    );
    return { data: deliveries };
  }

  @Patch(':id')
  @Roles('admin', 'owner')
  @ApiOperation({
    summary: 'Update webhook',
    description:
      'Updates an existing webhook configuration. All fields are optional - only provided fields will be updated.',
  })
  @ApiParam({ name: 'id', description: 'Webhook UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Webhook updated successfully',
    type: WebhookResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid webhook configuration',
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
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    const webhook = await this.webhooksService.update(tenantId, id, dto);
    return { data: webhook };
  }

  @Delete(':id')
  @Roles('admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete webhook',
    description:
      'Permanently deletes a webhook configuration. This action cannot be undone. Delivery history for this webhook will also be deleted.',
  })
  @ApiParam({ name: 'id', description: 'Webhook UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Webhook deleted successfully',
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
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.webhooksService.delete(tenantId, id);
    return { success: true };
  }

  @Post(':id/enable')
  @Roles('admin', 'owner')
  @ApiOperation({
    summary: 'Enable webhook',
    description:
      'Enables a previously disabled webhook. The webhook will start receiving event deliveries again.',
  })
  @ApiParam({ name: 'id', description: 'Webhook UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Webhook enabled successfully',
    type: WebhookResponseDto,
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
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async enable(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const webhook = await this.webhooksService.enable(tenantId, id);
    return { data: webhook, message: 'Webhook enabled' };
  }

  @Post(':id/disable')
  @Roles('admin', 'owner')
  @ApiOperation({
    summary: 'Disable webhook',
    description:
      'Disables a webhook temporarily. Events will not be delivered while the webhook is disabled. Use enable to resume deliveries.',
  })
  @ApiParam({ name: 'id', description: 'Webhook UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Webhook disabled successfully',
    type: WebhookResponseDto,
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
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async disable(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const webhook = await this.webhooksService.disable(tenantId, id);
    return { data: webhook, message: 'Webhook disabled' };
  }

  @Post(':id/test')
  @Roles('admin', 'owner')
  @ApiOperation({
    summary: 'Test webhook',
    description:
      'Sends a test event to the webhook endpoint. Use this to verify your webhook is correctly configured and receiving events.',
  })
  @ApiParam({ name: 'id', description: 'Webhook UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Test webhook delivery result',
    type: TestWebhookResultDto,
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
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async test(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: TestWebhookDto,
  ) {
    const result = await this.webhooksService.test(tenantId, id, dto.eventType);
    return { data: result };
  }

  // ============================================
  // Secret Rotation Endpoints
  // ============================================

  @Post(':id/rotate-secret')
  @Roles('admin', 'owner')
  @ApiOperation({
    summary: 'Rotate webhook secret',
    description:
      'Rotates the webhook signing secret. During the configurable grace period (default 24 hours), both the old and new secrets will be used for signature generation. The X-Webhook-Signature header will contain the new signature, and X-Webhook-Signature-Previous will contain the old signature. After the grace period, only the new secret is used.',
  })
  @ApiParam({ name: 'id', description: 'Webhook UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description:
      'Secret rotated successfully. The new secret is returned only once.',
    type: RotateSecretResponseDto,
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
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async rotateSecret(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: RotateSecretDto,
    @CurrentUser() user: { id: string },
    @Req() req: Request,
  ) {
    const result = await this.webhooksService.rotateSecret(
      tenantId,
      id,
      dto.gracePeriodHours ?? 24,
      user?.id,
      req.ip,
      req.headers['user-agent'],
    );
    return {
      data: result,
      message:
        'Secret rotated successfully. Store the new secret securely - it will not be displayed again.',
    };
  }

  @Get(':id/secret-status')
  @Roles('admin', 'owner')
  @ApiOperation({
    summary: 'Get webhook secret status',
    description:
      'Returns information about the webhook secret status, including whether a secret is configured, when it was last rotated, and whether the webhook is currently in a grace period.',
  })
  @ApiParam({ name: 'id', description: 'Webhook UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Secret status retrieved successfully',
    type: WebhookSecretStatusDto,
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
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async getSecretStatus(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    const status = await this.webhooksService.getSecretStatus(tenantId, id);
    return { data: status };
  }

  @Post(':id/expire-previous-secret')
  @Roles('admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Expire previous secret immediately',
    description:
      'Immediately expires the previous secret, ending the grace period early. Use this after confirming your webhook consumer has been updated to use the new secret.',
  })
  @ApiParam({ name: 'id', description: 'Webhook UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Previous secret expired successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Previous secret expired' },
      },
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
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async expirePreviousSecret(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    await this.webhooksService.expirePreviousSecret(tenantId, id);
    return { success: true, message: 'Previous secret expired' };
  }
}
