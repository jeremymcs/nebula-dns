// Nebula DNS - API Keys Service Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ApiKeysService } from './api-keys.service';
import { ApiKey } from './entities/api-key.entity';
import { ApiKeyUsage } from './entities/api-key-usage.entity';
import { CreateApiKeyDto } from './dto/api-key.dto';

describe('ApiKeysService', () => {
  let service: ApiKeysService;
  let apiKeyRepository: jest.Mocked<Repository<ApiKey>>;
  let usageRepository: jest.Mocked<Repository<ApiKeyUsage>>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';

  const mockApiKey: Partial<ApiKey> = {
    id: 'key-123',
    tenantId: mockTenantId,
    userId: mockUserId,
    name: 'Test API Key',
    keyPrefix: 'sk_live_abc',
    keyHash: '$2b$10$testHash',
    scopes: ['read', 'write'],
    rateLimit: 1000,
    isActive: true,
    lastUsedAt: null,
    lastUsedIp: null,
    expiresAt: null,
    allowedIps: null,
    allowedCidrs: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockApiKeyRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockUsageRepository = {
    create: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        {
          provide: getRepositoryToken(ApiKey),
          useValue: mockApiKeyRepository,
        },
        {
          provide: getRepositoryToken(ApiKeyUsage),
          useValue: mockUsageRepository,
        },
      ],
    }).compile();

    service = module.get<ApiKeysService>(ApiKeysService);
    apiKeyRepository = module.get(getRepositoryToken(ApiKey));
    usageRepository = module.get(getRepositoryToken(ApiKeyUsage));

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new API key with default values', async () => {
      const dto: CreateApiKeyDto = {
        name: 'Test Key',
      };

      mockApiKeyRepository.create.mockReturnValue(mockApiKey as ApiKey);
      mockApiKeyRepository.save.mockResolvedValue(mockApiKey as ApiKey);

      const result = await service.create(mockTenantId, mockUserId, dto);

      expect(result).toBeDefined();
      expect(result.apiKey).toBeDefined();
      expect(result.apiKey).toMatch(/^sk_live_/);
      expect(result.name).toBe(mockApiKey.name); // Uses the returned mock value
      expect(result.keyPrefix).toBeDefined();
      expect(mockApiKeyRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockTenantId,
          userId: mockUserId,
          name: dto.name,
          scopes: ['read'],
          rateLimit: 1000,
        }),
      );
    });

    it('should create API key with custom scopes and rate limit', async () => {
      const dto: CreateApiKeyDto = {
        name: 'Admin Key',
        scopes: ['admin'],
        rateLimit: 5000,
      };

      mockApiKeyRepository.create.mockReturnValue(mockApiKey as ApiKey);
      mockApiKeyRepository.save.mockResolvedValue(mockApiKey as ApiKey);

      const result = await service.create(mockTenantId, mockUserId, dto);

      expect(mockApiKeyRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          scopes: ['admin'],
          rateLimit: 5000,
        }),
      );
    });

    it('should create API key with expiration date', async () => {
      const expiresAt = new Date('2025-12-31');
      const dto: CreateApiKeyDto = {
        name: 'Expiring Key',
        expiresAt: expiresAt.toISOString(),
      };

      mockApiKeyRepository.create.mockReturnValue(mockApiKey as ApiKey);
      mockApiKeyRepository.save.mockResolvedValue(mockApiKey as ApiKey);

      await service.create(mockTenantId, mockUserId, dto);

      expect(mockApiKeyRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt: expect.any(Date),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all API keys for a tenant', async () => {
      const keys = [mockApiKey, { ...mockApiKey, id: 'key-456' }];
      mockApiKeyRepository.find.mockResolvedValue(keys as ApiKey[]);

      const result = await service.findAll(mockTenantId);

      expect(result).toHaveLength(2);
      expect(mockApiKeyRepository.find).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        relations: ['user'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when no keys exist', async () => {
      mockApiKeyRepository.find.mockResolvedValue([]);

      const result = await service.findAll(mockTenantId);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return an API key by id', async () => {
      mockApiKeyRepository.findOne.mockResolvedValue(mockApiKey as ApiKey);

      const result = await service.findOne(mockTenantId, 'key-123');

      expect(result).toEqual(mockApiKey);
      expect(mockApiKeyRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'key-123', tenantId: mockTenantId },
        relations: ['user'],
      });
    });

    it('should throw NotFoundException when key does not exist', async () => {
      mockApiKeyRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(mockTenantId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update API key properties', async () => {
      mockApiKeyRepository.findOne.mockResolvedValue(mockApiKey as ApiKey);
      mockApiKeyRepository.save.mockResolvedValue({
        ...mockApiKey,
        name: 'Updated Name',
      } as ApiKey);

      const result = await service.update(mockTenantId, 'key-123', {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
      expect(mockApiKeyRepository.save).toHaveBeenCalled();
    });

    it('should update scopes', async () => {
      mockApiKeyRepository.findOne.mockResolvedValue(mockApiKey as ApiKey);
      mockApiKeyRepository.save.mockResolvedValue({
        ...mockApiKey,
        scopes: ['admin'],
      } as ApiKey);

      const result = await service.update(mockTenantId, 'key-123', {
        scopes: ['admin'],
      });

      expect(result.scopes).toContain('admin');
    });
  });

  describe('delete', () => {
    it('should delete an API key', async () => {
      mockApiKeyRepository.findOne.mockResolvedValue(mockApiKey as ApiKey);
      mockApiKeyRepository.remove.mockResolvedValue(mockApiKey as ApiKey);

      await service.delete(mockTenantId, 'key-123');

      expect(mockApiKeyRepository.remove).toHaveBeenCalledWith(mockApiKey);
    });

    it('should throw NotFoundException when deleting non-existent key', async () => {
      mockApiKeyRepository.findOne.mockResolvedValue(null);

      await expect(service.delete(mockTenantId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('revoke', () => {
    it('should set isActive to false', async () => {
      mockApiKeyRepository.findOne.mockResolvedValue(mockApiKey as ApiKey);
      mockApiKeyRepository.save.mockResolvedValue({
        ...mockApiKey,
        isActive: false,
      } as ApiKey);

      const result = await service.revoke(mockTenantId, 'key-123');

      expect(result.isActive).toBe(false);
    });
  });

  describe('rotate', () => {
    it('should create new key and deprecate old one', async () => {
      mockApiKeyRepository.findOne.mockResolvedValue(mockApiKey as ApiKey);
      mockApiKeyRepository.create.mockReturnValue({
        ...mockApiKey,
        id: 'key-new',
        name: 'Test API Key (rotated)',
      } as ApiKey);
      mockApiKeyRepository.save.mockResolvedValue({
        ...mockApiKey,
        id: 'key-new',
      } as ApiKey);

      const result = await service.rotate(mockTenantId, 'key-123', 24);

      expect(result.apiKey).toBeDefined();
      expect(result.rotatedFromId).toBe('key-123');
      expect(result.oldKeyExpiresAt).toBeDefined();
      expect(mockApiKeyRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should use custom grace period', async () => {
      mockApiKeyRepository.findOne.mockResolvedValue(mockApiKey as ApiKey);
      mockApiKeyRepository.create.mockReturnValue(mockApiKey as ApiKey);
      mockApiKeyRepository.save.mockResolvedValue(mockApiKey as ApiKey);

      const gracePeriod = 48;
      const result = await service.rotate(mockTenantId, 'key-123', gracePeriod);

      expect(result.oldKeyExpiresAt).toBeDefined();
      const expectedExpiry = new Date(
        Date.now() + gracePeriod * 60 * 60 * 1000,
      );
      const actualExpiry = new Date(result.oldKeyExpiresAt!);
      expect(
        Math.abs(actualExpiry.getTime() - expectedExpiry.getTime()),
      ).toBeLessThan(1000);
    });
  });

  describe('validateApiKey', () => {
    it('should return valid API key when credentials match', async () => {
      const testKey = 'sk_live_test123456';
      const hashedKey = await bcrypt.hash(testKey, 10);

      mockApiKeyRepository.findOne.mockResolvedValue({
        ...mockApiKey,
        keyHash: hashedKey,
        keyPrefix: 'sk_live_tes',
        isActive: true,
        expiresAt: null,
      } as ApiKey);

      const result = await service.validateApiKey(testKey);

      expect(result).toBeDefined();
      expect(result?.tenantId).toBe(mockTenantId);
    });

    it('should return null for invalid key prefix', async () => {
      mockApiKeyRepository.findOne.mockResolvedValue(null);

      const result = await service.validateApiKey('sk_live_invalid');

      expect(result).toBeNull();
    });

    it('should return null for inactive key', async () => {
      mockApiKeyRepository.findOne.mockResolvedValue({
        ...mockApiKey,
        isActive: false,
      } as ApiKey);

      const result = await service.validateApiKey('sk_live_test');

      expect(result).toBeNull();
    });

    it('should return null for expired key', async () => {
      const pastDate = new Date('2020-01-01');
      mockApiKeyRepository.findOne.mockResolvedValue({
        ...mockApiKey,
        expiresAt: pastDate,
      } as ApiKey);

      const result = await service.validateApiKey('sk_live_test');

      expect(result).toBeNull();
    });

    it('should return null for incorrect key hash', async () => {
      mockApiKeyRepository.findOne.mockResolvedValue({
        ...mockApiKey,
        keyHash: await bcrypt.hash('different-key', 10),
      } as ApiKey);

      const result = await service.validateApiKey('sk_live_test');

      expect(result).toBeNull();
    });
  });

  describe('recordUsage', () => {
    it('should record API key usage', async () => {
      mockUsageRepository.create.mockReturnValue({} as ApiKeyUsage);
      mockUsageRepository.save.mockResolvedValue({} as ApiKeyUsage);
      mockApiKeyRepository.update.mockResolvedValue(undefined as any);

      await service.recordUsage(
        'key-123',
        '/api/policies',
        'GET',
        200,
        45,
        '192.168.1.1',
        'Mozilla/5.0',
      );

      expect(mockApiKeyRepository.update).toHaveBeenCalledWith('key-123', {
        lastUsedAt: expect.any(Date),
        lastUsedIp: '192.168.1.1',
      });
      expect(mockUsageRepository.create).toHaveBeenCalledWith({
        apiKeyId: 'key-123',
        endpoint: '/api/policies',
        method: 'GET',
        statusCode: 200,
        responseTimeMs: 45,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });
    });
  });

  describe('checkRateLimit', () => {
    it('should allow request when under limit', async () => {
      mockUsageRepository.count.mockResolvedValue(50);

      const result = await service.checkRateLimit('key-123', 1000);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(950);
      expect(result.resetAt).toBeInstanceOf(Date);
    });

    it('should deny request when over limit', async () => {
      mockUsageRepository.count.mockResolvedValue(1001);

      const result = await service.checkRateLimit('key-123', 1000);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should handle zero usage', async () => {
      mockUsageRepository.count.mockResolvedValue(0);

      const result = await service.checkRateLimit('key-123', 100);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(100);
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics', async () => {
      mockApiKeyRepository.findOne.mockResolvedValue(mockApiKey as ApiKey);
      mockUsageRepository.count
        .mockResolvedValueOnce(1000) // total
        .mockResolvedValueOnce(50) // today
        .mockResolvedValueOnce(300) // week
        .mockResolvedValueOnce(10); // errors

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avg: '45.5' }),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { endpoint: '/api/policies', count: '500' },
          { endpoint: '/api/locations', count: '300' },
        ]),
      };

      mockUsageRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.getUsageStats(mockTenantId, 'key-123');

      expect(result.totalRequests).toBe(1000);
      expect(result.requestsToday).toBe(50);
      expect(result.requestsThisWeek).toBe(300);
      expect(result.averageResponseTime).toBe(45.5);
      expect(result.topEndpoints).toHaveLength(2);
      expect(result.errorRate).toBeGreaterThan(0);
    });
  });

  describe('hasScope', () => {
    it('should return true for admin scope', async () => {
      const adminKey = { ...mockApiKey, scopes: ['admin'] } as ApiKey;

      expect(service.hasScope(adminKey, 'read')).toBe(true);
      expect(service.hasScope(adminKey, 'write')).toBe(true);
      expect(service.hasScope(adminKey, 'admin')).toBe(true);
    });

    it('should return true for write accessing read', async () => {
      const writeKey = { ...mockApiKey, scopes: ['write'] } as ApiKey;

      expect(service.hasScope(writeKey, 'read')).toBe(true);
      expect(service.hasScope(writeKey, 'write')).toBe(true);
    });

    it('should return false for read accessing write', async () => {
      const readKey = { ...mockApiKey, scopes: ['read'] } as ApiKey;

      expect(service.hasScope(readKey, 'read')).toBe(true);
      expect(service.hasScope(readKey, 'write')).toBe(false);
      expect(service.hasScope(readKey, 'admin')).toBe(false);
    });
  });

  describe('IP Allowlisting', () => {
    describe('create with IP allowlist', () => {
      it('should create API key with allowedIps', async () => {
        const dto: CreateApiKeyDto = {
          name: 'IP Restricted Key',
          allowedIps: ['192.168.1.1', '10.0.0.1'],
        };

        mockApiKeyRepository.create.mockReturnValue({
          ...mockApiKey,
          allowedIps: dto.allowedIps,
        } as ApiKey);
        mockApiKeyRepository.save.mockResolvedValue({
          ...mockApiKey,
          allowedIps: dto.allowedIps,
        } as ApiKey);

        const result = await service.create(mockTenantId, mockUserId, dto);

        expect(mockApiKeyRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            allowedIps: ['192.168.1.1', '10.0.0.1'],
            allowedCidrs: null,
          }),
        );
        expect(result.allowedIps).toEqual(['192.168.1.1', '10.0.0.1']);
      });

      it('should create API key with allowedCidrs', async () => {
        const dto: CreateApiKeyDto = {
          name: 'CIDR Restricted Key',
          allowedCidrs: ['192.168.0.0/24', '10.0.0.0/8'],
        };

        mockApiKeyRepository.create.mockReturnValue({
          ...mockApiKey,
          allowedCidrs: dto.allowedCidrs,
        } as ApiKey);
        mockApiKeyRepository.save.mockResolvedValue({
          ...mockApiKey,
          allowedCidrs: dto.allowedCidrs,
        } as ApiKey);

        const result = await service.create(mockTenantId, mockUserId, dto);

        expect(mockApiKeyRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            allowedIps: null,
            allowedCidrs: ['192.168.0.0/24', '10.0.0.0/8'],
          }),
        );
        expect(result.allowedCidrs).toEqual(['192.168.0.0/24', '10.0.0.0/8']);
      });

      it('should create API key with both allowedIps and allowedCidrs', async () => {
        const dto: CreateApiKeyDto = {
          name: 'Combined Restricted Key',
          allowedIps: ['192.168.1.1'],
          allowedCidrs: ['10.0.0.0/8'],
        };

        mockApiKeyRepository.create.mockReturnValue({
          ...mockApiKey,
          allowedIps: dto.allowedIps,
          allowedCidrs: dto.allowedCidrs,
        } as ApiKey);
        mockApiKeyRepository.save.mockResolvedValue({
          ...mockApiKey,
          allowedIps: dto.allowedIps,
          allowedCidrs: dto.allowedCidrs,
        } as ApiKey);

        const result = await service.create(mockTenantId, mockUserId, dto);

        expect(result.allowedIps).toEqual(['192.168.1.1']);
        expect(result.allowedCidrs).toEqual(['10.0.0.0/8']);
      });
    });

    describe('update IP allowlist', () => {
      it('should update allowedIps', async () => {
        mockApiKeyRepository.findOne.mockResolvedValue(mockApiKey as ApiKey);
        mockApiKeyRepository.save.mockResolvedValue({
          ...mockApiKey,
          allowedIps: ['192.168.1.100'],
        } as ApiKey);

        const result = await service.update(mockTenantId, 'key-123', {
          allowedIps: ['192.168.1.100'],
        });

        expect(result.allowedIps).toEqual(['192.168.1.100']);
      });

      it('should update allowedCidrs', async () => {
        mockApiKeyRepository.findOne.mockResolvedValue(mockApiKey as ApiKey);
        mockApiKeyRepository.save.mockResolvedValue({
          ...mockApiKey,
          allowedCidrs: ['172.16.0.0/12'],
        } as ApiKey);

        const result = await service.update(mockTenantId, 'key-123', {
          allowedCidrs: ['172.16.0.0/12'],
        });

        expect(result.allowedCidrs).toEqual(['172.16.0.0/12']);
      });

      it('should remove IP restrictions with empty array', async () => {
        const keyWithRestrictions = {
          ...mockApiKey,
          allowedIps: ['192.168.1.1'],
          allowedCidrs: ['10.0.0.0/8'],
        };

        mockApiKeyRepository.findOne.mockResolvedValue(
          keyWithRestrictions as ApiKey,
        );
        mockApiKeyRepository.save.mockResolvedValue({
          ...keyWithRestrictions,
          allowedIps: null,
          allowedCidrs: null,
        } as ApiKey);

        const result = await service.update(mockTenantId, 'key-123', {
          allowedIps: [],
          allowedCidrs: [],
        });

        expect(result.allowedIps).toBeNull();
        expect(result.allowedCidrs).toBeNull();
      });
    });

    describe('rotate with IP allowlist', () => {
      it('should preserve IP allowlist when rotating', async () => {
        const keyWithRestrictions = {
          ...mockApiKey,
          allowedIps: ['192.168.1.1'],
          allowedCidrs: ['10.0.0.0/8'],
        };

        mockApiKeyRepository.findOne.mockResolvedValue(
          keyWithRestrictions as ApiKey,
        );
        mockApiKeyRepository.create.mockReturnValue({
          ...keyWithRestrictions,
          id: 'key-new',
          name: 'Test API Key (rotated)',
        } as ApiKey);
        mockApiKeyRepository.save.mockResolvedValue({
          ...keyWithRestrictions,
          id: 'key-new',
        } as ApiKey);

        const result = await service.rotate(mockTenantId, 'key-123', 24);

        expect(mockApiKeyRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            allowedIps: ['192.168.1.1'],
            allowedCidrs: ['10.0.0.0/8'],
          }),
        );
        expect(result.allowedIps).toEqual(['192.168.1.1']);
        expect(result.allowedCidrs).toEqual(['10.0.0.0/8']);
      });
    });

    describe('toResponseDto includes IP allowlist', () => {
      it('should include allowedIps and allowedCidrs in response', async () => {
        const keyWithRestrictions = {
          ...mockApiKey,
          allowedIps: ['192.168.1.1'],
          allowedCidrs: ['10.0.0.0/8'],
        };

        mockApiKeyRepository.find.mockResolvedValueOnce([
          keyWithRestrictions as ApiKey,
        ]);

        const result = await service.findAll(mockTenantId);

        expect(result[0].allowedIps).toEqual(['192.168.1.1']);
        expect(result[0].allowedCidrs).toEqual(['10.0.0.0/8']);
      });

      it('should return null for unrestricted keys', async () => {
        const unrestrictedKey = {
          ...mockApiKey,
          allowedIps: null,
          allowedCidrs: null,
        };

        mockApiKeyRepository.find.mockResolvedValueOnce([
          unrestrictedKey as ApiKey,
        ]);

        const result = await service.findAll(mockTenantId);

        expect(result[0].allowedIps).toBeNull();
        expect(result[0].allowedCidrs).toBeNull();
      });
    });
  });
});
