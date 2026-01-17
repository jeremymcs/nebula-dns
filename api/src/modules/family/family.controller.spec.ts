// Nebula DNS - Family Controller Unit Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { FamilyController } from './family.controller';
import { FamilyService } from './family.service';
import {
  CreateFamilyMemberDto,
  UpdateFamilyMemberDto,
  AssignDeviceDto,
  SetScheduleDto,
  VerifyPinDto,
  FamilyRoleEnum,
  DeviceTypeEnum,
  ScheduleTypeEnum,
} from './dto/family.dto';
import { FamilyMember, PolicyOverride } from './entities/family-member.entity';

describe('FamilyController', () => {
  let controller: FamilyController;
  let service: FamilyService;

  const mockTenantId = 'tenant-123';
  const mockMemberId = 'member-123';
  const mockDeviceId = 'device-123';

  const mockPolicyOverrides: PolicyOverride = {
    blockedCategories: ['adult', 'gambling'],
    allowedCategories: [],
    blockedDomains: [],
    allowedDomains: [],
    safeSearch: true,
    youtubeRestricted: true,
  };

  const mockFamilyMember: Partial<FamilyMember> = {
    id: mockMemberId,
    tenantId: mockTenantId,
    name: 'Test Child',
    avatar: 'avatar-child-1',
    dateOfBirth: new Date('2015-03-15'),
    role: 'child',
    devices: [
      {
        id: mockDeviceId,
        name: "Emma's iPad",
        type: 'tablet',
        isOnline: true,
      },
    ],
    policyOverrides: mockPolicyOverrides,
    schedules: [],
    screenTime: { today: 60, weekAverage: 45, byCategory: [] },
    parentalPinHash: null,
    isOnline: true,
    lastActivityAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFamilyService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    assignDevice: jest.fn(),
    removeDevice: jest.fn(),
    getActivity: jest.fn(),
    setSchedule: jest.fn(),
    verifyPin: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FamilyController],
      providers: [
        {
          provide: FamilyService,
          useValue: mockFamilyService,
        },
      ],
    }).compile();

    controller = module.get<FamilyController>(FamilyController);
    service = module.get<FamilyService>(FamilyService);

    jest.clearAllMocks();
  });

  describe('GET /family/members', () => {
    it('should return all family members for tenant', async () => {
      const mockMembers = [mockFamilyMember];
      mockFamilyService.findAll.mockResolvedValue(mockMembers);

      const result = await controller.findAll(mockTenantId);

      expect(service.findAll).toHaveBeenCalledWith(mockTenantId);
      expect(result.data).toEqual(mockMembers);
      expect(result.total).toBe(1);
    });

    it('should return empty array when no members exist', async () => {
      mockFamilyService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(mockTenantId);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('GET /family/members/:id', () => {
    it('should return a family member by ID', async () => {
      mockFamilyService.findOne.mockResolvedValue(mockFamilyMember);

      const result = await controller.findOne(mockTenantId, mockMemberId);

      expect(service.findOne).toHaveBeenCalledWith(mockTenantId, mockMemberId);
      expect(result.data).toEqual(mockFamilyMember);
    });

    it('should throw NotFoundException for non-existent member', async () => {
      mockFamilyService.findOne.mockRejectedValue(
        new NotFoundException('Family member not found'),
      );

      await expect(
        controller.findOne(mockTenantId, 'invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /family/members', () => {
    it('should create a new family member', async () => {
      const createDto: CreateFamilyMemberDto = {
        name: 'New Child',
        role: FamilyRoleEnum.CHILD,
        avatar: 'avatar-1',
      };

      mockFamilyService.create.mockResolvedValue({
        ...mockFamilyMember,
        ...createDto,
      });

      const result = await controller.create(mockTenantId, createDto);

      expect(service.create).toHaveBeenCalledWith(mockTenantId, createDto);
      expect(result.data.name).toBe('New Child');
    });

    it('should create a parent member', async () => {
      const createDto: CreateFamilyMemberDto = {
        name: 'Parent',
        role: FamilyRoleEnum.PARENT,
      };

      mockFamilyService.create.mockResolvedValue({
        ...mockFamilyMember,
        ...createDto,
        role: 'parent',
      });

      const result = await controller.create(mockTenantId, createDto);

      expect(result.data.role).toBe('parent');
    });
  });

  describe('PATCH /family/members/:id', () => {
    it('should update a family member', async () => {
      const updateDto: UpdateFamilyMemberDto = {
        name: 'Updated Name',
      };

      mockFamilyService.update.mockResolvedValue({
        ...mockFamilyMember,
        name: 'Updated Name',
      });

      const result = await controller.update(
        mockTenantId,
        mockMemberId,
        updateDto,
      );

      expect(service.update).toHaveBeenCalledWith(
        mockTenantId,
        mockMemberId,
        updateDto,
      );
      expect(result.data.name).toBe('Updated Name');
    });

    it('should throw NotFoundException for non-existent member', async () => {
      mockFamilyService.update.mockRejectedValue(
        new NotFoundException('Family member not found'),
      );

      await expect(
        controller.update(mockTenantId, 'invalid-id', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('DELETE /family/members/:id', () => {
    it('should delete a family member', async () => {
      mockFamilyService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(mockTenantId, mockMemberId);

      expect(service.remove).toHaveBeenCalledWith(mockTenantId, mockMemberId);
      expect(result.message).toBe('Family member deleted successfully');
    });

    it('should throw NotFoundException for non-existent member', async () => {
      mockFamilyService.remove.mockRejectedValue(
        new NotFoundException('Family member not found'),
      );

      await expect(
        controller.remove(mockTenantId, 'invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /family/members/:id/devices', () => {
    it('should assign a device to a family member', async () => {
      const assignDto: AssignDeviceDto = {
        deviceId: 'new-device',
        name: 'New iPad',
        type: DeviceTypeEnum.TABLET,
      };

      const updatedMember = {
        ...mockFamilyMember,
        devices: [
          ...mockFamilyMember.devices!,
          {
            id: 'new-device',
            name: 'New iPad',
            type: 'tablet',
            isOnline: false,
          },
        ],
      };

      mockFamilyService.assignDevice.mockResolvedValue(updatedMember);

      const result = await controller.assignDevice(
        mockTenantId,
        mockMemberId,
        assignDto,
      );

      expect(service.assignDevice).toHaveBeenCalledWith(
        mockTenantId,
        mockMemberId,
        assignDto,
      );
      expect(result.data.devices).toHaveLength(2);
    });

    it('should throw NotFoundException for non-existent member', async () => {
      mockFamilyService.assignDevice.mockRejectedValue(
        new NotFoundException('Family member not found'),
      );

      await expect(
        controller.assignDevice(mockTenantId, 'invalid-id', {
          name: 'Test',
          type: DeviceTypeEnum.PHONE,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('DELETE /family/members/:id/devices/:deviceId', () => {
    it('should remove a device from a family member', async () => {
      const updatedMember = {
        ...mockFamilyMember,
        devices: [],
      };

      mockFamilyService.removeDevice.mockResolvedValue(updatedMember);

      const result = await controller.removeDevice(
        mockTenantId,
        mockMemberId,
        mockDeviceId,
      );

      expect(service.removeDevice).toHaveBeenCalledWith(
        mockTenantId,
        mockMemberId,
        mockDeviceId,
      );
      expect(result.data.devices).toHaveLength(0);
    });

    it('should throw NotFoundException for non-existent device', async () => {
      mockFamilyService.removeDevice.mockRejectedValue(
        new NotFoundException('Device not found'),
      );

      await expect(
        controller.removeDevice(mockTenantId, mockMemberId, 'invalid-device'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET /family/members/:id/activity', () => {
    it('should return activity summary for a family member', async () => {
      const mockActivity = {
        memberId: mockMemberId,
        memberName: 'Test Child',
        screenTime: { today: 60, weekAverage: 45, byCategory: [] },
        totalQueries: 1000,
        blockedQueries: 50,
        topDomains: [],
        topBlocked: [],
      };

      mockFamilyService.getActivity.mockResolvedValue(mockActivity);

      const result = await controller.getActivity(mockTenantId, mockMemberId, {
        period: '24h',
      });

      expect(service.getActivity).toHaveBeenCalledWith(
        mockTenantId,
        mockMemberId,
        '24h',
      );
      expect(result.data.totalQueries).toBe(1000);
    });

    it('should use default period if not provided', async () => {
      const mockActivity = {
        memberId: mockMemberId,
        memberName: 'Test Child',
        screenTime: { today: 60, weekAverage: 45, byCategory: [] },
        totalQueries: 1000,
        blockedQueries: 50,
        topDomains: [],
        topBlocked: [],
      };

      mockFamilyService.getActivity.mockResolvedValue(mockActivity);

      await controller.getActivity(mockTenantId, mockMemberId, {});

      expect(service.getActivity).toHaveBeenCalledWith(
        mockTenantId,
        mockMemberId,
        '24h',
      );
    });
  });

  describe('POST /family/members/:id/schedule', () => {
    it('should set a bedtime schedule', async () => {
      const scheduleDto: SetScheduleDto = {
        type: ScheduleTypeEnum.BEDTIME,
        enabled: true,
      };

      const updatedMember = {
        ...mockFamilyMember,
        schedules: [
          {
            type: 'bedtime',
            enabled: true,
            schedule: {},
            blockAll: true,
          },
        ],
      };

      mockFamilyService.setSchedule.mockResolvedValue(updatedMember);

      const result = await controller.setSchedule(
        mockTenantId,
        mockMemberId,
        scheduleDto,
      );

      expect(service.setSchedule).toHaveBeenCalledWith(
        mockTenantId,
        mockMemberId,
        scheduleDto,
      );
      expect(result.data.schedules).toHaveLength(1);
    });

    it('should set a screen time schedule', async () => {
      const scheduleDto: SetScheduleDto = {
        type: ScheduleTypeEnum.SCREEN_TIME,
        enabled: true,
        config: {
          type: 'screen_time',
          enabled: true,
          dailyLimitMinutes: 120,
          resetTime: '06:00',
        },
      };

      const updatedMember = {
        ...mockFamilyMember,
        schedules: [
          {
            type: 'screen_time',
            enabled: true,
            dailyLimitMinutes: 120,
            resetTime: '06:00',
          },
        ],
      };

      mockFamilyService.setSchedule.mockResolvedValue(updatedMember);

      const result = await controller.setSchedule(
        mockTenantId,
        mockMemberId,
        scheduleDto,
      );

      expect(result.data.schedules[0].type).toBe('screen_time');
    });

    it('should throw NotFoundException for non-existent member', async () => {
      mockFamilyService.setSchedule.mockRejectedValue(
        new NotFoundException('Family member not found'),
      );

      await expect(
        controller.setSchedule(mockTenantId, 'invalid-id', {
          type: ScheduleTypeEnum.BEDTIME,
          enabled: true,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /family/verify-pin', () => {
    it('should verify a correct PIN', async () => {
      const verifyDto: VerifyPinDto = {
        memberId: mockMemberId,
        pin: '1234',
      };

      mockFamilyService.verifyPin.mockResolvedValue(true);

      const result = await controller.verifyPin(mockTenantId, verifyDto);

      expect(service.verifyPin).toHaveBeenCalledWith(mockTenantId, verifyDto);
      expect(result.valid).toBe(true);
      expect(result.message).toBe('PIN verified successfully');
    });

    it('should throw UnauthorizedException for incorrect PIN', async () => {
      const verifyDto: VerifyPinDto = {
        memberId: mockMemberId,
        pin: 'wrong',
      };

      mockFamilyService.verifyPin.mockRejectedValue(
        new UnauthorizedException('Invalid PIN'),
      );

      await expect(
        controller.verifyPin(mockTenantId, verifyDto),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException when no PIN is set', async () => {
      const verifyDto: VerifyPinDto = {
        memberId: mockMemberId,
        pin: '1234',
      };

      mockFamilyService.verifyPin.mockRejectedValue(
        new BadRequestException('No PIN set for this family member'),
      );

      await expect(
        controller.verifyPin(mockTenantId, verifyDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Authorization', () => {
    it('should allow all roles to read family members', () => {
      const roles = Reflect.getMetadata('roles', controller.findAll);
      expect(roles).toEqual(
        expect.arrayContaining(['owner', 'admin', 'analyst', 'readonly']),
      );
    });

    it('should require ADMIN or OWNER for create', () => {
      const roles = Reflect.getMetadata('roles', controller.create);
      expect(roles).toEqual(expect.arrayContaining(['admin', 'owner']));
    });

    it('should require ADMIN or OWNER for update', () => {
      const roles = Reflect.getMetadata('roles', controller.update);
      expect(roles).toEqual(expect.arrayContaining(['admin', 'owner']));
    });

    it('should require ADMIN or OWNER for remove', () => {
      const roles = Reflect.getMetadata('roles', controller.remove);
      expect(roles).toEqual(expect.arrayContaining(['admin', 'owner']));
    });

    it('should require ADMIN or OWNER for device assignment', () => {
      const roles = Reflect.getMetadata('roles', controller.assignDevice);
      expect(roles).toEqual(expect.arrayContaining(['admin', 'owner']));
    });

    it('should require ADMIN or OWNER for schedule changes', () => {
      const roles = Reflect.getMetadata('roles', controller.setSchedule);
      expect(roles).toEqual(expect.arrayContaining(['admin', 'owner']));
    });

    it('should require ADMIN or OWNER for PIN verification', () => {
      const roles = Reflect.getMetadata('roles', controller.verifyPin);
      expect(roles).toEqual(expect.arrayContaining(['admin', 'owner']));
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockFamilyService.findAll.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(controller.findAll(mockTenantId)).rejects.toThrow(Error);
    });

    it('should propagate validation errors', async () => {
      mockFamilyService.create.mockRejectedValue(
        new BadRequestException('Validation failed'),
      );

      await expect(
        controller.create(mockTenantId, {
          name: '',
          role: FamilyRoleEnum.CHILD,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Tenant Isolation', () => {
    it('should filter by tenant when finding all members', async () => {
      mockFamilyService.findAll.mockResolvedValue([mockFamilyMember]);

      await controller.findAll(mockTenantId);

      expect(service.findAll).toHaveBeenCalledWith(mockTenantId);
    });

    it('should filter by tenant when finding one member', async () => {
      mockFamilyService.findOne.mockResolvedValue(mockFamilyMember);

      await controller.findOne(mockTenantId, mockMemberId);

      expect(service.findOne).toHaveBeenCalledWith(mockTenantId, mockMemberId);
    });

    it('should include tenant when creating a member', async () => {
      const createDto: CreateFamilyMemberDto = {
        name: 'Test',
        role: FamilyRoleEnum.CHILD,
      };

      mockFamilyService.create.mockResolvedValue(mockFamilyMember);

      await controller.create(mockTenantId, createDto);

      expect(service.create).toHaveBeenCalledWith(mockTenantId, createDto);
    });
  });
});
