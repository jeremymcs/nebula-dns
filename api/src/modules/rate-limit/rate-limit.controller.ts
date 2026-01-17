// Nebula DNS - Rate Limit Admin Controller
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Controller,
  Get,
  Post,
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
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@/common/guards/roles.guard';
import { RateLimitService } from './rate-limit.service';
import {
  RateLimitType,
  RateLimitConfig,
} from './interfaces/rate-limit.interface';

class ResetLimitDto {
  type: RateLimitType;
  identifier: string;
  windowMs: number;
}

class UpdateConfigDto implements RateLimitConfig {
  type: RateLimitType;
  identifier: string;
  limit: number;
  windowMs: number;
  enabled: boolean;
}

class GetUsageDto {
  type: RateLimitType;
  identifier: string;
  windowMs: number;
}

/**
 * Admin endpoints for managing rate limits
 */
@ApiTags('Rate Limiting')
@ApiBearerAuth()
@Controller('rate-limits')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RateLimitController {
  constructor(private readonly rateLimitService: RateLimitService) {}

  /**
   * Get rate limiter health status
   */
  @Get('health')
  @ApiOperation({ summary: 'Get rate limiter health status' })
  @ApiResponse({
    status: 200,
    description: 'Health status retrieved',
    schema: {
      type: 'object',
      properties: {
        redis: { type: 'boolean', description: 'Whether Redis is available' },
        fallbackSize: {
          type: 'number',
          description: 'Number of entries in fallback store',
        },
      },
    },
  })
  async getHealth() {
    return this.rateLimitService.getHealth();
  }

  /**
   * Get current usage for a rate limit bucket
   */
  @Post('usage')
  @Roles(Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Get current usage for a rate limit bucket' })
  @ApiBody({ type: GetUsageDto })
  @ApiResponse({
    status: 200,
    description: 'Current usage count',
    schema: {
      type: 'object',
      properties: {
        usage: { type: 'number' },
        type: { type: 'string' },
        identifier: { type: 'string' },
      },
    },
  })
  async getUsage(@Body() dto: GetUsageDto) {
    const usage = await this.rateLimitService.getUsage(
      dto.type,
      dto.identifier,
      dto.windowMs,
    );
    return {
      usage,
      type: dto.type,
      identifier: dto.identifier,
    };
  }

  /**
   * Reset rate limit for a specific identifier
   */
  @Post('reset')
  @Roles(Role.ADMIN, Role.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reset rate limit for a specific identifier' })
  @ApiBody({ type: ResetLimitDto })
  @ApiResponse({ status: 204, description: 'Rate limit reset successfully' })
  async resetLimit(@Body() dto: ResetLimitDto) {
    await this.rateLimitService.resetLimit(
      dto.type,
      dto.identifier,
      dto.windowMs,
    );
  }

  /**
   * Update rate limit configuration (synced to Policy Service)
   */
  @Post('config')
  @Roles(Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Update rate limit configuration' })
  @ApiBody({ type: UpdateConfigDto })
  @ApiResponse({ status: 200, description: 'Configuration updated' })
  async updateConfig(@Body() dto: UpdateConfigDto) {
    await this.rateLimitService.updateConfig(dto);
    return { message: 'Configuration updated and synced to Policy Service' };
  }

  /**
   * Delete rate limit configuration
   */
  @Delete('config/:type/:identifier')
  @Roles(Role.ADMIN, Role.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete rate limit configuration' })
  @ApiParam({ name: 'type', enum: RateLimitType })
  @ApiParam({ name: 'identifier', type: 'string' })
  @ApiResponse({ status: 204, description: 'Configuration deleted' })
  async deleteConfig(
    @Param('type') type: RateLimitType,
    @Param('identifier') identifier: string,
  ) {
    await this.rateLimitService.deleteConfig(type, identifier);
  }
}
