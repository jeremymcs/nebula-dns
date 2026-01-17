// Nebula DNS - Auth Service Unit Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService, LoginContext } from './auth.service';
import { SessionService } from './session.service';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { PartnerUser } from '../partners/entities/partner-user.entity';
import { MfaService } from '../mfa/mfa.service';
import { LoginResponseDto, MfaRequiredResponseDto } from './dto/login.dto';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;
  let jwtService: JwtService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash:
      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.V1O5E7y5p5oq5q',
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

  const mockTenantRepository = {
    findOne: jest.fn(),
  };

  const mockPartnerUserRepository = {
    findOne: jest.fn(),
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

  const mockMfaService = {
    isMfaEnabled: jest.fn().mockResolvedValue(false),
    verifyMfaCode: jest.fn().mockResolvedValue(true),
  };

  const mockSessionService = {
    createSession: jest.fn().mockResolvedValue({
      sessionId: 'session-123',
      userId: 'user-123',
      tenantId: 'tenant-123',
      tokenJti: 'jti-123',
      deviceInfo: { browser: 'Chrome', os: 'Windows', device: 'Desktop' },
      ipAddress: '127.0.0.1',
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }),
    getSessions: jest.fn().mockResolvedValue([]),
    revokeSession: jest.fn().mockResolvedValue(undefined),
    revokeAllSessions: jest.fn().mockResolvedValue(0),
    isTokenBlacklisted: jest.fn().mockResolvedValue(false),
    blacklistToken: jest.fn().mockResolvedValue(undefined),
    updateSessionActivity: jest.fn().mockResolvedValue(undefined),
    parseDeviceInfo: jest.fn().mockReturnValue({
      userAgent: 'Mozilla/5.0',
      browser: 'Chrome',
      os: 'Windows',
      device: 'Desktop',
      isMobile: false,
    }),
  };

  const mockLoginContext: LoginContext = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    ipAddress: '192.168.1.100',
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
          provide: getRepositoryToken(Tenant),
          useValue: mockTenantRepository,
        },
        {
          provide: getRepositoryToken(PartnerUser),
          useValue: mockPartnerUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: MfaService,
          useValue: mockMfaService,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
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

      // Type guard to check if it's a LoginResponseDto (not MFA required)
      expect('accessToken' in result).toBe(true);
      const loginResult = result as LoginResponseDto;
      expect(loginResult.accessToken).toBeDefined();
      expect(loginResult.refreshToken).toBeDefined();
      expect(loginResult.user.email).toBe('test@example.com');
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          failedLoginAttempts: 0,
          lockedUntil: null,
        }),
      );
    });

    it('should return MFA required response when MFA is enabled', async () => {
      const password = 'ValidP@ssw0rd!';
      const hashedPassword = await bcrypt.hash(password, 12);

      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        passwordHash: hashedPassword,
      });
      mockUserRepository.update.mockResolvedValue({});
      mockMfaService.isMfaEnabled.mockResolvedValue(true);

      const result = await service.login({
        email: 'test@example.com',
        password,
      });

      // Type guard to check if it's an MfaRequiredResponseDto
      expect('mfaRequired' in result).toBe(true);
      const mfaResult = result as MfaRequiredResponseDto;
      expect(mfaResult.mfaRequired).toBe(true);
      expect(mfaResult.tempToken).toBeDefined();
      expect(mfaResult.message).toBe('MFA verification required');
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

      await expect(service.refreshToken('invalid-type-token')).rejects.toThrow(
        UnauthorizedException,
      );
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

      await expect(service.refreshToken('valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
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
        where: {
          id: mockUser.id,
          tenantId: mockUser.tenantId,
          status: 'active',
        },
      });
    });

    it('should return null for invalid user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser('invalid-id', 'invalid-tenant');

      expect(result).toBeNull();
    });
  });

  describe('session management', () => {
    it('should create session on login with context', async () => {
      const password = 'ValidP@ssw0rd!';
      const hashedPassword = await bcrypt.hash(password, 12);

      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        passwordHash: hashedPassword,
      });
      mockUserRepository.update.mockResolvedValue({});
      mockMfaService.isMfaEnabled.mockResolvedValue(false);

      const result = await service.login(
        { email: 'test@example.com', password },
        mockLoginContext,
      );

      // Verify login succeeded
      expect('accessToken' in result).toBe(true);

      // Wait for any remaining async operations
      await new Promise((resolve) => setImmediate(resolve));

      // Session should be created with device info
      expect(mockSessionService.parseDeviceInfo).toHaveBeenCalledWith(
        mockLoginContext.userAgent,
      );
      expect(mockSessionService.createSession).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.tenantId,
        expect.any(String), // JTI
        expect.any(Object), // DeviceInfo
        mockLoginContext.ipAddress,
      );
    });

    it('should get sessions for user', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          device: 'Desktop',
          browser: 'Chrome',
          os: 'Windows',
          location: 'Unknown',
          ipAddress: '192.168.1.1',
          lastActive: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          isCurrent: true,
        },
      ];
      mockSessionService.getSessions.mockResolvedValue(mockSessions);
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getSessions(mockUser.id, 'current-jti');

      expect(result.data).toEqual(mockSessions);
      expect(mockSessionService.getSessions).toHaveBeenCalledWith(
        mockUser.id,
        'current-jti',
      );
    });

    it('should revoke session', async () => {
      await service.revokeSession(
        mockUser.id,
        'session-to-revoke',
        'current-jti',
      );

      expect(mockSessionService.revokeSession).toHaveBeenCalledWith(
        mockUser.id,
        'session-to-revoke',
        'current-jti',
      );
    });

    it('should revoke all sessions', async () => {
      mockSessionService.revokeAllSessions.mockResolvedValue(3);

      const result = await service.revokeAllSessions(
        mockUser.id,
        'current-jti',
      );

      expect(result).toBe(3);
      expect(mockSessionService.revokeAllSessions).toHaveBeenCalledWith(
        mockUser.id,
        'current-jti',
      );
    });

    it('should check token blacklist', async () => {
      mockSessionService.isTokenBlacklisted.mockResolvedValue(true);

      const result = await service.isTokenBlacklisted('some-jti');

      expect(result).toBe(true);
      expect(mockSessionService.isTokenBlacklisted).toHaveBeenCalledWith(
        'some-jti',
      );
    });

    it('should blacklist token on logout', async () => {
      await service.logout(mockUser.id, 'jti-to-blacklist');

      expect(mockSessionService.blacklistToken).toHaveBeenCalledWith(
        'jti-to-blacklist',
      );
    });
  });

  describe('refreshToken with session', () => {
    it('should reject blacklisted refresh token', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: mockUser.id,
        type: 'refresh',
        jti: 'blacklisted-jti',
      });
      mockSessionService.isTokenBlacklisted.mockResolvedValue(true);

      await expect(service.refreshToken('blacklisted-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should update session activity on refresh', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: mockUser.id,
        type: 'refresh',
        jti: 'valid-jti',
      });
      mockSessionService.isTokenBlacklisted.mockResolvedValue(false);
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await service.refreshToken('valid-refresh-token');

      expect(mockSessionService.updateSessionActivity).toHaveBeenCalledWith(
        mockUser.id,
        'valid-jti',
      );
    });
  });
});
