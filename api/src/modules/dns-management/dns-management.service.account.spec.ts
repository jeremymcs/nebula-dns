// Nebula DNS - DnsManagementService Cloudflare account id resolution tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DnsManagementService } from './dns-management.service';
import { DnsPlatformConnection } from './entities/dns-platform-connection.entity';
import { DnsZoneAssignment } from './entities/dns-zone-assignment.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { DNS_PROVIDER } from './providers/dns-provider.interface';
import { LimitsService } from '../limits/limits.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AdminActivityService } from '../admin/admin-activity.service';
import { DnsPlatformConnectionStatus } from './enums/dns-connection-status.enum';
import {
  deriveKey,
  encrypt,
} from '../../common/utils/encryption.util';

describe('DnsManagementService platform account id', () => {
  let service: DnsManagementService;
  const connectionFindOne = jest.fn();
  const connectionSave = jest.fn();
  const connectionCreate = jest.fn();
  const verifyToken = jest.fn();
  const listAccounts = jest.fn();
  let encryptionKey: Buffer;

  beforeEach(async () => {
    process.env.DNS_MANAGEMENT_ENCRYPTION_KEY =
      'test-dns-management-encryption-key-32b!';
    encryptionKey = deriveKey(
      process.env.DNS_MANAGEMENT_ENCRYPTION_KEY,
      'dns-management-gcm-salt',
    );

    connectionSave.mockImplementation(async (entity) => entity);
    connectionCreate.mockImplementation((partial) => ({
      id: 'conn-1',
      ...partial,
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DnsManagementService,
        {
          provide: getRepositoryToken(DnsPlatformConnection),
          useValue: {
            findOne: connectionFindOne,
            save: connectionSave,
            create: connectionCreate,
          },
        },
        {
          provide: getRepositoryToken(DnsZoneAssignment),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Tenant),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: DNS_PROVIDER,
          useValue: { verifyToken, listAccounts, listAccountZones: jest.fn() },
        },
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
    verifyToken.mockReset();
    listAccounts.mockReset();
    connectionFindOne.mockReset();
  });

  it('stores Cloudflare account id from listAccounts on connect', async () => {
    verifyToken.mockResolvedValue({ status: 'active', tokenId: 'token-id-1' });
    listAccounts.mockResolvedValue([
      { id: 'real-account-id', name: 'Production' },
    ]);
    connectionFindOne.mockResolvedValue(null);

    const result = await service.setPlatformConnection({
      label: 'CF prod',
      apiToken: 'cf-token',
      adminId: 'admin-1',
    });

    expect(result.accountId).toBe('real-account-id');
    expect(connectionSave).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          accountId: 'real-account-id',
        }),
      }),
    );
  });

  it('requires accountId when token sees multiple accounts', async () => {
    verifyToken.mockResolvedValue({ status: 'active' });
    listAccounts.mockResolvedValue([
      { id: 'a1', name: 'One' },
      { id: 'a2', name: 'Two' },
    ]);
    connectionFindOne.mockResolvedValue(null);

    await expect(
      service.setPlatformConnection({
        label: 'CF',
        apiToken: 'cf-token',
        adminId: 'admin-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('repairs invalid stored account id on verify', async () => {
    const connection: Partial<DnsPlatformConnection> = {
      id: 'conn-1',
      label: 'CF',
      tokenCiphertext: encrypt('cf-token', encryptionKey),
      status: DnsPlatformConnectionStatus.ACTIVE,
      metadata: { accountId: 'legacy-token-id' },
    };
    connectionFindOne.mockResolvedValue(connection);
    verifyToken.mockResolvedValue({ status: 'active' });
    listAccounts.mockResolvedValue([
      { id: 'real-account-id', name: 'Production' },
    ]);

    const result = await service.verifyPlatformConnection('admin-1');

    expect(result.accountId).toBe('real-account-id');
    expect(connectionSave).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          accountId: 'real-account-id',
        }),
      }),
    );
  });
});
