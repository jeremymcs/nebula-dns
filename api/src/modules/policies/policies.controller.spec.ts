// Nebula DNS - Policies Controller Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PoliciesController } from './policies.controller';
import { PoliciesService } from './policies.service';
import { PolicyCompilerService } from './policy-compiler.service';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

describe('PoliciesController', () => {
  let controller: PoliciesController;
  let policiesService: PoliciesService;
  let compilerService: PolicyCompilerService;

  const mockTenantId = 'tenant-123';
  const mockPolicyId = 'policy-123';
  const mockLocationId = 'location-123';
  const mockUser = {
    id: 'user-123',
    email: 'admin@example.com',
    role: 'admin',
    tenantId: mockTenantId,
  };

  const mockPolicy = {
    id: mockPolicyId,
    name: 'Test Policy',
    description: 'Test policy description',
    tenantId: mockTenantId,
    config: {
      blockCategories: ['malware', 'phishing'],
      threatBlocking: { enabled: true, feeds: ['abuse.ch'] },
      safesearch: { enabled: false, services: [] },
    },
    isDefault: false,
    versions: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPoliciesService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getVersions: jest.fn(),
    getVersion: jest.fn(),
    rollback: jest.fn(),
  };

  const mockCompilerService = {
    compileAllForTenant: jest.fn(),
    compile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PoliciesController],
      providers: [
        {
          provide: PoliciesService,
          useValue: mockPoliciesService,
        },
        {
          provide: PolicyCompilerService,
          useValue: mockCompilerService,
        },
      ],
    }).compile();

    controller = module.get<PoliciesController>(PoliciesController);
    policiesService = module.get<PoliciesService>(PoliciesService);
    compilerService = module.get<PolicyCompilerService>(PolicyCompilerService);

    jest.clearAllMocks();
  });

  describe('GET /policies', () => {
    it('should return paginated policies', async () => {
      const pagination: PaginationQueryDto = { limit: 10 };
      const mockResponse = {
        data: [mockPolicy],
        pagination: { hasMore: false, cursor: null },
      };

      mockPoliciesService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll(mockTenantId, pagination);

      expect(policiesService.findAll).toHaveBeenCalledWith(
        mockTenantId,
        pagination,
      );
      expect(result).toEqual(mockResponse);
      expect(result.data).toHaveLength(1);
    });

    it('should filter by tenant', async () => {
      mockPoliciesService.findAll.mockResolvedValue({
        data: [mockPolicy],
        pagination: { hasMore: false, cursor: null },
      });

      await controller.findAll(mockTenantId, {});

      expect(policiesService.findAll).toHaveBeenCalledWith(mockTenantId, {});
    });

    it('should return empty array when no policies found', async () => {
      mockPoliciesService.findAll.mockResolvedValue({
        data: [],
        pagination: { hasMore: false, cursor: null },
      });

      const result = await controller.findAll(mockTenantId, {});

      expect(result.data).toEqual([]);
    });
  });

  describe('GET /policies/:id', () => {
    it('should return policy by ID', async () => {
      mockPoliciesService.findOne.mockResolvedValue(mockPolicy);

      const result = await controller.findOne(mockTenantId, mockPolicyId);

      expect(policiesService.findOne).toHaveBeenCalledWith(
        mockTenantId,
        mockPolicyId,
      );
      expect(result).toEqual(mockPolicy);
    });

    it('should throw NotFoundException for non-existent policy', async () => {
      mockPoliciesService.findOne.mockRejectedValue(
        new NotFoundException('Policy not found'),
      );

      await expect(
        controller.findOne(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should enforce tenant isolation', async () => {
      mockPoliciesService.findOne.mockResolvedValue(mockPolicy);

      await controller.findOne(mockTenantId, mockPolicyId);

      expect(policiesService.findOne).toHaveBeenCalledWith(
        mockTenantId,
        mockPolicyId,
      );
    });
  });

  describe('POST /policies', () => {
    it('should create policy with valid data', async () => {
      const createDto: CreatePolicyDto = {
        name: 'New Policy',
        description: 'New policy description',
        config: {
          blockCategories: ['malware'],
          threatBlocking: { enabled: true, feeds: ['abuse.ch'] },
          safesearch: { enabled: false, services: [] },
        },
      };

      const expectedPolicy = { ...mockPolicy, ...createDto };
      mockPoliciesService.create.mockResolvedValue(expectedPolicy);

      const result = await controller.create(mockTenantId, mockUser, createDto);

      expect(policiesService.create).toHaveBeenCalledWith(
        mockTenantId,
        createDto,
        mockUser.id,
      );
      expect(result.name).toBe(createDto.name);
    });

    it('should reject invalid config', async () => {
      const createDto = {
        name: 'Test Policy',
        description: 'Test',
        config: {
          blockCategories: ['malware'],
          threatBlocking: { enabled: true, feeds: [] },
          safesearch: { enabled: false, services: [] },
        },
      };

      mockPoliciesService.create.mockRejectedValue(
        new BadRequestException('Invalid config'),
      );

      await expect(
        controller.create(mockTenantId, mockUser, createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid categories', async () => {
      const createDto: CreatePolicyDto = {
        name: 'Test Policy',
        description: 'Test',
        config: {
          blockCategories: ['invalid-category'],
          threatBlocking: { enabled: true, feeds: [] },
          safesearch: { enabled: false, services: [] },
        },
      };

      mockPoliciesService.create.mockRejectedValue(
        new BadRequestException('Invalid category'),
      );

      await expect(
        controller.create(mockTenantId, mockUser, createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should require policy name', async () => {
      const createDto: CreatePolicyDto = {
        name: '',
        description: 'Test',
        config: {
          blockCategories: ['malware'],
          threatBlocking: { enabled: true, feeds: [] },
          safesearch: { enabled: false, services: [] },
        },
      };

      mockPoliciesService.create.mockRejectedValue(
        new BadRequestException('Policy name is required'),
      );

      await expect(
        controller.create(mockTenantId, mockUser, createDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('PATCH /policies/:id', () => {
    it('should update policy and create new version', async () => {
      const updateDto: UpdatePolicyDto = {
        name: 'Updated Policy',
      };

      const updatedPolicy = { ...mockPolicy, ...updateDto };
      mockPoliciesService.update.mockResolvedValue(updatedPolicy);

      const result = await controller.update(
        mockTenantId,
        mockUser,
        mockPolicyId,
        updateDto,
      );

      expect(policiesService.update).toHaveBeenCalledWith(
        mockTenantId,
        mockPolicyId,
        updateDto,
        mockUser.id,
      );
      expect(result.name).toBe(updateDto.name);
    });

    it('should throw NotFoundException for non-existent policy', async () => {
      const updateDto: UpdatePolicyDto = { name: 'Updated' };

      mockPoliciesService.update.mockRejectedValue(
        new NotFoundException('Policy not found'),
      );

      await expect(
        controller.update(mockTenantId, mockUser, 'nonexistent-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('DELETE /policies/:id', () => {
    it('should delete policy successfully', async () => {
      mockPoliciesService.remove.mockResolvedValue(undefined);

      await controller.remove(mockTenantId, mockPolicyId);

      expect(policiesService.remove).toHaveBeenCalledWith(
        mockTenantId,
        mockPolicyId,
      );
    });

    it('should throw NotFoundException for non-existent policy', async () => {
      mockPoliciesService.remove.mockRejectedValue(
        new NotFoundException('Policy not found'),
      );

      await expect(
        controller.remove(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET /policies/:id/versions', () => {
    it('should return policy version history', async () => {
      const mockVersions = [
        { ...mockPolicy, version: 2 },
        { ...mockPolicy, version: 1 },
      ];

      mockPoliciesService.getVersions.mockResolvedValue(mockVersions);

      const result = await controller.getVersions(mockTenantId, mockPolicyId);

      expect(policiesService.getVersions).toHaveBeenCalledWith(
        mockTenantId,
        mockPolicyId,
      );
      expect(result).toHaveLength(2);
    });

    it('should throw NotFoundException for non-existent policy', async () => {
      mockPoliciesService.getVersions.mockRejectedValue(
        new NotFoundException('Policy not found'),
      );

      await expect(
        controller.getVersions(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET /policies/:id/versions/:versionId', () => {
    it('should return specific policy version', async () => {
      const versionId = 'version-1';
      const mockVersion = { ...mockPolicy, version: 1 };

      mockPoliciesService.getVersion.mockResolvedValue(mockVersion);

      const result = await controller.getVersion(
        mockTenantId,
        mockPolicyId,
        versionId,
      );

      expect(policiesService.getVersion).toHaveBeenCalledWith(
        mockTenantId,
        mockPolicyId,
        versionId,
      );
      expect(result).toEqual(mockVersion);
    });

    it('should throw NotFoundException for non-existent version', async () => {
      mockPoliciesService.getVersion.mockRejectedValue(
        new NotFoundException('Version not found'),
      );

      await expect(
        controller.getVersion(
          mockTenantId,
          mockPolicyId,
          'nonexistent-version',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /policies/:id/rollback', () => {
    it('should rollback to previous version', async () => {
      const versionId = 'version-1';
      const rolledBackPolicy = { ...mockPolicy, version: 3 };

      mockPoliciesService.rollback.mockResolvedValue(rolledBackPolicy);

      const result = await controller.rollback(
        mockTenantId,
        mockUser,
        mockPolicyId,
        versionId,
      );

      expect(policiesService.rollback).toHaveBeenCalledWith(
        mockTenantId,
        mockPolicyId,
        versionId,
        mockUser.id,
      );
      expect(result).toEqual(rolledBackPolicy);
    });

    it('should throw NotFoundException for non-existent version', async () => {
      mockPoliciesService.rollback.mockRejectedValue(
        new NotFoundException('Version not found'),
      );

      await expect(
        controller.rollback(
          mockTenantId,
          mockUser,
          mockPolicyId,
          'nonexistent-version',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /policies/compile', () => {
    it('should compile all policies for tenant', async () => {
      mockCompilerService.compileAllForTenant.mockResolvedValue(undefined);

      const result = await controller.compileAll(mockTenantId);

      expect(compilerService.compileAllForTenant).toHaveBeenCalledWith(
        mockTenantId,
      );
      expect(result.message).toBe('Policies compiled successfully');
    });

    it('should handle compilation errors', async () => {
      mockCompilerService.compileAllForTenant.mockRejectedValue(
        new Error('Compilation failed'),
      );

      await expect(controller.compileAll(mockTenantId)).rejects.toThrow(Error);
    });
  });

  describe('POST /policies/:id/compile/:locationId', () => {
    it('should compile policy for specific location', async () => {
      const mockCompiled = {
        policyId: mockPolicyId,
        locationId: mockLocationId,
        categories: ['malware'],
      };

      mockCompilerService.compile.mockResolvedValue(mockCompiled);

      const result = await controller.compileForLocation(
        mockTenantId,
        mockPolicyId,
        mockLocationId,
      );

      expect(compilerService.compile).toHaveBeenCalledWith(
        mockTenantId,
        mockPolicyId,
        mockLocationId,
      );
      expect(result.message).toBe('Policy compiled successfully');
      expect(result.compiled).toEqual(mockCompiled);
    });

    it('should throw NotFoundException for non-existent policy', async () => {
      mockCompilerService.compile.mockRejectedValue(
        new NotFoundException('Policy not found'),
      );

      await expect(
        controller.compileForLocation(
          mockTenantId,
          'nonexistent-id',
          mockLocationId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent location', async () => {
      mockCompilerService.compile.mockRejectedValue(
        new NotFoundException('Location not found'),
      );

      await expect(
        controller.compileForLocation(
          mockTenantId,
          mockPolicyId,
          'nonexistent-location',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Authorization', () => {
    it('should require OWNER or ADMIN for create', () => {
      const roles = Reflect.getMetadata('roles', controller.create);
      expect(roles).toEqual(expect.arrayContaining(['owner', 'admin']));
    });

    it('should require OWNER for delete', () => {
      const roles = Reflect.getMetadata('roles', controller.remove);
      expect(roles).toContain('owner');
    });

    it('should allow readonly users to view policies', () => {
      const roles = Reflect.getMetadata('roles', controller.findAll);
      expect(roles).toEqual(
        expect.arrayContaining(['owner', 'admin', 'analyst', 'readonly']),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockPoliciesService.findAll.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(controller.findAll(mockTenantId, {})).rejects.toThrow(Error);
    });

    it('should propagate validation errors', async () => {
      const createDto: CreatePolicyDto = {
        name: 'Test',
        description: 'Test',
        config: {
          blockCategories: ['malware'],
          threatBlocking: { enabled: true, feeds: [] },
          safesearch: { enabled: false, services: [] },
        },
      };

      mockPoliciesService.create.mockRejectedValue(
        new BadRequestException('Validation failed'),
      );

      await expect(
        controller.create(mockTenantId, mockUser, createDto),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
