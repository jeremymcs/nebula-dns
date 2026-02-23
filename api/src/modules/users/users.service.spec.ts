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
    it('should return paginated users with correct structure', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockUser]),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll(mockTenantId, {});

      // Verify data structure
      expect(result.data).toHaveLength(1);
      expect(result.data[0].email).toBe(mockUser.email);
      expect(result.data[0].id).toBe(mockUser.id);
      expect(result.data[0].tenantId).toBe(mockTenantId);

      // Verify pagination structure exists
      expect(result.pagination).toBeDefined();
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should handle pagination with cursor and return correct pagination', async () => {
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

      // Verify hasMore is true when more results exist
      expect(result.pagination.hasMore).toBe(true);

      // Verify cursor is set when hasMore is true
      expect(result.pagination.cursor).toBeDefined();
      expect(typeof result.pagination.cursor).toBe('string');
    });

    it('should return empty data array when no users exist', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll(mockTenantId, {});

      expect(result.data).toHaveLength(0);
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.cursor).toBeNull();
    });

    it('should apply tenant filter in query', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockUser]),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.findAll(mockTenantId, {});

      // Verify tenant filter was applied
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'user.tenant_id = :tenantId',
        { tenantId: mockTenantId },
      );
    });
  });

  describe('findOne', () => {
    it('should return user by id with all fields', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne(mockTenantId, mockUser.id);

      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
      expect(result.name).toBe(mockUser.name);
      expect(result.role).toBe(mockUser.role);
      expect(result.tenantId).toBe(mockTenantId);
      expect(result.status).toBe('active');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for wrong tenant', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('wrong-tenant', mockUser.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create new user with correct properties', async () => {
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

      // Verify user properties
      expect(result.email).toBe(createDto.email);
      expect(result.name).toBe(createDto.name);
      expect(result.role).toBe('analyst');

      // Verify save was called
      expect(mockUserRepository.save).toHaveBeenCalled();

      // Verify created user has tenantId
      const savedUser = mockUserRepository.save.mock.calls[0][0];
      expect(savedUser.tenantId).toBe(mockTenantId);
      expect(savedUser.status).toBe('active');
    });

    it('should hash password with bcrypt', async () => {
      const createDto = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'SecureP@ss123',
        role: 'analyst' as const,
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockImplementation((data) => data);
      mockUserRepository.save.mockImplementation((user) =>
        Promise.resolve(user),
      );

      await service.create(mockTenantId, createDto, 'owner');

      // Verify password was hashed
      const savedUser = mockUserRepository.save.mock.calls[0][0];
      expect(savedUser.passwordHash).toMatch(/^\$2b\$/);

      // Verify bcrypt hash verification works
      const isValid = await bcrypt.compare(
        'SecureP@ss123',
        savedUser.passwordHash,
      );
      expect(isValid).toBe(true);
    });

    it('should normalize email to lowercase', async () => {
      const createDto = {
        email: 'NewUser@EXAMPLE.COM',
        name: 'New User',
        password: 'SecureP@ss123',
        role: 'analyst' as const,
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockImplementation((data) => data);
      mockUserRepository.save.mockImplementation((user) =>
        Promise.resolve(user),
      );

      await service.create(mockTenantId, createDto, 'owner');

      // Verify email was normalized
      const savedUser = mockUserRepository.save.mock.calls[0][0];
      expect(savedUser.email).toBe('newuser@example.com');
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

    it('should allow admins to create analyst accounts', async () => {
      const createDto = {
        email: 'analyst@example.com',
        name: 'Analyst User',
        password: 'SecureP@ss123',
        role: 'analyst' as const,
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockImplementation((data) => data);
      mockUserRepository.save.mockImplementation((user) =>
        Promise.resolve(user),
      );

      const result = await service.create(mockTenantId, createDto, 'admin');

      expect(result.role).toBe('analyst');
    });
  });

  describe('update', () => {
    it('should update user fields correctly', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockImplementation((user) =>
        Promise.resolve(user),
      );

      const result = await service.update(mockTenantId, mockUser.id, {
        name: 'Updated Name',
      });

      // Verify name was updated
      expect(result.name).toBe('Updated Name');

      // Verify save was called
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should hash password when updating', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockImplementation((user) =>
        Promise.resolve(user),
      );

      await service.update(mockTenantId, mockUser.id, {
        password: 'NewP@ssw0rd!',
      });

      // Verify password was hashed with bcrypt
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordHash: expect.stringMatching(/^\$2b\$/),
        }),
      );
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(mockTenantId, 'non-existent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when updating user in wrong tenant', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('wrong-tenant', mockUser.id, { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete user successfully', async () => {
      const currentUser = { id: 'other-user', role: 'owner' };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.count.mockResolvedValue(2);
      mockUserRepository.remove.mockResolvedValue({});

      await expect(
        service.remove(mockTenantId, mockUser.id, currentUser),
      ).resolves.toBeUndefined();

      // Verify remove was called with correct user
      expect(mockUserRepository.remove).toHaveBeenCalledWith(mockUser);
    });

    it('should prevent self-deletion', async () => {
      const currentUser = { id: 'user-123', role: 'owner' };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.remove(mockTenantId, mockUser.id, currentUser),
      ).rejects.toThrow(BadRequestException);
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

    it('should throw NotFoundException for non-existent user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      const currentUser = { id: 'admin-user', role: 'owner' };

      await expect(
        service.remove(mockTenantId, 'non-existent', currentUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('suspend', () => {
    it('should suspend user by setting status to suspended', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        status: 'active',
      });
      mockUserRepository.save.mockImplementation((user) =>
        Promise.resolve(user),
      );

      await service.suspend(mockTenantId, mockUser.id);

      // Verify status was updated to suspended
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'suspended',
        }),
      );
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.suspend(mockTenantId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reactivate', () => {
    it('should reactivate suspended user', async () => {
      const suspendedUser = {
        ...mockUser,
        status: 'suspended',
        failedLoginAttempts: 5,
        lockedUntil: new Date(),
      };
      mockUserRepository.findOne.mockResolvedValue(suspendedUser);
      mockUserRepository.save.mockImplementation((user) =>
        Promise.resolve(user),
      );

      await service.reactivate(mockTenantId, mockUser.id);

      // Verify status reset and lock cleared
      const savedUser = mockUserRepository.save.mock.calls[0][0];
      expect(savedUser.status).toBe('active');
      expect(savedUser.failedLoginAttempts).toBe(0);
      expect(savedUser.lockedUntil).toBeNull();
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.reactivate(mockTenantId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
