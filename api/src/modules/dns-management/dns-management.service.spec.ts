// Nebula DNS - DnsManagementService tenant boundary unit tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net

import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';
import { DnsManagementService } from './dns-management.service';
import { DnsPlatformConnection } from './entities/dns-platform-connection.entity';
import { DnsZoneAssignment } from './entities/dns-zone-assignment.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { DNS_PROVIDER } from './providers/dns-provider.interface';
import { LimitsService } from '../limits/limits.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AdminActivityService } from '../admin/admin-activity.service';

describe('DnsManagementService tenant boundary', () => {
  let service: DnsManagementService;
  const assignmentFindOne = jest.fn();

  beforeEach(async () => {
    process.env.DNS_MANAGEMENT_ENCRYPTION_KEY =
      'test-dns-management-encryption-key-32b!';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DnsManagementService,
        {
          provide: getRepositoryToken(DnsPlatformConnection),
          useValue: { findOne: jest.fn(), save: jest.fn(), create: jest.fn() },
        },
        {
          provide: getRepositoryToken(DnsZoneAssignment),
          useValue: {
            findOne: assignmentFindOne,
            find: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Tenant),
          useValue: { findOne: jest.fn() },
        },
        { provide: DNS_PROVIDER, useValue: {} },
        {
          provide: LimitsService,
          useValue: {
            canAssignDnsZone: jest.fn(),
            invalidateDnsZoneCountCache: jest.fn(),
          },
        },
        { provide: AuditLogsService, useValue: { log: jest.fn() } },
        { provide: AdminActivityService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(DnsManagementService);
    assignmentFindOne.mockReset();
  });

  it('returns 404 when assignment belongs to another tenant', async () => {
    assignmentFindOne.mockResolvedValue(null);
    await expect(
      service.resolveTenantAssignment('tenant-b', 'zone-a-uuid'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(assignmentFindOne).toHaveBeenCalledWith({
      where: {
        id: 'zone-a-uuid',
        tenantId: 'tenant-b',
        unassignedAt: IsNull(),
      },
    });
  });
});
