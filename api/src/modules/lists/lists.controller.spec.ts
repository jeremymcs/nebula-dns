// Nebula DNS - Lists Controller Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ListsController } from './lists.controller';
import { ListsService } from './lists.service';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { AddEntriesDto } from './dto/add-entries.dto';
import { ListQueryDto } from './dto/list-query.dto';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

describe('ListsController', () => {
  let controller: ListsController;
  let service: ListsService;

  const mockTenantId = 'tenant-123';
  const mockListId = 'list-123';
  const mockEntryId = 'entry-123';

  const mockList = {
    id: mockListId,
    name: 'Block List',
    description: 'Custom block list',
    tenantId: mockTenantId,
    type: 'block',
    entryCount: 10,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockEntry = {
    id: mockEntryId,
    listId: mockListId,
    value: 'malicious-domain.com',
    type: 'domain',
    createdAt: new Date('2024-01-01'),
  };

  const mockListsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getEntries: jest.fn(),
    addEntries: jest.fn(),
    removeEntry: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListsController],
      providers: [
        {
          provide: ListsService,
          useValue: mockListsService,
        },
      ],
    }).compile();

    controller = module.get<ListsController>(ListsController);
    service = module.get<ListsService>(ListsService);

    jest.clearAllMocks();
  });

  describe('GET /lists', () => {
    it('should return all lists', async () => {
      const query: ListQueryDto = {};
      const mockResponse = {
        data: [mockList],
        pagination: { hasMore: false, cursor: null },
      };

      mockListsService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll(mockTenantId, query);

      expect(service.findAll).toHaveBeenCalledWith(mockTenantId, {}, undefined);
      expect(result).toEqual(mockResponse);
      expect(result.data).toHaveLength(1);
    });

    it('should filter by list type', async () => {
      const query: ListQueryDto = { type: 'block' };
      const mockResponse = {
        data: [mockList],
        pagination: { hasMore: false, cursor: null },
      };

      mockListsService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll(mockTenantId, query);

      expect(service.findAll).toHaveBeenCalledWith(mockTenantId, {}, 'block');
      expect(result.data).toHaveLength(1);
    });

    it('should handle pagination', async () => {
      const query: ListQueryDto = { limit: 5, cursor: 'list-100' };
      const mockResponse = {
        data: Array(5).fill(mockList),
        pagination: { hasMore: true, cursor: 'list-105' },
      };

      mockListsService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll(mockTenantId, query);

      expect(result.pagination.hasMore).toBe(true);
    });

    it('should return empty array when no lists found', async () => {
      mockListsService.findAll.mockResolvedValue({
        data: [],
        pagination: { hasMore: false, cursor: null },
      });

      const result = await controller.findAll(mockTenantId, {});

      expect(result.data).toEqual([]);
    });
  });

  describe('GET /lists/:id', () => {
    it('should return list by ID', async () => {
      mockListsService.findOne.mockResolvedValue(mockList);

      const result = await controller.findOne(mockTenantId, mockListId);

      expect(service.findOne).toHaveBeenCalledWith(mockTenantId, mockListId);
      expect(result).toEqual(mockList);
    });

    it('should throw NotFoundException for non-existent list', async () => {
      mockListsService.findOne.mockRejectedValue(
        new NotFoundException('List not found'),
      );

      await expect(
        controller.findOne(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should enforce tenant isolation', async () => {
      mockListsService.findOne.mockResolvedValue(mockList);

      await controller.findOne(mockTenantId, mockListId);

      expect(service.findOne).toHaveBeenCalledWith(mockTenantId, mockListId);
    });
  });

  describe('POST /lists', () => {
    it('should create list with valid data', async () => {
      const createDto: CreateListDto = {
        name: 'New Block List',
        description: 'Custom block list',
        type: 'block',
      };

      const expectedList = { ...mockList, ...createDto };
      mockListsService.create.mockResolvedValue(expectedList);

      const result = await controller.create(mockTenantId, createDto);

      expect(service.create).toHaveBeenCalledWith(mockTenantId, createDto);
      expect(result.name).toBe(createDto.name);
    });

    it('should create allow list', async () => {
      const createDto: CreateListDto = {
        name: 'Allow List',
        description: 'Whitelist domains',
        type: 'allow',
      };

      const expectedList = { ...mockList, type: 'allow', ...createDto };
      mockListsService.create.mockResolvedValue(expectedList);

      const result = await controller.create(mockTenantId, createDto);

      expect(result.type).toBe('allow');
    });

    it('should reject invalid list type', async () => {
      const createDto = {
        name: 'Test List',
        description: 'Test',
        type: 'invalid-type' as any,
      };

      mockListsService.create.mockRejectedValue(
        new BadRequestException('Invalid list type'),
      );

      await expect(controller.create(mockTenantId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should require list name', async () => {
      const createDto = {
        name: '',
        description: 'Test',
        type: 'block' as const,
      };

      mockListsService.create.mockRejectedValue(
        new BadRequestException('List name is required'),
      );

      await expect(
        controller.create(mockTenantId, createDto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate list name', async () => {
      const createDto: CreateListDto = {
        name: mockList.name,
        description: 'Duplicate',
        type: 'block',
      };

      mockListsService.create.mockRejectedValue(
        new BadRequestException('List with this name already exists'),
      );

      await expect(controller.create(mockTenantId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('PATCH /lists/:id', () => {
    it('should update list with valid data', async () => {
      const updateDto: UpdateListDto = {
        name: 'Updated List',
      };

      const updatedList = { ...mockList, ...updateDto };
      mockListsService.update.mockResolvedValue(updatedList);

      const result = await controller.update(
        mockTenantId,
        mockListId,
        updateDto,
      );

      expect(service.update).toHaveBeenCalledWith(
        mockTenantId,
        mockListId,
        updateDto,
      );
      expect(result.name).toBe(updateDto.name);
    });

    it('should update description', async () => {
      const updateDto: UpdateListDto = {
        description: 'Updated description',
      };

      const updatedList = { ...mockList, ...updateDto };
      mockListsService.update.mockResolvedValue(updatedList);

      const result = await controller.update(
        mockTenantId,
        mockListId,
        updateDto,
      );

      expect(result.description).toBe(updateDto.description);
    });

    it('should throw NotFoundException for non-existent list', async () => {
      const updateDto: UpdateListDto = { name: 'Updated' };

      mockListsService.update.mockRejectedValue(
        new NotFoundException('List not found'),
      );

      await expect(
        controller.update(mockTenantId, 'nonexistent-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('DELETE /lists/:id', () => {
    it('should delete list successfully', async () => {
      mockListsService.remove.mockResolvedValue(undefined);

      await controller.remove(mockTenantId, mockListId);

      expect(service.remove).toHaveBeenCalledWith(mockTenantId, mockListId);
    });

    it('should throw NotFoundException for non-existent list', async () => {
      mockListsService.remove.mockRejectedValue(
        new NotFoundException('List not found'),
      );

      await expect(
        controller.remove(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent deleting list in use by policies', async () => {
      mockListsService.remove.mockRejectedValue(
        new BadRequestException('Cannot delete list in use by policies'),
      );

      await expect(controller.remove(mockTenantId, mockListId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('GET /lists/:id/entries', () => {
    it('should return list entries', async () => {
      const pagination: PaginationQueryDto = { limit: 10 };
      const mockResponse = {
        data: [mockEntry],
        pagination: { hasMore: false, cursor: null },
      };

      mockListsService.getEntries.mockResolvedValue(mockResponse);

      const result = await controller.getEntries(
        mockTenantId,
        mockListId,
        pagination,
      );

      expect(service.getEntries).toHaveBeenCalledWith(
        mockTenantId,
        mockListId,
        pagination,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle pagination for entries', async () => {
      const pagination: PaginationQueryDto = { limit: 50, cursor: 'entry-100' };
      const mockResponse = {
        data: Array(50).fill(mockEntry),
        pagination: { hasMore: true, cursor: 'entry-150' },
      };

      mockListsService.getEntries.mockResolvedValue(mockResponse);

      const result = await controller.getEntries(
        mockTenantId,
        mockListId,
        pagination,
      );

      expect(result.pagination.hasMore).toBe(true);
    });

    it('should return empty array when no entries exist', async () => {
      mockListsService.getEntries.mockResolvedValue({
        data: [],
        pagination: { hasMore: false, cursor: null },
      });

      const result = await controller.getEntries(mockTenantId, mockListId, {});

      expect(result.data).toEqual([]);
    });

    it('should throw NotFoundException for non-existent list', async () => {
      mockListsService.getEntries.mockRejectedValue(
        new NotFoundException('List not found'),
      );

      await expect(
        controller.getEntries(mockTenantId, 'nonexistent-id', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /lists/:id/entries', () => {
    it('should add entries to list', async () => {
      const addEntriesDto: AddEntriesDto = {
        entries: [
          { value: 'malicious1.com', type: 'domain' },
          { value: 'malicious2.com', type: 'domain' },
        ],
      };

      const mockResponse = {
        added: 2,
        duplicates: 0,
        entries: [mockEntry],
      };

      mockListsService.addEntries.mockResolvedValue(mockResponse);

      const result = await controller.addEntries(
        mockTenantId,
        mockListId,
        addEntriesDto,
      );

      expect(service.addEntries).toHaveBeenCalledWith(
        mockTenantId,
        mockListId,
        addEntriesDto,
      );
      expect(result.added).toBe(2);
    });

    it('should handle duplicate entries', async () => {
      const addEntriesDto: AddEntriesDto = {
        entries: [{ value: 'existing.com', type: 'domain' }],
      };

      const mockResponse = {
        added: 0,
        duplicates: 1,
        entries: [],
      };

      mockListsService.addEntries.mockResolvedValue(mockResponse);

      const result = await controller.addEntries(
        mockTenantId,
        mockListId,
        addEntriesDto,
      );

      expect(result.duplicates).toBe(1);
    });

    it('should add IP address entries', async () => {
      const addEntriesDto: AddEntriesDto = {
        entries: [{ value: '192.168.1.100', type: 'ip' }],
      };

      mockListsService.addEntries.mockResolvedValue({
        added: 1,
        duplicates: 0,
        entries: [{ ...mockEntry, type: 'ip' }],
      });

      const result = await controller.addEntries(
        mockTenantId,
        mockListId,
        addEntriesDto,
      );

      expect(result.added).toBe(1);
    });

    it('should reject invalid entry types', async () => {
      const addEntriesDto = {
        entries: [{ value: 'test.com', type: 'invalid-type' }],
      } as any;

      mockListsService.addEntries.mockRejectedValue(
        new BadRequestException('Invalid entry type'),
      );

      await expect(
        controller.addEntries(mockTenantId, mockListId, addEntriesDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid domain format', async () => {
      const addEntriesDto: AddEntriesDto = {
        entries: [{ value: 'invalid domain', type: 'domain' }],
      };

      mockListsService.addEntries.mockRejectedValue(
        new BadRequestException('Invalid domain format'),
      );

      await expect(
        controller.addEntries(mockTenantId, mockListId, addEntriesDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent list', async () => {
      const addEntriesDto: AddEntriesDto = {
        entries: [{ value: 'test.com', type: 'domain' }],
      };

      mockListsService.addEntries.mockRejectedValue(
        new NotFoundException('List not found'),
      );

      await expect(
        controller.addEntries(mockTenantId, 'nonexistent-id', addEntriesDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('DELETE /lists/:id/entries/:entryId', () => {
    it('should remove entry from list', async () => {
      mockListsService.removeEntry.mockResolvedValue(undefined);

      await controller.removeEntry(mockTenantId, mockListId, mockEntryId);

      expect(service.removeEntry).toHaveBeenCalledWith(
        mockTenantId,
        mockListId,
        mockEntryId,
      );
    });

    it('should throw NotFoundException for non-existent entry', async () => {
      mockListsService.removeEntry.mockRejectedValue(
        new NotFoundException('Entry not found'),
      );

      await expect(
        controller.removeEntry(mockTenantId, mockListId, 'nonexistent-entry'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent list', async () => {
      mockListsService.removeEntry.mockRejectedValue(
        new NotFoundException('List not found'),
      );

      await expect(
        controller.removeEntry(mockTenantId, 'nonexistent-id', mockEntryId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Authorization', () => {
    it('should require OWNER or ADMIN for create', () => {
      const roles = Reflect.getMetadata('roles', controller.create);
      expect(roles).toEqual(expect.arrayContaining(['owner', 'admin']));
    });

    it('should require OWNER or ADMIN for delete', () => {
      const roles = Reflect.getMetadata('roles', controller.remove);
      expect(roles).toEqual(expect.arrayContaining(['owner', 'admin']));
    });

    it('should allow readonly users to view lists', () => {
      const roles = Reflect.getMetadata('roles', controller.findAll);
      expect(roles).toEqual(
        expect.arrayContaining(['owner', 'admin', 'analyst', 'readonly']),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockListsService.findAll.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(controller.findAll(mockTenantId, {})).rejects.toThrow(Error);
    });

    it('should propagate validation errors', async () => {
      const createDto: CreateListDto = {
        name: 'Test',
        description: 'Test',
        type: 'block',
      };

      mockListsService.create.mockRejectedValue(
        new BadRequestException('Validation failed'),
      );

      await expect(controller.create(mockTenantId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
