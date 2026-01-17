// Nebula DNS - Distributed Rate Limiting Module
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Module, Global } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';
import { RedisRateLimitGuard } from './guards/redis-rate-limit.guard';
import { RateLimitInterceptor } from './interceptors/rate-limit.interceptor';
import { RateLimitController } from './rate-limit.controller';

/**
 * Distributed Rate Limiting Module
 *
 * Provides Redis-backed rate limiting with sliding window algorithm.
 * Features:
 * - Multiple rate limit types (per-IP, per-tenant, per-location, per-API-key)
 * - Graceful degradation to in-memory when Redis unavailable
 * - Pub/sub for syncing config changes to Policy Service
 * - Response headers for rate limit information
 *
 * Usage:
 * @RateLimit({ type: RateLimitType.PER_IP, limit: 100, windowMs: 60000 })
 */
@Global()
@Module({
  providers: [RateLimitService, RedisRateLimitGuard, RateLimitInterceptor],
  controllers: [RateLimitController],
  exports: [RateLimitService, RedisRateLimitGuard, RateLimitInterceptor],
})
export class RateLimitModule {}
