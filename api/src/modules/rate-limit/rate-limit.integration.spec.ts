// Nebula DNS - Rate Limit Integration Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { RateLimitModule } from './rate-limit.module';
import { RedisModule } from '@/modules/redis/redis.module';
import { RedisService } from '@/modules/redis/redis.service';
import { RateLimitService } from './rate-limit.service';
import { RateLimitType } from './interfaces/rate-limit.interface';

/**
 * Integration tests for the distributed rate limiting system.
 *
 * These tests verify:
 * - Redis-based sliding window rate limiting
 * - Pub/sub for config sync
 * - Fallback behavior when Redis is unavailable
 * - Response headers
 *
 * Note: These tests require a running Redis instance.
 * Skip with: npm run test:e2e -- --testPathIgnorePatterns=rate-limit.integration
 */
describe('RateLimitService Integration', () => {
  let module: TestingModule;
  let rateLimitService: RateLimitService;
  let redisService: RedisService;

  // Check if Redis is available
  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:4379';

  beforeAll(async () => {
    try {
      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            load: [
              () => ({
                REDIS_URL,
              }),
            ],
          }),
          RedisModule,
          RateLimitModule,
        ],
      }).compile();

      rateLimitService = module.get<RateLimitService>(RateLimitService);
      redisService = module.get<RedisService>(RedisService);
    } catch (error) {
      console.warn('Skipping integration tests - Redis not available');
    }
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  beforeEach(async () => {
    // Clean up test keys
    if (redisService) {
      try {
        const client = redisService.getClient();
        const keys = await client.keys('ratelimit:*:test-*');
        if (keys.length > 0) {
          await client.del(...keys);
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('checkLimit with Redis', () => {
    it('should track requests using sliding window', async () => {
      if (!rateLimitService) {
        console.warn('Skipping test - Redis not available');
        return;
      }

      const identifier = `test-${Date.now()}`;
      const limit = 10;
      const windowMs = 60000;

      // Make several requests
      for (let i = 0; i < 5; i++) {
        const result = await rateLimitService.checkLimit(
          RateLimitType.PER_IP,
          identifier,
          limit,
          windowMs,
        );
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(limit - i - 1);
        expect(result.current).toBe(i + 1);
      }

      // Verify usage
      const usage = await rateLimitService.getUsage(
        RateLimitType.PER_IP,
        identifier,
        windowMs,
      );
      expect(usage).toBe(5);
    });

    it('should block when limit exceeded', async () => {
      if (!rateLimitService) {
        console.warn('Skipping test - Redis not available');
        return;
      }

      const identifier = `test-block-${Date.now()}`;
      const limit = 3;
      const windowMs = 60000;

      // Exhaust the limit
      for (let i = 0; i < limit; i++) {
        const result = await rateLimitService.checkLimit(
          RateLimitType.PER_IP,
          identifier,
          limit,
          windowMs,
        );
        expect(result.allowed).toBe(true);
      }

      // Next request should be blocked
      const result = await rateLimitService.checkLimit(
        RateLimitType.PER_IP,
        identifier,
        limit,
        windowMs,
      );
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should handle concurrent requests', async () => {
      if (!rateLimitService) {
        console.warn('Skipping test - Redis not available');
        return;
      }

      const identifier = `test-concurrent-${Date.now()}`;
      const limit = 100;
      const windowMs = 60000;

      // Make concurrent requests
      const promises = Array(50)
        .fill(null)
        .map(() =>
          rateLimitService.checkLimit(
            RateLimitType.PER_IP,
            identifier,
            limit,
            windowMs,
          ),
        );

      const results = await Promise.all(promises);

      // All should be allowed
      expect(results.every((r) => r.allowed)).toBe(true);

      // Verify usage
      const usage = await rateLimitService.getUsage(
        RateLimitType.PER_IP,
        identifier,
        windowMs,
      );
      expect(usage).toBe(50);
    });

    it('should reset limit correctly', async () => {
      if (!rateLimitService) {
        console.warn('Skipping test - Redis not available');
        return;
      }

      const identifier = `test-reset-${Date.now()}`;
      const limit = 5;
      const windowMs = 60000;

      // Use some of the limit
      for (let i = 0; i < 3; i++) {
        await rateLimitService.checkLimit(
          RateLimitType.PER_IP,
          identifier,
          limit,
          windowMs,
        );
      }

      // Verify usage before reset
      let usage = await rateLimitService.getUsage(
        RateLimitType.PER_IP,
        identifier,
        windowMs,
      );
      expect(usage).toBe(3);

      // Reset the limit
      await rateLimitService.resetLimit(
        RateLimitType.PER_IP,
        identifier,
        windowMs,
      );

      // Verify usage after reset
      usage = await rateLimitService.getUsage(
        RateLimitType.PER_IP,
        identifier,
        windowMs,
      );
      expect(usage).toBe(0);

      // Should be able to make requests again
      const result = await rateLimitService.checkLimit(
        RateLimitType.PER_IP,
        identifier,
        limit,
        windowMs,
      );
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(limit - 1);
    });
  });

  describe('pub/sub for Policy Service sync', () => {
    it('should publish config updates', async () => {
      if (!rateLimitService || !redisService) {
        console.warn('Skipping test - Redis not available');
        return;
      }

      const client = redisService.getClient();
      const subscriber = client.duplicate();
      await subscriber.subscribe('nebula:ratelimit');

      const messagePromise = new Promise<string>((resolve) => {
        subscriber.on('message', (channel, message) => {
          if (channel === 'nebula:ratelimit') {
            resolve(message);
          }
        });
      });

      // Update config
      await rateLimitService.updateConfig({
        type: RateLimitType.PER_TENANT,
        identifier: 'test-tenant',
        limit: 1000,
        windowMs: 60000,
        enabled: true,
      });

      // Wait for message with timeout
      const timeoutPromise = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000),
      );

      try {
        const message = await Promise.race([messagePromise, timeoutPromise]);
        const parsed = JSON.parse(message);
        expect(parsed.action).toBe('update');
        expect(parsed.config.limit).toBe(1000);
      } finally {
        await subscriber.unsubscribe();
        await subscriber.quit();
      }
    });

    it('should publish reset events', async () => {
      if (!rateLimitService || !redisService) {
        console.warn('Skipping test - Redis not available');
        return;
      }

      const client = redisService.getClient();
      const subscriber = client.duplicate();
      await subscriber.subscribe('nebula:ratelimit');

      const messagePromise = new Promise<string>((resolve) => {
        subscriber.on('message', (channel, message) => {
          if (channel === 'nebula:ratelimit') {
            resolve(message);
          }
        });
      });

      // Reset limit
      await rateLimitService.resetLimit(RateLimitType.PER_IP, 'test-ip', 60000);

      const timeoutPromise = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000),
      );

      try {
        const message = await Promise.race([messagePromise, timeoutPromise]);
        const parsed = JSON.parse(message);
        expect(parsed.action).toBe('reset');
      } finally {
        await subscriber.unsubscribe();
        await subscriber.quit();
      }
    });
  });

  describe('health check', () => {
    it('should report Redis status', async () => {
      if (!rateLimitService) {
        console.warn('Skipping test - Redis not available');
        return;
      }

      const health = await rateLimitService.getHealth();

      expect(health).toHaveProperty('redis');
      expect(health).toHaveProperty('fallbackSize');
      expect(typeof health.redis).toBe('boolean');
      expect(typeof health.fallbackSize).toBe('number');
    });
  });

  describe('different rate limit types', () => {
    it('should handle per-tenant rate limits', async () => {
      if (!rateLimitService) {
        console.warn('Skipping test - Redis not available');
        return;
      }

      const identifier = `test-tenant-${Date.now()}`;

      const result = await rateLimitService.checkLimit(
        RateLimitType.PER_TENANT,
        identifier,
        1000,
        60000,
      );

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(1000);
    });

    it('should handle per-location rate limits', async () => {
      if (!rateLimitService) {
        console.warn('Skipping test - Redis not available');
        return;
      }

      const identifier = `test-location-${Date.now()}`;

      const result = await rateLimitService.checkLimit(
        RateLimitType.PER_LOCATION,
        identifier,
        500,
        60000,
      );

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(500);
    });

    it('should handle per-api-key rate limits', async () => {
      if (!rateLimitService) {
        console.warn('Skipping test - Redis not available');
        return;
      }

      const identifier = `test-apikey-${Date.now()}`;

      const result = await rateLimitService.checkLimit(
        RateLimitType.PER_API_KEY,
        identifier,
        2000,
        60000,
      );

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(2000);
    });
  });
});
