// Nebula DNS - Users Controller Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';
  const mockCurrentUser = {
    id: 'current-user-123',
    email: 'admin@example.com',
    role: 'admin',
    tenantId: mockTenantId,
  };

  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    name: 'Test User',
    role: 'analyst' as const,
    tenantId: mockTenantId,
    status: 'active',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockUsersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    suspend: jest.fn(),
    reactivate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  describe('GET /users', () => {
    it('should return paginated users', async () => {
      const pagination: PaginationQueryDto = { limit: 10 };
      const mockResponse = {
        data: [mockUser],
        pagination: { hasMore: false, cursor: null },
      };

      mockUsersService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll(mockTenantId, pagination);

      expect(service.findAll).toHaveBeenCalledWith(mockTenantId, pagination);
      expect(result).toEqual(mockResponse);
      expect(result.data).toHaveLength(1);
    });

    it('should filter by tenant', async () => {
      const pagination: PaginationQueryDto = {};
      mockUsersService.findAll.mockResolvedValue({
        data: [mockUser],
        pagination: { hasMore: false, cursor: null },
      });

      await controller.findAll(mockTenantId, pagination);

      expect(service.findAll).toHaveBeenCalledWith(mockTenantId, pagination);
    });

    it('should handle pagination with cursor', async () => {
      const pagination: PaginationQueryDto = { limit: 5, cursor: 'user-100' };
      const mockResponse = {
        data: Array(5).fill(mockUser),
        pagination: { hasMore: true, cursor: 'user-105' },
      };

      mockUsersService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll(mockTenantId, pagination);

      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.cursor).toBe('user-105');
    });

    it('should return empty array when no users found', async () => {
      mockUsersService.findAll.mockResolvedValue({
        data: [],
        pagination: { hasMore: false, cursor: null },
      });

      const result = await controller.findAll(mockTenantId, {});

      expect(result.data).toEqual([]);
    });
  });

  describe('GET /users/:id', () => {
    it('should return user by ID', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne(mockTenantId, mockUserId);

      expect(service.findOne).toHaveBeenCalledWith(mockTenantId, mockUserId);
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockUsersService.findOne.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        controller.findOne(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should enforce tenant isolation', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      await controller.findOne(mockTenantId, mockUserId);

      expect(service.findOne).toHaveBeenCalledWith(mockTenantId, mockUserId);
    });
  });

  describe('POST /users', () => {
    it('should create user with valid data', async () => {
      const createDto: CreateUserDto = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'ValidP@ssw0rd123!',
        role: 'analyst',
      };

      const expectedUser = { ...mockUser, ...createDto };
      mockUsersService.create.mockResolvedValue(expectedUser);

      const result = await controller.create(
        mockTenantId,
        mockCurrentUser,
        createDto,
      );

      expect(service.create).toHaveBeenCalledWith(
        mockTenantId,
        createDto,
        mockCurrentUser,
      );
      expect(result.email).toBe(createDto.email);
    });

    it('should reject invalid email', async () => {
      const createDto = {
        email: 'invalid-email',
        name: 'Test User',
        password: 'ValidP@ssw0rd123!',
        role: 'analyst' as const,
      };

      mockUsersService.create.mockRejectedValue(
        new BadRequestException('Invalid email format'),
      );

      await expect(
        controller.create(mockTenantId, mockCurrentUser, createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject weak password', async () => {
      const createDto: CreateUserDto = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'weak',
        role: 'analyst',
      };

      mockUsersService.create.mockRejectedValue(
        new BadRequestException('Password does not meet requirements'),
      );

      await expect(
        controller.create(mockTenantId, mockCurrentUser, createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate email', async () => {
      const createDto: CreateUserDto = {
        email: mockUser.email,
        name: 'Duplicate User',
        password: 'ValidP@ssw0rd123!',
        role: 'analyst',
      };

      mockUsersService.create.mockRejectedValue(
        new BadRequestException('User with this email already exists'),
      );

      await expect(
        controller.create(mockTenantId, mockCurrentUser, createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid role', async () => {
      const createDto = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'ValidP@ssw0rd123!',
        role: 'invalid-role' as any,
      };

      mockUsersService.create.mockRejectedValue(
        new BadRequestException('Invalid role'),
      );

      await expect(
        controller.create(mockTenantId, mockCurrentUser, createDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('PATCH /users/:id', () => {
    it('should update user with valid data', async () => {
      const updateDto: UpdateUserDto = {
        name: 'Updated Name',
      };

      const updatedUser = { ...mockUser, ...updateDto };
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(
        mockTenantId,
        mockUserId,
        updateDto,
      );

      expect(service.update).toHaveBeenCalledWith(
        mockTenantId,
        mockUserId,
        updateDto,
      );
      expect(result.name).toBe(updateDto.name);
    });

    it('should update user password', async () => {
      const updateDto: UpdateUserDto = {
        password: 'NewValidP@ssw0rd123!',
      };

      const updatedUser = { ...mockUser };
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(
        mockTenantId,
        mockUserId,
        updateDto,
      );

      expect(service.update).toHaveBeenCalledWith(
        mockTenantId,
        mockUserId,
        updateDto,
      );
    });

    it('should update user role', async () => {
      const updateDto: UpdateUserDto = {
        role: 'admin',
      };

      const updatedUser = { ...mockUser, ...updateDto };
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(
        mockTenantId,
        mockUserId,
        updateDto,
      );

      expect(result.role).toBe(updateDto.role);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      const updateDto: UpdateUserDto = { name: 'Updated Name' };

      mockUsersService.update.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        controller.update(mockTenantId, 'nonexistent-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject invalid role in update', async () => {
      const updateDto = {
        role: 'invalid-role' as any,
      };

      mockUsersService.update.mockRejectedValue(
        new BadRequestException('Invalid role'),
      );

      await expect(
        controller.update(mockTenantId, mockUserId, updateDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete user successfully', async () => {
      mockUsersService.remove.mockResolvedValue(undefined);

      await controller.remove(mockTenantId, mockUserId, mockCurrentUser);

      expect(service.remove).toHaveBeenCalledWith(
        mockTenantId,
        mockUserId,
        mockCurrentUser,
      );
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockUsersService.remove.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        controller.remove(mockTenantId, 'nonexistent-id', mockCurrentUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent self-deletion', async () => {
      mockUsersService.remove.mockRejectedValue(
        new BadRequestException('Cannot delete your own account'),
      );

      await expect(
        controller.remove(mockTenantId, mockCurrentUser.id, mockCurrentUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent deleting last owner', async () => {
      mockUsersService.remove.mockRejectedValue(
        new BadRequestException('Cannot delete the last owner'),
      );

      await expect(
        controller.remove(mockTenantId, mockUserId, mockCurrentUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('POST /users/:id/suspend', () => {
    it('should suspend user successfully', async () => {
      mockUsersService.suspend.mockResolvedValue(undefined);

      await controller.suspend(mockTenantId, mockUserId);

      expect(service.suspend).toHaveBeenCalledWith(mockTenantId, mockUserId);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockUsersService.suspend.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        controller.suspend(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /users/:id/reactivate', () => {
    it('should reactivate user successfully', async () => {
      mockUsersService.reactivate.mockResolvedValue(undefined);

      await controller.reactivate(mockTenantId, mockUserId);

      expect(service.reactivate).toHaveBeenCalledWith(mockTenantId, mockUserId);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockUsersService.reactivate.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        controller.reactivate(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Authentication & Authorization', () => {
    it('should require authentication for all endpoints', () => {
      const guards = Reflect.getMetadata('__guards__', UsersController);
      expect(guards).toBeDefined();
    });

    it('should require OWNER role for delete', () => {
      const roles = Reflect.getMetadata('roles', controller.remove);
      expect(roles).toContain('owner');
    });

    it('should require OWNER or ADMIN for create', () => {
      const roles = Reflect.getMetadata('roles', controller.create);
      expect(roles).toEqual(expect.arrayContaining(['owner', 'admin']));
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockUsersService.findAll.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(controller.findAll(mockTenantId, {})).rejects.toThrow(Error);
    });

    it('should propagate validation errors', async () => {
      const createDto: CreateUserDto = {
        email: 'test@example.com',
        name: 'Test',
        password: 'ValidP@ssw0rd123!',
        role: 'analyst',
      };

      mockUsersService.create.mockRejectedValue(
        new BadRequestException('Validation failed'),
      );

      await expect(
        controller.create(mockTenantId, mockCurrentUser, createDto),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
