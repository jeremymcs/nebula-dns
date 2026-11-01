import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenException } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { AgentInstallation } from './entities/agent-installation.entity';
import { AgentInstallToken } from './entities/agent-install-token.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Location } from '../locations/entities/location.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RedisService } from '../redis/redis.service';
import { AgentBrandingConfig } from './agent-branding.config';

describe('AgentsService site IP updates', () => {
  let service: AgentsService;
  let locationRepository: jest.Mocked<Repository<Location>>;

  const mockAgent: AgentInstallation = {
    id: 'agent-1',
    tenantId: 'tenant-1',
    locationId: 'loc-1',
    deviceId: 'device-1',
    deviceName: 'Site Server',
    platform: 'windows',
    osVersion: '2022',
    agentVersion: '1.0.0',
    status: 'active',
    lastSeenAt: new Date(),
    ipAddress: null,
    errorMessage: null,
    deviceSecretHash: 'hash',
    roles: ['site-updater'],
    dnsEnforced: false,
    dohTokenHash: null,
    lastTamperAt: null,
    tamperCount: 0,
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  } as AgentInstallation;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentsService,
        {
          provide: getRepositoryToken(AgentInstallation),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(AgentInstallToken),
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Tenant),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Location),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        {
          provide: AuditLogsService,
          useValue: { log: jest.fn() },
        },
        {
          provide: RedisService,
          useValue: { storeIPRange: jest.fn(), invalidatePolicy: jest.fn() },
        },
        {
          provide: AgentBrandingConfig,
          useValue: {
            dnsServerHosts: ['dns1.shield.fluxlabs.net', 'dns2.shield.fluxlabs.net'],
            apiEndpoint: 'https://api.shield.fluxlabs.net',
            dohEndpoint: 'https://dns.shield.fluxlabs.net/dns-query',
          },
        },
      ],
    }).compile();

    service = module.get(AgentsService);
    locationRepository = module.get(getRepositoryToken(Location));
  });

  it('rejects agents without site-updater role', async () => {
    await expect(
      service.updateSitePublicIp(
        {
          agent: { ...mockAgent, roles: ['dns-enforce'] },
          tenantId: 'tenant-1',
        },
        { publicIpv4: '203.0.113.10' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('updates location ip range and clears dyndns', async () => {
    const location = {
      id: 'loc-1',
      tenantId: 'tenant-1',
      name: 'HQ',
      ipRange: '198.51.100.0/24',
      dyndns: 'office.example.com',
    } as Location;

    locationRepository.findOne.mockResolvedValue(location);
    locationRepository.save.mockImplementation(async (l) => l as Location);

    const result = await service.updateSitePublicIp(
      { agent: mockAgent, tenantId: 'tenant-1' },
      { publicIpv4: '203.0.113.44', publicIpv6: '2001:db8::1' },
    );

    expect(result.updated).toBe(true);
    expect(result.ipRange).toBe('203.0.113.44/32, 2001:db8::1/128');
    expect(locationRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        dyndns: null,
        siteIpUpdatedByAgentId: 'agent-1',
      }),
    );
  });
});
