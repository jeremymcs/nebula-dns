/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * API Key Authentication Guard with Rate Limiting
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeysService } from '@/modules/api-keys/api-keys.service';
import { ApiKeyScope } from '@/modules/api-keys/entities/api-key.entity';

export const API_KEY_SCOPES_KEY = 'api_key_scopes';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly apiKeysService: ApiKeysService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Get API key from header
    const apiKey = this.extractApiKey(request);
    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    // Validate API key
    const result = await this.apiKeysService.validateApiKey(apiKey);
    if (!result) {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    const { apiKey: keyEntity, tenantId } = result;

    // Check required scopes
    const requiredScopes = this.reflector.get<ApiKeyScope[]>(
      API_KEY_SCOPES_KEY,
      context.getHandler(),
    ) || ['read'];

    for (const scope of requiredScopes) {
      if (!this.apiKeysService.hasScope(keyEntity, scope)) {
        throw new UnauthorizedException(`API key does not have required scope: ${scope}`);
      }
    }

    // Check rate limit
    const rateLimitResult = await this.apiKeysService.checkRateLimit(
      keyEntity.id,
      keyEntity.rateLimit,
    );

    // Set rate limit headers
    response.setHeader('X-RateLimit-Limit', keyEntity.rateLimit.toString());
    response.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.setHeader('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetAt.getTime() / 1000).toString());

    if (!rateLimitResult.allowed) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000);
      response.setHeader('Retry-After', retryAfter.toString());
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'API key rate limit exceeded',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Attach API key info to request
    request.apiKey = keyEntity;
    request.tenantId = tenantId;

    // Record usage asynchronously (don't wait)
    const startTime = Date.now();
    response.on('finish', () => {
      const responseTime = Date.now() - startTime;
      this.apiKeysService.recordUsage(
        keyEntity.id,
        request.path,
        request.method,
        response.statusCode,
        responseTime,
        request.ip,
        request.headers['user-agent'],
      ).catch(() => {
        // Ignore usage recording errors
      });
    });

    return true;
  }

  private extractApiKey(request: any): string | null {
    // Check Authorization header (Bearer token)
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check X-API-Key header
    const apiKeyHeader = request.headers['x-api-key'];
    if (apiKeyHeader) {
      return apiKeyHeader;
    }

    // Check query parameter (less secure, but sometimes needed)
    if (request.query?.api_key) {
      return request.query.api_key;
    }

    return null;
  }
}

