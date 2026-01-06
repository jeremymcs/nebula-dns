/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Policies Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PoliciesService } from './policies.service';
import { Policy } from './entities/policy.entity';
import { PolicyVersion } from './entities/policy-version.entity';
import { Location } from '../locations/entities/location.entity';
import { RedisService } from '../redis/redis.service';
import { PolicyCompilerService } from './policy-compiler.service';

describe('PoliciesService', () => {
  let service: PoliciesService;
  let policyRepository: any;
  let versionRepository: any;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';

  const mockPolicy = {
    id: 'policy-123',
    name: 'Test Policy',
    description: 'A test policy',
    tenantId: mockTenantId,
    currentVersion: 1,
    isDefault: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPolicyVersion = {
    id: 'version-123',
    policyId: 'policy-123',
    version: 1,
    config: {
      blockCategories: ['malware', 'phishing'],
      threatBlocking: { enabled: true, feeds: ['malware'] },
      safesearch: { enabled: false, services: [] },
      schedules: [],
    },
    createdBy: mockUserId,
    changelog: 'Initial version',
    createdAt: new Date('2024-01-01'),
  };

  const mockPolicyRepository = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockVersionRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockLocationRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockRedisService = {
    publishPolicyUpdate: jest.fn(),
    invalidateCache: jest.fn(),
  };

  const mockPolicyCompilerService = {
    compile: jest.fn(),
    compileForAllLocations: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoliciesService,
        {
          provide: getRepositoryToken(Policy),
          useValue: mockPolicyRepository,
        },
        {
          provide: getRepositoryToken(PolicyVersion),
          useValue: mockVersionRepository,
        },
        {
          provide: getRepositoryToken(Location),
          useValue: mockLocationRepository,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: PolicyCompilerService,
          useValue: mockPolicyCompilerService,
        },
      ],
    }).compile();

    service = module.get<PoliciesService>(PoliciesService);
    policyRepository = module.get(getRepositoryToken(Policy));
    versionRepository = module.get(getRepositoryToken(PolicyVersion));

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated policies', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockPolicy]),
      };
      mockPolicyRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll(mockTenantId, { limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual(mockPolicy);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should handle pagination with cursor', async () => {
      const policies = [
        { ...mockPolicy, id: 'policy-1', createdAt: new Date('2024-01-02') },
        { ...mockPolicy, id: 'policy-2', createdAt: new Date('2024-01-01') },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(policies),
      };
      mockPolicyRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll(mockTenantId, { limit: 1 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.cursor).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('should return policy with current config', async () => {
      mockPolicyRepository.findOne.mockResolvedValue(mockPolicy);
      mockVersionRepository.findOne.mockResolvedValue(mockPolicyVersion);

      const result = await service.findOne(mockTenantId, mockPolicy.id);

      expect(result.id).toBe(mockPolicy.id);
      expect(result.currentConfig).toEqual(mockPolicyVersion.config);
    });

    it('should throw NotFoundException for non-existent policy', async () => {
      mockPolicyRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create policy with initial version', async () => {
      const createDto = {
        name: 'New Policy',
        description: 'A new policy',
        config: mockPolicyVersion.config,
      };

      mockPolicyRepository.create.mockReturnValue({
        ...mockPolicy,
        name: createDto.name,
        description: createDto.description,
      });
      mockPolicyRepository.save.mockImplementation((policy) =>
        Promise.resolve(policy),
      );
      mockVersionRepository.create.mockReturnValue(mockPolicyVersion);
      mockVersionRepository.save.mockResolvedValue(mockPolicyVersion);

      const result = await service.create(mockTenantId, createDto, mockUserId);

      expect(result.name).toBe(createDto.name);
      expect(mockVersionRepository.save).toHaveBeenCalled();
    });

    it('should set isDefault when specified', async () => {
      const createDto = {
        name: 'Default Policy',
        config: mockPolicyVersion.config,
        isDefault: true,
      };

      mockPolicyRepository.create.mockReturnValue({
        ...mockPolicy,
        name: createDto.name,
        isDefault: true,
      });
      mockPolicyRepository.save.mockImplementation((policy) =>
        Promise.resolve(policy),
      );
      mockVersionRepository.create.mockReturnValue(mockPolicyVersion);
      mockVersionRepository.save.mockResolvedValue(mockPolicyVersion);

      const result = await service.create(mockTenantId, createDto, mockUserId);

      expect(result.isDefault).toBe(true);
    });
  });

  describe('update', () => {
    it('should update policy metadata without creating new version', async () => {
      mockPolicyRepository.findOne.mockResolvedValue(mockPolicy);
      mockVersionRepository.findOne.mockResolvedValue(mockPolicyVersion);
      mockPolicyRepository.save.mockImplementation((policy) =>
        Promise.resolve(policy),
      );

      const result = await service.update(
        mockTenantId,
        mockPolicy.id,
        { name: 'Updated Name' },
        mockUserId,
      );

      expect(result.name).toBe('Updated Name');
      expect(mockVersionRepository.save).not.toHaveBeenCalled();
    });

    it('should create new version when config is updated', async () => {
      mockPolicyRepository.findOne.mockResolvedValue({ ...mockPolicy });
      mockVersionRepository.findOne.mockResolvedValue(mockPolicyVersion);
      mockVersionRepository.create.mockReturnValue({
        ...mockPolicyVersion,
        version: 2,
      });
      mockVersionRepository.save.mockResolvedValue({});
      mockPolicyRepository.save.mockImplementation((policy) =>
        Promise.resolve(policy),
      );

      const newConfig = {
        ...mockPolicyVersion.config,
        blockCategories: ['malware', 'phishing', 'adult'],
      };

      const result = await service.update(
        mockTenantId,
        mockPolicy.id,
        { config: newConfig },
        mockUserId,
      );

      expect(result.currentVersion).toBe(2);
      expect(mockVersionRepository.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete policy and its versions', async () => {
      mockPolicyRepository.findOne.mockResolvedValue(mockPolicy);
      mockVersionRepository.findOne.mockResolvedValue(mockPolicyVersion);
      mockVersionRepository.delete.mockResolvedValue({});
      mockPolicyRepository.remove.mockResolvedValue({});

      await expect(
        service.remove(mockTenantId, mockPolicy.id),
      ).resolves.toBeUndefined();

      expect(mockVersionRepository.delete).toHaveBeenCalledWith({
        policyId: mockPolicy.id,
      });
      expect(mockPolicyRepository.remove).toHaveBeenCalled();
    });

    it('should throw BadRequestException when deleting default policy', async () => {
      mockPolicyRepository.findOne.mockResolvedValue({
        ...mockPolicy,
        isDefault: true,
      });
      mockVersionRepository.findOne.mockResolvedValue(mockPolicyVersion);

      await expect(service.remove(mockTenantId, mockPolicy.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getVersions', () => {
    it('should return all versions for a policy', async () => {
      const versions = [
        { ...mockPolicyVersion, version: 2 },
        { ...mockPolicyVersion, version: 1 },
      ];

      mockPolicyRepository.findOne.mockResolvedValue(mockPolicy);
      mockVersionRepository.findOne.mockResolvedValue(mockPolicyVersion);
      mockVersionRepository.find.mockResolvedValue(versions);

      const result = await service.getVersions(mockTenantId, mockPolicy.id);

      expect(result).toHaveLength(2);
      expect(result[0].version).toBe(2); // Ordered DESC
    });
  });

  describe('rollback', () => {
    it('should create new version with old config', async () => {
      const oldVersion = {
        ...mockPolicyVersion,
        id: 'old-version',
        version: 1,
      };

      mockPolicyRepository.findOne.mockResolvedValue({
        ...mockPolicy,
        currentVersion: 2,
      });
      mockVersionRepository.findOne
        .mockResolvedValueOnce({ ...mockPolicyVersion, version: 2 }) // Current config
        .mockResolvedValueOnce(oldVersion); // Target version
      mockVersionRepository.create.mockReturnValue({
        ...oldVersion,
        version: 3,
        changelog: 'Rollback to version 1',
      });
      mockVersionRepository.save.mockResolvedValue({});
      mockPolicyRepository.save.mockImplementation((policy) =>
        Promise.resolve(policy),
      );

      const result = await service.rollback(
        mockTenantId,
        mockPolicy.id,
        oldVersion.id,
        mockUserId,
      );

      expect(result.currentVersion).toBe(3);
      expect(mockVersionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          config: oldVersion.config,
          changelog: 'Rollback to version 1',
        }),
      );
    });
  });
});
