// Nebula DNS - Admin Dashboard Service Unit Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminDashboardService } from './admin-dashboard.service';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { MspInvoice } from '../msp-billing/entities/msp-invoice.entity';
import { ClickHouseService } from '../clickhouse/clickhouse.service';

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;

  const createTenantQb = () => {
    const qb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
      getRawOne: jest.fn(),
    }
    return qb
  }

  let tenantQb = createTenantQb()

  const mspInvoiceQb = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
  };

  const mockTenantRepository = {
    createQueryBuilder: jest.fn(() => {
      const qb = createTenantQb()
      qb.getRawMany.mockResolvedValue([{ tier: 'msp', count: '1' }])
      qb.getRawOne.mockResolvedValue({ count: '0' })
      qb.where.mockImplementation((clause: string) => {
        if (clause.includes("t.tier = :tier")) {
          qb.getRawMany.mockResolvedValue([{ status: 'active', count: '1' }])
        }
        if (clause.includes("t.slug = 'demo'")) {
          qb.getRawOne.mockResolvedValue({ count: '1' })
        }
        if (clause.includes('managed_by_msp_id')) {
          qb.getRawOne.mockResolvedValue({ count: '0' })
        }
        return qb
      })
      return qb
    }),
  }

  const mockSubscriptionRepository = {
    count: jest.fn(),
  };

  const mockMspInvoiceRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mspInvoiceQb),
  };

  const mockClickhouseService = {
    queryScalarNumber: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDashboardService,
        {
          provide: getRepositoryToken(Tenant),
          useValue: mockTenantRepository,
        },
        {
          provide: getRepositoryToken(Subscription),
          useValue: mockSubscriptionRepository,
        },
        {
          provide: getRepositoryToken(MspInvoice),
          useValue: mockMspInvoiceRepository,
        },
        {
          provide: ClickHouseService,
          useValue: mockClickhouseService,
        },
      ],
    }).compile();

    service = module.get(AdminDashboardService);
  });

  it('returns aggregate stats for demo-like environment', async () => {
    mockClickhouseService.queryScalarNumber.mockResolvedValue(0)
    mockSubscriptionRepository.count.mockResolvedValue(0)

    const stats = await service.getStats()

    expect(stats.mspCount).toEqual({ value: 1, available: true });
    expect(stats.mspPendingCount).toEqual({ value: 0, available: true });
    expect(stats.tenantCount.total).toEqual({ value: 1, available: true });
    expect(stats.tenantCount.mspClients).toEqual({ value: 0, available: true });
    expect(stats.activeTenants7d).toEqual({ value: 0, available: true });
    expect(stats.billingEnabled).toBe(false);
    expect(stats.monthlyRevenueCents.value).toBeNull();
    expect(stats.demoTenantCount.value).toBe(1);
  });

  it('marks ClickHouse-derived metrics unavailable when query fails', async () => {
    mockTenantRepository.createQueryBuilder.mockImplementation(() => {
      const qb = createTenantQb()
      qb.getRawMany.mockResolvedValue([])
      qb.getRawOne.mockResolvedValue({ count: '0' })
      return qb
    })
    mockClickhouseService.queryScalarNumber.mockResolvedValue(null)
    mockSubscriptionRepository.count.mockResolvedValue(0)

    const stats = await service.getStats();

    expect(stats.activeTenants7d).toEqual({ value: 0, available: false });
  });

  it('computes paid MSP invoice revenue in cents when billing enabled', async () => {
    mspInvoiceQb.getRawOne.mockResolvedValue({ total: '123.45' });

    const cents = await service.sumPaidMspInvoiceRevenueCents('current');

    expect(cents).toBe(12345);
  });
});
