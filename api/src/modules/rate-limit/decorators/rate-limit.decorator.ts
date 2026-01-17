// Nebula DNS - Rate Limit Decorator
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  SetMetadata,
  applyDecorators,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  RateLimitOptions,
  RateLimitType,
} from '../interfaces/rate-limit.interface';
import { RedisRateLimitGuard } from '../guards/redis-rate-limit.guard';
import { RateLimitInterceptor } from '../interceptors/rate-limit.interceptor';

export const RATE_LIMIT_KEY = 'rate_limit';

/**
 * Rate limit decorator for applying distributed rate limiting to endpoints.
 *
 * @example
 * // Limit to 100 requests per minute per IP
 * @RateLimit({ type: RateLimitType.PER_IP, limit: 100, windowMs: 60000 })
 *
 * @example
 * // Limit to 1000 requests per hour per tenant
 * @RateLimit({ type: RateLimitType.PER_TENANT, limit: 1000, windowMs: 3600000 })
 *
 * @example
 * // Custom key generator
 * @RateLimit({
 *   type: RateLimitType.PER_IP,
 *   limit: 10,
 *   windowMs: 60000,
 *   keyGenerator: (req) => `${req.ip}:${req.path}`,
 * })
 */
export function RateLimit(options: RateLimitOptions) {
  return applyDecorators(
    SetMetadata(RATE_LIMIT_KEY, options),
    UseGuards(RedisRateLimitGuard),
    UseInterceptors(RateLimitInterceptor),
  );
}

/**
 * Shorthand decorator for per-IP rate limiting
 */
export function RateLimitPerIP(limit: number, windowMs: number = 60000) {
  return RateLimit({
    type: RateLimitType.PER_IP,
    limit,
    windowMs,
  });
}

/**
 * Shorthand decorator for per-tenant rate limiting
 */
export function RateLimitPerTenant(limit: number, windowMs: number = 60000) {
  return RateLimit({
    type: RateLimitType.PER_TENANT,
    limit,
    windowMs,
  });
}

/**
 * Shorthand decorator for per-location rate limiting
 */
export function RateLimitPerLocation(limit: number, windowMs: number = 60000) {
  return RateLimit({
    type: RateLimitType.PER_LOCATION,
    limit,
    windowMs,
  });
}

/**
 * Shorthand decorator for per-API-key rate limiting
 */
export function RateLimitPerApiKey(limit: number, windowMs: number = 60000) {
  return RateLimit({
    type: RateLimitType.PER_API_KEY,
    limit,
    windowMs,
  });
}

/**
 * Strict rate limiting for sensitive endpoints (e.g., login, password reset)
 */
export function StrictRateLimit(limit: number = 5, windowMs: number = 60000) {
  return RateLimit({
    type: RateLimitType.PER_IP,
    limit,
    windowMs,
    message: 'Too many attempts. Please try again later.',
  });
}
