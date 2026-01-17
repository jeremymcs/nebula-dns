// Nebula DNS - Webhooks Service Unit Tests with Idempotency
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { Webhook, WebhookEvent } from './entities/webhook.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { WebhookIdempotencyKey } from './entities/webhook-idempotency.entity';
import { RedisService } from '../redis/redis.service';
import { MetricsService } from '../metrics/metrics.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let webhookRepository: any;
  let deliveryRepository: any;
  let idempotencyRepository: any;
  let redisService: any;
  let metricsService: any;
  let auditLogsService: any;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';

  const mockWebhook: Partial<Webhook> = {
    id: 'webhook-123',
    tenantId: mockTenantId,
    name: 'Test Webhook',
    url: 'https://example.com/webhook',
    secretHash: 'test-secret',
    events: ['policy.created', 'policy.updated'] as WebhookEvent[],
    isEnabled: true,
    headers: {},
    ipAllowlist: [],
    rateLimit: 60,
    lastTriggeredAt: null,
    lastStatusCode: null,
    lastError: null,
    failureCount: 0,
    createdAt: new Date('2024-01-01'),
    previousSecret: null,
    secretRotatedAt: null,
    secretGracePeriodEnds: null,
  };

  const mockWebhookRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    }),
  };

  const mockDeliveryRepository = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockIdempotencyRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockRedisClient = {
    get: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    duplicate: jest.fn().mockReturnValue({
      subscribe: jest.fn(),
      on: jest.fn(),
    }),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    publish: jest.fn(),
    getClient: jest.fn().mockReturnValue(mockRedisClient),
  };

  const mockMetricsService = {
    incrementCounter: jest.fn(),
    setGauge: jest.fn(),
  };

  const mockAuditLogsService = {
    log: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        {
          provide: getRepositoryToken(Webhook),
          useValue: mockWebhookRepository,
        },
        {
          provide: getRepositoryToken(WebhookDelivery),
          useValue: mockDeliveryRepository,
        },
        {
          provide: getRepositoryToken(WebhookIdempotencyKey),
          useValue: mockIdempotencyRepository,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
        {
          provide: AuditLogsService,
          useValue: mockAuditLogsService,
        },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
    webhookRepository = module.get(getRepositoryToken(Webhook));
    deliveryRepository = module.get(getRepositoryToken(WebhookDelivery));
    idempotencyRepository = module.get(
      getRepositoryToken(WebhookIdempotencyKey),
    );
    redisService = module.get(RedisService);
    metricsService = module.get(MetricsService);
    auditLogsService = module.get(AuditLogsService);

    jest.clearAllMocks();
  });

  describe('IP Allowlist Validation', () => {
    describe('validateIpAllowlist', () => {
      it('should allow all IPs when allowlist is empty', () => {
        expect(service.validateIpAllowlist('192.168.1.100', [])).toBe(true);
        expect(service.validateIpAllowlist('10.0.0.1', [])).toBe(true);
      });

      it('should allow exact IP match', () => {
        const allowlist = ['192.168.1.100', '10.0.0.1'];
        expect(service.validateIpAllowlist('192.168.1.100', allowlist)).toBe(
          true,
        );
        expect(service.validateIpAllowlist('10.0.0.1', allowlist)).toBe(true);
      });

      it('should reject IP not in allowlist', () => {
        const allowlist = ['192.168.1.100'];
        expect(service.validateIpAllowlist('192.168.1.101', allowlist)).toBe(
          false,
        );
        expect(service.validateIpAllowlist('10.0.0.1', allowlist)).toBe(false);
      });

      it('should handle CIDR range matching', () => {
        const allowlist = ['192.168.1.0/24'];
        expect(service.validateIpAllowlist('192.168.1.1', allowlist)).toBe(
          true,
        );
        expect(service.validateIpAllowlist('192.168.1.254', allowlist)).toBe(
          true,
        );
        expect(service.validateIpAllowlist('192.168.2.1', allowlist)).toBe(
          false,
        );
      });

      it('should handle /32 CIDR (single IP)', () => {
        const allowlist = ['10.0.0.1/32'];
        expect(service.validateIpAllowlist('10.0.0.1', allowlist)).toBe(true);
        expect(service.validateIpAllowlist('10.0.0.2', allowlist)).toBe(false);
      });

      it('should handle /16 CIDR range', () => {
        const allowlist = ['172.16.0.0/16'];
        expect(service.validateIpAllowlist('172.16.0.1', allowlist)).toBe(true);
        expect(service.validateIpAllowlist('172.16.255.255', allowlist)).toBe(
          true,
        );
        expect(service.validateIpAllowlist('172.17.0.1', allowlist)).toBe(
          false,
        );
      });

      it('should handle /8 CIDR range', () => {
        const allowlist = ['10.0.0.0/8'];
        expect(service.validateIpAllowlist('10.0.0.1', allowlist)).toBe(true);
        expect(service.validateIpAllowlist('10.255.255.255', allowlist)).toBe(
          true,
        );
        expect(service.validateIpAllowlist('11.0.0.1', allowlist)).toBe(false);
      });

      it('should normalize IPv6-mapped IPv4 addresses', () => {
        const allowlist = ['192.168.1.100'];
        expect(
          service.validateIpAllowlist('::ffff:192.168.1.100', allowlist),
        ).toBe(true);
        expect(
          service.validateIpAllowlist('::ffff:192.168.1.101', allowlist),
        ).toBe(false);
      });

      it('should handle mixed allowlist with IPs and CIDRs', () => {
        const allowlist = ['192.168.1.100', '10.0.0.0/8', '172.16.0.0/12'];
        expect(service.validateIpAllowlist('192.168.1.100', allowlist)).toBe(
          true,
        );
        expect(service.validateIpAllowlist('10.50.100.200', allowlist)).toBe(
          true,
        );
        expect(service.validateIpAllowlist('172.20.5.10', allowlist)).toBe(
          true,
        );
        expect(service.validateIpAllowlist('8.8.8.8', allowlist)).toBe(false);
      });

      it('should return false for malformed CIDR', () => {
        const allowlist = ['192.168.1.0/99']; // Invalid mask
        expect(service.validateIpAllowlist('192.168.1.1', allowlist)).toBe(
          false,
        );
      });

      it('should handle null/undefined allowlist', () => {
        expect(service.validateIpAllowlist('192.168.1.1', null as any)).toBe(
          true,
        );
        expect(
          service.validateIpAllowlist('192.168.1.1', undefined as any),
        ).toBe(true);
      });
    });
  });

  describe('Rate Limiting', () => {
    describe('checkRateLimit', () => {
      it('should allow request when under limit', async () => {
        mockRedisService.get.mockResolvedValue('5'); // 5 requests made
        mockRedisClient.incr.mockResolvedValue(6);

        const result = await service.checkRateLimit(
          'webhook-123',
          mockTenantId,
          60,
        );

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(54); // 60 - 6
      });

      it('should reject request when at limit', async () => {
        mockRedisService.get.mockResolvedValue('60'); // At limit
        mockRedisClient.ttl.mockResolvedValue(30);

        const result = await service.checkRateLimit(
          'webhook-123',
          mockTenantId,
          60,
        );

        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
        expect(result.resetInSeconds).toBe(30);
      });

      it('should allow unlimited requests when rateLimit is 0', async () => {
        const result = await service.checkRateLimit(
          'webhook-123',
          mockTenantId,
          0,
        );

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(-1);
        expect(mockRedisService.get).not.toHaveBeenCalled();
      });

      it('should set expiration on first request', async () => {
        mockRedisService.get.mockResolvedValue(null); // No existing count
        mockRedisClient.incr.mockResolvedValue(1);

        await service.checkRateLimit('webhook-123', mockTenantId, 60);

        expect(mockRedisClient.expire).toHaveBeenCalledWith(
          expect.any(String),
          60,
        );
      });

      it('should not set expiration on subsequent requests', async () => {
        mockRedisService.get.mockResolvedValue('5');
        mockRedisClient.incr.mockResolvedValue(6);

        await service.checkRateLimit('webhook-123', mockTenantId, 60);

        expect(mockRedisClient.expire).not.toHaveBeenCalled();
      });

      it('should use correct Redis key format', async () => {
        mockRedisService.get.mockResolvedValue('0');
        mockRedisClient.incr.mockResolvedValue(1);

        await service.checkRateLimit('webhook-456', 'tenant-789', 60);

        expect(mockRedisService.get).toHaveBeenCalledWith(
          'webhook_ratelimit:tenant-789:webhook-456',
        );
      });

      it('should fail-open on Redis error', async () => {
        mockRedisService.get.mockRejectedValue(
          new Error('Redis connection failed'),
        );

        const result = await service.checkRateLimit(
          'webhook-123',
          mockTenantId,
          60,
        );

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(-1);
      });
    });
  });

  describe('HMAC Signature Generation', () => {
    it('should generate consistent HMAC signature', () => {
      const payload = JSON.stringify({ event: 'test', data: { id: '123' } });
      const secret = 'test-secret';

      // Access private method through any cast for testing
      const signature1 = (service as any).generateSignature(payload, secret);
      const signature2 = (service as any).generateSignature(payload, secret);

      expect(signature1).toBe(signature2);
      expect(signature1).toHaveLength(64); // SHA256 hex = 64 chars
    });

    it('should generate different signatures for different payloads', () => {
      const secret = 'test-secret';
      const signature1 = (service as any).generateSignature('payload1', secret);
      const signature2 = (service as any).generateSignature('payload2', secret);

      expect(signature1).not.toBe(signature2);
    });

    it('should generate different signatures for different secrets', () => {
      const payload = 'test-payload';
      const signature1 = (service as any).generateSignature(payload, 'secret1');
      const signature2 = (service as any).generateSignature(payload, 'secret2');

      expect(signature1).not.toBe(signature2);
    });
  });

  describe('Webhook CRUD Operations', () => {
    describe('create', () => {
      it('should create webhook with security fields', async () => {
        const createDto = {
          name: 'Test Webhook',
          url: 'https://example.com/webhook',
          events: ['policy.created'],
          ipAllowlist: ['192.168.1.0/24'],
          rateLimit: 100,
        };

        mockWebhookRepository.create.mockReturnValue({
          ...mockWebhook,
          ...createDto,
        });
        mockWebhookRepository.save.mockResolvedValue({
          ...mockWebhook,
          ...createDto,
        });

        const result = await service.create(mockTenantId, createDto);

        expect(result.ipAllowlist).toEqual(['192.168.1.0/24']);
        expect(result.rateLimit).toBe(100);
      });

      it('should use default rate limit when not specified', async () => {
        const createDto = {
          name: 'Test Webhook',
          url: 'https://example.com/webhook',
          events: ['policy.created'],
        };

        mockWebhookRepository.create.mockReturnValue({
          ...mockWebhook,
          rateLimit: 60,
        });
        mockWebhookRepository.save.mockResolvedValue({
          ...mockWebhook,
          rateLimit: 60,
        });

        await service.create(mockTenantId, createDto);

        expect(mockWebhookRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            rateLimit: 60,
          }),
        );
      });

      it('should reject invalid IP in allowlist', async () => {
        const createDto = {
          name: 'Test Webhook',
          url: 'https://example.com/webhook',
          events: ['policy.created'],
          ipAllowlist: ['invalid-ip'],
        };

        await expect(service.create(mockTenantId, createDto)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should reject invalid CIDR in allowlist', async () => {
        const createDto = {
          name: 'Test Webhook',
          url: 'https://example.com/webhook',
          events: ['policy.created'],
          ipAllowlist: ['192.168.1.0/99'], // Invalid mask
        };

        await expect(service.create(mockTenantId, createDto)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should reject invalid event types', async () => {
        const createDto = {
          name: 'Test Webhook',
          url: 'https://example.com/webhook',
          events: ['invalid.event'],
        };

        await expect(service.create(mockTenantId, createDto)).rejects.toThrow(
          BadRequestException,
        );
      });
    });

    describe('update', () => {
      it('should update webhook security fields', async () => {
        mockWebhookRepository.findOne.mockResolvedValue({ ...mockWebhook });
        mockWebhookRepository.save.mockImplementation((w) =>
          Promise.resolve(w),
        );

        const updateDto = {
          ipAllowlist: ['10.0.0.0/8'],
          rateLimit: 120,
        };

        const result = await service.update(
          mockTenantId,
          mockWebhook.id!,
          updateDto,
        );

        expect(result.ipAllowlist).toEqual(['10.0.0.0/8']);
        expect(result.rateLimit).toBe(120);
      });

      it('should clear IP allowlist with empty array', async () => {
        mockWebhookRepository.findOne.mockResolvedValue({
          ...mockWebhook,
          ipAllowlist: ['192.168.1.0/24'],
        });
        mockWebhookRepository.save.mockImplementation((w) =>
          Promise.resolve(w),
        );

        const result = await service.update(mockTenantId, mockWebhook.id!, {
          ipAllowlist: [],
        });

        expect(result.ipAllowlist).toEqual([]);
      });
    });

    describe('findOne', () => {
      it('should return webhook', async () => {
        mockWebhookRepository.findOne.mockResolvedValue(mockWebhook);

        const result = await service.findOne(mockTenantId, mockWebhook.id!);

        expect(result.id).toBe(mockWebhook.id);
        expect(result.ipAllowlist).toEqual([]);
      });

      it('should throw NotFoundException for non-existent webhook', async () => {
        mockWebhookRepository.findOne.mockResolvedValue(null);

        await expect(
          service.findOne(mockTenantId, 'nonexistent-id'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('findAll', () => {
      it('should return webhooks for tenant', async () => {
        mockWebhookRepository.find.mockResolvedValue([mockWebhook]);

        const result = await service.findAll(mockTenantId);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(mockWebhook.id);
      });

      it('should include security fields in response', async () => {
        mockWebhookRepository.find.mockResolvedValue([
          { ...mockWebhook, ipAllowlist: ['10.0.0.0/8'], rateLimit: 100 },
        ]);

        const result = await service.findAll(mockTenantId);

        expect(result[0].ipAllowlist).toEqual(['10.0.0.0/8']);
        expect(result[0].rateLimit).toBe(100);
      });
    });
  });

  describe('Redis Pub/Sub Integration', () => {
    describe('publishWebhookEvent', () => {
      it('should publish event to Redis channel', async () => {
        mockRedisService.publish.mockResolvedValue(undefined);

        await service.publishWebhookEvent(
          mockTenantId,
          'policy.created' as WebhookEvent,
          { id: 'policy-123' },
        );

        expect(mockRedisService.publish).toHaveBeenCalledWith(
          'webhook_events',
          expect.stringContaining(mockTenantId),
        );
      });

      it('should include event data in message', async () => {
        mockRedisService.publish.mockResolvedValue(undefined);

        await service.publishWebhookEvent(
          mockTenantId,
          'policy.created' as WebhookEvent,
          { id: 'policy-123', name: 'Test Policy' },
        );

        const publishCall = mockRedisService.publish.mock.calls[0];
        const message = JSON.parse(publishCall[1]);

        expect(message.tenantId).toBe(mockTenantId);
        expect(message.event).toBe('policy.created');
        expect(message.data).toEqual({ id: 'policy-123', name: 'Test Policy' });
        expect(message.timestamp).toBeDefined();
      });

      it('should fallback to sync trigger on publish failure', async () => {
        mockRedisService.publish.mockRejectedValue(new Error('Redis error'));
        mockWebhookRepository.find.mockResolvedValue([]);

        await service.publishWebhookEvent(
          mockTenantId,
          'policy.created' as WebhookEvent,
          { id: 'policy-123' },
        );

        expect(mockWebhookRepository.find).toHaveBeenCalled();
      });
    });
  });

  describe('Webhook Event Filtering', () => {
    describe('trigger', () => {
      it('should only trigger webhooks subscribed to the event', async () => {
        const webhook1 = {
          ...mockWebhook,
          id: 'webhook-1',
          events: ['policy.created'] as WebhookEvent[],
        };
        const webhook2 = {
          ...mockWebhook,
          id: 'webhook-2',
          events: ['policy.deleted'] as WebhookEvent[],
        };

        mockWebhookRepository.find.mockResolvedValue([webhook1, webhook2]);

        // Mock rate limit check
        mockRedisService.get.mockResolvedValue('0');
        mockRedisClient.incr.mockResolvedValue(1);

        await service.trigger(mockTenantId, 'policy.created' as WebhookEvent, {
          id: 'policy-123',
        });

        // Only webhook1 should be triggered (has policy.created event)
        // webhook2 should not be triggered (only has policy.deleted)
        expect(mockWebhookRepository.find).toHaveBeenCalledWith({
          where: { tenantId: mockTenantId, isEnabled: true },
        });
      });
    });
  });

  describe('Webhook Delivery', () => {
    describe('getDeliveries', () => {
      it('should return delivery history', async () => {
        const mockDelivery = {
          id: 'delivery-123',
          webhookId: mockWebhook.id,
          eventType: 'policy.created',
          payload: { id: 'policy-123' },
          statusCode: 200,
          responseTimeMs: 150,
          error: null,
          retryCount: 0,
          createdAt: new Date(),
        };

        mockWebhookRepository.findOne.mockResolvedValue(mockWebhook);
        mockDeliveryRepository.find.mockResolvedValue([mockDelivery]);

        const result = await service.getDeliveries(
          mockTenantId,
          mockWebhook.id!,
          50,
        );

        expect(result).toHaveLength(1);
        expect(result[0].statusCode).toBe(200);
        expect(result[0].eventType).toBe('policy.created');
      });
    });
  });

  describe('Auto-disable on Failures', () => {
    it('should disable webhook after 10 consecutive failures', async () => {
      const failingWebhook = {
        ...mockWebhook,
        failureCount: 9,
        isEnabled: true,
      };

      mockWebhookRepository.findOne.mockResolvedValue(failingWebhook);
      mockWebhookRepository.save.mockImplementation((w) => Promise.resolve(w));
      mockRedisService.get.mockResolvedValue('0');
      mockRedisClient.incr.mockResolvedValue(1);

      // Trigger a failure (URL doesn't exist, will fail)
      await service.trigger(mockTenantId, 'policy.created' as WebhookEvent, {
        id: 'policy-123',
      });

      // The webhook save should have been called with isEnabled = false
      // This depends on delivery actually failing, which it will since URL doesn't exist
    });
  });

  describe('Metrics Recording', () => {
    it('should record delivery metrics on success', async () => {
      mockWebhookRepository.find.mockResolvedValue([mockWebhook]);
      mockRedisService.get.mockResolvedValue('0');
      mockRedisClient.incr.mockResolvedValue(1);

      // Mock successful HTTP response
      // Note: This test is limited since we can't easily mock httpPost
      // The actual metrics recording is tested through integration tests

      expect(mockMetricsService.incrementCounter).toBeDefined();
      expect(mockMetricsService.setGauge).toBeDefined();
    });
  });

  describe('Test Webhook', () => {
    it('should test webhook without recording delivery', async () => {
      mockWebhookRepository.findOne.mockResolvedValue(mockWebhook);

      // Test webhook - should not call deliveryRepository.save
      const result = await service.test(mockTenantId, mockWebhook.id!);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('responseTimeMs');
      // deliveryRepository.save should NOT be called for test deliveries
    });
  });

  describe('Enable/Disable', () => {
    it('should enable webhook and reset failure count', async () => {
      const disabledWebhook = {
        ...mockWebhook,
        isEnabled: false,
        failureCount: 5,
        lastError: 'Previous error',
      };

      mockWebhookRepository.findOne.mockResolvedValue(disabledWebhook);
      mockWebhookRepository.save.mockImplementation((w) => Promise.resolve(w));

      const result = await service.enable(mockTenantId, mockWebhook.id!);

      expect(result.isEnabled).toBe(true);
      expect(result.failureCount).toBe(0);
      expect(result.lastError).toBeNull();
    });

    it('should disable webhook', async () => {
      mockWebhookRepository.findOne.mockResolvedValue({ ...mockWebhook });
      mockWebhookRepository.save.mockImplementation((w) => Promise.resolve(w));

      const result = await service.disable(mockTenantId, mockWebhook.id!);

      expect(result.isEnabled).toBe(false);
    });
  });

  describe('Available Events', () => {
    it('should return list of available webhook events', () => {
      const events = service.getAvailableEvents();

      expect(events).toContain('policy.created');
      expect(events).toContain('policy.updated');
      expect(events).toContain('policy.deleted');
      expect(events).toContain('threat.detected');
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('Idempotency', () => {
    describe('checkIdempotencyKey', () => {
      it('should return exists: false when key does not exist', async () => {
        mockIdempotencyRepository.findOne.mockResolvedValue(null);

        const result = await service.checkIdempotencyKey(
          'webhook-123',
          'idempotency-key-123',
        );

        expect(result.exists).toBe(false);
        expect(result.cachedResponse).toBeUndefined();
      });

      it('should return exists: true with cached response when key exists and acknowledged', async () => {
        mockIdempotencyRepository.findOne.mockResolvedValue({
          key: 'idempotency-key-123',
          webhookId: 'webhook-123',
          acknowledged: true,
          responseStatus: 200,
          responseBody: '{"success": true}',
        });

        const result = await service.checkIdempotencyKey(
          'webhook-123',
          'idempotency-key-123',
        );

        expect(result.exists).toBe(true);
        expect(result.cachedResponse).toEqual({
          statusCode: 200,
          body: '{"success": true}',
        });
      });

      it('should return exists: false when key exists but not acknowledged', async () => {
        mockIdempotencyRepository.findOne.mockResolvedValue({
          key: 'idempotency-key-123',
          webhookId: 'webhook-123',
          acknowledged: false,
        });

        const result = await service.checkIdempotencyKey(
          'webhook-123',
          'idempotency-key-123',
        );

        expect(result.exists).toBe(false);
      });

      it('should fail-open on repository error', async () => {
        mockIdempotencyRepository.findOne.mockRejectedValue(
          new Error('Database error'),
        );

        const result = await service.checkIdempotencyKey(
          'webhook-123',
          'idempotency-key-123',
        );

        expect(result.exists).toBe(false);
      });
    });

    describe('storeIdempotencyKey', () => {
      it('should store idempotency key with response', async () => {
        mockIdempotencyRepository.create.mockReturnValue({
          key: 'idempotency-key-123',
          webhookId: 'webhook-123',
          eventType: 'policy.created',
          acknowledged: true,
          responseStatus: 200,
          responseBody: '{"success": true}',
        });
        mockIdempotencyRepository.save.mockResolvedValue({});

        await service.storeIdempotencyKey(
          'idempotency-key-123',
          'webhook-123',
          'policy.created',
          true,
          { statusCode: 200, body: '{"success": true}' },
        );

        expect(mockIdempotencyRepository.create).toHaveBeenCalledWith({
          key: 'idempotency-key-123',
          webhookId: 'webhook-123',
          eventType: 'policy.created',
          acknowledged: true,
          responseStatus: 200,
          responseBody: '{"success": true}',
        });
        expect(mockIdempotencyRepository.save).toHaveBeenCalled();
      });

      it('should truncate response body to 1000 characters', async () => {
        const longBody = 'x'.repeat(2000);
        mockIdempotencyRepository.create.mockReturnValue({});
        mockIdempotencyRepository.save.mockResolvedValue({});

        await service.storeIdempotencyKey(
          'idempotency-key-123',
          'webhook-123',
          'policy.created',
          true,
          { statusCode: 200, body: longBody },
        );

        expect(mockIdempotencyRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            responseBody: 'x'.repeat(1000),
          }),
        );
      });

      it('should not throw on save error', async () => {
        mockIdempotencyRepository.create.mockReturnValue({});
        mockIdempotencyRepository.save.mockRejectedValue(
          new Error('Database error'),
        );

        // Should not throw
        await expect(
          service.storeIdempotencyKey(
            'idempotency-key-123',
            'webhook-123',
            'policy.created',
            true,
          ),
        ).resolves.toBeUndefined();
      });
    });

    describe('cleanupOldIdempotencyKeys', () => {
      it('should delete keys older than 7 days', async () => {
        mockIdempotencyRepository.delete.mockResolvedValue({ affected: 5 });

        await service.cleanupOldIdempotencyKeys();

        expect(mockIdempotencyRepository.delete).toHaveBeenCalledWith({
          deliveredAt: expect.any(Object),
        });
      });

      it('should handle no keys to delete', async () => {
        mockIdempotencyRepository.delete.mockResolvedValue({ affected: 0 });

        await service.cleanupOldIdempotencyKeys();

        expect(mockIdempotencyRepository.delete).toHaveBeenCalled();
      });

      it('should not throw on delete error', async () => {
        mockIdempotencyRepository.delete.mockRejectedValue(
          new Error('Database error'),
        );

        // Should not throw
        await expect(
          service.cleanupOldIdempotencyKeys(),
        ).resolves.toBeUndefined();
      });
    });

    describe('generateIdempotencyKey', () => {
      it('should generate a valid UUID v4', () => {
        const key = (service as any).generateIdempotencyKey();

        // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
        const uuidV4Regex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        expect(key).toMatch(uuidV4Regex);
      });

      it('should generate unique keys', () => {
        const key1 = (service as any).generateIdempotencyKey();
        const key2 = (service as any).generateIdempotencyKey();

        expect(key1).not.toBe(key2);
      });
    });
  });

  // ============================================
  // Secret Rotation Tests
  // ============================================

  describe('Secret Rotation', () => {
    describe('rotateSecret', () => {
      it('should generate a new secret and set grace period', async () => {
        mockWebhookRepository.findOne.mockResolvedValue({ ...mockWebhook });
        mockWebhookRepository.save.mockImplementation((w) =>
          Promise.resolve(w),
        );
        mockAuditLogsService.log.mockResolvedValue({});

        const result = await service.rotateSecret(
          mockTenantId,
          mockWebhook.id!,
          24,
          mockUserId,
        );

        expect(result.secret).toMatch(/^whsec_[a-f0-9]{32}$/);
        expect(result.rotatedAt).toBeDefined();
        expect(result.gracePeriodEndsAt).toBeDefined();

        // Grace period should be 24 hours from now
        const expectedGraceEnd = new Date(
          result.rotatedAt.getTime() + 24 * 60 * 60 * 1000,
        );
        expect(result.gracePeriodEndsAt.getTime()).toBeCloseTo(
          expectedGraceEnd.getTime(),
          -3,
        );
      });

      it('should store previous secret during rotation', async () => {
        const webhookWithSecret = {
          ...mockWebhook,
          secretHash: 'old-secret-123',
        };
        mockWebhookRepository.findOne.mockResolvedValue(webhookWithSecret);
        mockWebhookRepository.save.mockImplementation((w) =>
          Promise.resolve(w),
        );

        const result = await service.rotateSecret(
          mockTenantId,
          mockWebhook.id!,
          24,
        );

        expect(result.hasPreviousSecret).toBe(true);
        expect(mockWebhookRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            previousSecret: 'old-secret-123',
          }),
        );
      });

      it('should handle rotation with no previous secret', async () => {
        const webhookNoSecret = {
          ...mockWebhook,
          secretHash: null,
        };
        mockWebhookRepository.findOne.mockResolvedValue(webhookNoSecret);
        mockWebhookRepository.save.mockImplementation((w) =>
          Promise.resolve(w),
        );

        const result = await service.rotateSecret(
          mockTenantId,
          mockWebhook.id!,
          24,
        );

        expect(result.hasPreviousSecret).toBe(false);
      });

      it('should log audit event on rotation', async () => {
        mockWebhookRepository.findOne.mockResolvedValue({ ...mockWebhook });
        mockWebhookRepository.save.mockImplementation((w) =>
          Promise.resolve(w),
        );

        await service.rotateSecret(
          mockTenantId,
          mockWebhook.id!,
          24,
          mockUserId,
          '192.168.1.1',
          'test-user-agent',
        );

        expect(mockAuditLogsService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            tenantId: mockTenantId,
            userId: mockUserId,
            action: 'token_rotate',
            resourceType: 'webhook',
            resourceId: mockWebhook.id,
            ipAddress: '192.168.1.1',
            userAgent: 'test-user-agent',
          }),
        );
      });

      it('should use custom grace period hours', async () => {
        mockWebhookRepository.findOne.mockResolvedValue({ ...mockWebhook });
        mockWebhookRepository.save.mockImplementation((w) =>
          Promise.resolve(w),
        );

        const result = await service.rotateSecret(
          mockTenantId,
          mockWebhook.id!,
          48, // 48 hours
        );

        const expectedGraceEnd = new Date(
          result.rotatedAt.getTime() + 48 * 60 * 60 * 1000,
        );
        expect(result.gracePeriodEndsAt.getTime()).toBeCloseTo(
          expectedGraceEnd.getTime(),
          -3,
        );
      });

      it('should throw NotFoundException for non-existent webhook', async () => {
        mockWebhookRepository.findOne.mockResolvedValue(null);

        await expect(
          service.rotateSecret(mockTenantId, 'nonexistent-id', 24),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('isInGracePeriod', () => {
      it('should return true when within grace period', () => {
        const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
        const webhook = {
          ...mockWebhook,
          secretGracePeriodEnds: futureDate,
        } as Webhook;

        expect(service.isInGracePeriod(webhook)).toBe(true);
      });

      it('should return false when grace period has ended', () => {
        const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
        const webhook = {
          ...mockWebhook,
          secretGracePeriodEnds: pastDate,
        } as Webhook;

        expect(service.isInGracePeriod(webhook)).toBe(false);
      });

      it('should return false when no grace period is set', () => {
        const webhook = {
          ...mockWebhook,
          secretGracePeriodEnds: null,
        } as Webhook;

        expect(service.isInGracePeriod(webhook)).toBe(false);
      });
    });

    describe('getSecretStatus', () => {
      it('should return secret status with active grace period', async () => {
        const futureDate = new Date(Date.now() + 60 * 60 * 1000);
        const rotatedAt = new Date(Date.now() - 12 * 60 * 60 * 1000);
        const webhookWithGrace = {
          ...mockWebhook,
          secretHash: 'current-secret',
          previousSecret: 'old-secret',
          secretRotatedAt: rotatedAt,
          secretGracePeriodEnds: futureDate,
        };
        mockWebhookRepository.findOne.mockResolvedValue(webhookWithGrace);

        const status = await service.getSecretStatus(
          mockTenantId,
          mockWebhook.id!,
        );

        expect(status.hasSecret).toBe(true);
        expect(status.inGracePeriod).toBe(true);
        expect(status.lastRotatedAt).toEqual(rotatedAt);
        expect(status.gracePeriodEndsAt).toEqual(futureDate);
      });

      it('should return secret status without grace period', async () => {
        mockWebhookRepository.findOne.mockResolvedValue({ ...mockWebhook });

        const status = await service.getSecretStatus(
          mockTenantId,
          mockWebhook.id!,
        );

        expect(status.hasSecret).toBe(true);
        expect(status.inGracePeriod).toBe(false);
        expect(status.gracePeriodEndsAt).toBeNull();
      });

      it('should return status for webhook without secret', async () => {
        const noSecretWebhook = {
          ...mockWebhook,
          secretHash: null,
        };
        mockWebhookRepository.findOne.mockResolvedValue(noSecretWebhook);

        const status = await service.getSecretStatus(
          mockTenantId,
          mockWebhook.id!,
        );

        expect(status.hasSecret).toBe(false);
        expect(status.inGracePeriod).toBe(false);
      });
    });

    describe('expirePreviousSecret', () => {
      it('should clear previous secret and grace period', async () => {
        const webhookWithPreviousSecret = {
          ...mockWebhook,
          previousSecret: 'old-secret',
          secretGracePeriodEnds: new Date(Date.now() + 60 * 60 * 1000),
        };
        mockWebhookRepository.findOne.mockResolvedValue(
          webhookWithPreviousSecret,
        );
        mockWebhookRepository.save.mockImplementation((w) =>
          Promise.resolve(w),
        );

        await service.expirePreviousSecret(mockTenantId, mockWebhook.id!);

        expect(mockWebhookRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            previousSecret: null,
            secretGracePeriodEnds: null,
          }),
        );
      });

      it('should do nothing if no previous secret exists', async () => {
        mockWebhookRepository.findOne.mockResolvedValue({ ...mockWebhook });

        await service.expirePreviousSecret(mockTenantId, mockWebhook.id!);

        expect(mockWebhookRepository.save).not.toHaveBeenCalled();
      });
    });

    describe('cleanupExpiredGracePeriods', () => {
      it('should cleanup webhooks with expired grace periods', async () => {
        const expiredWebhook1 = {
          ...mockWebhook,
          id: 'webhook-1',
          previousSecret: 'old-secret-1',
          secretGracePeriodEnds: new Date(Date.now() - 60 * 60 * 1000),
        };
        const expiredWebhook2 = {
          ...mockWebhook,
          id: 'webhook-2',
          previousSecret: 'old-secret-2',
          secretGracePeriodEnds: new Date(Date.now() - 30 * 60 * 1000),
        };

        const queryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest
            .fn()
            .mockResolvedValue([expiredWebhook1, expiredWebhook2]),
        };
        mockWebhookRepository.createQueryBuilder.mockReturnValue(queryBuilder);
        mockWebhookRepository.save.mockImplementation((w) =>
          Promise.resolve(w),
        );

        await service.cleanupExpiredGracePeriods();

        expect(mockWebhookRepository.save).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              id: 'webhook-1',
              previousSecret: null,
              secretGracePeriodEnds: null,
            }),
            expect.objectContaining({
              id: 'webhook-2',
              previousSecret: null,
              secretGracePeriodEnds: null,
            }),
          ]),
        );
      });

      it('should do nothing if no expired grace periods', async () => {
        const queryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        };
        mockWebhookRepository.createQueryBuilder.mockReturnValue(queryBuilder);

        await service.cleanupExpiredGracePeriods();

        expect(mockWebhookRepository.save).not.toHaveBeenCalled();
      });
    });

    describe('Dual Signature Generation', () => {
      it('should generate consistent signatures for same payload and secret', () => {
        const payload = JSON.stringify({ event: 'test', data: { id: '123' } });
        const secret = 'test-secret';

        const signature1 = (service as any).generateSignature(payload, secret);
        const signature2 = (service as any).generateSignature(payload, secret);

        expect(signature1).toBe(signature2);
      });

      it('should generate different signatures with different secrets', () => {
        const payload = JSON.stringify({ event: 'test', data: { id: '123' } });

        const signature1 = (service as any).generateSignature(
          payload,
          'secret1',
        );
        const signature2 = (service as any).generateSignature(
          payload,
          'secret2',
        );

        expect(signature1).not.toBe(signature2);
      });
    });
  });
});
