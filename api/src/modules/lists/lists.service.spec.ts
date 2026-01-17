// Nebula DNS - Lists Service Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ListsService } from './lists.service';
import { CustomList, ListType } from './entities/custom-list.entity';
import { CustomListEntry } from './entities/custom-list-entry.entity';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { AddEntriesDto } from './dto/add-entries.dto';

describe('ListsService', () => {
  let service: ListsService;
  let listRepository: jest.Mocked<Repository<CustomList>>;
  let entryRepository: jest.Mocked<Repository<CustomListEntry>>;

  const mockTenantId = 'tenant-123';

  const mockList: Partial<CustomList> = {
    id: 'list-123',
    tenantId: mockTenantId,
    name: 'Test Blocklist',
    description: 'Test description',
    type: 'blocklist',
    entryCount: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockEntry: Partial<CustomListEntry> = {
    id: 'entry-123',
    listId: 'list-123',
    domain: 'example.com',
    type: 'exact',
    comment: 'Test entry',
    createdAt: new Date('2024-01-01'),
  };

  const mockListRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockEntryRepository = {
    create: jest.fn(),
    save: jest.fn(),
    insert: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListsService,
        {
          provide: getRepositoryToken(CustomList),
          useValue: mockListRepository,
        },
        {
          provide: getRepositoryToken(CustomListEntry),
          useValue: mockEntryRepository,
        },
      ],
    }).compile();

    service = module.get<ListsService>(ListsService);
    listRepository = module.get(getRepositoryToken(CustomList));
    entryRepository = module.get(getRepositoryToken(CustomListEntry));

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated lists', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockList]),
      };
      mockListRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.findAll(mockTenantId, { limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should filter by list type', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockList]),
      };
      mockListRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      await service.findAll(mockTenantId, { limit: 20 }, 'blocklist');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'list.type = :type',
        { type: 'blocklist' },
      );
    });

    it('should handle pagination with cursor', async () => {
      const lists = Array(21)
        .fill(null)
        .map((_, i) => ({ ...mockList, id: `list-${i}` }));

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(lists),
      };
      mockListRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.findAll(mockTenantId, { limit: 20 });

      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.cursor).toBeDefined();
      expect(result.data).toHaveLength(20);
    });
  });

  describe('findOne', () => {
    it('should return a list by id', async () => {
      mockListRepository.findOne.mockResolvedValue(mockList as CustomList);

      const result = await service.findOne(mockTenantId, 'list-123');

      expect(result).toEqual(mockList);
      expect(mockListRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'list-123', tenantId: mockTenantId },
      });
    });

    it('should throw NotFoundException when list not found', async () => {
      mockListRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(mockTenantId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new list', async () => {
      const dto: CreateListDto = {
        name: 'New List',
        type: 'blocklist',
        description: 'Test list',
      };

      mockListRepository.create.mockReturnValue(mockList as CustomList);
      mockListRepository.save.mockResolvedValue(mockList as CustomList);

      const result = await service.create(mockTenantId, dto);

      expect(result).toEqual(mockList);
      expect(mockListRepository.create).toHaveBeenCalledWith({
        ...dto,
        tenantId: mockTenantId,
        entryCount: 0,
      });
    });
  });

  describe('update', () => {
    it('should update list properties', async () => {
      const dto: UpdateListDto = {
        name: 'Updated Name',
        description: 'Updated description',
      };

      mockListRepository.findOne.mockResolvedValue(mockList as CustomList);
      mockListRepository.save.mockResolvedValue({
        ...mockList,
        ...dto,
      } as CustomList);

      const result = await service.update(mockTenantId, 'list-123', dto);

      expect(result.name).toBe('Updated Name');
      expect(mockListRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent list', async () => {
      mockListRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(mockTenantId, 'nonexistent', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete list and all entries', async () => {
      mockListRepository.findOne.mockResolvedValue(mockList as CustomList);
      mockEntryRepository.delete.mockResolvedValue(undefined as any);
      mockListRepository.remove.mockResolvedValue(mockList as CustomList);

      await service.remove(mockTenantId, 'list-123');

      expect(mockEntryRepository.delete).toHaveBeenCalledWith({
        listId: 'list-123',
      });
      expect(mockListRepository.remove).toHaveBeenCalledWith(mockList);
    });

    it('should throw NotFoundException for non-existent list', async () => {
      mockListRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(mockTenantId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getEntries', () => {
    it('should return paginated entries', async () => {
      mockListRepository.findOne.mockResolvedValue(mockList as CustomList);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockEntry]),
      };
      mockEntryRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.getEntries(mockTenantId, 'list-123', {
        limit: 50,
      });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should handle pagination with cursor', async () => {
      mockListRepository.findOne.mockResolvedValue(mockList as CustomList);

      const entries = Array(51)
        .fill(null)
        .map((_, i) => ({ ...mockEntry, id: `entry-${i}` }));

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(entries),
      };
      mockEntryRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.getEntries(mockTenantId, 'list-123', {
        limit: 50,
      });

      expect(result.pagination.hasMore).toBe(true);
      expect(result.data).toHaveLength(50);
    });
  });

  describe('addEntries', () => {
    it('should add new entries to list', async () => {
      const dto: AddEntriesDto = {
        entries: [
          { domain: 'example.com', type: 'exact' },
          { domain: 'test.com', type: 'exact' },
        ],
      };

      mockListRepository.findOne.mockResolvedValue(mockList as CustomList);
      mockEntryRepository.find.mockResolvedValue([]);
      mockEntryRepository.insert.mockResolvedValue(undefined as any);
      mockListRepository.save.mockResolvedValue({
        ...mockList,
        entryCount: 2,
      } as CustomList);

      const result = await service.addEntries(mockTenantId, 'list-123', dto);

      expect(result.added).toBe(2);
      expect(result.skipped).toBe(0);
      expect(mockEntryRepository.insert).toHaveBeenCalled();
    });

    it('should skip duplicate entries', async () => {
      const dto: AddEntriesDto = {
        entries: [
          { domain: 'example.com', type: 'exact' },
          { domain: 'example.com', type: 'exact' }, // Duplicate
        ],
      };

      mockListRepository.findOne.mockResolvedValue(mockList as CustomList);
      mockEntryRepository.find.mockResolvedValue([]);
      mockEntryRepository.insert.mockResolvedValue(undefined as any);
      mockListRepository.save.mockResolvedValue({
        ...mockList,
        entryCount: 1,
      } as CustomList);

      const result = await service.addEntries(mockTenantId, 'list-123', dto);

      expect(result.added).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it('should skip invalid domains', async () => {
      const dto: AddEntriesDto = {
        entries: [
          { domain: 'valid.com', type: 'exact' },
          { domain: 'invalid domain', type: 'exact' },
          { domain: '.invalid', type: 'exact' },
        ],
      };

      mockListRepository.findOne.mockResolvedValue(mockList as CustomList);
      mockEntryRepository.find.mockResolvedValue([]);
      mockEntryRepository.insert.mockResolvedValue(undefined as any);
      mockListRepository.save.mockResolvedValue(mockList as CustomList);

      const result = await service.addEntries(mockTenantId, 'list-123', dto);

      expect(result.added).toBe(1);
      expect(result.skipped).toBe(2);
    });

    it('should skip existing entries from database', async () => {
      const dto: AddEntriesDto = {
        entries: [
          { domain: 'example.com', type: 'exact' },
          { domain: 'new.com', type: 'exact' },
        ],
      };

      mockListRepository.findOne.mockResolvedValue(mockList as CustomList);
      mockEntryRepository.find.mockResolvedValue([
        { domain: 'example.com' } as CustomListEntry,
      ]);
      mockEntryRepository.insert.mockResolvedValue(undefined as any);
      mockListRepository.save.mockResolvedValue(mockList as CustomList);

      const result = await service.addEntries(mockTenantId, 'list-123', dto);

      expect(result.added).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it('should normalize domains before adding', async () => {
      const dto: AddEntriesDto = {
        entries: [
          { domain: '  EXAMPLE.COM  ', type: 'exact' },
          { domain: '.test.com.', type: 'exact' },
        ],
      };

      mockListRepository.findOne.mockResolvedValue(mockList as CustomList);
      mockEntryRepository.find.mockResolvedValue([]);
      mockEntryRepository.insert.mockResolvedValue(undefined as any);
      mockListRepository.save.mockResolvedValue(mockList as CustomList);

      await service.addEntries(mockTenantId, 'list-123', dto);

      expect(mockEntryRepository.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ domain: 'example.com' }),
          expect.objectContaining({ domain: 'test.com' }),
        ]),
      );
    });
  });

  describe('removeEntry', () => {
    it('should remove entry from list', async () => {
      mockListRepository.findOne.mockResolvedValue(mockList as CustomList);
      mockEntryRepository.findOne.mockResolvedValue(
        mockEntry as CustomListEntry,
      );
      mockEntryRepository.remove.mockResolvedValue(
        mockEntry as CustomListEntry,
      );
      mockListRepository.save.mockResolvedValue(mockList as CustomList);

      await service.removeEntry(mockTenantId, 'list-123', 'entry-123');

      expect(mockEntryRepository.remove).toHaveBeenCalledWith(mockEntry);
      expect(mockListRepository.save).toHaveBeenCalled();
    });

    it('should decrement entry count', async () => {
      const listWithEntries = { ...mockList, entryCount: 5 };
      mockListRepository.findOne.mockResolvedValue(
        listWithEntries as CustomList,
      );
      mockEntryRepository.findOne.mockResolvedValue(
        mockEntry as CustomListEntry,
      );
      mockEntryRepository.remove.mockResolvedValue(
        mockEntry as CustomListEntry,
      );
      mockListRepository.save.mockResolvedValue({
        ...listWithEntries,
        entryCount: 4,
      } as CustomList);

      await service.removeEntry(mockTenantId, 'list-123', 'entry-123');

      expect(mockListRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ entryCount: 4 }),
      );
    });

    it('should not go below zero entry count', async () => {
      const listWithZero = { ...mockList, entryCount: 0 };
      mockListRepository.findOne.mockResolvedValue(listWithZero as CustomList);
      mockEntryRepository.findOne.mockResolvedValue(
        mockEntry as CustomListEntry,
      );
      mockEntryRepository.remove.mockResolvedValue(
        mockEntry as CustomListEntry,
      );
      mockListRepository.save.mockResolvedValue(listWithZero as CustomList);

      await service.removeEntry(mockTenantId, 'list-123', 'entry-123');

      expect(mockListRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ entryCount: 0 }),
      );
    });

    it('should throw NotFoundException for non-existent entry', async () => {
      mockListRepository.findOne.mockResolvedValue(mockList as CustomList);
      mockEntryRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removeEntry(mockTenantId, 'list-123', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('normalizeDomain', () => {
    it('should convert to lowercase', () => {
      const result = (service as any).normalizeDomain('EXAMPLE.COM');
      expect(result).toBe('example.com');
    });

    it('should trim whitespace', () => {
      const result = (service as any).normalizeDomain('  example.com  ');
      expect(result).toBe('example.com');
    });

    it('should remove leading dot', () => {
      const result = (service as any).normalizeDomain('.example.com');
      expect(result).toBe('example.com');
    });

    it('should remove trailing dot', () => {
      const result = (service as any).normalizeDomain('example.com.');
      expect(result).toBe('example.com');
    });
  });

  describe('isValidDomain', () => {
    it('should accept valid domains', () => {
      expect((service as any).isValidDomain('example.com')).toBe(true);
      expect((service as any).isValidDomain('sub.example.com')).toBe(true);
      expect((service as any).isValidDomain('test-domain.co.uk')).toBe(true);
      expect((service as any).isValidDomain('*.example.com')).toBe(true);
    });

    it('should reject invalid domains', () => {
      expect((service as any).isValidDomain('')).toBe(false);
      expect((service as any).isValidDomain('example')).toBe(false);
      expect((service as any).isValidDomain('example.')).toBe(false);
      expect((service as any).isValidDomain('.example.com')).toBe(false);
      expect((service as any).isValidDomain('-example.com')).toBe(false);
      expect((service as any).isValidDomain('example.com-')).toBe(false);
    });
  });
});
