// Nebula DNS - Family Service Unit Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { FamilyService } from './family.service';
import { FamilyMember, PolicyOverride } from './entities/family-member.entity';
import { FamilyRoleEnum, ScheduleTypeEnum } from './dto/family.dto';
import { ClickHouseService } from '../clickhouse/clickhouse.service';

describe('FamilyService', () => {
  let service: FamilyService;
  let repository: Repository<FamilyMember>;
  let clickHouseService: ClickHouseService;

  const mockTenantId = 'tenant-123';
  const mockMemberId = 'member-123';

  const mockPolicyOverrides: PolicyOverride = {
    blockedCategories: ['adult', 'gambling'],
    allowedCategories: [],
    blockedDomains: [],
    allowedDomains: [],
    safeSearch: true,
    youtubeRestricted: true,
  };

  const createMockFamilyMember = (
    overrides: Partial<FamilyMember> = {},
  ): FamilyMember => {
    return {
      id: mockMemberId,
      tenantId: mockTenantId,
      tenant: null as any,
      name: 'Test Child',
      avatar: 'avatar-child-1',
      dateOfBirth: new Date('2015-03-15'),
      role: 'child',
      devices: [
        {
          id: 'device-1',
          name: "Emma's iPad",
          type: 'tablet',
          isOnline: true,
        },
      ],
      policyOverrides: mockPolicyOverrides,
      schedules: [
        {
          type: 'screen_time',
          enabled: true,
          dailyLimitMinutes: 120,
          resetTime: '06:00',
        },
      ],
      screenTime: {
        today: 60,
        weekAverage: 45,
        byCategory: [],
      },
      parentalPinHash: null,
      isOnline: true,
      lastActivityAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      verifyPin: jest.fn().mockResolvedValue(true),
      hashPin: jest.fn(),
      ...overrides,
    } as unknown as FamilyMember;
  };

  const mockClickHouseService = {
    getSummaryStats: jest.fn().mockResolvedValue({
      totalQueries: 1000,
      blockedQueries: 50,
      threatsBlocked: 5,
      blockRate: 5,
      avgResponseTime: 15,
      cacheHitRate: 80,
    }),
    getTopBlocked: jest.fn().mockResolvedValue([
      { domain: 'ads.example.com', category: 'advertising', count: 100 },
      { domain: 'malware.com', category: 'malware', count: 50 },
    ]),
  };

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FamilyService,
        {
          provide: getRepositoryToken(FamilyMember),
          useValue: mockRepository,
        },
        {
          provide: ClickHouseService,
          useValue: mockClickHouseService,
        },
      ],
    }).compile();

    service = module.get<FamilyService>(FamilyService);
    repository = module.get(getRepositoryToken(FamilyMember));
    clickHouseService = module.get(ClickHouseService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all family members for tenant', async () => {
      const mockMember = createMockFamilyMember();
      mockRepository.find.mockResolvedValue([mockMember]);

      const result = await service.findAll(mockTenantId);

      expect(result).toHaveLength(1);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        order: { createdAt: 'ASC' },
      });
    });

    it('should return empty array when none exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll(mockTenantId);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a family member by id', async () => {
      const mockMember = createMockFamilyMember();
      mockRepository.findOne.mockResolvedValue(mockMember);

      const result = await service.findOne(mockTenantId, mockMemberId);

      expect(result.id).toBe(mockMemberId);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockMemberId, tenantId: mockTenantId },
      });
    });

    it('should throw NotFoundException when member not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(mockTenantId, 'invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a new family member with default settings', async () => {
      const createDto = {
        name: 'New Child',
        role: FamilyRoleEnum.CHILD,
        avatar: 'avatar-1',
      };

      const createdMember = createMockFamilyMember({ name: 'New Child' });
      mockRepository.create.mockReturnValue(createdMember);
      mockRepository.save.mockResolvedValue(createdMember);

      const result = await service.create(mockTenantId, createDto);

      expect(result.name).toBe('New Child');
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should set default policy overrides for child role', async () => {
      const createDto = {
        name: 'New Child',
        role: FamilyRoleEnum.CHILD,
      };

      mockRepository.create.mockImplementation((data) =>
        createMockFamilyMember(data),
      );
      mockRepository.save.mockImplementation((data) => Promise.resolve(data));

      await service.create(mockTenantId, createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          policyOverrides: expect.objectContaining({
            safeSearch: true,
            youtubeRestricted: true,
            blockedCategories: expect.arrayContaining(['adult', 'gambling']),
          }),
        }),
      );
    });

    it('should set default schedules for child role', async () => {
      const createDto = {
        name: 'New Child',
        role: FamilyRoleEnum.CHILD,
      };

      mockRepository.create.mockImplementation((data) =>
        createMockFamilyMember(data),
      );
      mockRepository.save.mockImplementation((data) => Promise.resolve(data));

      await service.create(mockTenantId, createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          schedules: expect.arrayContaining([
            expect.objectContaining({ type: 'bedtime', enabled: true }),
            expect.objectContaining({ type: 'screen_time', enabled: true }),
          ]),
        }),
      );
    });

    it('should create parent with no schedules', async () => {
      const createDto = {
        name: 'Parent',
        role: FamilyRoleEnum.PARENT,
      };

      mockRepository.create.mockImplementation((data) =>
        createMockFamilyMember(data),
      );
      mockRepository.save.mockImplementation((data) => Promise.resolve(data));

      await service.create(mockTenantId, createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          schedules: [],
        }),
      );
    });
  });

  describe('update', () => {
    it('should update a family member', async () => {
      const updateDto = { name: 'Updated Name' };

      const mockMember = createMockFamilyMember();
      mockRepository.findOne.mockResolvedValue(mockMember);
      mockRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...mockMember, ...data }),
      );

      const result = await service.update(
        mockTenantId,
        mockMemberId,
        updateDto,
      );

      expect(result.name).toBe('Updated Name');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should update role and avatar', async () => {
      const updateDto = {
        role: FamilyRoleEnum.TEEN,
        avatar: 'new-avatar',
      };

      const mockMember = createMockFamilyMember();
      mockRepository.findOne.mockResolvedValue(mockMember);
      mockRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.update(
        mockTenantId,
        mockMemberId,
        updateDto,
      );

      expect(result.role).toBe('teen');
      expect(result.avatar).toBe('new-avatar');
    });

    it('should throw NotFoundException for non-existent member', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(mockTenantId, 'invalid-id', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a family member', async () => {
      const mockMember = createMockFamilyMember();
      mockRepository.findOne.mockResolvedValue(mockMember);
      mockRepository.remove.mockResolvedValue(mockMember);

      await service.remove(mockTenantId, mockMemberId);

      expect(mockRepository.remove).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent member', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(mockTenantId, 'invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assignDevice', () => {
    it('should add a new device to a family member', async () => {
      const dto = {
        deviceId: 'new-device-1',
        name: 'New Tablet',
        type: 'tablet' as const,
      };

      const mockMember = createMockFamilyMember({ devices: [] });
      mockRepository.findOne.mockResolvedValue(mockMember);
      mockRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.assignDevice(
        mockTenantId,
        mockMemberId,
        dto as any,
      );

      expect(result.devices).toHaveLength(1);
      expect(result.devices[0].name).toBe('New Tablet');
    });

    it('should update existing device if ID matches', async () => {
      const dto = {
        deviceId: 'device-1',
        name: 'Updated iPad',
        type: 'tablet' as const,
      };

      const mockMember = createMockFamilyMember();
      mockRepository.findOne.mockResolvedValue(mockMember);
      mockRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.assignDevice(
        mockTenantId,
        mockMemberId,
        dto as any,
      );

      expect(result.devices[0].name).toBe('Updated iPad');
    });

    it('should generate device ID if not provided', async () => {
      const dto = {
        name: 'Auto ID Device',
        type: 'phone' as const,
      };

      const mockMember = createMockFamilyMember({ devices: [] });
      mockRepository.findOne.mockResolvedValue(mockMember);
      mockRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.assignDevice(
        mockTenantId,
        mockMemberId,
        dto as any,
      );

      expect(result.devices[0].id).toBeDefined();
      expect(result.devices[0].id.length).toBeGreaterThan(0);
    });
  });

  describe('removeDevice', () => {
    it('should remove a device from a family member', async () => {
      const mockMember = createMockFamilyMember();
      mockRepository.findOne.mockResolvedValue(mockMember);
      mockRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.removeDevice(
        mockTenantId,
        mockMemberId,
        'device-1',
      );

      expect(result.devices).toHaveLength(0);
    });

    it('should throw NotFoundException for non-existent device', async () => {
      const mockMember = createMockFamilyMember();
      mockRepository.findOne.mockResolvedValue(mockMember);

      await expect(
        service.removeDevice(mockTenantId, mockMemberId, 'invalid-device'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('setSchedule', () => {
    it('should add a new bedtime schedule', async () => {
      const dto = {
        type: ScheduleTypeEnum.BEDTIME,
        enabled: true,
        config: {
          type: 'bedtime' as const,
          enabled: true,
          schedule: {
            monday: {
              enabled: true,
              times: [{ start: '20:00', end: '07:00' }],
            },
            tuesday: { enabled: false },
            wednesday: { enabled: false },
            thursday: { enabled: false },
            friday: { enabled: false },
            saturday: { enabled: false },
            sunday: { enabled: false },
          },
          blockAll: true,
        },
      };

      const mockMember = createMockFamilyMember({ schedules: [] });
      mockRepository.findOne.mockResolvedValue(mockMember);
      mockRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.setSchedule(mockTenantId, mockMemberId, dto);

      expect(result.schedules).toHaveLength(1);
      expect(result.schedules[0].type).toBe('bedtime');
    });

    it('should update existing schedule of same type', async () => {
      const dto = {
        type: ScheduleTypeEnum.SCREEN_TIME,
        enabled: false,
      };

      const mockMember = createMockFamilyMember();
      mockRepository.findOne.mockResolvedValue(mockMember);
      mockRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.setSchedule(mockTenantId, mockMemberId, dto);

      const screenTimeSchedule = result.schedules.find(
        (s) => s.type === 'screen_time',
      );
      expect(screenTimeSchedule?.enabled).toBe(false);
    });

    it('should add homework schedule', async () => {
      const dto = {
        type: ScheduleTypeEnum.HOMEWORK,
        enabled: true,
        config: {
          type: 'homework' as const,
          enabled: true,
          schedule: {
            monday: {
              enabled: true,
              times: [{ start: '15:00', end: '17:00' }],
            },
            tuesday: { enabled: false },
            wednesday: { enabled: false },
            thursday: { enabled: false },
            friday: { enabled: false },
            saturday: { enabled: false },
            sunday: { enabled: false },
          },
          allowedCategories: ['education'],
          blockedCategories: ['gaming', 'social_media'],
        },
      };

      const mockMember = createMockFamilyMember({ schedules: [] });
      mockRepository.findOne.mockResolvedValue(mockMember);
      mockRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.setSchedule(mockTenantId, mockMemberId, dto);

      expect(result.schedules).toHaveLength(1);
      expect(result.schedules[0].type).toBe('homework');
    });
  });

  describe('getActivity', () => {
    it('should return activity summary for member with devices', async () => {
      const mockMember = createMockFamilyMember();
      mockRepository.findOne.mockResolvedValue(mockMember);

      const result = await service.getActivity(
        mockTenantId,
        mockMemberId,
        '24h',
      );

      expect(result.memberId).toBe(mockMemberId);
      expect(result.memberName).toBe('Test Child');
      expect(result.totalQueries).toBe(1000);
      expect(result.blockedQueries).toBe(50);
      expect(mockClickHouseService.getSummaryStats).toHaveBeenCalledWith(
        mockTenantId,
        '24h',
      );
    });

    it('should return empty activity for member without devices', async () => {
      const mockMember = createMockFamilyMember({ devices: [] });
      mockRepository.findOne.mockResolvedValue(mockMember);

      const result = await service.getActivity(
        mockTenantId,
        mockMemberId,
        '24h',
      );

      expect(result.totalQueries).toBe(0);
      expect(result.blockedQueries).toBe(0);
      expect(mockClickHouseService.getSummaryStats).not.toHaveBeenCalled();
    });
  });

  describe('verifyPin', () => {
    it('should verify correct PIN', async () => {
      const mockMember = createMockFamilyMember({
        parentalPinHash: 'hashed-pin',
      });
      (mockMember.verifyPin as jest.Mock).mockResolvedValue(true);
      mockRepository.findOne.mockResolvedValue(mockMember);

      const result = await service.verifyPin(mockTenantId, {
        memberId: mockMemberId,
        pin: '1234',
      });

      expect(result).toBe(true);
      expect(mockMember.verifyPin).toHaveBeenCalledWith('1234');
    });

    it('should throw UnauthorizedException for incorrect PIN', async () => {
      const mockMember = createMockFamilyMember({
        parentalPinHash: 'hashed-pin',
      });
      (mockMember.verifyPin as jest.Mock).mockResolvedValue(false);
      mockRepository.findOne.mockResolvedValue(mockMember);

      await expect(
        service.verifyPin(mockTenantId, {
          memberId: mockMemberId,
          pin: 'wrong',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException when no PIN is set', async () => {
      const mockMember = createMockFamilyMember({
        parentalPinHash: null,
      });
      mockRepository.findOne.mockResolvedValue(mockMember);

      await expect(
        service.verifyPin(mockTenantId, {
          memberId: mockMemberId,
          pin: '1234',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateScreenTime', () => {
    it('should update screen time statistics', async () => {
      const mockMember = createMockFamilyMember();
      mockRepository.findOne.mockResolvedValue(mockMember);
      mockRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.updateScreenTime(
        mockTenantId,
        mockMemberId,
        { today: 90 },
      );

      expect(result.screenTime.today).toBe(90);
    });
  });

  describe('setOnlineStatus', () => {
    it('should update online status', async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.setOnlineStatus(mockTenantId, mockMemberId, true);

      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: mockMemberId, tenantId: mockTenantId },
        expect.objectContaining({ isOnline: true }),
      );
    });

    it('should update last activity when going online', async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.setOnlineStatus(mockTenantId, mockMemberId, true);

      expect(mockRepository.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          isOnline: true,
          lastActivityAt: expect.any(Date),
        }),
      );
    });
  });
});
