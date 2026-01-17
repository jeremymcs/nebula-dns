// Nebula DNS - Session Management Service
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { RedisService } from '../redis/redis.service';

/**
 * Session data stored in Redis
 */
export interface SessionData {
  sessionId: string;
  userId: string;
  tenantId: string;
  tokenJti: string;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  createdAt: string;
  lastActivity: string;
  expiresAt: string;
}

/**
 * Device information extracted from request
 */
export interface DeviceInfo {
  userAgent: string;
  browser: string;
  os: string;
  device: string;
  isMobile: boolean;
}

/**
 * Session response for API
 */
export interface SessionResponse {
  id: string;
  device: string;
  browser: string;
  os: string;
  location: string;
  ipAddress: string;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
}

/**
 * Redis key prefixes for session management
 */
const REDIS_KEYS = {
  SESSION: 'session',
  BLACKLIST: 'session:blacklist',
  USER_SESSIONS: 'session:user',
} as const;

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly maxSessionsPerUser: number;
  private readonly sessionTtlSeconds: number;
  private readonly blacklistTtlSeconds: number;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    // Configurable session limit (default: 10)
    this.maxSessionsPerUser = this.configService.get<number>(
      'SESSION_MAX_PER_USER',
      10,
    );

    // Session TTL in seconds (default: 7 days)
    this.sessionTtlSeconds = this.configService.get<number>(
      'SESSION_TTL_SECONDS',
      7 * 24 * 60 * 60,
    );

    // Blacklist TTL should match refresh token TTL (default: 7 days)
    this.blacklistTtlSeconds = this.configService.get<number>(
      'SESSION_BLACKLIST_TTL_SECONDS',
      7 * 24 * 60 * 60,
    );
  }

  /**
   * Create a new session for a user
   * Enforces session limit by removing oldest sessions if necessary
   */
  async createSession(
    userId: string,
    tenantId: string,
    tokenJti: string,
    deviceInfo: DeviceInfo,
    ipAddress: string,
  ): Promise<SessionData> {
    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionTtlSeconds * 1000);

    const sessionData: SessionData = {
      sessionId,
      userId,
      tenantId,
      tokenJti,
      deviceInfo,
      ipAddress,
      createdAt: now.toISOString(),
      lastActivity: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    try {
      // Check current session count and enforce limit
      await this.enforceSessionLimit(userId);

      // Store session data as hash
      const sessionKey = this.getSessionKey(userId, sessionId);
      await this.redisService.set(
        sessionKey,
        JSON.stringify(sessionData),
        this.sessionTtlSeconds,
      );

      // Add session ID to user's session list
      const userSessionsKey = this.getUserSessionsKey(userId);
      const client = this.redisService.getClient();
      await client.sadd(userSessionsKey, sessionId);
      await client.expire(userSessionsKey, this.sessionTtlSeconds);

      this.logger.log(
        `Created session ${sessionId} for user ${userId} from ${ipAddress}`,
      );

      return sessionData;
    } catch (error) {
      this.logger.error(
        `Failed to create session for user ${userId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getSessions(
    userId: string,
    currentJti?: string,
  ): Promise<SessionResponse[]> {
    try {
      const userSessionsKey = this.getUserSessionsKey(userId);
      const client = this.redisService.getClient();
      const sessionIds = await client.smembers(userSessionsKey);

      if (!sessionIds || sessionIds.length === 0) {
        return [];
      }

      const sessions: SessionResponse[] = [];

      for (const sessionId of sessionIds) {
        const sessionKey = this.getSessionKey(userId, sessionId);
        const data = await this.redisService.get(sessionKey);

        if (data) {
          const session: SessionData = JSON.parse(data);

          // Skip expired sessions (cleanup will handle removal)
          if (new Date(session.expiresAt) <= new Date()) {
            continue;
          }

          sessions.push({
            id: session.sessionId,
            device: session.deviceInfo.device,
            browser: session.deviceInfo.browser,
            os: session.deviceInfo.os,
            location: await this.getLocationFromIp(session.ipAddress),
            ipAddress: session.ipAddress,
            lastActive: session.lastActivity,
            createdAt: session.createdAt,
            isCurrent: currentJti === session.tokenJti,
          });
        } else {
          // Session expired, clean up from set
          await client.srem(userSessionsKey, sessionId);
        }
      }

      // Sort by last activity (most recent first)
      sessions.sort(
        (a, b) =>
          new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime(),
      );

      return sessions;
    } catch (error) {
      this.logger.error(
        `Failed to get sessions for user ${userId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Revoke a specific session by ID
   * Also blacklists the associated token JTI
   */
  async revokeSession(
    userId: string,
    sessionId: string,
    currentJti?: string,
  ): Promise<void> {
    try {
      const sessionKey = this.getSessionKey(userId, sessionId);
      const data = await this.redisService.get(sessionKey);

      if (!data) {
        throw new NotFoundException('Session not found');
      }

      const session: SessionData = JSON.parse(data);

      // Prevent revoking current session if specified
      if (currentJti && session.tokenJti === currentJti) {
        throw new BadRequestException(
          'Cannot revoke current session. Use logout instead.',
        );
      }

      // Blacklist the token JTI
      await this.blacklistToken(session.tokenJti);

      // Remove session data
      await this.redisService.del(sessionKey);

      // Remove from user's session set
      const userSessionsKey = this.getUserSessionsKey(userId);
      const client = this.redisService.getClient();
      await client.srem(userSessionsKey, sessionId);

      this.logger.log(`Revoked session ${sessionId} for user ${userId}`);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to revoke session ${sessionId} for user ${userId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Revoke all sessions for a user except the current one
   */
  async revokeAllSessions(
    userId: string,
    currentJti?: string,
  ): Promise<number> {
    try {
      const userSessionsKey = this.getUserSessionsKey(userId);
      const client = this.redisService.getClient();
      const sessionIds = await client.smembers(userSessionsKey);

      if (!sessionIds || sessionIds.length === 0) {
        return 0;
      }

      let revokedCount = 0;

      for (const sessionId of sessionIds) {
        const sessionKey = this.getSessionKey(userId, sessionId);
        const data = await this.redisService.get(sessionKey);

        if (data) {
          const session: SessionData = JSON.parse(data);

          // Skip current session if JTI provided
          if (currentJti && session.tokenJti === currentJti) {
            continue;
          }

          // Blacklist the token JTI
          await this.blacklistToken(session.tokenJti);

          // Remove session data
          await this.redisService.del(sessionKey);
          await client.srem(userSessionsKey, sessionId);
          revokedCount++;
        }
      }

      this.logger.log(
        `Revoked ${revokedCount} sessions for user ${userId} (kept current: ${!!currentJti})`,
      );

      return revokedCount;
    } catch (error) {
      this.logger.error(
        `Failed to revoke all sessions for user ${userId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Check if a token JTI is blacklisted
   */
  async isTokenBlacklisted(jti: string): Promise<boolean> {
    try {
      const blacklistKey = this.getBlacklistKey(jti);
      const result = await this.redisService.get(blacklistKey);
      return result !== null;
    } catch (error) {
      // Fail open - if Redis is unavailable, allow the token
      this.logger.warn(
        `Failed to check token blacklist: ${(error as Error).message}. Allowing token.`,
      );
      return false;
    }
  }

  /**
   * Blacklist a token JTI
   */
  async blacklistToken(jti: string): Promise<void> {
    try {
      const blacklistKey = this.getBlacklistKey(jti);
      await this.redisService.set(
        blacklistKey,
        new Date().toISOString(),
        this.blacklistTtlSeconds,
      );
      this.logger.debug(`Blacklisted token JTI: ${jti}`);
    } catch (error) {
      this.logger.error(
        `Failed to blacklist token: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Update session's last activity timestamp
   */
  async updateSessionActivity(userId: string, jti: string): Promise<void> {
    try {
      // Find session by JTI
      const session = await this.findSessionByJti(userId, jti);
      if (!session) {
        return; // Session not found, nothing to update
      }

      session.lastActivity = new Date().toISOString();

      const sessionKey = this.getSessionKey(userId, session.sessionId);
      const ttl = Math.max(
        0,
        Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000),
      );

      if (ttl > 0) {
        await this.redisService.set(sessionKey, JSON.stringify(session), ttl);
      }
    } catch (error) {
      // Non-critical operation, just log
      this.logger.debug(
        `Failed to update session activity: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Get session by token JTI
   */
  async findSessionByJti(
    userId: string,
    jti: string,
  ): Promise<SessionData | null> {
    try {
      const userSessionsKey = this.getUserSessionsKey(userId);
      const client = this.redisService.getClient();
      const sessionIds = await client.smembers(userSessionsKey);

      for (const sessionId of sessionIds) {
        const sessionKey = this.getSessionKey(userId, sessionId);
        const data = await this.redisService.get(sessionKey);

        if (data) {
          const session: SessionData = JSON.parse(data);
          if (session.tokenJti === jti) {
            return session;
          }
        }
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Failed to find session by JTI: ${(error as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Clean up expired sessions for a user
   */
  async cleanupExpiredSessions(userId: string): Promise<number> {
    try {
      const userSessionsKey = this.getUserSessionsKey(userId);
      const client = this.redisService.getClient();
      const sessionIds = await client.smembers(userSessionsKey);

      let cleanedCount = 0;

      for (const sessionId of sessionIds) {
        const sessionKey = this.getSessionKey(userId, sessionId);
        const data = await this.redisService.get(sessionKey);

        if (!data) {
          // Session expired, remove from set
          await client.srem(userSessionsKey, sessionId);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.debug(
          `Cleaned up ${cleanedCount} expired sessions for user ${userId}`,
        );
      }

      return cleanedCount;
    } catch (error) {
      this.logger.error(
        `Failed to cleanup expired sessions: ${(error as Error).message}`,
      );
      return 0;
    }
  }

  /**
   * Parse device info from user agent string
   */
  parseDeviceInfo(userAgent: string): DeviceInfo {
    const ua = userAgent || 'Unknown';

    // Simple user agent parsing
    const browserMatch = ua.match(
      /(Chrome|Firefox|Safari|Edge|Opera|MSIE|Trident)[\/\s]?([\d.]+)?/i,
    );
    const mobileMatch = ua.match(/Mobile|Android|iPhone|iPad|iPod/i);

    let browser = 'Unknown';
    if (browserMatch) {
      browser = browserMatch[1];
      if (browserMatch[2]) {
        browser += ` ${browserMatch[2].split('.')[0]}`;
      }
    }

    // OS detection - check Android first since it contains "Linux"
    let os = 'Unknown';
    if (ua.includes('Android')) {
      const androidMatch = ua.match(/Android[\s]?([\d.]+)?/i);
      os = 'Android';
      if (androidMatch && androidMatch[1]) {
        os += ` ${androidMatch[1].split('.').slice(0, 2).join('.')}`;
      }
    } else if (
      ua.includes('iPhone') ||
      ua.includes('iPad') ||
      ua.includes('iOS')
    ) {
      const iosMatch = ua.match(/(?:iPhone|iPad|CPU) OS ([\d_]+)/i);
      os = ua.includes('iPad') ? 'iPadOS' : 'iOS';
      if (iosMatch && iosMatch[1]) {
        os += ` ${iosMatch[1].replace(/_/g, '.').split('.').slice(0, 2).join('.')}`;
      }
    } else if (ua.includes('Mac OS X')) {
      const macMatch = ua.match(/Mac OS X ([\d._]+)/i);
      os = 'Mac OS X';
      if (macMatch && macMatch[1]) {
        os += ` ${macMatch[1].replace(/_/g, '.').split('.').slice(0, 2).join('.')}`;
      }
    } else if (ua.includes('Windows')) {
      const winMatch = ua.match(/Windows NT ([\d.]+)/i);
      os = 'Windows';
      if (winMatch && winMatch[1]) {
        // Map NT version to Windows version
        const ntVersionMap: Record<string, string> = {
          '10.0': '10',
          '6.3': '8.1',
          '6.2': '8',
          '6.1': '7',
        };
        const version = ntVersionMap[winMatch[1]] || winMatch[1];
        os += ` ${version}`;
      }
    } else if (ua.includes('Linux')) {
      os = 'Linux';
    }

    const isMobile = !!mobileMatch;
    const device = isMobile ? 'Mobile' : 'Desktop';

    return {
      userAgent: ua.substring(0, 500), // Limit stored user agent
      browser,
      os,
      device,
      isMobile,
    };
  }

  /**
   * Enforce session limit by removing oldest sessions
   */
  private async enforceSessionLimit(userId: string): Promise<void> {
    try {
      const sessions = await this.getSessions(userId);

      if (sessions.length >= this.maxSessionsPerUser) {
        // Sort by last active (oldest first) and remove excess
        const sortedSessions = [...sessions].sort(
          (a, b) =>
            new Date(a.lastActive).getTime() - new Date(b.lastActive).getTime(),
        );

        const sessionsToRemove = sortedSessions.slice(
          0,
          sessions.length - this.maxSessionsPerUser + 1,
        );

        for (const session of sessionsToRemove) {
          await this.revokeSession(userId, session.id);
          this.logger.log(
            `Removed oldest session ${session.id} to enforce limit for user ${userId}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to enforce session limit: ${(error as Error).message}`,
      );
      // Don't block session creation on limit enforcement failure
    }
  }

  /**
   * Get location from IP address
   * In production, this would use a GeoIP service
   */
  private async getLocationFromIp(ipAddress: string): Promise<string> {
    // Placeholder - in production, use MaxMind GeoIP or similar
    if (ipAddress === '127.0.0.1' || ipAddress === '::1') {
      return 'Localhost';
    }

    if (ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.')) {
      return 'Private Network';
    }

    // Default for unknown locations
    return 'Unknown';
  }

  /**
   * Get Redis key for a session
   */
  private getSessionKey(userId: string, sessionId: string): string {
    return `${REDIS_KEYS.SESSION}:${userId}:${sessionId}`;
  }

  /**
   * Get Redis key for user's session set
   */
  private getUserSessionsKey(userId: string): string {
    return `${REDIS_KEYS.USER_SESSIONS}:${userId}`;
  }

  /**
   * Get Redis key for blacklisted token
   */
  private getBlacklistKey(jti: string): string {
    return `${REDIS_KEYS.BLACKLIST}:${jti}`;
  }
}
