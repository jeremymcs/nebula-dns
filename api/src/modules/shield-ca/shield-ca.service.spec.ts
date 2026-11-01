import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { ShieldCaService } from './shield-ca.service';
import { ShieldCaIntermediate } from './entities/shield-ca-intermediate.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { RedisService } from '../redis/redis.service';
import { EmailService } from '../email/email.service';
import * as pki from './shield-ca-pki.util';
import * as encryption from '@/common/utils/encryption.util';

describe('ShieldCaService', () => {
  let service: ShieldCaService;
  const redis = { get: jest.fn(), set: jest.fn() };
  const caRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const tenantRepo = { findOne: jest.fn() };
  const userRepo = { find: jest.fn() };
  const emailService = {
    sendTransactionalHtml: jest.fn().mockResolvedValue(true),
    sendRendered: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShieldCaService,
        { provide: getRepositoryToken(ShieldCaIntermediate), useValue: caRepo },
        { provide: getRepositoryToken(Tenant), useValue: tenantRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: RedisService, useValue: redis },
        { provide: EmailService, useValue: emailService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'SHIELD_CA_MASTER_KEY')
                return 'test-master-key-32-characters-long!';
              if (key === 'SHIELD_BLOCKPAGE_INTERNAL_SECRET') return 'secret';
              if (key === 'FRONTEND_URL') return 'http://localhost:4011';
              return undefined;
            }),
          },
        },
      ],
    }).compile();
    service = module.get(ShieldCaService);
  });

  it('denies leaf issuance when domain is not blocked', async () => {
    redis.get.mockResolvedValue(null);
    await expect(service.issueLeafForDomain('evil.com')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('resolves MSP-owned CA for managed client tenants', async () => {
    tenantRepo.findOne.mockResolvedValueOnce({
      id: 'client-1',
      managedByMspId: 'msp-1',
      tier: 'enterprise',
    });
    tenantRepo.findOne.mockResolvedValueOnce({
      id: 'msp-1',
      tier: 'msp',
      slug: 'msp',
    });
    const owner = await service.resolveCaOwner('client-1');
    expect(owner.ownerTenantId).toBe('msp-1');
    expect(owner.scope).toBe('msp');
  });

  it('issues leaf only for blocked domain with tenant SNI index', async () => {
    redis.get.mockImplementation(async (key: string) => {
      if (key === 'blockdomainsni:blocked.example.com') return 'tenant-a';
      if (key === 'blockdomain:tenant-a:blocked.example.com') return '1';
      return null;
    });
    tenantRepo.findOne.mockResolvedValue({
      id: 'tenant-a',
      tier: 'enterprise',
      slug: 'a',
    });
    jest.spyOn(pki, 'issueLeafCertificate').mockReturnValue({
      certificatePem: 'leaf-cert',
      privateKeyPem: 'leaf-key',
      notBefore: new Date(),
      notAfter: new Date(Date.now() + 3600000),
    });
    jest.spyOn(service as any, 'ensureIntermediate').mockResolvedValue({
      certificatePem: 'ca-cert',
      privateKeyEncrypted: 'enc',
    });
    jest
      .spyOn(encryption, 'decrypt')
      .mockReturnValue('mock-intermediate-private-key-pem-for-unit-tests');
    const result = await service.issueLeafForDomain('blocked.example.com');
    expect(result.certificatePem).toBe('leaf-cert');
    expect(pki.issueLeafCertificate).toHaveBeenCalledWith(
      expect.objectContaining({ domain: 'blocked.example.com' }),
    );
  });

  it('caddy ask allowed only for blocked domains', async () => {
    redis.get.mockImplementation(async (key: string) => {
      if (key === 'blockdomainsni:ok.example.com') return 'tenant-a';
      if (key === 'blockdomain:tenant-a:ok.example.com') return '1';
      return null;
    });
    await expect(service.caddyAskAllowed('ok.example.com')).resolves.toBe(true);
    await expect(service.caddyAskAllowed('unknown.example.com')).resolves.toBe(
      false,
    );
  });

  it('sends rotation alert emails once per intermediate expiry', async () => {
    const notAfter = new Date(Date.now() + 86400000 * 10);
    caRepo.find.mockResolvedValue([
      {
        id: 'ca-1',
        ownerTenantId: 'tenant-a',
        notAfter,
        status: 'active',
      },
    ]);
    redis.get.mockResolvedValue(null);
    tenantRepo.findOne.mockResolvedValue({ id: 'tenant-a', name: 'Acme' });
    userRepo.find.mockResolvedValue([
      { email: 'admin@acme.test', role: 'owner' },
    ]);

    const sent = await service.sendRotationAlertEmails();
    expect(sent).toBe(1);
    expect(emailService.sendRendered).toHaveBeenCalledWith(
      'admin@acme.test',
      expect.objectContaining({
        subject: expect.stringContaining('rotation'),
        html: expect.stringContaining('Shield Certificate'),
      }),
    );
    expect(redis.set).toHaveBeenCalled();
  });

  it('assertInternalSecret rejects bad secret', () => {
    expect(() => service.assertInternalSecret('wrong')).toThrow(
      ForbiddenException,
    );
    expect(() => service.assertInternalSecret('secret')).not.toThrow();
  });
});
