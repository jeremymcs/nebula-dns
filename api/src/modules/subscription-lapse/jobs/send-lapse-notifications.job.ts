// Nebula DNS - Send Lapse Notifications Job
// Job to send daily reminders to MSPs during grace period (US-028)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { EmailService } from '../../email/email.service';
import { RedisService } from '../../redis/redis.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SendLapseNotificationsJob {
  private readonly logger = new Logger(SendLapseNotificationsJob.name);
  private readonly GRACE_PERIOD_DAYS = 30;

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly emailService: EmailService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Run daily at 9 AM to send reminder emails to MSPs in grace period
   * This ensures MSPs receive daily reminders during the grace period
   */
  @Cron('0 9 * * *', {
    name: 'send-lapse-notifications',
    timeZone: 'UTC',
  })
  async handleCron(): Promise<void> {
    this.logger.log('Starting daily lapse notification job');
    const startTime = Date.now();

    try {
      // Find all MSP tenants in grace period
      const mspTenantsInGrace = await this.tenantRepository.find({
        where: {
          tier: 'msp',
          subscriptionStatus: 'grace',
        },
      });

      let notificationsSent = 0;

      for (const mspTenant of mspTenantsInGrace) {
        const daysRemaining = await this.calculateDaysRemaining(mspTenant.id);
        if (daysRemaining === null) {
          continue;
        }

        // Send daily reminder to MSP
        if (mspTenant.contactEmail) {
          await this.sendMspDailyReminder(mspTenant, daysRemaining);
          notificationsSent++;
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Lapse notification job completed in ${duration}ms, sent ${notificationsSent} notifications`,
      );
    } catch (error) {
      this.logger.error('Lapse notification job failed', error);
    }
  }

  private async calculateDaysRemaining(
    tenantId: string,
  ): Promise<number | null> {
    const graceStartStr = await this.redisService.get(
      `grace_start:${tenantId}`,
    );
    if (!graceStartStr) {
      return null;
    }

    const graceStartDate = new Date(graceStartStr);
    const endDate = new Date(graceStartDate);
    endDate.setDate(endDate.getDate() + this.GRACE_PERIOD_DAYS);

    const daysRemaining = Math.max(
      0,
      Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    );

    return daysRemaining;
  }

  private async sendMspDailyReminder(
    mspTenant: Tenant,
    daysRemaining: number,
  ): Promise<void> {
    if (!mspTenant.contactEmail) {
      return;
    }

    const frontendUrl =
      this.configService.get('FRONTEND_URL') || 'http://localhost:4001';

    // Get client count for context
    const clientCount = await this.tenantRepository.count({
      where: { managedByMspId: mspTenant.id },
    });

    await this.emailService.sendGracePeriodDailyReminder({
      to: mspTenant.contactEmail,
      companyName: mspTenant.name,
      daysRemaining,
      clientCount,
      updatePaymentUrl: `${frontendUrl}/dashboard/billing`,
    });

    this.logger.debug(
      `Sent daily reminder to MSP ${mspTenant.id}, ${daysRemaining} days remaining`,
    );
  }

  /**
   * Manual trigger for testing or admin operations
   */
  async runManually(): Promise<void> {
    this.logger.log('Manually triggering lapse notification job');
    await this.handleCron();
  }
}
