// Nebula DNS - Admin Session Management Service
// Redis-backed session tracking for admin authentication
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
 * Admin session data stored in Redis
 * Uses 'admin:' prefix to isolate from tenant sessions
 */
export interface AdminSessionData {
  sessionId: string;
  adminId: string;
  tokenJti: string;
  deviceInfo: AdminDeviceInfo;
  ipAddress: string;
  createdAt: string;
  lastActivity: string;
  expiresAt: string;
}

/**
 * Device information extracted from request
 */
export interface AdminDeviceInfo {
  userAgent: string;
  browser: string;
  os: string;
  device: string;
  isMobile: boolean;
}

/**
 * Session response for API
 */
export interface AdminSessionResponse {
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
 * Redis key prefixes for admin session management
 * Completely isolated from tenant session keys
 */
const ADMIN_REDIS_KEYS = {
  SESSION: 'admin:session',
  BLACKLIST: 'admin:session:blacklist',
  ADMIN_SESSIONS: 'admin:session:admin',
} as const;

/**
 * Admin Session Service
 *
 * Manages admin authentication sessions in Redis with complete isolation
 * from tenant sessions. Features:
 * - Separate 'admin:' key prefix
 * - 8-hour session TTL (configurable)
 * - Max 5 sessions per admin (configurable)
 * - Token blacklisting for logout/revocation
 */
@Injectable()
export class AdminSessionService {
  private readonly logger = new Logger(AdminSessionService.name);
  private readonly maxSessionsPerAdmin: number;
  private readonly sessionTtlSeconds: number;
  private readonly blacklistTtlSeconds: number;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    // Admin-specific session limit (default: 5)
    this.maxSessionsPerAdmin = this.configService.get<number>(
      'ADMIN_MAX_SESSIONS',
      5,
    );

    // Admin session TTL in seconds (default: 8 hours for workday)
    this.sessionTtlSeconds = this.configService.get<number>(
      'ADMIN_SESSION_TTL_SECONDS',
      8 * 60 * 60, // 28800 seconds = 8 hours
    );

    // Blacklist TTL should match token TTL (default: 8 hours)
    this.blacklistTtlSeconds = this.configService.get<number>(
      'ADMIN_BLACKLIST_TTL_SECONDS',
      8 * 60 * 60,
    );
  }

  /**
   * Create a new session for an admin
   * Enforces session limit by removing oldest sessions if necessary
   */
  async createSession(
    adminId: string,
    tokenJti: string,
    deviceInfo: AdminDeviceInfo,
    ipAddress: string,
  ): Promise<AdminSessionData> {
    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionTtlSeconds * 1000);

    const sessionData: AdminSessionData = {
      sessionId,
      adminId,
      tokenJti,
      deviceInfo,
      ipAddress,
      createdAt: now.toISOString(),
      lastActivity: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    try {
      // Check current session count and enforce limit
      await this.enforceSessionLimit(adminId);

      // Store session data
      const sessionKey = this.getSessionKey(adminId, sessionId);
      await this.redisService.set(
        sessionKey,
        JSON.stringify(sessionData),
        this.sessionTtlSeconds,
      );

      // Add session ID to admin's session list
      const adminSessionsKey = this.getAdminSessionsKey(adminId);
      const client = this.redisService.getClient();
      await client.sadd(adminSessionsKey, sessionId);
      await client.expire(adminSessionsKey, this.sessionTtlSeconds);

      this.logger.log(
        `Created admin session ${sessionId} for admin ${adminId} from ${ipAddress}`,
      );

      return sessionData;
    } catch (error) {
      this.logger.error(
        `Failed to create admin session for admin ${adminId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Get all active sessions for an admin
   */
  async getSessions(
    adminId: string,
    currentJti?: string,
  ): Promise<AdminSessionResponse[]> {
    try {
      const adminSessionsKey = this.getAdminSessionsKey(adminId);
      const client = this.redisService.getClient();
      const sessionIds = await client.smembers(adminSessionsKey);

      if (!sessionIds || sessionIds.length === 0) {
        return [];
      }

      const sessions: AdminSessionResponse[] = [];

      for (const sessionId of sessionIds) {
        const sessionKey = this.getSessionKey(adminId, sessionId);
        const data = await this.redisService.get(sessionKey);

        if (data) {
          const session: AdminSessionData = JSON.parse(data);

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
          await client.srem(adminSessionsKey, sessionId);
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
        `Failed to get sessions for admin ${adminId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Revoke a specific session by ID
   * Also blacklists the associated token JTI
   */
  async revokeSession(
    adminId: string,
    sessionId: string,
    currentJti?: string,
  ): Promise<void> {
    try {
      const sessionKey = this.getSessionKey(adminId, sessionId);
      const data = await this.redisService.get(sessionKey);

      if (!data) {
        throw new NotFoundException('Session not found');
      }

      const session: AdminSessionData = JSON.parse(data);

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

      // Remove from admin's session set
      const adminSessionsKey = this.getAdminSessionsKey(adminId);
      const client = this.redisService.getClient();
      await client.srem(adminSessionsKey, sessionId);

      this.logger.log(
        `Revoked admin session ${sessionId} for admin ${adminId}`,
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to revoke session ${sessionId} for admin ${adminId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Revoke all sessions for an admin except the current one
   */
  async revokeAllSessions(
    adminId: string,
    currentJti?: string,
  ): Promise<number> {
    try {
      const adminSessionsKey = this.getAdminSessionsKey(adminId);
      const client = this.redisService.getClient();
      const sessionIds = await client.smembers(adminSessionsKey);

      if (!sessionIds || sessionIds.length === 0) {
        return 0;
      }

      let revokedCount = 0;

      for (const sessionId of sessionIds) {
        const sessionKey = this.getSessionKey(adminId, sessionId);
        const data = await this.redisService.get(sessionKey);

        if (data) {
          const session: AdminSessionData = JSON.parse(data);

          // Skip current session if JTI provided
          if (currentJti && session.tokenJti === currentJti) {
            continue;
          }

          // Blacklist the token JTI
          await this.blacklistToken(session.tokenJti);

          // Remove session data
          await this.redisService.del(sessionKey);
          await client.srem(adminSessionsKey, sessionId);
          revokedCount++;
        }
      }

      this.logger.log(
        `Revoked ${revokedCount} sessions for admin ${adminId} (kept current: ${!!currentJti})`,
      );

      return revokedCount;
    } catch (error) {
      this.logger.error(
        `Failed to revoke all sessions for admin ${adminId}: ${(error as Error).message}`,
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
        `Failed to check admin token blacklist: ${(error as Error).message}. Allowing token.`,
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
      this.logger.debug(`Blacklisted admin token JTI: ${jti}`);
    } catch (error) {
      this.logger.error(
        `Failed to blacklist admin token: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Update session's last activity timestamp
   */
  async updateSessionActivity(adminId: string, jti: string): Promise<void> {
    try {
      // Find session by JTI
      const session = await this.findSessionByJti(adminId, jti);
      if (!session) {
        return; // Session not found, nothing to update
      }

      session.lastActivity = new Date().toISOString();

      const sessionKey = this.getSessionKey(adminId, session.sessionId);
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
        `Failed to update admin session activity: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Get session by token JTI
   */
  async findSessionByJti(
    adminId: string,
    jti: string,
  ): Promise<AdminSessionData | null> {
    try {
      const adminSessionsKey = this.getAdminSessionsKey(adminId);
      const client = this.redisService.getClient();
      const sessionIds = await client.smembers(adminSessionsKey);

      for (const sessionId of sessionIds) {
        const sessionKey = this.getSessionKey(adminId, sessionId);
        const data = await this.redisService.get(sessionKey);

        if (data) {
          const session: AdminSessionData = JSON.parse(data);
          if (session.tokenJti === jti) {
            return session;
          }
        }
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Failed to find admin session by JTI: ${(error as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Parse device info from user agent string
   */
  parseDeviceInfo(userAgent: string): AdminDeviceInfo {
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

    // OS detection
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
  private async enforceSessionLimit(adminId: string): Promise<void> {
    try {
      const sessions = await this.getSessions(adminId);

      if (sessions.length >= this.maxSessionsPerAdmin) {
        // Sort by last active (oldest first) and remove excess
        const sortedSessions = [...sessions].sort(
          (a, b) =>
            new Date(a.lastActive).getTime() - new Date(b.lastActive).getTime(),
        );

        const sessionsToRemove = sortedSessions.slice(
          0,
          sessions.length - this.maxSessionsPerAdmin + 1,
        );

        for (const session of sessionsToRemove) {
          await this.revokeSession(adminId, session.id);
          this.logger.log(
            `Removed oldest admin session ${session.id} to enforce limit for admin ${adminId}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to enforce admin session limit: ${(error as Error).message}`,
      );
      // Don't block session creation on limit enforcement failure
    }
  }

  /**
   * Get location from IP address
   * In production, this would use a GeoIP service
   */
  private async getLocationFromIp(ipAddress: string): Promise<string> {
    if (ipAddress === '127.0.0.1' || ipAddress === '::1') {
      return 'Localhost';
    }

    if (ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.')) {
      return 'Private Network';
    }

    return 'Unknown';
  }

  /**
   * Get Redis key for a session
   * Format: admin:session:{admin_id}:{session_id}
   */
  private getSessionKey(adminId: string, sessionId: string): string {
    return `${ADMIN_REDIS_KEYS.SESSION}:${adminId}:${sessionId}`;
  }

  /**
   * Get Redis key for admin's session set
   * Format: admin:session:admin:{admin_id}
   */
  private getAdminSessionsKey(adminId: string): string {
    return `${ADMIN_REDIS_KEYS.ADMIN_SESSIONS}:${adminId}`;
  }

  /**
   * Get Redis key for blacklisted token
   * Format: admin:session:blacklist:{jti}
   */
  private getBlacklistKey(jti: string): string {
    return `${ADMIN_REDIS_KEYS.BLACKLIST}:${jti}`;
  }
}
