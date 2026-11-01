import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ShieldCaService } from './shield-ca.service';

@Injectable()
export class ShieldCaRotationAlertsJob {
  private readonly logger = new Logger(ShieldCaRotationAlertsJob.name);

  constructor(private readonly shieldCaService: ShieldCaService) {}

  /** Daily check for intermediates expiring within 30 days */
  @Cron('0 9 * * *', { timeZone: 'UTC' })
  async handleDailyRotationAlerts(): Promise<void> {
    try {
      const sent = await this.shieldCaService.sendRotationAlertEmails();
      if (sent > 0) {
        this.logger.log(`Sent ${sent} Shield CA rotation alert(s)`);
      }
    } catch (err) {
      this.logger.error('Shield CA rotation alert job failed', err);
    }
  }
}
