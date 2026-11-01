// Flux Shield - Admin tenants service unit tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminTenantsService } from './admin-tenants.service';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { AgentInstallation } from '../agents/entities/agent-installation.entity';
import { Location } from '../locations/entities/location.entity';
import { LimitsService } from '../limits/limits.service';
import { ClickHouseService } from '../clickhouse/clickhouse.service';
import { AdminActivityService } from './admin-activity.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AdminRole } from './enums/admin-role.enum';

describe('AdminTenantsService', () => {
  let service: AdminTenantsService;

  const mockTenant: Tenant = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Acme Corp',
    slug: 'acme',
    status: 'active',
    plan: 'pro',
    tier: 'enterprise',
    contactEmail: 'admin@acme.test',
    managedByMspId: null,
    managedByMsp: null,
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Tenant;

  const tenantRepo = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockQb = {
    leftJoin: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(1),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockTenant]),
  };

  beforeEach(async () => {
    tenantRepo.createQueryBuilder.mockReturnValue(mockQb);
    tenantRepo.findOne.mockResolvedValue(mockTenant);
    tenantRepo.save.mockImplementation(async (t: Tenant) => t);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminTenantsService,
        { provide: getRepositoryToken(Tenant), useValue: tenantRepo },
        {
          provide: getRepositoryToken(User),
          useValue: {
            count: jest.fn().mockResolvedValue(2),
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getRepositoryToken(AgentInstallation),
          useValue: { count: jest.fn().mockResolvedValue(3) },
        },
        {
          provide: getRepositoryToken(Location),
          useValue: { count: jest.fn().mockResolvedValue(1) },
        },
        {
          provide: LimitsService,
          useValue: {
            getTenantLimits: jest.fn().mockResolvedValue({
              tier: 'pro',
              locationLimit: 10,
              clientLimit: null,
              familyMemberLimit: null,
              queriesPerMonth: 100000,
            }),
            invalidateLimitsCache: jest.fn(),
          },
        },
        {
          provide: ClickHouseService,
          useValue: {
            getSummaryStats: jest.fn().mockResolvedValue({
              totalQueries: 100,
              blockedQueries: 5,
            }),
            isHealthy: jest.fn().mockReturnValue(true),
            isUsingMockData: jest.fn().mockReturnValue(false),
            getAggregatedQueryTimeSeries: jest.fn().mockResolvedValue({
              data: [],
              isMockData: false,
              analyticsAvailable: true,
            }),
          },
        },
        {
          provide: AdminActivityService,
          useValue: { log: jest.fn() },
        },
        {
          provide: AuditLogsService,
          useValue: { log: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AdminTenantsService);
  });

  it('lists tenants with pagination', async () => {
    const result = await service.listTenants({ limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });

  it('returns tenant detail', async () => {
    const detail = await service.getTenantDetail(mockTenant.id);
    expect(detail.name).toBe('Acme Corp');
    expect(detail.agentCount).toBe(3);
  });

  it('throws when tenant missing', async () => {
    tenantRepo.findOne.mockResolvedValueOnce(null);
    await expect(service.getTenantDetail('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('suspends an active tenant', async () => {
    const admin = {
      adminId: 'admin-id',
      email: 'admin@test.local',
      name: 'Admin',
      mfaVerified: true,
      jti: 'jti',
      role: AdminRole.SUPER_ADMIN,
    };
    const result = await service.suspendTenant(mockTenant.id, admin);
    expect(result.success).toBe(true);
    expect(tenantRepo.save).toHaveBeenCalled();
  });

  it('rejects suspend when already suspended', async () => {
    tenantRepo.findOne.mockResolvedValueOnce({
      ...mockTenant,
      status: 'suspended',
    });
    await expect(
      service.suspendTenant(mockTenant.id, {
        adminId: 'a',
        email: 'a@b.c',
        name: 'A',
        mfaVerified: true,
        jti: 'j',
        role: AdminRole.SUPER_ADMIN,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
