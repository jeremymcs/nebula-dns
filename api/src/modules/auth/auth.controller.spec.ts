// Nebula DNS - Auth Controller Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  LoginDto,
  LoginResponseDto,
  MfaRequiredResponseDto,
  MfaVerifyLoginDto,
} from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SwitchTenantDto } from './dto/switch-tenant.dto';
import { RedisRateLimitGuard } from '../rate-limit/guards/redis-rate-limit.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin',
    tenantId: 'tenant-123',
    mfaEnabled: false,
    jti: 'session-token-123',
  };

  const mockLoginResponse: LoginResponseDto = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 900,
    user: {
      id: mockUser.id,
      email: mockUser.email,
      name: mockUser.name,
      role: mockUser.role,
      tenantId: mockUser.tenantId,
    },
  };

  const mockMfaResponse: MfaRequiredResponseDto = {
    mfaRequired: true,
    tempToken: 'mock-temp-token',
    message: 'MFA verification required',
  };

  const mockRequest = {
    headers: {
      'user-agent': 'Test User Agent',
      'x-forwarded-for': '192.168.1.1',
    },
    ip: '192.168.1.1',
  } as unknown as Request;

  const mockIp = '192.168.1.1';

  const mockAuthService = {
    login: jest.fn(),
    verifyMfaLogin: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    changePassword: jest.fn(),
    getManagedOrganizations: jest.fn(),
    switchTenant: jest.fn(),
    getSessions: jest.fn(),
    revokeSession: jest.fn(),
    revokeAllSessions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(RedisRateLimitGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'ValidP@ssw0rd!',
      };

      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(loginDto, mockRequest, mockIp);

      expect(authService.login).toHaveBeenCalledWith(loginDto, {
        userAgent: 'Test User Agent',
        ipAddress: '192.168.1.1',
      });
      expect(result).toEqual(mockLoginResponse);
      expect('accessToken' in result).toBe(true);
    });

    it('should return MFA required response when MFA is enabled', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'ValidP@ssw0rd!',
      };

      mockAuthService.login.mockResolvedValue(mockMfaResponse);

      const result = await controller.login(loginDto, mockRequest, mockIp);

      expect(authService.login).toHaveBeenCalledWith(loginDto, {
        userAgent: 'Test User Agent',
        ipAddress: '192.168.1.1',
      });
      expect(result).toEqual(mockMfaResponse);
      expect('mfaRequired' in result).toBe(true);
      expect((result as MfaRequiredResponseDto).mfaRequired).toBe(true);
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      const loginDto: LoginDto = {
        email: 'invalid@example.com',
        password: 'password',
      };

      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(
        controller.login(loginDto, mockRequest, mockIp),
      ).rejects.toThrow(UnauthorizedException);
      expect(authService.login).toHaveBeenCalledWith(loginDto, {
        userAgent: 'Test User Agent',
        ipAddress: '192.168.1.1',
      });
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(
        controller.login(loginDto, mockRequest, mockIp),
      ).rejects.toThrow(UnauthorizedException);
      expect(authService.login).toHaveBeenCalledWith(loginDto, {
        userAgent: 'Test User Agent',
        ipAddress: '192.168.1.1',
      });
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      const loginDto: LoginDto = {
        email: 'nonexistent@example.com',
        password: 'password',
      };

      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(
        controller.login(loginDto, mockRequest, mockIp),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for locked account', async () => {
      const loginDto: LoginDto = {
        email: 'locked@example.com',
        password: 'ValidP@ssw0rd!',
      };

      const lockDate = new Date();
      lockDate.setMinutes(lockDate.getMinutes() + 15);

      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException(
          `Account locked. Try again after ${lockDate.toISOString()}`,
        ),
      );

      await expect(
        controller.login(loginDto, mockRequest, mockIp),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should not expose sensitive information in error messages', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      try {
        await controller.login(loginDto, mockRequest, mockIp);
        fail('Should have thrown UnauthorizedException');
      } catch (error) {
        expect(error.message).toBe('Invalid credentials');
        expect(error.message).not.toContain('password');
        expect(error.message).not.toContain('hash');
      }
    });

    it('should extract IP from X-Forwarded-For header', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'ValidP@ssw0rd!',
      };

      const reqWithProxy = {
        headers: {
          'user-agent': 'Test Agent',
          'x-forwarded-for': '10.0.0.1, 192.168.1.1',
        },
        ip: '127.0.0.1',
      } as unknown as Request;

      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      await controller.login(loginDto, reqWithProxy, '127.0.0.1');

      expect(authService.login).toHaveBeenCalledWith(loginDto, {
        userAgent: 'Test Agent',
        ipAddress: '10.0.0.1',
      });
    });
  });

  describe('verifyMfa', () => {
    it('should return tokens for valid MFA code', async () => {
      const mfaDto: MfaVerifyLoginDto = {
        tempToken: 'mock-temp-token',
        code: '123456',
      };

      mockAuthService.verifyMfaLogin.mockResolvedValue(mockLoginResponse);

      const result = await controller.verifyMfa(mfaDto);

      expect(authService.verifyMfaLogin).toHaveBeenCalledWith(mfaDto);
      expect(result).toEqual(mockLoginResponse);
      expect(result.accessToken).toBe('mock-access-token');
    });

    it('should throw UnauthorizedException for invalid MFA code', async () => {
      const mfaDto: MfaVerifyLoginDto = {
        tempToken: 'mock-temp-token',
        code: '999999',
      };

      mockAuthService.verifyMfaLogin.mockRejectedValue(
        new UnauthorizedException('Invalid MFA code'),
      );

      await expect(controller.verifyMfa(mfaDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for expired temp token', async () => {
      const mfaDto: MfaVerifyLoginDto = {
        tempToken: 'expired-temp-token',
        code: '123456',
      };

      mockAuthService.verifyMfaLogin.mockRejectedValue(
        new UnauthorizedException('Invalid or expired MFA token'),
      );

      await expect(controller.verifyMfa(mfaDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for used backup code', async () => {
      const mfaDto: MfaVerifyLoginDto = {
        tempToken: 'mock-temp-token',
        code: '12345678', // Backup code format
      };

      mockAuthService.verifyMfaLogin.mockRejectedValue(
        new UnauthorizedException('Invalid MFA code'),
      );

      await expect(controller.verifyMfa(mfaDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should accept backup code format (8 digits)', async () => {
      const mfaDto: MfaVerifyLoginDto = {
        tempToken: 'mock-temp-token',
        code: '12345678',
      };

      mockAuthService.verifyMfaLogin.mockResolvedValue(mockLoginResponse);

      const result = await controller.verifyMfa(mfaDto);

      expect(result).toEqual(mockLoginResponse);
    });
  });

  describe('refresh', () => {
    it('should return new tokens for valid refresh token', async () => {
      const refreshDto: RefreshTokenDto = {
        refreshToken: 'valid-refresh-token',
      };

      mockAuthService.refreshToken.mockResolvedValue(mockLoginResponse);

      const result = await controller.refresh(refreshDto, mockRequest, mockIp);

      expect(authService.refreshToken).toHaveBeenCalledWith(
        refreshDto.refreshToken,
        {
          userAgent: 'Test User Agent',
          ipAddress: '192.168.1.1',
        },
      );
      expect(result).toEqual(mockLoginResponse);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedException for expired token', async () => {
      const refreshDto: RefreshTokenDto = {
        refreshToken: 'expired-token',
      };

      mockAuthService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      );

      await expect(
        controller.refresh(refreshDto, mockRequest, mockIp),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      const refreshDto: RefreshTokenDto = {
        refreshToken: 'invalid-token',
      };

      mockAuthService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      );

      await expect(
        controller.refresh(refreshDto, mockRequest, mockIp),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for revoked token', async () => {
      const refreshDto: RefreshTokenDto = {
        refreshToken: 'revoked-token',
      };

      mockAuthService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      );

      await expect(
        controller.refresh(refreshDto, mockRequest, mockIp),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user information', async () => {
      const result = await controller.getCurrentUser(mockUser);

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        tenantId: mockUser.tenantId,
        mfaEnabled: false,
      });
    });

    it('should include mfaEnabled flag when MFA is enabled', async () => {
      const userWithMfa = {
        ...mockUser,
        mfaEnabled: true,
      };

      const result = await controller.getCurrentUser(userWithMfa);

      expect(result.mfaEnabled).toBe(true);
    });

    it('should not expose password hash', async () => {
      const userWithPassword = {
        ...mockUser,
        passwordHash: '$2b$12$somehash',
      };

      const result = await controller.getCurrentUser(userWithPassword);

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('password');
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(mockUser);

      expect(authService.logout).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.jti,
      );
      expect(result).toBeUndefined();
    });
  });

  describe('changePassword', () => {
    it('should change password with valid old password', async () => {
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'OldP@ssw0rd!',
        newPassword: 'NewP@ssw0rd123!',
      };

      mockAuthService.changePassword.mockResolvedValue(undefined);

      const result = await controller.changePassword(
        mockUser,
        changePasswordDto,
      );

      expect(authService.changePassword).toHaveBeenCalledWith(
        mockUser.id,
        changePasswordDto,
      );
      expect(result).toBeUndefined();
    });

    it('should throw BadRequestException for invalid old password', async () => {
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'WrongP@ssw0rd!',
        newPassword: 'NewP@ssw0rd123!',
      };

      mockAuthService.changePassword.mockRejectedValue(
        new BadRequestException('Current password is incorrect'),
      );

      await expect(
        controller.changePassword(mockUser, changePasswordDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for weak new password', async () => {
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'OldP@ssw0rd!',
        newPassword: 'weak',
      };

      mockAuthService.changePassword.mockRejectedValue(
        new BadRequestException(
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        ),
      );

      await expect(
        controller.changePassword(mockUser, changePasswordDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for same password', async () => {
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'SameP@ssw0rd!',
        newPassword: 'SameP@ssw0rd!',
      };

      mockAuthService.changePassword.mockRejectedValue(
        new BadRequestException(
          'New password must be different from current password',
        ),
      );

      await expect(
        controller.changePassword(mockUser, changePasswordDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getManagedOrganizations', () => {
    it('should return managed organizations for MSP users', async () => {
      const mockMspResponse = {
        isMsp: true,
        partnerId: 'partner-123',
        currentOrg: {
          id: 'tenant-123',
          name: 'Current Org',
          slug: 'current-org',
        },
        organizations: [
          {
            id: 'tenant-123',
            name: 'Current Org',
            slug: 'current-org',
            status: 'active',
          },
          {
            id: 'tenant-456',
            name: 'Client Org',
            slug: 'client-org',
            status: 'active',
          },
        ],
      };

      mockAuthService.getManagedOrganizations.mockResolvedValue(
        mockMspResponse,
      );

      const result = await controller.getManagedOrganizations(
        mockUser,
        mockUser.tenantId,
      );

      expect(authService.getManagedOrganizations).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.tenantId,
      );
      expect(result.isMsp).toBe(true);
      expect(result.organizations).toHaveLength(2);
    });

    it('should return empty list for non-MSP users', async () => {
      const mockNonMspResponse = {
        isMsp: false,
        partnerId: null,
        currentOrg: {
          id: 'tenant-123',
          name: 'Regular Org',
          slug: 'regular-org',
        },
        organizations: [],
      };

      mockAuthService.getManagedOrganizations.mockResolvedValue(
        mockNonMspResponse,
      );

      const result = await controller.getManagedOrganizations(
        mockUser,
        mockUser.tenantId,
      );

      expect(result.isMsp).toBe(false);
      expect(result.organizations).toHaveLength(0);
    });
  });

  describe('switchTenant', () => {
    it('should switch tenant for MSP users', async () => {
      const switchDto: SwitchTenantDto = {
        tenantId: 'tenant-456',
      };

      const newLoginResponse: LoginResponseDto = {
        ...mockLoginResponse,
        user: {
          ...mockLoginResponse.user,
          tenantId: 'tenant-456',
        },
      };

      mockAuthService.switchTenant.mockResolvedValue(newLoginResponse);

      const result = await controller.switchTenant(
        mockUser,
        mockUser.tenantId,
        switchDto,
      );

      expect(authService.switchTenant).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.tenantId,
        switchDto.tenantId,
      );
      expect(result.user.tenantId).toBe('tenant-456');
    });

    it('should throw ForbiddenException for non-MSP users', async () => {
      const switchDto: SwitchTenantDto = {
        tenantId: 'tenant-456',
      };

      mockAuthService.switchTenant.mockRejectedValue(
        new ForbiddenException(
          'Only MSP users can switch between organizations',
        ),
      );

      await expect(
        controller.switchTenant(mockUser, mockUser.tenantId, switchDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for unauthorized tenant', async () => {
      const switchDto: SwitchTenantDto = {
        tenantId: 'unauthorized-tenant',
      };

      mockAuthService.switchTenant.mockRejectedValue(
        new ForbiddenException('You do not have access to this organization'),
      );

      await expect(
        controller.switchTenant(mockUser, mockUser.tenantId, switchDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getSessions', () => {
    it('should return active sessions for user', async () => {
      const mockSessions = {
        data: [
          {
            id: 'session-1',
            device: 'Chrome on Windows',
            browser: 'Chrome',
            location: 'New York, US',
            ipAddress: '192.168.1.1',
            lastActive: new Date().toISOString(),
            isCurrent: true,
          },
          {
            id: 'session-2',
            device: 'Safari on iPhone',
            browser: 'Safari',
            location: 'San Francisco, US',
            ipAddress: '192.168.1.2',
            lastActive: new Date().toISOString(),
            isCurrent: false,
          },
        ],
      };

      mockAuthService.getSessions.mockResolvedValue(mockSessions);

      const result = await controller.getSessions(mockUser);

      expect(authService.getSessions).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.jti,
      );
      expect(result.data).toHaveLength(2);
      expect(result.data[0].isCurrent).toBe(true);
    });
  });

  describe('revokeSession', () => {
    it('should revoke specific session', async () => {
      const sessionId = 'session-123';
      mockAuthService.revokeSession.mockResolvedValue(undefined);

      const result = await controller.revokeSession(mockUser, sessionId);

      expect(authService.revokeSession).toHaveBeenCalledWith(
        mockUser.id,
        sessionId,
        mockUser.jti,
      );
      expect(result).toBeUndefined();
    });
  });

  describe('revokeAllSessions', () => {
    it('should revoke all sessions except current', async () => {
      const revokedCount = 3;
      mockAuthService.revokeAllSessions.mockResolvedValue(revokedCount);

      const result = await controller.revokeAllSessions(mockUser);

      expect(authService.revokeAllSessions).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.jti,
      );
      expect(result).toBeDefined();
    });
  });

  describe('Rate Limiting and Security', () => {
    it('should handle multiple failed login attempts', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      // Simulate 5 failed attempts
      for (let i = 0; i < 5; i++) {
        mockAuthService.login.mockRejectedValue(
          new UnauthorizedException('Invalid credentials'),
        );

        await expect(
          controller.login(loginDto, mockRequest, mockIp),
        ).rejects.toThrow(UnauthorizedException);
      }

      // 6th attempt should be locked
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Account locked. Try again after'),
      );

      await expect(
        controller.login(loginDto, mockRequest, mockIp),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reset failed attempts counter on successful login', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'ValidP@ssw0rd!',
      };

      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(loginDto, mockRequest, mockIp);

      expect(result).toEqual(mockLoginResponse);
    });

    it('should not leak user existence in error messages', async () => {
      const loginDto: LoginDto = {
        email: 'nonexistent@example.com',
        password: 'password',
      };

      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      try {
        await controller.login(loginDto, mockRequest, mockIp);
        fail('Should have thrown UnauthorizedException');
      } catch (error) {
        expect(error.message).toBe('Invalid credentials');
        expect(error.message).not.toContain('not found');
        expect(error.message).not.toContain('does not exist');
      }
    });

    it('should handle case-insensitive email login', async () => {
      const loginDto: LoginDto = {
        email: 'TEST@EXAMPLE.COM',
        password: 'ValidP@ssw0rd!',
      };

      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(loginDto, mockRequest, mockIp);

      expect(result).toEqual(mockLoginResponse);
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error format for authentication failures', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      try {
        await controller.login(loginDto, mockRequest, mockIp);
        fail('Should have thrown UnauthorizedException');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect(error.message).toBe('Invalid credentials');
      }
    });

    it('should return consistent error format for validation failures', async () => {
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'old',
        newPassword: 'weak',
      };

      mockAuthService.changePassword.mockRejectedValue(
        new BadRequestException('Password validation failed'),
      );

      try {
        await controller.changePassword(mockUser, changePasswordDto);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });
  });
});
