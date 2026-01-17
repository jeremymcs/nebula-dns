// Nebula DNS - Distributed Rate Limiting Service
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/modules/redis/redis.service';
import {
  RateLimitType,
  RateLimitResult,
  RateLimitConfig,
  RateLimitInvalidationMessage,
} from './interfaces/rate-limit.interface';

/**
 * Distributed rate limiting service using Redis sliding window algorithm.
 *
 * Key features:
 * - Sliding window rate limiting for accurate limiting
 * - Atomic operations using Redis MULTI/EXEC
 * - Graceful degradation when Redis is unavailable (fail-open)
 * - Pub/sub for syncing rate limit config changes to Policy Service
 */
@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly RATE_LIMIT_CHANNEL = 'nebula:ratelimit';

  // In-memory fallback for when Redis is unavailable
  private readonly fallbackStore: Map<
    string,
    { count: number; resetAt: number }
  > = new Map();
  private redisAvailable = true;

  constructor(private readonly redisService: RedisService) {
    this.checkRedisConnection();
  }

  /**
   * Check if Redis is available
   */
  private async checkRedisConnection(): Promise<void> {
    try {
      const client = this.redisService.getClient();
      await client.ping();
      this.redisAvailable = true;
    } catch (error) {
      this.redisAvailable = false;
      this.logger.warn(
        'Redis unavailable, using in-memory fallback for rate limiting',
      );
    }
  }

  /**
   * Build the Redis key for rate limiting
   */
  private buildKey(
    type: RateLimitType,
    identifier: string,
    windowMs: number,
  ): string {
    const windowSeconds = Math.floor(windowMs / 1000);
    return `ratelimit:${type}:${identifier}:${windowSeconds}`;
  }

  /**
   * Check rate limit using sliding window algorithm
   *
   * Returns: { allowed: boolean, remaining: number, resetAt: Date, limit: number, current: number }
   */
  async checkLimit(
    type: RateLimitType,
    identifier: string,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    const key = this.buildKey(type, identifier, windowMs);
    const now = Date.now();
    const windowStart = now - windowMs;
    const windowSeconds = Math.ceil(windowMs / 1000);

    // Try Redis first
    if (this.redisAvailable) {
      try {
        return await this.checkLimitRedis(
          key,
          limit,
          windowMs,
          windowStart,
          windowSeconds,
          now,
        );
      } catch (error) {
        this.logger.warn(
          `Redis rate limit check failed, using fallback: ${error.message}`,
        );
        this.redisAvailable = false;
        // Attempt reconnection check in background
        setTimeout(() => this.checkRedisConnection(), 5000);
      }
    }

    // Fallback to in-memory
    return this.checkLimitInMemory(key, limit, windowMs, now);
  }

  /**
   * Redis-based sliding window rate limiting
   */
  private async checkLimitRedis(
    key: string,
    limit: number,
    windowMs: number,
    windowStart: number,
    windowSeconds: number,
    now: number,
  ): Promise<RateLimitResult> {
    const client = this.redisService.getClient();
    const resetAt = new Date(now + windowMs);

    // Use sorted set with timestamps as scores for sliding window
    // This allows us to remove old entries and count within the window
    const sortedSetKey = `${key}:window`;

    // Use MULTI for atomic operations
    const results = await client
      .multi()
      // Remove entries older than the window
      .zremrangebyscore(sortedSetKey, 0, windowStart)
      // Count current entries in window
      .zcard(sortedSetKey)
      // Add current request with timestamp as score
      .zadd(sortedSetKey, now, `${now}:${Math.random()}`)
      // Set expiry on the sorted set (window + buffer)
      .expire(sortedSetKey, windowSeconds + 10)
      .exec();

    if (!results) {
      throw new Error('Redis MULTI/EXEC returned null');
    }

    // zcard result is at index 1 (after zremrangebyscore)
    const currentCount = (results[1][1] as number) || 0;
    const allowed = currentCount < limit;
    const remaining = Math.max(0, limit - currentCount - 1);

    // If not allowed, remove the entry we just added
    if (!allowed) {
      // Don't wait for this, just fire and forget
      client.zremrangebyscore(sortedSetKey, now, now).catch(() => {});
    }

    return {
      allowed,
      remaining: allowed ? remaining : 0,
      resetAt,
      limit,
      current: currentCount + (allowed ? 1 : 0),
    };
  }

  /**
   * In-memory fallback rate limiting (simple fixed window)
   */
  private checkLimitInMemory(
    key: string,
    limit: number,
    windowMs: number,
    now: number,
  ): RateLimitResult {
    const entry = this.fallbackStore.get(key);
    const resetAt = new Date(now + windowMs);

    // Clean up expired entries periodically
    if (Math.random() < 0.01) {
      this.cleanupFallbackStore(now);
    }

    if (!entry || now > entry.resetAt) {
      // New window
      this.fallbackStore.set(key, { count: 1, resetAt: now + windowMs });
      return {
        allowed: true,
        remaining: limit - 1,
        resetAt,
        limit,
        current: 1,
      };
    }

    entry.count++;
    const allowed = entry.count <= limit;
    const remaining = Math.max(0, limit - entry.count);

    return {
      allowed,
      remaining,
      resetAt: new Date(entry.resetAt),
      limit,
      current: entry.count,
    };
  }

  /**
   * Clean up expired entries from the in-memory fallback store
   */
  private cleanupFallbackStore(now: number): void {
    for (const [key, entry] of this.fallbackStore) {
      if (now > entry.resetAt) {
        this.fallbackStore.delete(key);
      }
    }
  }

  /**
   * Get current usage for a rate limit bucket
   */
  async getUsage(
    type: RateLimitType,
    identifier: string,
    windowMs: number,
  ): Promise<number> {
    const key = this.buildKey(type, identifier, windowMs);
    const now = Date.now();
    const windowStart = now - windowMs;

    if (this.redisAvailable) {
      try {
        const client = this.redisService.getClient();
        const sortedSetKey = `${key}:window`;

        // Remove old entries and count
        await client.zremrangebyscore(sortedSetKey, 0, windowStart);
        return await client.zcard(sortedSetKey);
      } catch (error) {
        this.logger.warn(`Redis getUsage failed: ${error.message}`);
      }
    }

    // Fallback
    const entry = this.fallbackStore.get(key);
    if (!entry || now > entry.resetAt) {
      return 0;
    }
    return entry.count;
  }

  /**
   * Reset rate limit for a specific identifier (admin use)
   */
  async resetLimit(
    type: RateLimitType,
    identifier: string,
    windowMs: number,
  ): Promise<void> {
    const key = this.buildKey(type, identifier, windowMs);
    const sortedSetKey = `${key}:window`;

    // Remove from Redis
    if (this.redisAvailable) {
      try {
        const client = this.redisService.getClient();
        await client.del(sortedSetKey);
        this.logger.log(`Reset rate limit for ${type}:${identifier}`);
      } catch (error) {
        this.logger.warn(`Redis resetLimit failed: ${error.message}`);
      }
    }

    // Remove from fallback
    this.fallbackStore.delete(key);

    // Publish invalidation message for Policy Service
    await this.publishRateLimitUpdate({
      type: 'rate_limit',
      action: 'reset',
      identifier: `${type}:${identifier}`,
    });
  }

  /**
   * Update rate limit configuration and sync to Policy Service
   */
  async updateConfig(config: RateLimitConfig): Promise<void> {
    await this.publishRateLimitUpdate({
      type: 'rate_limit',
      action: 'update',
      config,
    });

    this.logger.log(
      `Updated rate limit config for ${config.type}:${config.identifier} - limit: ${config.limit}, window: ${config.windowMs}ms`,
    );
  }

  /**
   * Delete rate limit configuration
   */
  async deleteConfig(type: RateLimitType, identifier: string): Promise<void> {
    await this.publishRateLimitUpdate({
      type: 'rate_limit',
      action: 'delete',
      identifier: `${type}:${identifier}`,
    });

    this.logger.log(`Deleted rate limit config for ${type}:${identifier}`);
  }

  /**
   * Publish rate limit update via Redis pub/sub for Policy Service
   */
  private async publishRateLimitUpdate(
    message: RateLimitInvalidationMessage,
  ): Promise<void> {
    try {
      await this.redisService.publish(
        this.RATE_LIMIT_CHANNEL,
        JSON.stringify(message),
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish rate limit update: ${error.message}`,
      );
    }
  }

  /**
   * Get rate limiter health status
   */
  async getHealth(): Promise<{ redis: boolean; fallbackSize: number }> {
    await this.checkRedisConnection();
    return {
      redis: this.redisAvailable,
      fallbackSize: this.fallbackStore.size,
    };
  }

  /**
   * Check if Redis is currently available
   */
  isRedisAvailable(): boolean {
    return this.redisAvailable;
  }
}
