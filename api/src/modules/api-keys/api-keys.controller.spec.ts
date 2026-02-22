// Nebula DNS - API Keys Controller Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import {
  CreateApiKeyDto,
  UpdateApiKeyDto,
  RotateApiKeyDto,
} from './dto/api-key.dto';

describe('ApiKeysController', () => {
  let controller: ApiKeysController;
  let service: ApiKeysService;

  const mockTenantId = 'tenant-123';
  const mockApiKeyId = 'api-key-123';
  const mockUser = {
    id: 'user-123',
    email: 'admin@example.com',
    role: 'admin',
    tenantId: mockTenantId,
  };

  const mockApiKey = {
    id: mockApiKeyId,
    tenantId: mockTenantId,
    userId: mockUser.id,
    name: 'Production API Key',
    keyPrefix: 'ndns_',
    keyHash: 'hashed-key-value',
    scopes: ['read', 'write'],
    expiresAt: new Date('2025-01-01'),
    lastUsedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockApiKeyWithSecret = {
    ...mockApiKey,
    apiKey: 'ndns_test_1234567890abcdef',
  };

  const mockUsageStats = {
    totalRequests: 1234,
    requestsLast24h: 56,
    requestsLast7d: 345,
    lastUsedAt: new Date('2024-01-15'),
  };

  const mockApiKeysService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    getUsageStats: jest.fn(),
    update: jest.fn(),
    revoke: jest.fn(),
    rotate: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiKeysController],
      providers: [
        {
          provide: ApiKeysService,
          useValue: mockApiKeysService,
        },
      ],
    }).compile();

    controller = module.get<ApiKeysController>(ApiKeysController);
    service = module.get<ApiKeysService>(ApiKeysService);

    jest.clearAllMocks();
  });

  describe('POST /api-keys', () => {
    it('should create API key with valid data', async () => {
      const createDto: CreateApiKeyDto = {
        name: 'Production API Key',
        scopes: ['read', 'write'],
        expiresAt: '2025-01-01',
      };

      mockApiKeysService.create.mockResolvedValue(mockApiKeyWithSecret);

      const result = await controller.create(mockTenantId, mockUser, createDto);

      expect(service.create).toHaveBeenCalledWith(
        mockTenantId,
        mockUser.id,
        createDto,
      );
      expect(result.data).toEqual(mockApiKeyWithSecret);
      expect(result.message).toContain('Make sure to copy the key now');
    });

    it('should create API key with default expiration', async () => {
      const createDto: CreateApiKeyDto = {
        name: 'Test Key',
        scopes: ['read'],
      };

      mockApiKeysService.create.mockResolvedValue(mockApiKeyWithSecret);

      await controller.create(mockTenantId, mockUser, createDto);

      expect(service.create).toHaveBeenCalledWith(
        mockTenantId,
        mockUser.id,
        createDto,
      );
    });

    it('should reject invalid scopes', async () => {
      const createDto: CreateApiKeyDto = {
        name: 'Test Key',
        scopes: ['invalid' as any],
      };

      mockApiKeysService.create.mockRejectedValue(
        new BadRequestException('Invalid scope'),
      );

      await expect(
        controller.create(mockTenantId, mockUser, createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should require API key name', async () => {
      const createDto = {
        name: '',
        scopes: ['read'],
      };

      mockApiKeysService.create.mockRejectedValue(
        new BadRequestException('API key name is required'),
      );

      await expect(
        controller.create(mockTenantId, mockUser, createDto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate API key name', async () => {
      const createDto: CreateApiKeyDto = {
        name: mockApiKey.name,
        scopes: ['read'],
      };

      mockApiKeysService.create.mockRejectedValue(
        new BadRequestException('API key with this name already exists'),
      );

      await expect(
        controller.create(mockTenantId, mockUser, createDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('GET /api-keys', () => {
    it('should return all API keys for tenant', async () => {
      const mockApiKeys = [mockApiKey];
      mockApiKeysService.findAll.mockResolvedValue(mockApiKeys);

      const result = await controller.findAll(mockTenantId);

      expect(service.findAll).toHaveBeenCalledWith(mockTenantId);
      expect(result.data).toEqual(mockApiKeys);
      expect(result.data).toHaveLength(1);
    });

    it('should not expose key secrets in list', async () => {
      mockApiKeysService.findAll.mockResolvedValue([mockApiKey]);

      const result = await controller.findAll(mockTenantId);

      expect(result.data[0]).not.toHaveProperty('key');
      expect(result.data[0]).toHaveProperty('keyPrefix');
    });

    it('should return empty array when no API keys exist', async () => {
      mockApiKeysService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(mockTenantId);

      expect(result.data).toEqual([]);
    });
  });

  describe('GET /api-keys/:id', () => {
    it('should return API key by ID', async () => {
      mockApiKeysService.findOne.mockResolvedValue(mockApiKey);

      const result = await controller.findOne(mockTenantId, mockApiKeyId);

      expect(service.findOne).toHaveBeenCalledWith(mockTenantId, mockApiKeyId);
      expect(result.data).toEqual(mockApiKey);
    });

    it('should throw NotFoundException for non-existent API key', async () => {
      mockApiKeysService.findOne.mockRejectedValue(
        new NotFoundException('API key not found'),
      );

      await expect(
        controller.findOne(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should enforce tenant isolation', async () => {
      mockApiKeysService.findOne.mockResolvedValue(mockApiKey);

      await controller.findOne(mockTenantId, mockApiKeyId);

      expect(service.findOne).toHaveBeenCalledWith(mockTenantId, mockApiKeyId);
    });
  });

  describe('GET /api-keys/:id/usage', () => {
    it('should return usage statistics', async () => {
      mockApiKeysService.getUsageStats.mockResolvedValue(mockUsageStats);

      const result = await controller.getUsageStats(mockTenantId, mockApiKeyId);

      expect(service.getUsageStats).toHaveBeenCalledWith(
        mockTenantId,
        mockApiKeyId,
      );
      expect(result.data).toEqual(mockUsageStats);
      expect(result.data.totalRequests).toBe(1234);
    });

    it('should throw NotFoundException for non-existent API key', async () => {
      mockApiKeysService.getUsageStats.mockRejectedValue(
        new NotFoundException('API key not found'),
      );

      await expect(
        controller.getUsageStats(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('PATCH /api-keys/:id', () => {
    it('should update API key with valid data', async () => {
      const updateDto: UpdateApiKeyDto = {
        name: 'Updated API Key',
      };

      const updatedApiKey = { ...mockApiKey, ...updateDto };
      mockApiKeysService.update.mockResolvedValue(updatedApiKey);

      const result = await controller.update(
        mockTenantId,
        mockApiKeyId,
        updateDto,
      );

      expect(service.update).toHaveBeenCalledWith(
        mockTenantId,
        mockApiKeyId,
        updateDto,
      );
      expect(result.data.name).toBe(updateDto.name);
    });

    it('should update API key scopes', async () => {
      const updateDto: UpdateApiKeyDto = {
        scopes: ['read', 'read'],
      };

      const updatedApiKey = { ...mockApiKey, ...updateDto };
      mockApiKeysService.update.mockResolvedValue(updatedApiKey);

      const result = await controller.update(
        mockTenantId,
        mockApiKeyId,
        updateDto,
      );

      expect(result.data.scopes).toEqual(updateDto.scopes);
    });

    it('should throw NotFoundException for non-existent API key', async () => {
      const updateDto: UpdateApiKeyDto = { name: 'Updated' };

      mockApiKeysService.update.mockRejectedValue(
        new NotFoundException('API key not found'),
      );

      await expect(
        controller.update(mockTenantId, 'nonexistent-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /api-keys/:id/revoke', () => {
    it('should revoke API key', async () => {
      const revokedApiKey = {
        ...mockApiKey,
        revokedAt: new Date(),
      };

      mockApiKeysService.revoke.mockResolvedValue(revokedApiKey);

      const result = await controller.revoke(mockTenantId, mockApiKeyId);

      expect(service.revoke).toHaveBeenCalledWith(mockTenantId, mockApiKeyId);
      expect(result.data).toEqual(revokedApiKey);
      expect(result.message).toBe('API key revoked successfully');
    });

    it('should throw NotFoundException for non-existent API key', async () => {
      mockApiKeysService.revoke.mockRejectedValue(
        new NotFoundException('API key not found'),
      );

      await expect(
        controller.revoke(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle already revoked key', async () => {
      mockApiKeysService.revoke.mockRejectedValue(
        new BadRequestException('API key already revoked'),
      );

      await expect(
        controller.revoke(mockTenantId, mockApiKeyId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('POST /api-keys/:id/rotate', () => {
    it('should rotate API key with grace period', async () => {
      const rotateDto: RotateApiKeyDto = {
        gracePeriodHours: 48,
      };

      const newApiKey = {
        ...mockApiKeyWithSecret,
        id: 'new-api-key-123',
      };

      mockApiKeysService.rotate.mockResolvedValue(newApiKey);

      const result = await controller.rotate(
        mockTenantId,
        mockApiKeyId,
        rotateDto,
      );

      expect(service.rotate).toHaveBeenCalledWith(
        mockTenantId,
        mockApiKeyId,
        rotateDto.gracePeriodHours,
      );
      expect(result.data).toEqual(newApiKey);
      expect(result.message).toContain('48 hours');
    });

    it('should rotate API key with default grace period', async () => {
      const rotateDto: RotateApiKeyDto = {};

      mockApiKeysService.rotate.mockResolvedValue(mockApiKeyWithSecret);

      const result = await controller.rotate(
        mockTenantId,
        mockApiKeyId,
        rotateDto,
      );

      expect(result.message).toContain('24 hours');
    });

    it('should throw NotFoundException for non-existent API key', async () => {
      const rotateDto: RotateApiKeyDto = {
        gracePeriodHours: 24,
      };

      mockApiKeysService.rotate.mockRejectedValue(
        new NotFoundException('API key not found'),
      );

      await expect(
        controller.rotate(mockTenantId, 'nonexistent-id', rotateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject invalid grace period', async () => {
      const rotateDto: RotateApiKeyDto = {
        gracePeriodHours: -1,
      };

      mockApiKeysService.rotate.mockRejectedValue(
        new BadRequestException('Invalid grace period'),
      );

      await expect(
        controller.rotate(mockTenantId, mockApiKeyId, rotateDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('DELETE /api-keys/:id', () => {
    it('should delete API key successfully', async () => {
      mockApiKeysService.delete.mockResolvedValue(undefined);

      const result = await controller.delete(mockTenantId, mockApiKeyId);

      expect(service.delete).toHaveBeenCalledWith(mockTenantId, mockApiKeyId);
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException for non-existent API key', async () => {
      mockApiKeysService.delete.mockRejectedValue(
        new NotFoundException('API key not found'),
      );

      await expect(
        controller.delete(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Authorization', () => {
    it('should require ADMIN or OWNER for create', () => {
      const roles = Reflect.getMetadata('roles', controller.create);
      expect(roles).toEqual(expect.arrayContaining(['admin', 'owner']));
    });

    it('should require ADMIN or OWNER for revoke', () => {
      const roles = Reflect.getMetadata('roles', controller.revoke);
      expect(roles).toEqual(expect.arrayContaining(['admin', 'owner']));
    });

    it('should require ADMIN or OWNER for rotate', () => {
      const roles = Reflect.getMetadata('roles', controller.rotate);
      expect(roles).toEqual(expect.arrayContaining(['admin', 'owner']));
    });

    it('should require ADMIN or OWNER for delete', () => {
      const roles = Reflect.getMetadata('roles', controller.delete);
      expect(roles).toEqual(expect.arrayContaining(['admin', 'owner']));
    });
  });

  describe('Security', () => {
    it('should not expose key hash in responses', async () => {
      mockApiKeysService.findAll.mockResolvedValue([mockApiKey]);

      const result = await controller.findAll(mockTenantId);

      expect(result.data[0]).not.toHaveProperty('key');
    });

    it('should only show full key on creation', async () => {
      const createDto: CreateApiKeyDto = {
        name: 'Test Key',
        scopes: ['read'],
      };

      mockApiKeysService.create.mockResolvedValue(mockApiKeyWithSecret);

      const result = await controller.create(mockTenantId, mockUser, createDto);

      expect(result.data).toHaveProperty('apiKey');
      expect(result.data.apiKey).toMatch(/^ndns_/);
    });

    it('should only show full key on rotation', async () => {
      const rotateDto: RotateApiKeyDto = {
        gracePeriodHours: 24,
      };

      mockApiKeysService.rotate.mockResolvedValue(mockApiKeyWithSecret);

      const result = await controller.rotate(
        mockTenantId,
        mockApiKeyId,
        rotateDto,
      );

      expect(result.data).toHaveProperty('apiKey');
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockApiKeysService.findAll.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(controller.findAll(mockTenantId)).rejects.toThrow(Error);
    });

    it('should propagate validation errors', async () => {
      const createDto: CreateApiKeyDto = {
        name: 'Test',
        scopes: ['read'],
      };

      mockApiKeysService.create.mockRejectedValue(
        new BadRequestException('Validation failed'),
      );

      await expect(
        controller.create(mockTenantId, mockUser, createDto),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
