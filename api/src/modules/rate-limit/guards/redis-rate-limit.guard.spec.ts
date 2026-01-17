// Nebula DNS - Redis Rate Limit Guard Unit Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisRateLimitGuard } from './redis-rate-limit.guard';
import { RateLimitService } from '../rate-limit.service';
import { RateLimitType } from '../interfaces/rate-limit.interface';
import { RATE_LIMIT_KEY } from '../decorators/rate-limit.decorator';

describe('RedisRateLimitGuard', () => {
  let guard: RedisRateLimitGuard;
  let reflector: Reflector;
  let rateLimitService: jest.Mocked<RateLimitService>;

  const mockRequest: Record<string, any> = {
    ip: '192.168.1.1',
    headers: {},
    user: { tenantId: 'tenant-123' },
    params: {},
    body: {},
    query: {},
  };

  const mockContext = {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;

  beforeEach(async () => {
    const mockRateLimitService = {
      checkLimit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisRateLimitGuard,
        Reflector,
        {
          provide: RateLimitService,
          useValue: mockRateLimitService,
        },
      ],
    }).compile();

    guard = module.get<RedisRateLimitGuard>(RedisRateLimitGuard);
    reflector = module.get<Reflector>(Reflector);
    rateLimitService = module.get(RateLimitService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow request when no rate limit configured', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(rateLimitService.checkLimit).not.toHaveBeenCalled();
    });

    it('should allow request when under rate limit', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        type: RateLimitType.PER_IP,
        limit: 100,
        windowMs: 60000,
      });

      rateLimitService.checkLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetAt: new Date(Date.now() + 60000),
        limit: 100,
        current: 1,
      });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(rateLimitService.checkLimit).toHaveBeenCalledWith(
        RateLimitType.PER_IP,
        '192.168.1.1',
        100,
        60000,
      );
    });

    it('should throw HttpException when rate limit exceeded', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        type: RateLimitType.PER_IP,
        limit: 100,
        windowMs: 60000,
      });

      rateLimitService.checkLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + 30000),
        limit: 100,
        current: 101,
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        HttpException,
      );

      try {
        await guard.canActivate(mockContext);
      } catch (error) {
        expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(error.getResponse()).toMatchObject({
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests, please try again later',
          limit: 100,
          remaining: 0,
        });
      }
    });

    it('should use custom error message when provided', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        type: RateLimitType.PER_IP,
        limit: 5,
        windowMs: 60000,
        message: 'Custom rate limit message',
      });

      rateLimitService.checkLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + 30000),
        limit: 5,
        current: 6,
      });

      try {
        await guard.canActivate(mockContext);
      } catch (error) {
        expect(error.getResponse().message).toBe('Custom rate limit message');
      }
    });

    it('should skip rate limiting when skip function returns true', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        type: RateLimitType.PER_IP,
        limit: 100,
        windowMs: 60000,
        skip: () => true,
      });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(rateLimitService.checkLimit).not.toHaveBeenCalled();
    });

    it('should use custom key generator when provided', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        type: RateLimitType.PER_IP,
        limit: 100,
        windowMs: 60000,
        keyGenerator: (req: any) => `custom:${req.ip}`,
      });

      rateLimitService.checkLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetAt: new Date(Date.now() + 60000),
        limit: 100,
        current: 1,
      });

      await guard.canActivate(mockContext);

      expect(rateLimitService.checkLimit).toHaveBeenCalledWith(
        RateLimitType.PER_IP,
        'custom:192.168.1.1',
        100,
        60000,
      );
    });

    it('should store rate limit result in request', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        type: RateLimitType.PER_IP,
        limit: 100,
        windowMs: 60000,
      });

      const resetAt = new Date(Date.now() + 60000);
      rateLimitService.checkLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetAt,
        limit: 100,
        current: 1,
      });

      await guard.canActivate(mockContext);

      expect(mockRequest['rateLimitResult']).toEqual({
        allowed: true,
        remaining: 99,
        resetAt,
        limit: 100,
        current: 1,
      });
    });
  });

  describe('identifier extraction', () => {
    it('should extract IP from x-forwarded-for header', async () => {
      const request = {
        ...mockRequest,
        headers: { 'x-forwarded-for': '10.0.0.1, 192.168.1.1' },
      };

      const context = {
        ...mockContext,
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        type: RateLimitType.PER_IP,
        limit: 100,
        windowMs: 60000,
      });

      rateLimitService.checkLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetAt: new Date(Date.now() + 60000),
        limit: 100,
        current: 1,
      });

      await guard.canActivate(context);

      expect(rateLimitService.checkLimit).toHaveBeenCalledWith(
        RateLimitType.PER_IP,
        '10.0.0.1',
        100,
        60000,
      );
    });

    it('should extract IP from x-real-ip header', async () => {
      const request = {
        ...mockRequest,
        headers: { 'x-real-ip': '10.0.0.2' },
      };

      const context = {
        ...mockContext,
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        type: RateLimitType.PER_IP,
        limit: 100,
        windowMs: 60000,
      });

      rateLimitService.checkLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetAt: new Date(Date.now() + 60000),
        limit: 100,
        current: 1,
      });

      await guard.canActivate(context);

      expect(rateLimitService.checkLimit).toHaveBeenCalledWith(
        RateLimitType.PER_IP,
        '10.0.0.2',
        100,
        60000,
      );
    });

    it('should extract tenant ID for per-tenant rate limit', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        type: RateLimitType.PER_TENANT,
        limit: 1000,
        windowMs: 60000,
      });

      rateLimitService.checkLimit.mockResolvedValue({
        allowed: true,
        remaining: 999,
        resetAt: new Date(Date.now() + 60000),
        limit: 1000,
        current: 1,
      });

      await guard.canActivate(mockContext);

      expect(rateLimitService.checkLimit).toHaveBeenCalledWith(
        RateLimitType.PER_TENANT,
        'tenant-123',
        1000,
        60000,
      );
    });

    it('should extract location ID for per-location rate limit', async () => {
      const request = {
        ...mockRequest,
        params: { locationId: 'location-456' },
      };

      const context = {
        ...mockContext,
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        type: RateLimitType.PER_LOCATION,
        limit: 500,
        windowMs: 60000,
      });

      rateLimitService.checkLimit.mockResolvedValue({
        allowed: true,
        remaining: 499,
        resetAt: new Date(Date.now() + 60000),
        limit: 500,
        current: 1,
      });

      await guard.canActivate(context);

      expect(rateLimitService.checkLimit).toHaveBeenCalledWith(
        RateLimitType.PER_LOCATION,
        'location-456',
        500,
        60000,
      );
    });

    it('should extract API key ID for per-api-key rate limit', async () => {
      const request = {
        ...mockRequest,
        apiKey: { id: 'apikey-789' },
      };

      const context = {
        ...mockContext,
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        type: RateLimitType.PER_API_KEY,
        limit: 2000,
        windowMs: 60000,
      });

      rateLimitService.checkLimit.mockResolvedValue({
        allowed: true,
        remaining: 1999,
        resetAt: new Date(Date.now() + 60000),
        limit: 2000,
        current: 1,
      });

      await guard.canActivate(context);

      expect(rateLimitService.checkLimit).toHaveBeenCalledWith(
        RateLimitType.PER_API_KEY,
        'apikey-789',
        2000,
        60000,
      );
    });

    it('should fail open when identifier cannot be determined', async () => {
      const request = {
        ip: null,
        headers: {},
        user: {},
        params: {},
        body: {},
        query: {},
      };

      const context = {
        ...mockContext,
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        type: RateLimitType.PER_TENANT,
        limit: 100,
        windowMs: 60000,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(rateLimitService.checkLimit).not.toHaveBeenCalled();
    });
  });
});
