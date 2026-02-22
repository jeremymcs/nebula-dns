// Nebula DNS - Session Service Redis Integration Tests
// Tests session management operations against a real Redis instance (US-001)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { SessionService, DeviceInfo, SessionData } from './session.service';
import { RedisService } from '../redis/redis.service';

/**
 * Session Service Redis Integration Tests
 *
 * These tests require a running Redis instance. You can start one using:
 * - Docker Compose: `docker-compose up -d redis`
 * - Standalone Docker: `docker run -d -p 4379:6379 redis:7-alpine`
 *
 * The tests will use database 15 (TEST_DB) to isolate from production data.
 */
describe('Session Service Redis Integration Tests', () => {
  let sessionService: SessionService;
  let redisService: RedisService;
  let redisClient: Redis;
  const TEST_DB = 15;
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:4379';

  const mockUserId = 'test-user-123';
  const mockTenantId = 'test-tenant-456';
  const mockTokenJti = 'test-jti-789';
  const mockIpAddress = '192.168.1.100';

  const mockDeviceInfo: DeviceInfo = {
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0',
    browser: 'Chrome 120',
    os: 'Windows 10',
    device: 'Desktop',
    isMobile: false,
  };

  beforeAll(async () => {
    // Create a test Redis client for verification
    redisClient = new Redis(redisUrl);
    await redisClient.select(TEST_DB);

    // Create RedisService with test configuration
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          REDIS_URL: redisUrl,
          SESSION_MAX_PER_USER: 5, // Lower limit for testing
          SESSION_TTL_SECONDS: 3600, // 1 hour for testing
          SESSION_BLACKLIST_TTL_SECONDS: 3600,
        };
        return config[key] ?? defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        RedisService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    sessionService = module.get<SessionService>(SessionService);
    redisService = module.get<RedisService>(RedisService);

    // Switch service to test database
    await redisService.getClient().select(TEST_DB);

    // Wait for connection
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    if (redisService) {
      await redisService.onModuleDestroy();
    }
    if (redisClient) {
      await redisClient.quit();
    }
  });

  beforeEach(async () => {
    // Clean up Redis between tests
    await redisClient.flushdb();
  });

  describe('Session Creation', () => {
    it('should create a new session and store in Redis', async () => {
      const session = await sessionService.createSession(
        mockUserId,
        mockTenantId,
        mockTokenJti,
        mockDeviceInfo,
        mockIpAddress,
      );

      expect(session).toBeDefined();
      expect(session.sessionId).toBeDefined();
      expect(session.userId).toBe(mockUserId);
      expect(session.tenantId).toBe(mockTenantId);
      expect(session.tokenJti).toBe(mockTokenJti);
      expect(session.ipAddress).toBe(mockIpAddress);
      expect(session.deviceInfo).toEqual(mockDeviceInfo);

      // Verify session exists in Redis
      const sessionKey = `session:${mockUserId}:${session.sessionId}`;
      const stored = await redisClient.get(sessionKey);
      expect(stored).toBeDefined();

      const storedData: SessionData = JSON.parse(stored!);
      expect(storedData.sessionId).toBe(session.sessionId);
    });

    it('should add session to user session set', async () => {
      const session = await sessionService.createSession(
        mockUserId,
        mockTenantId,
        mockTokenJti,
        mockDeviceInfo,
        mockIpAddress,
      );

      const userSessionsKey = `session:user:${mockUserId}`;
      const sessionIds = await redisClient.smembers(userSessionsKey);

      expect(sessionIds).toContain(session.sessionId);
    });

    it('should enforce session limit by removing oldest sessions', async () => {
      // Create 5 sessions (at limit)
      const sessions: SessionData[] = [];
      for (let i = 0; i < 5; i++) {
        const session = await sessionService.createSession(
          mockUserId,
          mockTenantId,
          `jti-${i}`,
          mockDeviceInfo,
          mockIpAddress,
        );
        sessions.push(session);
        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Create 6th session - should trigger limit enforcement
      const newSession = await sessionService.createSession(
        mockUserId,
        mockTenantId,
        'jti-new',
        mockDeviceInfo,
        mockIpAddress,
      );

      // Get all sessions - should not exceed limit
      const allSessions = await sessionService.getSessions(mockUserId);
      expect(allSessions.length).toBeLessThanOrEqual(5);

      // New session should exist
      expect(allSessions.some((s) => s.id === newSession.sessionId)).toBe(true);
    }, 15000);
  });

  describe('Session Retrieval', () => {
    it('should return empty array when no sessions exist', async () => {
      const sessions = await sessionService.getSessions('nonexistent-user');
      expect(sessions).toEqual([]);
    });

    it('should return all active sessions for user', async () => {
      // Create multiple sessions
      await sessionService.createSession(
        mockUserId,
        mockTenantId,
        'jti-1',
        mockDeviceInfo,
        mockIpAddress,
      );
      await sessionService.createSession(
        mockUserId,
        mockTenantId,
        'jti-2',
        { ...mockDeviceInfo, browser: 'Firefox 120' },
        '10.0.0.1',
      );

      const sessions = await sessionService.getSessions(mockUserId);

      expect(sessions).toHaveLength(2);
      expect(sessions.every((s) => s.device === 'Desktop')).toBe(true);
    });

    it('should mark current session correctly', async () => {
      const session1 = await sessionService.createSession(
        mockUserId,
        mockTenantId,
        'jti-1',
        mockDeviceInfo,
        mockIpAddress,
      );
      await sessionService.createSession(
        mockUserId,
        mockTenantId,
        'jti-2',
        mockDeviceInfo,
        mockIpAddress,
      );

      const sessions = await sessionService.getSessions(mockUserId, 'jti-1');

      const currentSession = sessions.find((s) => s.id === session1.sessionId);
      const otherSession = sessions.find((s) => s.id !== session1.sessionId);

      expect(currentSession?.isCurrent).toBe(true);
      expect(otherSession?.isCurrent).toBe(false);
    });

    it('should include location info in response', async () => {
      await sessionService.createSession(
        mockUserId,
        mockTenantId,
        mockTokenJti,
        mockDeviceInfo,
        '192.168.1.100',
      );

      const sessions = await sessionService.getSessions(mockUserId);

      expect(sessions[0].location).toBeDefined();
      expect(sessions[0].location).toBe('Private Network');
    });
  });

  describe('Session Revocation', () => {
    it('should revoke session and blacklist token', async () => {
      const session = await sessionService.createSession(
        mockUserId,
        mockTenantId,
        mockTokenJti,
        mockDeviceInfo,
        mockIpAddress,
      );

      await sessionService.revokeSession(mockUserId, session.sessionId);

      // Session should be removed
      const sessions = await sessionService.getSessions(mockUserId);
      expect(sessions.find((s) => s.id === session.sessionId)).toBeUndefined();

      // Token should be blacklisted
      const isBlacklisted =
        await sessionService.isTokenBlacklisted(mockTokenJti);
      expect(isBlacklisted).toBe(true);
    });

    it('should throw when revoking current session', async () => {
      const session = await sessionService.createSession(
        mockUserId,
        mockTenantId,
        mockTokenJti,
        mockDeviceInfo,
        mockIpAddress,
      );

      await expect(
        sessionService.revokeSession(
          mockUserId,
          session.sessionId,
          mockTokenJti,
        ),
      ).rejects.toThrow('Cannot revoke current session');
    });

    it('should throw when session not found', async () => {
      await expect(
        sessionService.revokeSession(mockUserId, 'nonexistent-session'),
      ).rejects.toThrow('Session not found');
    });
  });

  describe('Revoke All Sessions', () => {
    it('should revoke all sessions except current', async () => {
      // Create multiple sessions
      const session1 = await sessionService.createSession(
        mockUserId,
        mockTenantId,
        'jti-1',
        mockDeviceInfo,
        mockIpAddress,
      );
      await sessionService.createSession(
        mockUserId,
        mockTenantId,
        'jti-2',
        mockDeviceInfo,
        mockIpAddress,
      );
      await sessionService.createSession(
        mockUserId,
        mockTenantId,
        'jti-3',
        mockDeviceInfo,
        mockIpAddress,
      );

      const revokedCount = await sessionService.revokeAllSessions(
        mockUserId,
        'jti-1',
      );

      expect(revokedCount).toBe(2);

      // Current session should still exist
      const sessions = await sessionService.getSessions(mockUserId);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe(session1.sessionId);
    });

    it('should blacklist all revoked tokens', async () => {
      await sessionService.createSession(
        mockUserId,
        mockTenantId,
        'jti-1',
        mockDeviceInfo,
        mockIpAddress,
      );
      await sessionService.createSession(
        mockUserId,
        mockTenantId,
        'jti-2',
        mockDeviceInfo,
        mockIpAddress,
      );

      await sessionService.revokeAllSessions(mockUserId, 'jti-1');

      // jti-2 should be blacklisted
      const isBlacklisted = await sessionService.isTokenBlacklisted('jti-2');
      expect(isBlacklisted).toBe(true);

      // jti-1 (current) should not be blacklisted
      const isCurrentBlacklisted =
        await sessionService.isTokenBlacklisted('jti-1');
      expect(isCurrentBlacklisted).toBe(false);
    });
  });

  describe('Token Blacklist', () => {
    it('should blacklist token with correct TTL', async () => {
      await sessionService.blacklistToken(mockTokenJti);

      const blacklistKey = `session:blacklist:${mockTokenJti}`;
      const exists = await redisClient.exists(blacklistKey);
      expect(exists).toBe(1);

      const ttl = await redisClient.ttl(blacklistKey);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(3600);
    });

    it('should return true for blacklisted token', async () => {
      await sessionService.blacklistToken(mockTokenJti);

      const isBlacklisted =
        await sessionService.isTokenBlacklisted(mockTokenJti);
      expect(isBlacklisted).toBe(true);
    });

    it('should return false for non-blacklisted token', async () => {
      const isBlacklisted =
        await sessionService.isTokenBlacklisted('never-blacklisted');
      expect(isBlacklisted).toBe(false);
    });
  });

  describe('Session Activity Update', () => {
    it('should update lastActivity timestamp', async () => {
      const session = await sessionService.createSession(
        mockUserId,
        mockTenantId,
        mockTokenJti,
        mockDeviceInfo,
        mockIpAddress,
      );

      const originalActivity = session.lastActivity;

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 100));

      await sessionService.updateSessionActivity(mockUserId, mockTokenJti);

      const sessions = await sessionService.getSessions(mockUserId);
      const updatedSession = sessions.find((s) => s.id === session.sessionId);

      expect(
        new Date(updatedSession!.lastActive).getTime(),
      ).toBeGreaterThanOrEqual(new Date(originalActivity).getTime());
    });
  });

  describe('Session Cleanup', () => {
    it('should remove expired session references from set', async () => {
      // Create a session
      const session = await sessionService.createSession(
        mockUserId,
        mockTenantId,
        mockTokenJti,
        mockDeviceInfo,
        mockIpAddress,
      );

      // Manually delete the session data (simulating expiration)
      const sessionKey = `session:${mockUserId}:${session.sessionId}`;
      await redisClient.del(sessionKey);

      // Run cleanup
      const cleaned = await sessionService.cleanupExpiredSessions(mockUserId);

      expect(cleaned).toBe(1);

      // Session set should be empty
      const userSessionsKey = `session:user:${mockUserId}`;
      const remainingSessions = await redisClient.smembers(userSessionsKey);
      expect(remainingSessions).toHaveLength(0);
    });
  });

  describe('Find Session by JTI', () => {
    it('should find session by token JTI', async () => {
      const session = await sessionService.createSession(
        mockUserId,
        mockTenantId,
        mockTokenJti,
        mockDeviceInfo,
        mockIpAddress,
      );

      const found = await sessionService.findSessionByJti(
        mockUserId,
        mockTokenJti,
      );

      expect(found).toBeDefined();
      expect(found?.sessionId).toBe(session.sessionId);
      expect(found?.tokenJti).toBe(mockTokenJti);
    });

    it('should return null for non-existent JTI', async () => {
      await sessionService.createSession(
        mockUserId,
        mockTenantId,
        mockTokenJti,
        mockDeviceInfo,
        mockIpAddress,
      );

      const found = await sessionService.findSessionByJti(
        mockUserId,
        'different-jti',
      );

      expect(found).toBeNull();
    });
  });

  describe('Device Info Parsing', () => {
    it('should correctly parse Chrome on Windows', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

      const info = sessionService.parseDeviceInfo(ua);

      expect(info.browser).toContain('Chrome');
      expect(info.os).toContain('Windows');
      expect(info.device).toBe('Desktop');
      expect(info.isMobile).toBe(false);
    });

    it('should correctly parse Safari on iOS', () => {
      const ua =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

      const info = sessionService.parseDeviceInfo(ua);

      expect(info.device).toBe('Mobile');
      expect(info.isMobile).toBe(true);
    });

    it('should correctly parse Chrome on Android', () => {
      const ua =
        'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

      const info = sessionService.parseDeviceInfo(ua);

      expect(info.browser).toContain('Chrome');
      expect(info.os).toContain('Android');
      expect(info.device).toBe('Mobile');
      expect(info.isMobile).toBe(true);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent session creation', async () => {
      const createPromises = Array.from({ length: 5 }, (_, i) =>
        sessionService.createSession(
          mockUserId,
          mockTenantId,
          `jti-concurrent-${i}`,
          mockDeviceInfo,
          mockIpAddress,
        ),
      );

      const sessions = await Promise.all(createPromises);

      // All sessions should have unique IDs
      const sessionIds = sessions.map((s) => s.sessionId);
      const uniqueIds = new Set(sessionIds);
      expect(uniqueIds.size).toBe(5);

      // All should be retrievable
      const allSessions = await sessionService.getSessions(mockUserId);
      expect(allSessions.length).toBe(5);
    }, 10000);

    it('should handle concurrent blacklist checks', async () => {
      await sessionService.blacklistToken(mockTokenJti);

      const checkPromises = Array.from({ length: 10 }, () =>
        sessionService.isTokenBlacklisted(mockTokenJti),
      );

      const results = await Promise.all(checkPromises);

      // All checks should return true
      expect(results.every((r) => r === true)).toBe(true);
    });
  });

  describe('Session TTL', () => {
    it('should set correct TTL on session', async () => {
      const session = await sessionService.createSession(
        mockUserId,
        mockTenantId,
        mockTokenJti,
        mockDeviceInfo,
        mockIpAddress,
      );

      const sessionKey = `session:${mockUserId}:${session.sessionId}`;
      const ttl = await redisClient.ttl(sessionKey);

      // TTL should be close to configured value (3600 seconds for test)
      expect(ttl).toBeGreaterThan(3500);
      expect(ttl).toBeLessThanOrEqual(3600);
    });

    it('should set correct TTL on user sessions set', async () => {
      await sessionService.createSession(
        mockUserId,
        mockTenantId,
        mockTokenJti,
        mockDeviceInfo,
        mockIpAddress,
      );

      const userSessionsKey = `session:user:${mockUserId}`;
      const ttl = await redisClient.ttl(userSessionsKey);

      expect(ttl).toBeGreaterThan(3500);
      expect(ttl).toBeLessThanOrEqual(3600);
    });
  });
});
