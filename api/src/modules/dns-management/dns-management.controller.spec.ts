// Nebula DNS - DNS Management controller permission tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net

import { Test, TestingModule } from '@nestjs/testing';
import {
  DnsManagementController,
} from './dns-management.controller';
import { AdminDnsManagementController } from './admin-dns-management.controller';
import { DnsManagementService } from './dns-management.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { AdminRolesGuard } from '../admin/guards/admin-roles.guard';

describe('DnsManagementController', () => {
  let controller: DnsManagementController;
  const service = {
    listTenantZones: jest.fn(),
    listTenantRecords: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DnsManagementController],
      providers: [{ provide: DnsManagementService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(DnsManagementController);
    jest.clearAllMocks();
  });

  it('lists zones for tenant', async () => {
    service.listTenantZones.mockResolvedValue([{ id: 'z1' }]);
    await expect(controller.listZones('tenant-a')).resolves.toEqual([
      { id: 'z1' },
    ]);
    expect(service.listTenantZones).toHaveBeenCalledWith('tenant-a');
  });

  it('lists records using assignment zone id', async () => {
    service.listTenantRecords.mockResolvedValue([]);
    await controller.listRecords('tenant-a', 'assignment-uuid');
    expect(service.listTenantRecords).toHaveBeenCalledWith(
      'tenant-a',
      'assignment-uuid',
    );
  });
});

describe('AdminDnsManagementController', () => {
  let controller: AdminDnsManagementController;
  const service = {
    getPlatformConnectionStatus: jest.fn(),
    setPlatformConnection: jest.fn(),
    syncPlatformZones: jest.fn(),
    assignZone: jest.fn(),
  };

  const req = {
    user: { adminId: 'admin-1' },
    ip: '127.0.0.1',
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminDnsManagementController],
      providers: [{ provide: DnsManagementService, useValue: service }],
    })
      .overrideGuard(AdminAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminRolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AdminDnsManagementController);
    jest.clearAllMocks();
  });

  it('stores platform connection via admin id', async () => {
    service.setPlatformConnection.mockResolvedValue({ id: 'conn-1' });
    await controller.setConnection(
      { label: 'Flux CF', apiToken: 'secret-token' },
      req,
    );
    expect(service.setPlatformConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: 'admin-1',
        apiToken: 'secret-token',
      }),
    );
  });

  it('does not expose token in get connection', async () => {
    service.getPlatformConnectionStatus.mockResolvedValue({
      id: 'conn-1',
      tokenFingerprint: 'abc123',
    });
    const result = await controller.getConnection();
    expect(result).not.toHaveProperty('apiToken');
    expect(result).not.toHaveProperty('tokenCiphertext');
  });
});
