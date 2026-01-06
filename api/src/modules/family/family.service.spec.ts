import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FamilyService } from './family.service';
import { FamilyMember } from './entities/family-member.entity';
import { FamilyRole } from './dto/family.dto';
import { NotFoundException } from '@nestjs/common';

describe('FamilyService', () => {
  let service: FamilyService;
  let repository: jest.Mocked<Repository<FamilyMember>>;

  const mockFamilyMember: FamilyMember = {
    id: 'member-1',
    tenantId: 'tenant-1',
    tenant: null as any,
    name: 'Test Child',
    avatar: '👶',
    role: 'child',
    devices: [{ id: 'd1', name: 'iPad', type: 'tablet', isOnline: true }],
    restrictions: {
      blockedCategories: ['adult', 'gambling'],
      allowedApps: [],
      safeSearch: true,
    },
    screenTime: {
      today: 60,
      weekAverage: 45,
      byCategory: [],
    },
    isOnline: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FamilyService,
        {
          provide: getRepositoryToken(FamilyMember),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FamilyService>(FamilyService);
    repository = module.get(getRepositoryToken(FamilyMember));
  });

  describe('findAll', () => {
    it('should return all family members for tenant', async () => {
      repository.find.mockResolvedValue([mockFamilyMember]);

      const result = await service.findAll('tenant-1');

      expect(result).toEqual([mockFamilyMember]);
      expect(repository.find).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        order: { createdAt: 'ASC' },
      });
    });

    it('should return empty array when none exist', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findAll('tenant-1');

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a family member by id', async () => {
      repository.findOne.mockResolvedValue(mockFamilyMember);

      const result = await service.findOne('tenant-1', 'member-1');

      expect(result).toEqual(mockFamilyMember);
    });

    it('should throw NotFoundException when member not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('tenant-1', 'invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a new family member', async () => {
      const createDto = {
        name: 'New Child',
        role: FamilyRole.CHILD,
        avatar: '👶',
      };
      repository.create.mockReturnValue({ ...mockFamilyMember, ...createDto });
      repository.save.mockResolvedValue({ ...mockFamilyMember, ...createDto });

      const result = await service.create('tenant-1', createDto);

      expect(result.name).toBe('New Child');
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a family member', async () => {
      const updateDto = { name: 'Updated Name' };
      repository.findOne.mockResolvedValue(mockFamilyMember);
      repository.save.mockResolvedValue({ ...mockFamilyMember, ...updateDto });

      const result = await service.update('tenant-1', 'member-1', updateDto);

      expect(result.name).toBe('Updated Name');
    });
  });

  describe('remove', () => {
    it('should remove a family member', async () => {
      repository.findOne.mockResolvedValue(mockFamilyMember);
      repository.remove.mockResolvedValue(mockFamilyMember);

      await service.remove('tenant-1', 'member-1');

      expect(repository.remove).toHaveBeenCalledWith(mockFamilyMember);
    });
  });
});
