// Nebula DNS - Secrets Manager Controller
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// Admin endpoints for secrets management and health checks

import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import {
  SecretsService,
  SecretRefreshResult,
  SecretsHealthStatus,
} from './secrets.service';

/**
 * DTO for secret refresh request
 */
class RefreshSecretsDto {
  /**
   * Specific secret name to refresh, or 'all' for all secrets
   */
  secret?: string;
}

/**
 * User context from JWT
 */
interface UserContext {
  id: string;
  tenantId: string;
  role: string;
  email: string;
}

@ApiTags('admin')
@Controller('admin/secrets')
export class SecretsController {
  private readonly logger = new Logger(SecretsController.name);

  constructor(private readonly secretsService: SecretsService) {}

  /**
   * Refresh secrets from the provider
   * Owner-only endpoint for refreshing secrets without restart
   */
  @Post('refresh')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Refresh secrets from provider',
    description:
      'Refreshes secrets from the configured provider (AWS/Vault/env). ' +
      'This allows updating secrets without restarting the application. ' +
      'Owner role required.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        secret: {
          type: 'string',
          description:
            "Specific secret name to refresh, or omit for all secrets. Use 'all' explicitly for clarity.",
          example: 'all',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Secrets refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        secretsRefreshed: {
          type: 'array',
          items: { type: 'string' },
        },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              secret: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
        refreshedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - valid JWT required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - owner role required',
  })
  async refreshSecrets(
    @Body() dto: RefreshSecretsDto,
    @CurrentUser() user: UserContext,
  ): Promise<SecretRefreshResult> {
    // Double-check owner role for this sensitive operation
    if (user.role !== 'owner') {
      this.logger.warn(
        `Unauthorized secrets refresh attempt by user ${user.id} (role: ${user.role})`,
      );
      throw new ForbiddenException('Only owners can refresh secrets');
    }

    this.logger.log(
      `Secrets refresh initiated by user ${user.id} (${user.email})`,
    );

    let result: SecretRefreshResult;

    if (!dto.secret || dto.secret === 'all') {
      result = await this.secretsService.refreshAllSecrets();
    } else {
      result = await this.secretsService.refreshSecret(dto.secret);
    }

    // Log the result (without exposing secret values)
    if (result.success) {
      this.logger.log(
        `Secrets refresh completed: ${result.secretsRefreshed.length} secrets refreshed`,
      );
    } else {
      this.logger.warn(
        `Secrets refresh completed with errors: ${result.errors.length} failures`,
      );
    }

    return result;
  }

  /**
   * Clear the secrets cache
   * Forces re-fetch on next access
   */
  @Post('cache/clear')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Clear secrets cache',
    description:
      'Clears the in-memory secrets cache, forcing re-fetch from the provider on next access. ' +
      'Use this after updating secrets in AWS/Vault to ensure the application uses new values. ' +
      'Owner role required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache cleared successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        clearedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  async clearCache(@CurrentUser() user: UserContext): Promise<{
    success: boolean;
    message: string;
    clearedAt: Date;
  }> {
    if (user.role !== 'owner') {
      this.logger.warn(
        `Unauthorized cache clear attempt by user ${user.id} (role: ${user.role})`,
      );
      throw new ForbiddenException('Only owners can clear secrets cache');
    }

    this.logger.log(
      `Secrets cache clear initiated by user ${user.id} (${user.email})`,
    );

    this.secretsService.clearCache();

    return {
      success: true,
      message: 'Secrets cache cleared successfully',
      clearedAt: new Date(),
    };
  }
}

/**
 * Public health check controller for secrets
 * Separate from admin to allow unauthenticated health checks
 */
@ApiTags('health')
@Controller('health/secrets')
export class SecretsHealthController {
  constructor(private readonly secretsService: SecretsService) {}

  /**
   * Health check endpoint for secrets provider
   * Public endpoint for Kubernetes probes
   */
  @Get()
  @ApiOperation({
    summary: 'Secrets provider health check',
    description:
      'Validates connectivity to the secrets provider and returns health status. ' +
      'This endpoint is public for use with Kubernetes health probes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Secrets provider health status',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['healthy', 'degraded', 'unhealthy'],
        },
        provider: {
          type: 'string',
          enum: ['env', 'aws', 'vault'],
        },
        connected: { type: 'boolean' },
        lastRefreshTime: {
          type: 'string',
          format: 'date-time',
          nullable: true,
        },
        lastRefreshStatus: {
          type: 'string',
          enum: ['success', 'failure', 'pending'],
        },
        cacheStats: {
          type: 'object',
          properties: {
            totalSecrets: { type: 'number' },
            expiredSecrets: { type: 'number' },
          },
        },
        latencyMs: { type: 'number' },
        error: { type: 'string', nullable: true },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Secrets provider is unhealthy',
  })
  async getHealth(): Promise<SecretsHealthStatus> {
    const status = await this.secretsService.getHealthStatus();

    // Note: We don't throw on unhealthy status to allow the health check
    // to return detailed information about what's wrong
    return status;
  }

  /**
   * Simple readiness check
   * Returns 200 if secrets service is initialized
   */
  @Get('ready')
  @ApiOperation({
    summary: 'Secrets service readiness check',
    description:
      'Simple check if the secrets service is initialized and ready.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is ready',
    schema: {
      type: 'object',
      properties: {
        ready: { type: 'boolean' },
        provider: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service is not ready',
  })
  getReady(): { ready: boolean; provider: string } {
    const ready = this.secretsService.isReady();
    const provider = this.secretsService.getProvider();

    return { ready, provider };
  }
}
