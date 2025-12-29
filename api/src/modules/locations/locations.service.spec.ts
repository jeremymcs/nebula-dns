/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Locations Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { Location } from './entities/location.entity';
import { LocationToken } from './entities/location-token.entity';
import { RedisService } from '../redis/redis.service';
import { PolicyCompilerService } from '../policies/policy-compiler.service';

describe('LocationsService', () => {
  let service: LocationsService;
  let locationRepository: any;
  let tokenRepository: any;
  let configService: any;

  const mockTenantId = 'tenant-123';

  const mockLocation = {
    id: 'location-123',
    name: 'Main Office',
    description: 'Primary office location',
    tenantId: mockTenantId,
    policyId: 'policy-123',
    ipAddresses: ['192.168.1.0/24'],
    status: 'active',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockToken = {
    id: 'token-123',
    locationId: 'location-123',
    tokenHash: 'hashed-token',
    name: 'Default Token',
    status: 'active',
    expiresAt: null,
    lastUsedAt: null,
    createdAt: new Date('2024-01-01'),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-hmac-secret'),
  };

  const mockLocationRepository = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockTokenRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockRedisService = {
    storeToken: jest.fn(),
    deleteToken: jest.fn(),
    publishPolicyUpdate: jest.fn(),
    storeIPRange: jest.fn(),
    deleteIPRange: jest.fn(),
    getAllIPRanges: jest.fn(),
  };

  const mockPolicyCompilerService = {
    compile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        {
          provide: getRepositoryToken(Location),
          useValue: mockLocationRepository,
        },
        {
          provide: getRepositoryToken(LocationToken),
          useValue: mockTokenRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: PolicyCompilerService,
          useValue: mockPolicyCompilerService,
        },
      ],
    }).compile();

    service = module.get<LocationsService>(LocationsService);
    locationRepository = module.get(getRepositoryToken(Location));
    tokenRepository = module.get(getRepositoryToken(LocationToken));
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated locations', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockLocation]),
      };
      mockLocationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll(mockTenantId, {});

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe(mockLocation.name);
    });
  });

  describe('findOne', () => {
    it('should return location', async () => {
      mockLocationRepository.findOne.mockResolvedValue(mockLocation);

      const result = await service.findOne(mockTenantId, mockLocation.id);

      expect(result.id).toBe(mockLocation.id);
      expect(result.name).toBe(mockLocation.name);
    });

    it('should throw NotFoundException for non-existent location', async () => {
      mockLocationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create location', async () => {
      const createDto = {
        name: 'New Location',
        description: 'A new location',
        policyId: 'policy-123',
        ipRange: '192.168.1.0/24',
      };

      mockLocationRepository.findOne.mockResolvedValue(null); // No existing location with same IP
      mockLocationRepository.create.mockReturnValue({
        ...mockLocation,
        name: createDto.name,
        description: createDto.description,
        ipRange: createDto.ipRange,
      });
      mockLocationRepository.save.mockImplementation((loc) => Promise.resolve(loc));

      const result = await service.create(mockTenantId, createDto);

      expect(result.name).toBe(createDto.name);
      expect(mockLocationRepository.save).toHaveBeenCalled();
    });
  });

  describe('createToken', () => {
    it('should create new token for location', async () => {
      mockLocationRepository.findOne.mockResolvedValue(mockLocation);
      mockTokenRepository.create.mockReturnValue(mockToken);
      mockTokenRepository.save.mockResolvedValue(mockToken);

      const result = await service.createToken(mockTenantId, mockLocation.id, {
        label: 'New Token',
      });

      expect(result.token).toBeDefined();
      expect(result.tokenId).toBe(mockToken.id);
    });

    it('should throw NotFoundException for non-existent location', async () => {
      mockLocationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createToken(mockTenantId, 'invalid-location', { label: 'Token' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should set expiration date when provided', async () => {
      const expiresIn = 30; // days
      mockLocationRepository.findOne.mockResolvedValue(mockLocation);
      mockTokenRepository.create.mockReturnValue(mockToken);
      mockTokenRepository.save.mockImplementation((token) => Promise.resolve(token));

      await service.createToken(mockTenantId, mockLocation.id, {
        label: 'Expiring Token',
        expiresInDays: expiresIn,
      });

      expect(mockTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt: expect.any(Date),
        }),
      );
    });
  });

  describe('revokeToken', () => {
    it('should revoke token', async () => {
      mockLocationRepository.findOne.mockResolvedValue(mockLocation);
      mockTokenRepository.findOne.mockResolvedValue({ ...mockToken });
      mockTokenRepository.save.mockResolvedValue({});

      await expect(
        service.revokeToken(mockTenantId, mockLocation.id, mockToken.id),
      ).resolves.toBeUndefined();

      expect(mockTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
        }),
      );
    });
  });

  describe('remove', () => {
    it('should delete location and its tokens', async () => {
      mockLocationRepository.findOne.mockResolvedValue(mockLocation);
      mockTokenRepository.delete.mockResolvedValue({});
      mockLocationRepository.remove.mockResolvedValue({});

      await expect(
        service.remove(mockTenantId, mockLocation.id),
      ).resolves.toBeUndefined();

      expect(mockTokenRepository.delete).toHaveBeenCalledWith({
        locationId: mockLocation.id,
      });
      expect(mockLocationRepository.remove).toHaveBeenCalled();
    });
  });

  describe('findByIP', () => {
    const mockIPRangeMapping = {
      tenant_id: mockTenantId,
      location_id: 'location-123',
      ip_range: '192.168.1.0/24',
      rate_limit: 1000,
    };

    it('should find location by exact IP match in Redis', async () => {
      mockRedisService.getAllIPRanges.mockResolvedValue([
        { ...mockIPRangeMapping, ip_range: '192.168.1.100' },
      ]);

      const result = await service.findByIP('192.168.1.100');

      expect(result.found).toBe(true);
      expect(result.tenantId).toBe(mockTenantId);
      expect(result.locationId).toBe('location-123');
    });

    it('should find location by CIDR range match', async () => {
      mockRedisService.getAllIPRanges.mockResolvedValue([mockIPRangeMapping]);

      const result = await service.findByIP('192.168.1.50');

      expect(result.found).toBe(true);
      expect(result.tenantId).toBe(mockTenantId);
      expect(result.locationId).toBe('location-123');
    });

    it('should return not found for non-matching IP', async () => {
      mockRedisService.getAllIPRanges.mockResolvedValue([mockIPRangeMapping]);
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockLocationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findByIP('10.0.0.1');

      expect(result.found).toBe(false);
    });

    it('should handle comma-separated IP ranges', async () => {
      mockRedisService.getAllIPRanges.mockResolvedValue([
        { ...mockIPRangeMapping, ip_range: '10.0.0.0/8, 192.168.1.0/24' },
      ]);

      const result = await service.findByIP('192.168.1.50');

      expect(result.found).toBe(true);
    });

    it('should handle IPv6-mapped IPv4 addresses', async () => {
      mockRedisService.getAllIPRanges.mockResolvedValue([
        { ...mockIPRangeMapping, ip_range: '192.168.1.100' },
      ]);

      const result = await service.findByIP('::ffff:192.168.1.100');

      expect(result.found).toBe(true);
    });

    it('should fall back to database if Redis returns empty', async () => {
      mockRedisService.getAllIPRanges.mockResolvedValue([]);
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { ...mockLocation, ipRange: '192.168.1.0/24' },
        ]),
      };
      mockLocationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findByIP('192.168.1.50');

      expect(result.found).toBe(true);
      expect(result.tenantId).toBe(mockTenantId);
    });
  });
});
