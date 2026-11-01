import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PolicyCompilerService } from './policy-compiler.service';
import { Policy } from './entities/policy.entity';
import { PolicyVersion } from './entities/policy-version.entity';
import { Location } from '../locations/entities/location.entity';
import { CustomList } from '../lists/entities/custom-list.entity';
import { CustomListEntry } from '../lists/entities/custom-list-entry.entity';
import { RedisService } from '../redis/redis.service';
import { Tenant } from '../tenants/entities/tenant.entity';

describe('PolicyCompilerService', () => {
  let service: PolicyCompilerService;
  const redisMock = {
    storeCompiledPolicy: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PolicyCompilerService,
        {
          provide: getRepositoryToken(Policy),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(PolicyVersion),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Location),
          useValue: {
            find: jest.fn().mockResolvedValue([
              {
                id: 'loc-1',
                tenantId: 'tenant-1',
                policyId: 'pol-1',
                status: 'active',
              },
              {
                id: 'loc-2',
                tenantId: 'tenant-1',
                policyId: null,
                status: 'active',
              },
            ]),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CustomList),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: getRepositoryToken(CustomListEntry),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Tenant),
          useValue: { findOne: jest.fn() },
        },
        { provide: RedisService, useValue: redisMock },
      ],
    }).compile();

    service = module.get(PolicyCompilerService);
    jest.clearAllMocks();
  });

  it('compileAllActiveLocations compiles assigned active locations', async () => {
    jest.spyOn(service, 'compile').mockResolvedValue({
      tenantId: 'tenant-1',
      locationId: 'loc-1',
      policyVersion: 1,
    } as any);

    const result = await service.compileAllActiveLocations();
    expect(result.compiled).toBe(1);
    expect(result.skipped).toBe(1);
    expect(service.compile).toHaveBeenCalledWith('tenant-1', 'pol-1', 'loc-1');
  });
});
