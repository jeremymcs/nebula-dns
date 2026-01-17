// Nebula DNS - Webhooks Controller Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  TestWebhookDto,
} from './dto/webhook.dto';

describe('WebhooksController', () => {
  let controller: WebhooksController;
  let service: WebhooksService;

  const mockTenantId = 'tenant-123';
  const mockWebhookId = 'webhook-123';

  const mockWebhook = {
    id: mockWebhookId,
    tenantId: mockTenantId,
    url: 'https://example.com/webhook',
    events: ['policy.created', 'policy.updated'],
    secret: 'whsec_test123',
    isEnabled: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockDelivery = {
    id: 'delivery-123',
    webhookId: mockWebhookId,
    event: 'policy.created',
    payload: { id: 'policy-123' },
    status: 'success',
    responseCode: 200,
    attemptedAt: new Date('2024-01-01'),
  };

  const mockWebhooksService = {
    getAvailableEvents: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    getDeliveries: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    enable: jest.fn(),
    disable: jest.fn(),
    test: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        {
          provide: WebhooksService,
          useValue: mockWebhooksService,
        },
      ],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
    service = module.get<WebhooksService>(WebhooksService);

    jest.clearAllMocks();
  });

  describe('GET /webhooks/events', () => {
    it('should return available webhook events', async () => {
      const mockEvents = [
        'policy.created',
        'policy.updated',
        'policy.deleted',
        'location.created',
        'user.created',
      ];

      mockWebhooksService.getAvailableEvents.mockReturnValue(mockEvents);

      const result = await controller.getAvailableEvents();

      expect(service.getAvailableEvents).toHaveBeenCalled();
      expect(result.data).toEqual(mockEvents);
      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  describe('POST /webhooks', () => {
    it('should create webhook with valid data', async () => {
      const createDto: CreateWebhookDto = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['policy.created', 'policy.updated'],
        secret: 'whsec_test123',
      };

      mockWebhooksService.create.mockResolvedValue(mockWebhook);

      const result = await controller.create(mockTenantId, createDto);

      expect(service.create).toHaveBeenCalledWith(mockTenantId, createDto);
      expect(result.data).toEqual(mockWebhook);
      expect(result.message).toBe('Webhook created successfully');
    });

    it('should reject invalid URL', async () => {
      const createDto: CreateWebhookDto = {
        name: 'Test Webhook',
        url: 'invalid-url',
        events: ['policy.created'],
        secret: 'whsec_test123',
      };

      mockWebhooksService.create.mockRejectedValue(
        new BadRequestException('Invalid webhook URL'),
      );

      await expect(controller.create(mockTenantId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject non-HTTPS URLs', async () => {
      const createDto: CreateWebhookDto = {
        name: 'Test Webhook',
        url: 'http://example.com/webhook',
        events: ['policy.created'],
        secret: 'whsec_test123',
      };

      mockWebhooksService.create.mockRejectedValue(
        new BadRequestException('Webhook URL must use HTTPS'),
      );

      await expect(controller.create(mockTenantId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject invalid events', async () => {
      const createDto: CreateWebhookDto = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['invalid.event'],
        secret: 'whsec_test123',
      };

      mockWebhooksService.create.mockRejectedValue(
        new BadRequestException('Invalid event type'),
      );

      await expect(controller.create(mockTenantId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should require at least one event', async () => {
      const createDto: CreateWebhookDto = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: [],
        secret: 'whsec_test123',
      };

      mockWebhooksService.create.mockRejectedValue(
        new BadRequestException('At least one event is required'),
      );

      await expect(controller.create(mockTenantId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('GET /webhooks', () => {
    it('should return all webhooks for tenant', async () => {
      const mockWebhooks = [mockWebhook];
      mockWebhooksService.findAll.mockResolvedValue(mockWebhooks);

      const result = await controller.findAll(mockTenantId);

      expect(service.findAll).toHaveBeenCalledWith(mockTenantId);
      expect(result.data).toEqual(mockWebhooks);
      expect(result.data).toHaveLength(1);
    });

    it('should return empty array when no webhooks exist', async () => {
      mockWebhooksService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(mockTenantId);

      expect(result.data).toEqual([]);
    });
  });

  describe('GET /webhooks/:id', () => {
    it('should return webhook by ID', async () => {
      mockWebhooksService.findOne.mockResolvedValue(mockWebhook);

      const result = await controller.findOne(mockTenantId, mockWebhookId);

      expect(service.findOne).toHaveBeenCalledWith(mockTenantId, mockWebhookId);
      expect(result.data).toEqual(mockWebhook);
    });

    it('should throw NotFoundException for non-existent webhook', async () => {
      mockWebhooksService.findOne.mockRejectedValue(
        new NotFoundException('Webhook not found'),
      );

      await expect(
        controller.findOne(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should enforce tenant isolation', async () => {
      mockWebhooksService.findOne.mockResolvedValue(mockWebhook);

      await controller.findOne(mockTenantId, mockWebhookId);

      expect(service.findOne).toHaveBeenCalledWith(mockTenantId, mockWebhookId);
    });
  });

  describe('GET /webhooks/:id/deliveries', () => {
    it('should return webhook deliveries', async () => {
      const mockDeliveries = [mockDelivery];
      mockWebhooksService.getDeliveries.mockResolvedValue(mockDeliveries);

      const result = await controller.getDeliveries(
        mockTenantId,
        mockWebhookId,
      );

      expect(service.getDeliveries).toHaveBeenCalledWith(
        mockTenantId,
        mockWebhookId,
        50,
      );
      expect(result.data).toEqual(mockDeliveries);
    });

    it('should respect custom limit parameter', async () => {
      mockWebhooksService.getDeliveries.mockResolvedValue([mockDelivery]);

      await controller.getDeliveries(mockTenantId, mockWebhookId, '100');

      expect(service.getDeliveries).toHaveBeenCalledWith(
        mockTenantId,
        mockWebhookId,
        100,
      );
    });

    it('should return empty array when no deliveries exist', async () => {
      mockWebhooksService.getDeliveries.mockResolvedValue([]);

      const result = await controller.getDeliveries(
        mockTenantId,
        mockWebhookId,
      );

      expect(result.data).toEqual([]);
    });

    it('should throw NotFoundException for non-existent webhook', async () => {
      mockWebhooksService.getDeliveries.mockRejectedValue(
        new NotFoundException('Webhook not found'),
      );

      await expect(
        controller.getDeliveries(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('PATCH /webhooks/:id', () => {
    it('should update webhook with valid data', async () => {
      const updateDto: UpdateWebhookDto = {
        url: 'https://example.com/new-webhook',
      };

      const updatedWebhook = { ...mockWebhook, ...updateDto };
      mockWebhooksService.update.mockResolvedValue(updatedWebhook);

      const result = await controller.update(
        mockTenantId,
        mockWebhookId,
        updateDto,
      );

      expect(service.update).toHaveBeenCalledWith(
        mockTenantId,
        mockWebhookId,
        updateDto,
      );
      expect(result.data.url).toBe(updateDto.url);
    });

    it('should update webhook events', async () => {
      const updateDto: UpdateWebhookDto = {
        events: ['policy.created', 'location.created'],
      };

      const updatedWebhook = { ...mockWebhook, ...updateDto };
      mockWebhooksService.update.mockResolvedValue(updatedWebhook);

      const result = await controller.update(
        mockTenantId,
        mockWebhookId,
        updateDto,
      );

      expect(result.data.events).toEqual(updateDto.events);
    });

    it('should throw NotFoundException for non-existent webhook', async () => {
      const updateDto: UpdateWebhookDto = {
        url: 'https://example.com/webhook',
      };

      mockWebhooksService.update.mockRejectedValue(
        new NotFoundException('Webhook not found'),
      );

      await expect(
        controller.update(mockTenantId, 'nonexistent-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('DELETE /webhooks/:id', () => {
    it('should delete webhook successfully', async () => {
      mockWebhooksService.delete.mockResolvedValue(undefined);

      const result = await controller.delete(mockTenantId, mockWebhookId);

      expect(service.delete).toHaveBeenCalledWith(mockTenantId, mockWebhookId);
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException for non-existent webhook', async () => {
      mockWebhooksService.delete.mockRejectedValue(
        new NotFoundException('Webhook not found'),
      );

      await expect(
        controller.delete(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /webhooks/:id/enable', () => {
    it('should enable webhook', async () => {
      const enabledWebhook = { ...mockWebhook, isEnabled: true };
      mockWebhooksService.enable.mockResolvedValue(enabledWebhook);

      const result = await controller.enable(mockTenantId, mockWebhookId);

      expect(service.enable).toHaveBeenCalledWith(mockTenantId, mockWebhookId);
      expect(result.data.isEnabled).toBe(true);
      expect(result.message).toBe('Webhook enabled');
    });

    it('should throw NotFoundException for non-existent webhook', async () => {
      mockWebhooksService.enable.mockRejectedValue(
        new NotFoundException('Webhook not found'),
      );

      await expect(
        controller.enable(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /webhooks/:id/disable', () => {
    it('should disable webhook', async () => {
      const disabledWebhook = { ...mockWebhook, isEnabled: false };
      mockWebhooksService.disable.mockResolvedValue(disabledWebhook);

      const result = await controller.disable(mockTenantId, mockWebhookId);

      expect(service.disable).toHaveBeenCalledWith(mockTenantId, mockWebhookId);
      expect(result.data.isEnabled).toBe(false);
      expect(result.message).toBe('Webhook disabled');
    });

    it('should throw NotFoundException for non-existent webhook', async () => {
      mockWebhooksService.disable.mockRejectedValue(
        new NotFoundException('Webhook not found'),
      );

      await expect(
        controller.disable(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /webhooks/:id/test', () => {
    it('should send test webhook', async () => {
      const testDto: TestWebhookDto = {
        eventType: 'policy.created',
      };

      const testResult = {
        success: true,
        statusCode: 200,
        responseTime: 123,
      };

      mockWebhooksService.test.mockResolvedValue(testResult);

      const result = await controller.test(
        mockTenantId,
        mockWebhookId,
        testDto,
      );

      expect(service.test).toHaveBeenCalledWith(
        mockTenantId,
        mockWebhookId,
        testDto.eventType,
      );
      expect(result.data.success).toBe(true);
    });

    it('should handle failed test webhook', async () => {
      const testDto: TestWebhookDto = {
        eventType: 'policy.created',
      };

      const testResult = {
        success: false,
        statusCode: 500,
        error: 'Internal Server Error',
      };

      mockWebhooksService.test.mockResolvedValue(testResult);

      const result = await controller.test(
        mockTenantId,
        mockWebhookId,
        testDto,
      );

      expect(result.data.success).toBe(false);
    });

    it('should throw NotFoundException for non-existent webhook', async () => {
      const testDto: TestWebhookDto = {
        eventType: 'policy.created',
      };

      mockWebhooksService.test.mockRejectedValue(
        new NotFoundException('Webhook not found'),
      );

      await expect(
        controller.test(mockTenantId, 'nonexistent-id', testDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject invalid event type', async () => {
      const testDto: TestWebhookDto = {
        eventType: 'invalid.event',
      };

      mockWebhooksService.test.mockRejectedValue(
        new BadRequestException('Invalid event type'),
      );

      await expect(
        controller.test(mockTenantId, mockWebhookId, testDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Authorization', () => {
    it('should require ADMIN or OWNER for create', () => {
      const roles = Reflect.getMetadata('roles', controller.create);
      expect(roles).toEqual(expect.arrayContaining(['admin', 'owner']));
    });

    it('should require ADMIN or OWNER for delete', () => {
      const roles = Reflect.getMetadata('roles', controller.delete);
      expect(roles).toEqual(expect.arrayContaining(['admin', 'owner']));
    });

    it('should require ADMIN or OWNER for enable/disable', () => {
      const enableRoles = Reflect.getMetadata('roles', controller.enable);
      const disableRoles = Reflect.getMetadata('roles', controller.disable);

      expect(enableRoles).toEqual(expect.arrayContaining(['admin', 'owner']));
      expect(disableRoles).toEqual(expect.arrayContaining(['admin', 'owner']));
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockWebhooksService.findAll.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(controller.findAll(mockTenantId)).rejects.toThrow(Error);
    });

    it('should propagate validation errors', async () => {
      const createDto: CreateWebhookDto = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['policy.created'],
        secret: 'whsec_test123',
      };

      mockWebhooksService.create.mockRejectedValue(
        new BadRequestException('Validation failed'),
      );

      await expect(controller.create(mockTenantId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
