// Tenant isolation: review must scope by tenant_id in repository lookup
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
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
import { ConfigService } from '@nestjs/config';

describe('BlockPagesService tenant isolation', () => {
  it('rejects review when request belongs to another tenant', async () => {
    const accessRepo = { findOne: jest.fn().mockResolvedValue(null), save: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        BlockPagesService,
        { provide: getRepositoryToken(BlockPage), useValue: {} },
        { provide: getRepositoryToken(AccessRequest), useValue: accessRepo },
        { provide: getRepositoryToken(Tenant), useValue: {} },
        { provide: getRepositoryToken(Location), useValue: { find: jest.fn() } },
        { provide: TenantsService, useValue: {} },
        { provide: ListsService, useValue: {} },
        { provide: PolicyCompilerService, useValue: {} },
        { provide: AuditLogsService, useValue: { log: jest.fn() } },
        { provide: RedisService, useValue: { get: jest.fn(), getClient: jest.fn() } },
        { provide: EmailService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();
    const service = module.get(BlockPagesService);
    await expect(
      service.reviewAccessRequest('tenant-a', 'req-1', 'user-1', {
        status: 'approved',
      }),
    ).rejects.toThrow(NotFoundException);
    expect(accessRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'req-1', tenantId: 'tenant-a' },
    });
  });
});
