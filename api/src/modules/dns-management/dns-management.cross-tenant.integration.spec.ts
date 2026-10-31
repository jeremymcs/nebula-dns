// Nebula DNS - Cross-tenant leakage tests for DNS Management
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DnsManagementService } from './dns-management.service';
import { DnsPlatformConnection } from './entities/dns-platform-connection.entity';
import { DnsZoneAssignment } from './entities/dns-zone-assignment.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { DNS_PROVIDER } from './providers/dns-provider.interface';
import { LimitsService } from '../limits/limits.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AdminActivityService } from '../admin/admin-activity.service';
import { ALL_TEST_ENTITIES } from '../../../test/all-entities';
import { DnsPlatformConnectionStatus } from './enums/dns-connection-status.enum';
import { DnsProvisioningModel } from './enums/dns-provisioning-model.enum';

describe('DnsManagement cross-tenant isolation', () => {
  let module: TestingModule;
  let service: DnsManagementService;
  let assignmentRepo: Repository<DnsZoneAssignment>;
  let tenantRepo: Repository<Tenant>;
  let zoneAId: string;
  let zoneBId: string;
  const providerZoneA = 'cf-zone-tenant-a';
  const providerZoneB = 'cf-zone-tenant-b';

  const mockProvider = {
    verifyToken: jest.fn(),
    listAccountZones: jest.fn(),
    createZone: jest.fn(),
    listRecords: jest.fn(),
    createRecord: jest.fn(),
    updateRecord: jest.fn(),
    deleteRecord: jest.fn(),
  };

  beforeAll(async () => {
    process.env.DNS_MANAGEMENT_ENCRYPTION_KEY =
      'test-dns-management-encryption-key-32b!';

    const databaseUrl =
      process.env.DATABASE_URL ||
      'postgresql://test:test@localhost:5432/nebula_test';

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: databaseUrl,
          entities: ALL_TEST_ENTITIES,
          synchronize: true,
          dropSchema: true,
          ssl: false,
        }),
        TypeOrmModule.forFeature([
          DnsPlatformConnection,
          DnsZoneAssignment,
          Tenant,
        ]),
      ],
      providers: [
        DnsManagementService,
        {
          provide: DNS_PROVIDER,
          useValue: mockProvider,
        },
        {
          provide: LimitsService,
          useValue: {
            canAssignDnsZone: jest.fn().mockResolvedValue({ allowed: true }),
            invalidateDnsZoneCountCache: jest.fn(),
          },
        },
        {
          provide: AuditLogsService,
          useValue: { log: jest.fn() },
        },
        {
          provide: AdminActivityService,
          useValue: { log: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(DnsManagementService);
    assignmentRepo = module.get(getRepositoryToken(DnsZoneAssignment));
    tenantRepo = module.get(getRepositoryToken(Tenant));

    const tenantA = await tenantRepo.save(
      tenantRepo.create({
        name: 'Tenant A',
        slug: 'tenant-a',
        status: 'active',
        tier: 'enterprise',
        plan: 'pro',
      }),
    );
    const tenantB = await tenantRepo.save(
      tenantRepo.create({
        name: 'Tenant B',
        slug: 'tenant-b',
        status: 'active',
        tier: 'enterprise',
        plan: 'pro',
      }),
    );

    const connectionRepo = module.get<Repository<DnsPlatformConnection>>(
      getRepositoryToken(DnsPlatformConnection),
    );
    await connectionRepo.save(
      connectionRepo.create({
        label: 'Test CF',
        tokenCiphertext: 'dummy',
        tokenFingerprint: 'abc',
        status: DnsPlatformConnectionStatus.ACTIVE,
        metadata: {
          zoneInventory: [
            {
              providerZoneId: providerZoneA,
              zoneName: 'a.example.com',
              status: 'active',
              nameServers: ['ns1.example.com'],
              syncedAt: new Date().toISOString(),
            },
            {
              providerZoneId: providerZoneB,
              zoneName: 'b.example.com',
              status: 'active',
              nameServers: ['ns2.example.com'],
              syncedAt: new Date().toISOString(),
            },
          ],
        },
      }),
    );

    const assignmentA = await assignmentRepo.save(
      assignmentRepo.create({
        tenantId: tenantA.id,
        connectionId: (await connectionRepo.findOne({ where: {} }))!.id,
        provisioningModel: DnsProvisioningModel.PLATFORM_HOSTED,
        providerZoneId: providerZoneA,
        zoneName: 'a.example.com',
        status: 'active',
        nameServers: [],
      }),
    );
    const assignmentB = await assignmentRepo.save(
      assignmentRepo.create({
        tenantId: tenantB.id,
        connectionId: (await connectionRepo.findOne({ where: {} }))!.id,
        provisioningModel: DnsProvisioningModel.PLATFORM_HOSTED,
        providerZoneId: providerZoneB,
        zoneName: 'b.example.com',
        status: 'active',
        nameServers: [],
      }),
    );

    zoneAId = assignmentA.id;
    zoneBId = assignmentB.id;
  });

  afterAll(async () => {
    await module?.close();
  });

  it('tenant B cannot list tenant A zones', async () => {
    const zones = await service.listTenantZones(
      (await tenantRepo.findOne({ where: { slug: 'tenant-b' } }))!.id,
    );
    expect(zones.every((z) => z.zoneName !== 'a.example.com')).toBe(true);
  });

  it('tenant B cannot read tenant A records by assignment UUID (404)', async () => {
    const tenantB = (await tenantRepo.findOne({ where: { slug: 'tenant-b' } }))!;
    await expect(
      service.listTenantRecords(tenantB.id, zoneAId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('tenant B cannot access tenant A zone by raw Cloudflare zone id', async () => {
    const tenantB = (await tenantRepo.findOne({ where: { slug: 'tenant-b' } }))!;
    const assignment = await service.resolveByProviderZoneIdForTenant(
      tenantB.id,
      providerZoneA,
    );
    expect(assignment).toBeNull();
  });

  it('random assignment UUID returns 404 for tenant A', async () => {
    const tenantA = (await tenantRepo.findOne({ where: { slug: 'tenant-a' } }))!;
    await expect(
      service.listTenantRecords(tenantA.id, '00000000-0000-4000-8000-000000000099'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('tenant A can list only its own zone', async () => {
    const tenantA = (await tenantRepo.findOne({ where: { slug: 'tenant-a' } }))!;
    const zones = await service.listTenantZones(tenantA.id);
    expect(zones).toHaveLength(1);
    expect(zones[0].id).toBe(zoneAId);
    expect(zones[0].id).not.toBe(zoneBId);
  });
});
