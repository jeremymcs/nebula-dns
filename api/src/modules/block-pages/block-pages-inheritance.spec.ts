// Nebula DNS - Block page inheritance & security tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { BlockPagesService } from './block-pages.service';
import { BlockPage } from './entities/block-page.entity';
import { AccessRequest } from './entities/access-request.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Location } from '../locations/entities/location.entity';
import { TenantsService } from '../tenants/tenants.service';
import { ListsService } from '../lists/lists.service';
import { PolicyCompilerService } from '../policies/policy-compiler.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RedisService } from '../redis/redis.service';
import { EmailService } from '../email/email.service';

describe('BlockPagesService inheritance & XSS', () => {
  let service: BlockPagesService;
  const tenantId = 'tenant-client';
  const mspId = 'tenant-msp';

  const platformPage: Partial<BlockPage> = {
    id: 'platform',
    tenantId: null,
    scope: 'platform',
    isDefault: true,
    title: 'Platform',
    message: 'Blocked',
    showPoweredBy: true,
    footerText: 'Powered by Flux Labs',
    primaryColor: '#1E3B78',
    secondaryColor: '#4B7CBB',
    accentColor: '#FF6E62',
    backgroundColor: '#f3f4f6',
    textColor: '#1f2937',
    showDomain: true,
    showCategory: true,
    showReason: true,
    showTimestamp: true,
    showRequestAccess: true,
    language: 'en',
    messageMarkdown: false,
  };

  const repos = {
    blockPage: {
      findOne: jest.fn(),
      find: jest.fn(),
    },
    accessRequest: {},
    location: { findOne: jest.fn() },
    tenant: { findOne: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockPagesService,
        { provide: getRepositoryToken(BlockPage), useValue: repos.blockPage },
        {
          provide: getRepositoryToken(AccessRequest),
          useValue: {},
        },
        { provide: getRepositoryToken(Location), useValue: repos.location },
        { provide: getRepositoryToken(Tenant), useValue: repos.tenant },
        { provide: TenantsService, useValue: {} },
        { provide: ListsService, useValue: {} },
        { provide: PolicyCompilerService, useValue: {} },
        {
          provide: AuditLogsService,
          useValue: { log: jest.fn() },
        },
        {
          provide: RedisService,
          useValue: { get: jest.fn(), getClient: jest.fn() },
        },
        { provide: EmailService, useValue: {} },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('/tmp/uploads') },
        },
      ],
    }).compile();

    service = module.get(BlockPagesService);
  });

  it('falls back to platform default when tenant has no custom page', async () => {
    repos.tenant.findOne.mockResolvedValue({
      id: tenantId,
      managedByMspId: null,
    });
    repos.blockPage.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(platformPage);
    repos.location.findOne.mockResolvedValue(null);

    const { page } = await service.resolveEffectiveBlockPage(tenantId);
    expect(page.scope).toBe('platform');
  });

  it('prefers MSP default over platform for managed clients', async () => {
    const mspPage = {
      ...platformPage,
      id: 'msp-default',
      tenantId: mspId,
      scope: 'msp',
    };
    repos.tenant.findOne.mockResolvedValue({
      id: tenantId,
      managedByMspId: mspId,
    });
    repos.blockPage.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(mspPage);
    repos.location.findOne.mockResolvedValue(null);

    const { page } = await service.resolveEffectiveBlockPage(tenantId);
    expect(page.id).toBe('msp-default');
  });

  it('strips script tags from generated HTML', () => {
    const html = service.generateBlockPageHtml(
      {
        ...platformPage,
        customHtml: '<script>alert(1)</script><p>OK</p>',
      } as BlockPage,
      { domain: 'evil.com' },
    );
    expect(html).not.toContain('<script>');
    expect(html).toContain('OK');
  });
});
