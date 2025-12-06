/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Auth Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;
  let jwtService: JwtService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.V1O5E7y5p5oq5q',
    role: 'admin',
    tenantId: 'tenant-123',
    status: 'active',
    failedLoginAttempts: 0,
    lockedUntil: null,
    tenant: { id: 'tenant-123', name: 'Test Tenant' },
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      const password = 'ValidP@ssw0rd!';
      const hashedPassword = await bcrypt.hash(password, 12);
      
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        passwordHash: hashedPassword,
      });
      mockUserRepository.update.mockResolvedValue({});

      const result = await service.login({
        email: 'test@example.com',
        password,
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          failedLoginAttempts: 0,
          lockedUntil: null,
        }),
      );
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'nonexistent@example.com',
          password: 'password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const hashedPassword = await bcrypt.hash('correct-password', 12);
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        passwordHash: hashedPassword,
      });
      mockUserRepository.update.mockResolvedValue({});

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for locked account', async () => {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 10);

      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        lockedUntil: futureDate,
      });

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'ValidP@ssw0rd!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should increment failed login attempts on wrong password', async () => {
      const hashedPassword = await bcrypt.hash('correct-password', 12);
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        passwordHash: hashedPassword,
        failedLoginAttempts: 2,
      });
      mockUserRepository.update.mockResolvedValue({});

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          failedLoginAttempts: 3,
        }),
      );
    });

    it('should lock account after 5 failed attempts', async () => {
      const hashedPassword = await bcrypt.hash('correct-password', 12);
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        passwordHash: hashedPassword,
        failedLoginAttempts: 4,
      });
      mockUserRepository.update.mockResolvedValue({});

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          failedLoginAttempts: 5,
          lockedUntil: expect.any(Date),
        }),
      );
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens for valid refresh token', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: mockUser.id,
        type: 'refresh',
      });
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.refreshToken('valid-refresh-token');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedException for invalid token type', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: mockUser.id,
        type: 'access', // Wrong type
      });

      await expect(
        service.refreshToken('invalid-type-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: mockUser.id,
        type: 'refresh',
      });
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        status: 'inactive',
      });

      await expect(
        service.refreshToken('valid-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(
        service.refreshToken('invalid-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    it('should change password for valid current password', async () => {
      const currentPassword = 'CurrentP@ss123';
      const newPassword = 'NewP@ssw0rd!';
      const hashedCurrentPassword = await bcrypt.hash(currentPassword, 12);

      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        passwordHash: hashedCurrentPassword,
      });
      mockUserRepository.update.mockResolvedValue({});

      await expect(
        service.changePassword(mockUser.id, {
          currentPassword,
          newPassword,
        }),
      ).resolves.toBeUndefined();

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          passwordHash: expect.any(String),
        }),
      );
    });

    it('should throw BadRequestException for user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.changePassword('nonexistent-id', {
          currentPassword: 'current',
          newPassword: 'new',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for incorrect current password', async () => {
      const hashedPassword = await bcrypt.hash('correct-password', 12);
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        passwordHash: hashedPassword,
      });

      await expect(
        service.changePassword(mockUser.id, {
          currentPassword: 'wrong-password',
          newPassword: 'NewP@ssw0rd!',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateUser', () => {
    it('should return user for valid credentials', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.validateUser(mockUser.id, mockUser.tenantId);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id, tenantId: mockUser.tenantId, status: 'active' },
      });
    });

    it('should return null for invalid user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser('invalid-id', 'invalid-tenant');

      expect(result).toBeNull();
    });
  });
});
