// Nebula DNS - Grace Period Check Cron Job
// Daily job to check and process MSP subscription grace periods (US-028)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionLapseService } from '../subscription-lapse.service';

@Injectable()
export class GracePeriodCheckJob {
  private readonly logger = new Logger(GracePeriodCheckJob.name);

  constructor(
    private readonly subscriptionLapseService: SubscriptionLapseService,
  ) {}

  /**
   * Run daily at 2 AM to check for expired grace periods
   * This job:
   * 1. Finds all MSP tenants in grace period
   * 2. Checks if grace period has expired (30 days)
   * 3. Suspends MSP and all client tenants if expired
   * 4. Sends appropriate notifications at day 1, 7, 14, 21, 28
   */
  @Cron('0 2 * * *', {
    name: 'grace-period-check',
    timeZone: 'UTC',
  })
  async handleCron(): Promise<void> {
    this.logger.log('Starting grace period check job');
    const startTime = Date.now();

    try {
      await this.subscriptionLapseService.processExpiredGracePeriods();

      const duration = Date.now() - startTime;
      this.logger.log(`Grace period check completed in ${duration}ms`);
    } catch (error) {
      this.logger.error('Grace period check job failed', error);
    }
  }

  /**
   * Manual trigger for testing or admin operations
   */
  async runManually(): Promise<void> {
    this.logger.log('Manually triggering grace period check');
    await this.handleCron();
  }
}
