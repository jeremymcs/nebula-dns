// Nebula DNS - Redis Distributed Rate Limit Guard
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitService } from '../rate-limit.service';
import {
  RateLimitOptions,
  RateLimitType,
  RateLimitResult,
} from '../interfaces/rate-limit.interface';
import { RATE_LIMIT_KEY } from '../decorators/rate-limit.decorator';

/**
 * Redis-backed distributed rate limiting guard.
 *
 * Uses sliding window algorithm with Redis for accurate rate limiting
 * across multiple API instances. Falls back to in-memory limiting if
 * Redis is unavailable (fail-open strategy).
 *
 * Key format: ratelimit:{type}:{identifier}:{window}
 */
@Injectable()
export class RedisRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RedisRateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return true; // No rate limiting configured
    }

    const request = context.switchToHttp().getRequest();

    // Check if should skip rate limiting
    if (options.skip && options.skip(request)) {
      return true;
    }

    // Get the identifier based on rate limit type
    const identifier = this.getIdentifier(options, request);
    if (!identifier) {
      this.logger.warn(
        `Could not determine identifier for rate limit type: ${options.type}`,
      );
      return true; // Fail open if we can't identify the client
    }

    // Check rate limit
    const result = await this.rateLimitService.checkLimit(
      options.type,
      identifier,
      options.limit,
      options.windowMs,
    );

    // Store result in request for interceptor to add headers
    request.rateLimitResult = result;
    request.rateLimitOptions = options;

    if (!result.allowed) {
      const retryAfter = Math.ceil(
        (result.resetAt.getTime() - Date.now()) / 1000,
      );
      const message =
        options.message || 'Too many requests, please try again later';

      this.logger.warn(
        `Rate limit exceeded for ${options.type}:${identifier} - ` +
          `current: ${result.current}, limit: ${result.limit}`,
      );

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message,
          error: 'Too Many Requests',
          retryAfter,
          limit: result.limit,
          remaining: 0,
          resetAt: result.resetAt.toISOString(),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Get the identifier for rate limiting based on the type
   */
  private getIdentifier(
    options: RateLimitOptions,
    request: any,
  ): string | null {
    // Use custom key generator if provided
    if (options.keyGenerator) {
      return options.keyGenerator(request);
    }

    switch (options.type) {
      case RateLimitType.PER_IP:
        return this.getClientIp(request);

      case RateLimitType.PER_TENANT:
        return request.user?.tenantId || request.tenantId || null;

      case RateLimitType.PER_LOCATION:
        // Location can come from various sources
        return (
          request.locationId ||
          request.params?.locationId ||
          request.body?.locationId ||
          request.query?.locationId ||
          null
        );

      case RateLimitType.PER_API_KEY:
        return request.apiKey?.id || this.extractApiKeyId(request) || null;

      default:
        return null;
    }
  }

  /**
   * Extract client IP from request, handling proxies
   */
  private getClientIp(request: any): string {
    // Check X-Forwarded-For header (when behind proxy/load balancer)
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = (
        Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor
      ).split(',');
      return ips[0].trim();
    }

    // Check X-Real-IP header
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Fall back to request IP
    return request.ip || request.socket?.remoteAddress || 'unknown';
  }

  /**
   * Extract API key ID from request headers
   */
  private extractApiKeyId(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      // Return a hash of the key prefix for identification
      const key = authHeader.substring(7);
      if (key.startsWith('sk_')) {
        // Use prefix for identification (first 12 chars)
        return key.substring(0, 12);
      }
    }

    const apiKeyHeader = request.headers['x-api-key'];
    if (apiKeyHeader) {
      return apiKeyHeader.substring(0, 12);
    }

    return null;
  }
}
