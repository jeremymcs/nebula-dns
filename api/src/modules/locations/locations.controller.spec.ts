// Nebula DNS - Locations Controller Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { CreateTokenDto } from './dto/create-token.dto';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

describe('LocationsController', () => {
  let controller: LocationsController;
  let service: LocationsService;

  const mockTenantId = 'tenant-123';
  const mockLocationId = 'location-123';
  const mockTokenId = 'token-123';

  const mockLocation = {
    id: mockLocationId,
    label: 'Office HQ',
    description: 'Main office location',
    tenantId: mockTenantId,
    ipRange: '192.168.1.0/24',
    policyId: 'policy-123',

    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockToken = {
    id: mockTokenId,
    locationId: mockLocationId,
    label: 'API Token',
    token: 'secret-token-value',
    expiresAt: new Date('2025-01-01'),
    createdAt: new Date('2024-01-01'),
  };

  const mockLocationsService = {
    findByIP: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getTokens: jest.fn(),
    createToken: jest.fn(),
    revokeToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationsController],
      providers: [
        {
          provide: LocationsService,
          useValue: mockLocationsService,
        },
      ],
    }).compile();

    controller = module.get<LocationsController>(LocationsController);
    service = module.get<LocationsService>(LocationsService);

    jest.clearAllMocks();
  });

  describe('GET /locations/by-ip/:ip (Public)', () => {
    it('should return location for valid IP', async () => {
      const ip = '192.168.1.100';
      mockLocationsService.findByIP.mockResolvedValue(mockLocation);

      const result = await controller.findByIP(ip);

      expect(service.findByIP).toHaveBeenCalledWith(ip);
      expect(result).toEqual(mockLocation);
    });

    it('should handle IP not found', async () => {
      const ip = '10.0.0.1';
      mockLocationsService.findByIP.mockResolvedValue(null);

      const result = await controller.findByIP(ip);

      expect(result).toBeNull();
    });

    it('should handle IPv6 addresses', async () => {
      const ip = '2001:db8::1';
      mockLocationsService.findByIP.mockResolvedValue(mockLocation);

      const result = await controller.findByIP(ip);

      expect(service.findByIP).toHaveBeenCalledWith(ip);
      expect(result).toEqual(mockLocation);
    });

    it('should validate IP format', async () => {
      const ip = 'invalid-ip';
      mockLocationsService.findByIP.mockRejectedValue(
        new BadRequestException('Invalid IP address'),
      );

      await expect(controller.findByIP(ip)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('GET /locations', () => {
    it('should return paginated locations', async () => {
      const pagination: PaginationQueryDto = { limit: 10 };
      const mockResponse = {
        data: [mockLocation],
        pagination: { hasMore: false, cursor: null },
      };

      mockLocationsService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll(mockTenantId, pagination);

      expect(service.findAll).toHaveBeenCalledWith(mockTenantId, pagination);
      expect(result).toEqual(mockResponse);
      expect(result.data).toHaveLength(1);
    });

    it('should filter by tenant', async () => {
      mockLocationsService.findAll.mockResolvedValue({
        data: [mockLocation],
        pagination: { hasMore: false, cursor: null },
      });

      await controller.findAll(mockTenantId, {});

      expect(service.findAll).toHaveBeenCalledWith(mockTenantId, {});
    });

    it('should return empty array when no locations found', async () => {
      mockLocationsService.findAll.mockResolvedValue({
        data: [],
        pagination: { hasMore: false, cursor: null },
      });

      const result = await controller.findAll(mockTenantId, {});

      expect(result.data).toEqual([]);
    });
  });

  describe('GET /locations/:id', () => {
    it('should return location by ID', async () => {
      mockLocationsService.findOne.mockResolvedValue(mockLocation);

      const result = await controller.findOne(mockTenantId, mockLocationId);

      expect(service.findOne).toHaveBeenCalledWith(
        mockTenantId,
        mockLocationId,
      );
      expect(result).toEqual(mockLocation);
    });

    it('should throw NotFoundException for non-existent location', async () => {
      mockLocationsService.findOne.mockRejectedValue(
        new NotFoundException('Location not found'),
      );

      await expect(
        controller.findOne(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should enforce tenant isolation', async () => {
      mockLocationsService.findOne.mockResolvedValue(mockLocation);

      await controller.findOne(mockTenantId, mockLocationId);

      expect(service.findOne).toHaveBeenCalledWith(
        mockTenantId,
        mockLocationId,
      );
    });
  });

  describe('POST /locations', () => {
    it('should create location with valid data', async () => {
      const createDto: CreateLocationDto = {
        name: 'New Office',
        description: 'New office location',
        ipRange: '10.0.0.0/24',
        policyId: 'policy-123',
      };

      const expectedLocation = { ...mockLocation, ...createDto };
      mockLocationsService.create.mockResolvedValue(expectedLocation);

      const result = await controller.create(mockTenantId, createDto);

      expect(service.create).toHaveBeenCalledWith(mockTenantId, createDto);
      expect(result.name).toBe(createDto.name);
    });

    it('should reject invalid IP ranges', async () => {
      const createDto: CreateLocationDto = {
        name: 'Test Location',
        description: 'Test',
        ipRange: 'invalid-ip-range',
        policyId: 'policy-123',
      };

      mockLocationsService.create.mockRejectedValue(
        new BadRequestException('Invalid IP range format'),
      );

      await expect(controller.create(mockTenantId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject overlapping IP ranges', async () => {
      const createDto: CreateLocationDto = {
        label: 'Test Location',
        description: 'Test',
        ipRange: '192.168.1.0/24',
        policyId: 'policy-123',
      };

      mockLocationsService.create.mockRejectedValue(
        new BadRequestException('IP range overlaps with existing location'),
      );

      await expect(controller.create(mockTenantId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should require location name', async () => {
      const createDto = {
        label: '',
        description: 'Test',
        ipRange: '192.168.1.0/24',
        policyId: 'policy-123',
      };

      mockLocationsService.create.mockRejectedValue(
        new BadRequestException('Location name is required'),
      );

      await expect(
        controller.create(mockTenantId, createDto as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('PATCH /locations/:id', () => {
    it('should update location with valid data', async () => {
      const updateDto: UpdateLocationDto = {
        label: 'Updated Office',
      };

      const updatedLocation = { ...mockLocation, ...updateDto };
      mockLocationsService.update.mockResolvedValue(updatedLocation);

      const result = await controller.update(
        mockTenantId,
        mockLocationId,
        updateDto,
      );

      expect(service.update).toHaveBeenCalledWith(
        mockTenantId,
        mockLocationId,
        updateDto,
      );
      expect(result.name).toBe(updateDto.name);
    });

    it('should update IP range', async () => {
      const updateDto: UpdateLocationDto = {
        ipRange: '10.0.0.0/24',
      };

      const updatedLocation = { ...mockLocation, ...updateDto };
      mockLocationsService.update.mockResolvedValue(updatedLocation);

      const result = await controller.update(
        mockTenantId,
        mockLocationId,
        updateDto,
      );

      expect(result.ipRange).toEqual(updateDto.ipRange);
    });

    it('should throw NotFoundException for non-existent location', async () => {
      const updateDto: UpdateLocationDto = { label: 'Updated' };

      mockLocationsService.update.mockRejectedValue(
        new NotFoundException('Location not found'),
      );

      await expect(
        controller.update(mockTenantId, 'nonexistent-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('DELETE /locations/:id', () => {
    it('should delete location successfully', async () => {
      mockLocationsService.remove.mockResolvedValue(undefined);

      await controller.remove(mockTenantId, mockLocationId);

      expect(service.remove).toHaveBeenCalledWith(mockTenantId, mockLocationId);
    });

    it('should throw NotFoundException for non-existent location', async () => {
      mockLocationsService.remove.mockRejectedValue(
        new NotFoundException('Location not found'),
      );

      await expect(
        controller.remove(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent deleting location with active agents', async () => {
      mockLocationsService.remove.mockRejectedValue(
        new BadRequestException('Cannot delete location with active agents'),
      );

      await expect(
        controller.remove(mockTenantId, mockLocationId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('GET /locations/:id/tokens', () => {
    it('should return location tokens', async () => {
      const mockTokens = [mockToken];
      mockLocationsService.getTokens.mockResolvedValue(mockTokens);

      const result = await controller.getTokens(mockTenantId, mockLocationId);

      expect(service.getTokens).toHaveBeenCalledWith(
        mockTenantId,
        mockLocationId,
      );
      expect(result).toEqual(mockTokens);
    });

    it('should return empty array when no tokens exist', async () => {
      mockLocationsService.getTokens.mockResolvedValue([]);

      const result = await controller.getTokens(mockTenantId, mockLocationId);

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException for non-existent location', async () => {
      mockLocationsService.getTokens.mockRejectedValue(
        new NotFoundException('Location not found'),
      );

      await expect(
        controller.getTokens(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /locations/:id/tokens', () => {
    it('should create location token', async () => {
      const createTokenDto: CreateTokenDto = {
        label: 'API Token',
        expiresInDays: 365,
      };

      mockLocationsService.createToken.mockResolvedValue(mockToken);

      const result = await controller.createToken(
        mockTenantId,
        mockLocationId,
        createTokenDto,
      );

      expect(service.createToken).toHaveBeenCalledWith(
        mockTenantId,
        mockLocationId,
        createTokenDto,
      );
      expect(result).toEqual(mockToken);
    });

    it('should create token with default expiration', async () => {
      const createTokenDto: CreateTokenDto = {
        label: 'API Token',
      };

      mockLocationsService.createToken.mockResolvedValue(mockToken);

      await controller.createToken(
        mockTenantId,
        mockLocationId,
        createTokenDto,
      );

      expect(service.createToken).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent location', async () => {
      const createTokenDto: CreateTokenDto = {
        label: 'API Token',
      };

      mockLocationsService.createToken.mockRejectedValue(
        new NotFoundException('Location not found'),
      );

      await expect(
        controller.createToken(mockTenantId, 'nonexistent-id', createTokenDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('DELETE /locations/:id/tokens/:tokenId', () => {
    it('should revoke token successfully', async () => {
      mockLocationsService.revokeToken.mockResolvedValue(undefined);

      await controller.revokeToken(mockTenantId, mockLocationId, mockTokenId);

      expect(service.revokeToken).toHaveBeenCalledWith(
        mockTenantId,
        mockLocationId,
        mockTokenId,
      );
    });

    it('should throw NotFoundException for non-existent token', async () => {
      mockLocationsService.revokeToken.mockRejectedValue(
        new NotFoundException('Token not found'),
      );

      await expect(
        controller.revokeToken(
          mockTenantId,
          mockLocationId,
          'nonexistent-token',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Authorization', () => {
    it('should require OWNER or ADMIN for create', () => {
      const roles = Reflect.getMetadata('roles', controller.create);
      expect(roles).toEqual(expect.arrayContaining(['owner', 'admin']));
    });

    it('should require OWNER for delete', () => {
      const roles = Reflect.getMetadata('roles', controller.remove);
      expect(roles).toContain('owner');
    });

    it('should allow readonly users to view locations', () => {
      const roles = Reflect.getMetadata('roles', controller.findAll);
      expect(roles).toEqual(
        expect.arrayContaining(['owner', 'admin', 'analyst', 'readonly']),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockLocationsService.findAll.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(controller.findAll(mockTenantId, {})).rejects.toThrow(Error);
    });

    it('should propagate validation errors', async () => {
      const createDto: CreateLocationDto = {
        label: 'Test',
        description: 'Test',
        ipRange: '192.168.1.0/24',
        policyId: 'policy-123',
      };

      mockLocationsService.create.mockRejectedValue(
        new BadRequestException('Validation failed'),
      );

      await expect(controller.create(mockTenantId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
