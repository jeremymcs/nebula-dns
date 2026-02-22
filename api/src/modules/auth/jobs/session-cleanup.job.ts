// Nebula DNS - Session Cleanup Cron Job
// Hourly job to clean up expired sessions from Redis (US-001)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionService } from '../session.service';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class SessionCleanupJob {
  private readonly logger = new Logger(SessionCleanupJob.name);

  constructor(
    private readonly sessionService: SessionService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Run hourly to clean up expired sessions
   * This job iterates through users who have logged in recently and
   * removes any expired session references from Redis sets
   */
  @Cron('0 * * * *', {
    name: 'session-cleanup',
    timeZone: 'UTC',
  })
  async handleCron(): Promise<void> {
    this.logger.log('Starting session cleanup job');
    const startTime = Date.now();

    try {
      const result = await this.cleanupAllExpiredSessions();

      const duration = Date.now() - startTime;
      this.logger.log(
        `Session cleanup completed in ${duration}ms. ` +
          `Processed ${result.usersProcessed} users, ` +
          `cleaned ${result.sessionsRemoved} expired session references`,
      );
    } catch (error) {
      this.logger.error('Session cleanup job failed', error);
    }
  }

  /**
   * Clean up expired sessions for all recently active users
   * Only checks users who have logged in within the session TTL period
   */
  async cleanupAllExpiredSessions(): Promise<{
    usersProcessed: number;
    sessionsRemoved: number;
  }> {
    // Get users who have logged in within the last 7 days (default session TTL)
    const sessionTtlDays = 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - sessionTtlDays);

    const recentlyActiveUsers = await this.userRepository
      .createQueryBuilder('user')
      .select(['user.id'])
      .where('user.lastLoginAt > :cutoffDate', { cutoffDate })
      .getMany();

    let totalCleaned = 0;

    for (const user of recentlyActiveUsers) {
      try {
        const cleaned = await this.sessionService.cleanupExpiredSessions(
          user.id,
        );
        totalCleaned += cleaned;
      } catch (error) {
        this.logger.warn(
          `Failed to cleanup sessions for user ${user.id}: ${(error as Error).message}`,
        );
      }
    }

    return {
      usersProcessed: recentlyActiveUsers.length,
      sessionsRemoved: totalCleaned,
    };
  }

  /**
   * Manual trigger for testing or admin operations
   */
  async runManually(): Promise<{
    usersProcessed: number;
    sessionsRemoved: number;
  }> {
    this.logger.log('Manually triggering session cleanup');
    return this.cleanupAllExpiredSessions();
  }
}
