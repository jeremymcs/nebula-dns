/**
 * Nebula DNS - MSP Templates Service Unit Tests
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { MspTemplatesService } from './msp-templates.service';
import {
  MspTemplate,
  MspTemplateDeployment,
} from './entities/msp-template.entity';
import { MspTemplateVersion } from './entities/msp-template-version.entity';
import { ClientTemplateApplication } from './entities/client-template-application.entity';
import { TemplateApplyJob } from './entities/template-apply-job.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
// PartnerUser removed - using unified tier system (US-022, US-023)
import { Policy } from '../policies/entities/policy.entity';
import { PolicyVersion } from '../policies/entities/policy-version.entity';
import { Location } from '../locations/entities/location.entity';
import { RedisService } from '../redis/redis.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PolicyCompilerService } from '../policies/policy-compiler.service';

describe('MspTemplatesService', () => {
  let service: MspTemplatesService;
  let templateRepository: any;
  let deploymentRepository: any;
  let tenantRepository: any;
  let userRepository: any;
  // partnerUserRepository removed - using unified tier system (US-022, US-023)
  let policyRepository: any;

  const mockUserId = 'user-123';
  const mockTenantId = 'tenant-123';
  const mockPartnerId = 'partner-123';
  const mockTemplateId = 'template-123';

  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
  };

  // mockPartnerUser removed - using unified tier system (US-022, US-023)
  // MSP users are now identified by tenant.tier='msp'

  const mockTenant = {
    id: mockTenantId,
    tier: 'msp', // MSP tier replaces partnerId
    managedByMspId: null,
    name: 'Test MSP Tenant',
  };

  const mockTemplate = {
    id: mockTemplateId,
    partnerId: mockPartnerId,
    name: 'Test Template',
    description: 'A test template',
    config: {
      policyName: 'Default Policy',
      policyDescription: 'From template',
      blockCategories: ['malware', 'phishing'],
      warnCategories: [],
      threatBlocking: { enabled: true, feeds: ['malware'] },
      safesearch: { enabled: false, services: [] },
      schedules: [],
    },
    version: 1,
    isDefault: false,
    category: 'security',
    tags: ['test'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockDeployment = {
    id: 'deployment-123',
    templateId: mockTemplateId,
    tenantId: mockTenantId,
    deployedBy: mockUserId,
    templateVersion: 1,
    deploymentMode: 'overlay',
    status: 'completed',
    policiesCreated: 1,
    createdAt: new Date('2024-01-01'),
  };

  const mockTemplateRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockDeploymentRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockTenantRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  // mockPartnerUserRepository removed - using unified tier system (US-022, US-023)

  const mockPolicyRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockPolicyVersionRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockLocationRepository = {
    find: jest.fn(),
  };

  const mockVersionRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockApplicationRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    }),
  };

  const mockApplyJobRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockRedisService = {
    invalidatePolicy: jest.fn(),
  };

  const mockAuditLogsService = {
    log: jest.fn(),
  };

  const mockPolicyCompilerService = {
    compile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MspTemplatesService,
        {
          provide: getRepositoryToken(MspTemplate),
          useValue: mockTemplateRepository,
        },
        {
          provide: getRepositoryToken(MspTemplateDeployment),
          useValue: mockDeploymentRepository,
        },
        {
          provide: getRepositoryToken(MspTemplateVersion),
          useValue: mockVersionRepository,
        },
        {
          provide: getRepositoryToken(ClientTemplateApplication),
          useValue: mockApplicationRepository,
        },
        {
          provide: getRepositoryToken(TemplateApplyJob),
          useValue: mockApplyJobRepository,
        },
        {
          provide: getRepositoryToken(Tenant),
          useValue: mockTenantRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        // PartnerUser repository removed - using unified tier system (US-022, US-023)
        {
          provide: getRepositoryToken(Policy),
          useValue: mockPolicyRepository,
        },
        {
          provide: getRepositoryToken(PolicyVersion),
          useValue: mockPolicyVersionRepository,
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
          provide: AuditLogsService,
          useValue: mockAuditLogsService,
        },
        {
          provide: PolicyCompilerService,
          useValue: mockPolicyCompilerService,
        },
      ],
    }).compile();

    service = module.get<MspTemplatesService>(MspTemplatesService);
    templateRepository = module.get(getRepositoryToken(MspTemplate));
    deploymentRepository = module.get(
      getRepositoryToken(MspTemplateDeployment),
    );
    tenantRepository = module.get(getRepositoryToken(Tenant));
    userRepository = module.get(getRepositoryToken(User));
    // partnerUserRepository removed - using unified tier system (US-022, US-023)
    policyRepository = module.get(getRepositoryToken(Policy));

    jest.clearAllMocks();
  });

  describe('getMspTenantId (via findAll)', () => {
    // Updated for unified tier system (US-022, US-023)
    // MSP access is now determined by tenant.tier='msp'
    it('should get MSP tenant ID from tenant with tier=msp', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockTenantRepository.findOne.mockResolvedValue(mockTenant);
      mockTemplateRepository.find.mockResolvedValue([]);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      mockDeploymentRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      await service.findAll(mockUserId, mockTenantId);

      expect(mockTenantRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockTenantId },
      });
    });

    it('should throw ForbiddenException when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.findAll(mockUserId, mockTenantId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when not an MSP tier tenant', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockTenantRepository.findOne.mockResolvedValue({
        id: mockTenantId,
        tier: 'enterprise', // Not MSP tier
      });

      await expect(service.findAll(mockUserId, mockTenantId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockTenantRepository.findOne.mockResolvedValue(mockTenant);
    });

    it('should return all templates for the partner', async () => {
      mockTemplateRepository.find.mockResolvedValue([mockTemplate]);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ templateId: mockTemplateId, count: '5' }]),
      };
      mockApplicationRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.findAll(mockUserId, mockTenantId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockTemplateId);
      expect(result[0].name).toBe('Test Template');
      expect(result[0].deployedTo).toBe(5);
    });

    it('should return empty array when no templates exist', async () => {
      mockTemplateRepository.find.mockResolvedValue([]);

      const result = await service.findAll(mockUserId, mockTenantId);

      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    beforeEach(() => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockTenantRepository.findOne.mockResolvedValue(mockTenant);
    });

    it('should return a single template by ID', async () => {
      mockTemplateRepository.findOne.mockResolvedValue(mockTemplate);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ templateId: mockTemplateId, count: '3' }]),
      };
      mockApplicationRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.findOne(
        mockUserId,
        mockTenantId,
        mockTemplateId,
      );

      expect(result.id).toBe(mockTemplateId);
      expect(result.name).toBe('Test Template');
      expect(result.deployedTo).toBe(3);
    });

    it('should throw NotFoundException when template not found', async () => {
      mockTemplateRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(mockUserId, mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    beforeEach(() => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockTenantRepository.findOne.mockResolvedValue(mockTenant);
    });

    it('should create a new template', async () => {
      const createDto = {
        name: 'New Template',
        description: 'A new template',
        config: mockTemplate.config,
        category: 'security',
        tags: ['new'],
      };

      mockTemplateRepository.findOne.mockResolvedValueOnce(null); // No duplicate
      mockTemplateRepository.create.mockReturnValue({
        ...mockTemplate,
        ...createDto,
        id: 'new-template-id',
      });
      mockTemplateRepository.save.mockImplementation((template) =>
        Promise.resolve({
          ...template,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const result = await service.create(
        mockUserId,
        mockTenantId,
        createDto,
        '127.0.0.1',
      );

      expect(result.name).toBe('New Template');
      expect(result.deployedTo).toBe(0);
      expect(mockAuditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'create',
          resourceType: 'template',
        }),
      );
    });

    it('should throw ConflictException when template name already exists', async () => {
      const createDto = {
        name: 'Test Template',
        config: mockTemplate.config,
      };

      mockTemplateRepository.findOne.mockResolvedValueOnce(mockTemplate);

      await expect(
        service.create(mockUserId, mockTenantId, createDto, '127.0.0.1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should set isDefault when specified', async () => {
      const createDto = {
        name: 'Default Template',
        config: mockTemplate.config,
        isDefault: true,
      };

      mockTemplateRepository.findOne.mockResolvedValueOnce(null);
      mockTemplateRepository.create.mockReturnValue({
        ...mockTemplate,
        ...createDto,
        id: 'new-template-id',
      });
      mockTemplateRepository.save.mockImplementation((template) =>
        Promise.resolve({
          ...template,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const result = await service.create(mockUserId, mockTenantId, createDto);

      expect(result.isDefault).toBe(true);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockTenantRepository.findOne.mockResolvedValue(mockTenant);
    });

    it('should update template metadata without incrementing version', async () => {
      mockTemplateRepository.findOne
        .mockResolvedValueOnce({ ...mockTemplate }) // First call for partner ID check
        .mockResolvedValueOnce({ ...mockTemplate }); // Second call for findOne
      mockTemplateRepository.save.mockImplementation((template) =>
        Promise.resolve(template),
      );

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      mockDeploymentRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.update(
        mockUserId,
        mockTenantId,
        mockTemplateId,
        { description: 'Updated description' },
        '127.0.0.1',
      );

      expect(result.version).toBe(1); // Version unchanged
      expect(mockAuditLogsService.log).toHaveBeenCalled();
    });

    it('should increment version when config is updated', async () => {
      const templateCopy = { ...mockTemplate };
      mockTemplateRepository.findOne.mockResolvedValue(templateCopy);
      mockTemplateRepository.save.mockImplementation((template) =>
        Promise.resolve(template),
      );

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      mockDeploymentRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const newConfig = {
        ...mockTemplate.config,
        blockCategories: ['malware', 'phishing', 'adult'],
      };

      const result = await service.update(
        mockUserId,
        mockTenantId,
        mockTemplateId,
        { config: newConfig },
        '127.0.0.1',
      );

      expect(result.version).toBe(2);
    });

    it('should throw NotFoundException when template not found', async () => {
      mockTemplateRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(mockUserId, mockTenantId, 'nonexistent-id', {
          name: 'New Name',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when renaming to existing name', async () => {
      mockTemplateRepository.findOne
        .mockResolvedValueOnce({ ...mockTemplate })
        .mockResolvedValueOnce({ id: 'other-template', name: 'Existing Name' });

      await expect(
        service.update(mockUserId, mockTenantId, mockTemplateId, {
          name: 'Existing Name',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockTenantRepository.findOne.mockResolvedValue(mockTenant);
    });

    it('should delete a template', async () => {
      mockTemplateRepository.findOne.mockResolvedValue(mockTemplate);
      mockTemplateRepository.remove.mockResolvedValue({});

      await expect(
        service.remove(mockUserId, mockTenantId, mockTemplateId, '127.0.0.1'),
      ).resolves.toBeUndefined();

      expect(mockTemplateRepository.remove).toHaveBeenCalled();
      expect(mockAuditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'delete',
          resourceType: 'template',
          resourceId: mockTemplateId,
        }),
      );
    });

    it('should throw NotFoundException when template not found', async () => {
      mockTemplateRepository.findOne.mockResolvedValue(null);

      await expect(
        service.remove(mockUserId, mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deploy', () => {
    const mockTenant2 = {
      id: 'tenant-456',
      partnerId: mockPartnerId,
      name: 'Test Tenant 2',
    };

    beforeEach(() => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockTenantRepository.findOne.mockResolvedValue(mockTenant);
    });

    it('should deploy template to multiple tenants', async () => {
      mockTemplateRepository.findOne.mockResolvedValue(mockTemplate);
      mockTenantRepository.find.mockResolvedValue([mockTenant, mockTenant2]);
      mockPolicyRepository.create.mockReturnValue({
        id: 'new-policy-id',
        name: 'Default Policy',
        tenantId: mockTenantId,
      });
      mockPolicyRepository.save.mockImplementation((policy) =>
        Promise.resolve({ ...policy, id: 'new-policy-id' }),
      );
      mockPolicyVersionRepository.create.mockReturnValue({
        id: 'new-version-id',
        policyId: 'new-policy-id',
        version: 1,
      });
      mockPolicyVersionRepository.save.mockResolvedValue({});
      mockDeploymentRepository.create.mockReturnValue(mockDeployment);
      mockDeploymentRepository.save.mockResolvedValue(mockDeployment);
      mockLocationRepository.find.mockResolvedValue([]);

      const deployDto = {
        tenantIds: [mockTenantId, 'tenant-456'],
        mode: 'overlay' as const,
      };

      const result = await service.deploy(
        mockUserId,
        mockTenantId,
        mockTemplateId,
        deployDto,
        '127.0.0.1',
      );

      expect(result.success).toBe(true);
      expect(result.totalTenants).toBe(2);
      expect(result.successfulDeployments).toBe(2);
      expect(result.failedDeployments).toBe(0);
      expect(mockAuditLogsService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException when template not found', async () => {
      mockTemplateRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deploy(mockUserId, mockTenantId, 'nonexistent-id', {
          tenantIds: [mockTenantId],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when tenant not owned by partner', async () => {
      mockTemplateRepository.findOne.mockResolvedValue(mockTemplate);
      mockTenantRepository.find.mockResolvedValue([mockTenant]); // Only 1 of 2 found

      await expect(
        service.deploy(mockUserId, mockTenantId, mockTemplateId, {
          tenantIds: [mockTenantId, 'unauthorized-tenant'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle partial deployment failures', async () => {
      mockTemplateRepository.findOne.mockResolvedValue(mockTemplate);
      mockTenantRepository.find.mockResolvedValue([mockTenant, mockTenant2]);

      // First deployment succeeds
      mockPolicyRepository.create.mockReturnValueOnce({
        id: 'policy-1',
        name: 'Default Policy',
        tenantId: mockTenantId,
      });
      mockPolicyRepository.save
        .mockResolvedValueOnce({ id: 'policy-1' })
        .mockRejectedValueOnce(new Error('Database error')); // Second deployment fails
      mockPolicyVersionRepository.create.mockReturnValue({});
      mockPolicyVersionRepository.save.mockResolvedValue({});
      mockDeploymentRepository.create.mockReturnValue(mockDeployment);
      mockDeploymentRepository.save.mockResolvedValue(mockDeployment);
      mockLocationRepository.find.mockResolvedValue([]);

      const result = await service.deploy(
        mockUserId,
        mockTenantId,
        mockTemplateId,
        { tenantIds: [mockTenantId, 'tenant-456'] },
      );

      expect(result.success).toBe(false);
      expect(result.successfulDeployments).toBe(1);
      expect(result.failedDeployments).toBe(1);
    });
  });

  describe('getDeploymentHistory', () => {
    beforeEach(() => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockTenantRepository.findOne.mockResolvedValue(mockTenant);
    });

    it('should return deployment history for a template', async () => {
      const deployments = [
        { ...mockDeployment, id: 'deployment-1' },
        { ...mockDeployment, id: 'deployment-2' },
      ];

      mockTemplateRepository.findOne.mockResolvedValue(mockTemplate);
      mockDeploymentRepository.find.mockResolvedValue(deployments);

      const result = await service.getDeploymentHistory(
        mockUserId,
        mockTenantId,
        mockTemplateId,
      );

      expect(result).toHaveLength(2);
      expect(mockDeploymentRepository.find).toHaveBeenCalledWith({
        where: { templateId: mockTemplateId },
        order: { createdAt: 'DESC' },
        take: 50,
      });
    });

    it('should throw NotFoundException when template not found', async () => {
      mockTemplateRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getDeploymentHistory(
          mockUserId,
          mockTenantId,
          'nonexistent-id',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should respect custom limit parameter', async () => {
      mockTemplateRepository.findOne.mockResolvedValue(mockTemplate);
      mockDeploymentRepository.find.mockResolvedValue([]);

      await service.getDeploymentHistory(
        mockUserId,
        mockTenantId,
        mockTemplateId,
        10,
      );

      expect(mockDeploymentRepository.find).toHaveBeenCalledWith({
        where: { templateId: mockTemplateId },
        order: { createdAt: 'DESC' },
        take: 10,
      });
    });
  });
});
