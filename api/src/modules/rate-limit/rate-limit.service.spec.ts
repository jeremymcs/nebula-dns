// Nebula DNS - Rate Limit Service Unit Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitService } from './rate-limit.service';
import { RedisService } from '@/modules/redis/redis.service';
import { RateLimitType } from './interfaces/rate-limit.interface';

describe('RateLimitService', () => {
  let service: RateLimitService;
  let redisService: jest.Mocked<RedisService>;

  const mockRedisClient = {
    ping: jest.fn(),
    multi: jest.fn(),
    zremrangebyscore: jest.fn(),
    zcard: jest.fn(),
    del: jest.fn(),
    publish: jest.fn(),
  };

  const mockMultiChain = {
    zremrangebyscore: jest.fn().mockReturnThis(),
    zcard: jest.fn().mockReturnThis(),
    zadd: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRedisClient.multi.mockReturnValue(mockMultiChain);
    mockRedisClient.ping.mockResolvedValue('PONG');

    const mockRedisService = {
      getClient: jest.fn().mockReturnValue(mockRedisClient),
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<RateLimitService>(RateLimitService);
    redisService = module.get(RedisService);
  });

  describe('checkLimit', () => {
    it('should allow request when under limit', async () => {
      mockMultiChain.exec.mockResolvedValue([
        [null, 0], // zremrangebyscore result
        [null, 5], // zcard result - 5 requests in window
        [null, 1], // zadd result
        [null, 1], // expire result
      ]);

      const result = await service.checkLimit(
        RateLimitType.PER_IP,
        '192.168.1.1',
        100,
        60000,
      );

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(94); // 100 - 5 - 1
      expect(result.limit).toBe(100);
      expect(result.current).toBe(6);
      expect(result.resetAt).toBeInstanceOf(Date);
    });

    it('should deny request when at limit', async () => {
      mockMultiChain.exec.mockResolvedValue([
        [null, 0],
        [null, 100], // At limit
        [null, 1],
        [null, 1],
      ]);

      mockRedisClient.zremrangebyscore.mockResolvedValue(1);

      const result = await service.checkLimit(
        RateLimitType.PER_IP,
        '192.168.1.1',
        100,
        60000,
      );

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.current).toBe(100);
    });

    it('should deny request when over limit', async () => {
      mockMultiChain.exec.mockResolvedValue([
        [null, 0],
        [null, 150], // Over limit
        [null, 1],
        [null, 1],
      ]);

      mockRedisClient.zremrangebyscore.mockResolvedValue(1);

      const result = await service.checkLimit(
        RateLimitType.PER_IP,
        '192.168.1.1',
        100,
        60000,
      );

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should use correct key format', async () => {
      mockMultiChain.exec.mockResolvedValue([
        [null, 0],
        [null, 0],
        [null, 1],
        [null, 1],
      ]);

      await service.checkLimit(
        RateLimitType.PER_TENANT,
        'tenant-123',
        1000,
        3600000, // 1 hour
      );

      // Verify multi was called on the client
      expect(mockRedisClient.multi).toHaveBeenCalled();
    });

    it('should fall back to in-memory when Redis fails', async () => {
      mockMultiChain.exec.mockRejectedValue(
        new Error('Redis connection failed'),
      );

      const result = await service.checkLimit(
        RateLimitType.PER_IP,
        '192.168.1.1',
        100,
        60000,
      );

      // Should allow in fail-open mode
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);
    });

    it('should handle different rate limit types', async () => {
      mockMultiChain.exec.mockResolvedValue([
        [null, 0],
        [null, 10],
        [null, 1],
        [null, 1],
      ]);

      const types = [
        RateLimitType.PER_IP,
        RateLimitType.PER_TENANT,
        RateLimitType.PER_LOCATION,
        RateLimitType.PER_API_KEY,
      ];

      for (const type of types) {
        const result = await service.checkLimit(type, 'test-id', 100, 60000);
        expect(result.allowed).toBe(true);
      }
    });
  });

  describe('getUsage', () => {
    it('should return current usage count', async () => {
      mockRedisClient.zremrangebyscore.mockResolvedValue(0);
      mockRedisClient.zcard.mockResolvedValue(50);

      const usage = await service.getUsage(
        RateLimitType.PER_IP,
        '192.168.1.1',
        60000,
      );

      expect(usage).toBe(50);
    });

    it('should return 0 when no usage', async () => {
      mockRedisClient.zremrangebyscore.mockResolvedValue(0);
      mockRedisClient.zcard.mockResolvedValue(0);

      const usage = await service.getUsage(
        RateLimitType.PER_IP,
        '192.168.1.1',
        60000,
      );

      expect(usage).toBe(0);
    });
  });

  describe('resetLimit', () => {
    it('should delete the rate limit bucket', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await service.resetLimit(RateLimitType.PER_IP, '192.168.1.1', 60000);

      expect(mockRedisClient.del).toHaveBeenCalled();
    });

    it('should publish reset message via pub/sub', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await service.resetLimit(RateLimitType.PER_IP, '192.168.1.1', 60000);

      expect(redisService.publish).toHaveBeenCalledWith(
        'nebula:ratelimit',
        expect.stringContaining('"action":"reset"'),
      );
    });
  });

  describe('updateConfig', () => {
    it('should publish config update via pub/sub', async () => {
      const config = {
        type: RateLimitType.PER_TENANT,
        identifier: 'tenant-123',
        limit: 1000,
        windowMs: 60000,
        enabled: true,
      };

      await service.updateConfig(config);

      expect(redisService.publish).toHaveBeenCalledWith(
        'nebula:ratelimit',
        expect.stringContaining('"action":"update"'),
      );
      expect(redisService.publish).toHaveBeenCalledWith(
        'nebula:ratelimit',
        expect.stringContaining('"limit":1000'),
      );
    });
  });

  describe('deleteConfig', () => {
    it('should publish delete message via pub/sub', async () => {
      await service.deleteConfig(RateLimitType.PER_TENANT, 'tenant-123');

      expect(redisService.publish).toHaveBeenCalledWith(
        'nebula:ratelimit',
        expect.stringContaining('"action":"delete"'),
      );
    });
  });

  describe('getHealth', () => {
    it('should return health status with Redis available', async () => {
      mockRedisClient.ping.mockResolvedValue('PONG');

      const health = await service.getHealth();

      expect(health.redis).toBe(true);
      expect(health.fallbackSize).toBeGreaterThanOrEqual(0);
    });

    it('should return health status with Redis unavailable', async () => {
      mockRedisClient.ping.mockRejectedValue(new Error('Connection failed'));

      const health = await service.getHealth();

      expect(health.redis).toBe(false);
    });
  });

  describe('isRedisAvailable', () => {
    it('should return true when Redis is available', () => {
      expect(service.isRedisAvailable()).toBe(true);
    });
  });

  describe('in-memory fallback', () => {
    it('should track requests in memory when Redis fails', async () => {
      // Make Redis fail
      mockMultiChain.exec.mockRejectedValue(new Error('Redis down'));

      // First request should be allowed
      const result1 = await service.checkLimit(
        RateLimitType.PER_IP,
        '192.168.1.100',
        5,
        60000,
      );
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(4);

      // Subsequent requests should decrement remaining
      const result2 = await service.checkLimit(
        RateLimitType.PER_IP,
        '192.168.1.100',
        5,
        60000,
      );
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(3);
    });

    it('should block when in-memory limit exceeded', async () => {
      mockMultiChain.exec.mockRejectedValue(new Error('Redis down'));

      // Exhaust the limit
      for (let i = 0; i < 5; i++) {
        await service.checkLimit(
          RateLimitType.PER_IP,
          '192.168.1.200',
          5,
          60000,
        );
      }

      // Next request should be blocked
      const result = await service.checkLimit(
        RateLimitType.PER_IP,
        '192.168.1.200',
        5,
        60000,
      );
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });
});
