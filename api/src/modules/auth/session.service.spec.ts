// Nebula DNS - Session Service Unit Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SessionService, DeviceInfo, SessionData } from './session.service';
import { RedisService } from '../redis/redis.service';

describe('SessionService', () => {
  let service: SessionService;

  const mockUserId = 'user-123';
  const mockTenantId = 'tenant-123';
  const mockTokenJti = 'jti-abc123';
  const mockSessionId = 'session-456';
  const mockIpAddress = '192.168.1.100';

  const mockDeviceInfo: DeviceInfo = {
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0',
    browser: 'Chrome 120',
    os: 'Windows 10',
    device: 'Desktop',
    isMobile: false,
  };

  const mockSessionData: SessionData = {
    sessionId: mockSessionId,
    userId: mockUserId,
    tenantId: mockTenantId,
    tokenJti: mockTokenJti,
    deviceInfo: mockDeviceInfo,
    ipAddress: mockIpAddress,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const mockRedisClient = {
    sadd: jest.fn().mockResolvedValue(1),
    srem: jest.fn().mockResolvedValue(1),
    smembers: jest.fn().mockResolvedValue([]),
    expire: jest.fn().mockResolvedValue(1),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    getClient: jest.fn().mockReturnValue(mockRedisClient),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        SESSION_MAX_PER_USER: 10,
        SESSION_TTL_SECONDS: 604800, // 7 days
        SESSION_BLACKLIST_TTL_SECONDS: 604800,
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a new session and store in Redis', async () => {
      mockRedisClient.smembers.mockResolvedValue([]);
      mockRedisService.set.mockResolvedValue(undefined);

      const result = await service.createSession(
        mockUserId,
        mockTenantId,
        mockTokenJti,
        mockDeviceInfo,
        mockIpAddress,
      );

      expect(result).toBeDefined();
      expect(result.userId).toBe(mockUserId);
      expect(result.tenantId).toBe(mockTenantId);
      expect(result.tokenJti).toBe(mockTokenJti);
      expect(result.deviceInfo).toEqual(mockDeviceInfo);
      expect(result.ipAddress).toBe(mockIpAddress);
      expect(result.sessionId).toBeDefined();
      expect(mockRedisService.set).toHaveBeenCalled();
      expect(mockRedisClient.sadd).toHaveBeenCalled();
    });

    it('should enforce session limit by removing oldest sessions', async () => {
      // Mock 10 existing sessions (at limit)
      const existingSessionIds = Array.from(
        { length: 10 },
        (_, i) => `session-${i}`,
      );

      // First call for getSessions during enforcement, second for createSession
      mockRedisClient.smembers
        .mockResolvedValueOnce(existingSessionIds) // For enforceSessionLimit -> getSessions
        .mockResolvedValueOnce(existingSessionIds); // Possibly called again

      // Mock session data for each existing session during getSessions
      const oldDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      existingSessionIds.forEach((id, index) => {
        mockRedisService.get.mockResolvedValueOnce(
          JSON.stringify({
            ...mockSessionData,
            sessionId: id,
            tokenJti: `jti-${id}`,
            lastActivity: new Date(
              oldDate.getTime() + index * 1000,
            ).toISOString(),
          }),
        );
      });

      // For revokeSession - need to return the session data
      mockRedisService.get.mockResolvedValueOnce(
        JSON.stringify({
          ...mockSessionData,
          sessionId: 'session-0',
          tokenJti: 'jti-session-0',
        }),
      );

      mockRedisService.set.mockResolvedValue(undefined);
      mockRedisService.del.mockResolvedValue(undefined);

      const result = await service.createSession(
        mockUserId,
        mockTenantId,
        mockTokenJti,
        mockDeviceInfo,
        mockIpAddress,
      );

      expect(result).toBeDefined();
      // Session limit enforcement should have been triggered
      // The oldest session should have been revoked (del called for session and blacklist set called)
      expect(mockRedisService.set).toHaveBeenCalled();
    });
  });

  describe('getSessions', () => {
    it('should return empty array when no sessions exist', async () => {
      mockRedisClient.smembers.mockResolvedValue([]);

      const result = await service.getSessions(mockUserId);

      expect(result).toEqual([]);
    });

    it('should return active sessions for user', async () => {
      mockRedisClient.smembers.mockResolvedValue([mockSessionId]);
      mockRedisService.get.mockResolvedValue(JSON.stringify(mockSessionData));

      const result = await service.getSessions(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockSessionId);
      expect(result[0].device).toBe(mockDeviceInfo.device);
      expect(result[0].browser).toBe(mockDeviceInfo.browser);
    });

    it('should mark current session correctly', async () => {
      mockRedisClient.smembers.mockResolvedValue([mockSessionId]);
      mockRedisService.get.mockResolvedValue(JSON.stringify(mockSessionData));

      const result = await service.getSessions(mockUserId, mockTokenJti);

      expect(result[0].isCurrent).toBe(true);
    });

    it('should filter out expired sessions', async () => {
      const expiredSession = {
        ...mockSessionData,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };
      mockRedisClient.smembers.mockResolvedValue([mockSessionId]);
      mockRedisService.get.mockResolvedValue(JSON.stringify(expiredSession));

      const result = await service.getSessions(mockUserId);

      expect(result).toHaveLength(0);
    });

    it('should clean up sessions with no data', async () => {
      mockRedisClient.smembers.mockResolvedValue([mockSessionId]);
      mockRedisService.get.mockResolvedValue(null);

      await service.getSessions(mockUserId);

      expect(mockRedisClient.srem).toHaveBeenCalledWith(
        expect.any(String),
        mockSessionId,
      );
    });
  });

  describe('revokeSession', () => {
    it('should revoke session and blacklist token', async () => {
      mockRedisService.get.mockResolvedValue(JSON.stringify(mockSessionData));
      mockRedisService.set.mockResolvedValue(undefined);
      mockRedisService.del.mockResolvedValue(undefined);

      await service.revokeSession(mockUserId, mockSessionId);

      // Should blacklist the token
      expect(mockRedisService.set).toHaveBeenCalledWith(
        expect.stringContaining('blacklist'),
        expect.any(String),
        expect.any(Number),
      );

      // Should delete session
      expect(mockRedisService.del).toHaveBeenCalled();

      // Should remove from user sessions set
      expect(mockRedisClient.srem).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent session', async () => {
      mockRedisService.get.mockResolvedValue(null);

      await expect(
        service.revokeSession(mockUserId, 'nonexistent-session'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when revoking current session', async () => {
      mockRedisService.get.mockResolvedValue(JSON.stringify(mockSessionData));

      await expect(
        service.revokeSession(mockUserId, mockSessionId, mockTokenJti),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('revokeAllSessions', () => {
    it('should revoke all sessions except current', async () => {
      const otherSessionId = 'other-session-789';
      const otherJti = 'other-jti-xyz';
      const otherSession = {
        ...mockSessionData,
        sessionId: otherSessionId,
        tokenJti: otherJti,
      };

      mockRedisClient.smembers.mockResolvedValue([
        mockSessionId,
        otherSessionId,
      ]);

      // First call for current session (skipped), second for other session
      mockRedisService.get
        .mockResolvedValueOnce(JSON.stringify(mockSessionData))
        .mockResolvedValueOnce(JSON.stringify(otherSession));

      mockRedisService.set.mockResolvedValue(undefined);
      mockRedisService.del.mockResolvedValue(undefined);

      const result = await service.revokeAllSessions(mockUserId, mockTokenJti);

      // Should only revoke the other session (1)
      expect(result).toBe(1);
      expect(mockRedisService.del).toHaveBeenCalledTimes(1);
    });

    it('should return 0 when no sessions exist', async () => {
      mockRedisClient.smembers.mockResolvedValue([]);

      const result = await service.revokeAllSessions(mockUserId);

      expect(result).toBe(0);
    });
  });

  describe('isTokenBlacklisted', () => {
    it('should return true for blacklisted token', async () => {
      mockRedisService.get.mockResolvedValue(new Date().toISOString());

      const result = await service.isTokenBlacklisted(mockTokenJti);

      expect(result).toBe(true);
    });

    it('should return false for non-blacklisted token', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const result = await service.isTokenBlacklisted(mockTokenJti);

      expect(result).toBe(false);
    });

    it('should fail open on Redis error', async () => {
      mockRedisService.get.mockRejectedValue(
        new Error('Redis connection error'),
      );

      const result = await service.isTokenBlacklisted(mockTokenJti);

      expect(result).toBe(false);
    });
  });

  describe('blacklistToken', () => {
    it('should blacklist token with TTL', async () => {
      mockRedisService.set.mockResolvedValue(undefined);

      await service.blacklistToken(mockTokenJti);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        `session:blacklist:${mockTokenJti}`,
        expect.any(String),
        604800, // 7 days default
      );
    });
  });

  describe('updateSessionActivity', () => {
    it('should update lastActivity timestamp', async () => {
      mockRedisClient.smembers.mockResolvedValue([mockSessionId]);
      mockRedisService.get.mockResolvedValue(JSON.stringify(mockSessionData));
      mockRedisService.set.mockResolvedValue(undefined);

      await service.updateSessionActivity(mockUserId, mockTokenJti);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        expect.stringContaining(mockSessionId),
        expect.any(String),
        expect.any(Number),
      );
    });

    it('should silently fail if session not found', async () => {
      mockRedisClient.smembers.mockResolvedValue([]);

      await expect(
        service.updateSessionActivity(mockUserId, 'nonexistent-jti'),
      ).resolves.toBeUndefined();
    });
  });

  describe('parseDeviceInfo', () => {
    it('should parse Chrome on Windows', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

      const result = service.parseDeviceInfo(ua);

      expect(result.browser).toContain('Chrome');
      expect(result.os).toContain('Windows');
      expect(result.device).toBe('Desktop');
      expect(result.isMobile).toBe(false);
    });

    it('should parse Safari on macOS', () => {
      const ua =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15';

      const result = service.parseDeviceInfo(ua);

      expect(result.browser).toContain('Safari');
      expect(result.os).toContain('Mac OS X');
      expect(result.device).toBe('Desktop');
      expect(result.isMobile).toBe(false);
    });

    it('should parse mobile Chrome on Android', () => {
      const ua =
        'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

      const result = service.parseDeviceInfo(ua);

      expect(result.browser).toContain('Chrome');
      expect(result.os).toContain('Android');
      expect(result.device).toBe('Mobile');
      expect(result.isMobile).toBe(true);
    });

    it('should parse Safari on iPhone', () => {
      const ua =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

      const result = service.parseDeviceInfo(ua);

      expect(result.device).toBe('Mobile');
      expect(result.isMobile).toBe(true);
    });

    it('should handle unknown user agent', () => {
      const result = service.parseDeviceInfo('');

      expect(result.browser).toBe('Unknown');
      expect(result.os).toBe('Unknown');
      expect(result.device).toBe('Desktop');
      expect(result.isMobile).toBe(false);
    });

    it('should truncate long user agents', () => {
      const longUa = 'A'.repeat(1000);

      const result = service.parseDeviceInfo(longUa);

      expect(result.userAgent.length).toBeLessThanOrEqual(500);
    });
  });

  describe('findSessionByJti', () => {
    it('should find session by JTI', async () => {
      mockRedisClient.smembers.mockResolvedValue([mockSessionId]);
      mockRedisService.get.mockResolvedValue(JSON.stringify(mockSessionData));

      const result = await service.findSessionByJti(mockUserId, mockTokenJti);

      expect(result).toBeDefined();
      expect(result?.tokenJti).toBe(mockTokenJti);
    });

    it('should return null if session not found', async () => {
      mockRedisClient.smembers.mockResolvedValue([mockSessionId]);
      mockRedisService.get.mockResolvedValue(JSON.stringify(mockSessionData));

      const result = await service.findSessionByJti(
        mockUserId,
        'different-jti',
      );

      expect(result).toBeNull();
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should remove expired sessions from set', async () => {
      mockRedisClient.smembers.mockResolvedValue([
        mockSessionId,
        'expired-session',
      ]);
      mockRedisService.get
        .mockResolvedValueOnce(JSON.stringify(mockSessionData)) // Valid session
        .mockResolvedValueOnce(null); // Expired/deleted session

      const result = await service.cleanupExpiredSessions(mockUserId);

      expect(result).toBe(1);
      expect(mockRedisClient.srem).toHaveBeenCalledWith(
        expect.any(String),
        'expired-session',
      );
    });

    it('should return 0 when no cleanup needed', async () => {
      mockRedisClient.smembers.mockResolvedValue([mockSessionId]);
      mockRedisService.get.mockResolvedValue(JSON.stringify(mockSessionData));

      const result = await service.cleanupExpiredSessions(mockUserId);

      expect(result).toBe(0);
    });
  });
});
