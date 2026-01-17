// Nebula DNS - Health Check Controller
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async check() {
    return this.healthService.check();
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check with dependencies' })
  @ApiResponse({ status: 200, description: 'Detailed health status' })
  async checkDetailed() {
    return this.healthService.checkDetailed();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check for K8s probes' })
  @ApiResponse({
    status: 200,
    description: 'Service is ready to accept traffic',
  })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async ready() {
    return this.healthService.checkReady();
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check for K8s probes' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async live() {
    return { status: 'alive', timestamp: new Date().toISOString() };
  }

  @Get('encryption')
  @ApiOperation({
    summary: 'Encryption configuration health check',
    description:
      'Validates that all required encryption keys are properly configured. Does not expose any secret values.',
  })
  @ApiResponse({
    status: 200,
    description: 'Encryption configuration status',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['configured', 'misconfigured'],
          description: 'Overall encryption configuration status',
        },
        environment: {
          type: 'string',
          description: 'Current environment (development, production, etc.)',
        },
        keys: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Encryption key name' },
              isPresent: {
                type: 'boolean',
                description: 'Whether the key is configured',
              },
              isValidLength: {
                type: 'boolean',
                description:
                  'Whether the key meets minimum length requirements',
              },
            },
          },
        },
        hasErrors: { type: 'boolean' },
        hasWarnings: { type: 'boolean' },
      },
    },
  })
  async checkEncryption() {
    return this.healthService.checkEncryption();
  }
}
