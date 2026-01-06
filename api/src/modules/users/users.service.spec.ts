/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Users Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: any;

  const mockTenantId = 'tenant-123';

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: '$2b$12$hash',
    role: 'admin',
    tenantId: mockTenantId,
    status: 'active',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockUserRepository = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(getRepositoryToken(User));

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockUser]),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll(mockTenantId, {});

      expect(result.data).toHaveLength(1);
      expect(result.data[0].email).toBe(mockUser.email);
    });

    it('should handle pagination with cursor', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([mockUser, { ...mockUser, id: 'user-456' }]),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll(mockTenantId, { limit: 1 });

      expect(result.pagination.hasMore).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne(mockTenantId, mockUser.id);

      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create new user', async () => {
      const createDto = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'SecureP@ss123',
        role: 'analyst' as const,
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue({
        ...mockUser,
        email: createDto.email,
        name: createDto.name,
        role: createDto.role,
      });
      mockUserRepository.save.mockImplementation((user) =>
        Promise.resolve(user),
      );

      const result = await service.create(mockTenantId, createDto, 'owner');

      expect(result.email).toBe(createDto.email);
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for duplicate email', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.create(
          mockTenantId,
          {
            email: mockUser.email,
            name: 'New User',
            password: 'SecureP@ss123',
            role: 'analyst',
          },
          'owner',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent non-owners from creating owner accounts', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          mockTenantId,
          {
            email: 'owner@example.com',
            name: 'New Owner',
            password: 'SecureP@ss123',
            role: 'owner',
          },
          'admin',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockImplementation((user) =>
        Promise.resolve(user),
      );

      const result = await service.update(mockTenantId, mockUser.id, {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });

    it('should hash password when updating', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockImplementation((user) =>
        Promise.resolve(user),
      );

      await service.update(mockTenantId, mockUser.id, {
        password: 'NewP@ssw0rd!',
      });

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordHash: expect.stringMatching(/^\$2b\$/),
        }),
      );
    });
  });

  describe('remove', () => {
    it('should delete user', async () => {
      const currentUser = { id: 'other-user', role: 'owner' };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.count.mockResolvedValue(2);
      mockUserRepository.remove.mockResolvedValue({});

      await expect(
        service.remove(mockTenantId, mockUser.id, currentUser),
      ).resolves.toBeUndefined();

      expect(mockUserRepository.remove).toHaveBeenCalled();
    });

    it('should prevent deleting the last owner', async () => {
      const currentUser = { id: 'other-user', role: 'owner' };
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        role: 'owner',
      });
      mockUserRepository.count.mockResolvedValue(1);

      await expect(
        service.remove(mockTenantId, mockUser.id, currentUser),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
