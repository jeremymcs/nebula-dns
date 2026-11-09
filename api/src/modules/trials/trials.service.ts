// Nebula DNS - Trials Service
// Handles tier upgrade trials and conversions (US-032, US-033)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TrialHistory, TrialStatus } from './entities/trial-history.entity';
import { Tenant, TenantTier } from '../tenants/entities/tenant.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { EmailService } from '../email/email.service';
import { PaymentsService } from '../payments/payments.service';
import {
  StartTrialDto,
  ConvertTrialDto,
  TrialStatusResponseDto,
  TrialHistoryItemDto,
  StartTrialResponseDto,
  ConvertTrialResponseDto,
} from './dto/trial.dto';

// Trial duration in days
const TRIAL_DURATION_DAYS = 14;
// Days before trial ends to send warning email
const WARNING_EMAIL_DAYS = 3;

// Tier hierarchy for upgrade validation
const TIER_HIERARCHY: Record<TenantTier, number> = {
  home: 1,
  enterprise: 2,
  msp: 3,
};

// Map tiers to plan codes for Stripe
const TIER_TO_PLAN_CODE: Record<TenantTier, string> = {
  home: 'free',
  enterprise: 'pro',
  msp: 'enterprise',
};

@Injectable()
export class TrialsService {
  private readonly logger = new Logger(TrialsService.name);
  private readonly frontendUrl: string;

  constructor(
    @InjectRepository(TrialHistory)
    private trialHistoryRepository: Repository<TrialHistory>,
    @InjectRepository(Tenant)
    private tenantsRepository: Repository<Tenant>,
    @InjectRepository(Subscription)
    private subscriptionsRepository: Repository<Subscription>,
    private configService: ConfigService,
    private emailService: EmailService,
    private paymentsService: PaymentsService,
  ) {
    this.frontendUrl =
      this.configService.get('FRONTEND_URL') || 'http://localhost:4011';
  }

  /**
   * Get current trial status for a tenant
   */
  async getTrialStatus(tenantId: string): Promise<TrialStatusResponseDto> {
    const tenant = await this.tenantsRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check for active trial
    const activeTrial = await this.trialHistoryRepository.findOne({
      where: {
        tenantId,
        status: 'active',
      },
    });

    // Get all past trials to determine available tiers
    const pastTrials = await this.trialHistoryRepository.find({
      where: { tenantId },
      select: ['trialTier'],
    });

    const trialedTiers = new Set(pastTrials.map((t) => t.trialTier));

    // Determine available trials (tiers not yet trialed that are upgrades)
    const allTiers: TenantTier[] = ['home', 'enterprise', 'msp'];
    const availableTrials = allTiers.filter((tier) => {
      // Can't trial current tier
      if (tier === tenant.tier) return false;
      // Can't trial if already trialed
      if (trialedTiers.has(tier)) return false;
      // Can only trial higher tiers
      if (TIER_HIERARCHY[tier] <= TIER_HIERARCHY[tenant.tier]) return false;
      return true;
    });

    if (!activeTrial) {
      return {
        hasActiveTrial: false,
        availableTrials,
      };
    }

    const now = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil(
        (activeTrial.endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );

    return {
      hasActiveTrial: true,
      trialTier: activeTrial.trialTier,
      originalTier: activeTrial.originalTier,
      startedAt: activeTrial.startedAt,
      endsAt: activeTrial.endsAt,
      daysRemaining,
      status: activeTrial.status,
      availableTrials: [], // No trials available during active trial
    };
  }

  /**
   * Start a trial for a higher tier
   */
  async startTrial(
    tenantId: string,
    dto: StartTrialDto,
  ): Promise<StartTrialResponseDto> {
    const tenant = await this.tenantsRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Validate tier is an upgrade
    if (TIER_HIERARCHY[dto.tier] <= TIER_HIERARCHY[tenant.tier]) {
      throw new BadRequestException(
        `Cannot trial ${dto.tier} tier - must be a higher tier than current (${tenant.tier})`,
      );
    }

    // Check for existing active trial
    const existingActiveTrial = await this.trialHistoryRepository.findOne({
      where: {
        tenantId,
        status: 'active',
      },
    });

    if (existingActiveTrial) {
      throw new BadRequestException(
        'Already have an active trial. Please complete or cancel current trial first.',
      );
    }

    // Check if this tier was already trialed (one trial per tier per tenant)
    const previousTrial = await this.trialHistoryRepository.findOne({
      where: {
        tenantId,
        trialTier: dto.tier,
      },
    });

    if (previousTrial) {
      throw new BadRequestException(
        `Already used trial for ${dto.tier} tier. Each tier can only be trialed once.`,
      );
    }

    // Calculate trial period
    const now = new Date();
    const endsAt = new Date(
      now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000,
    );

    // Create trial history record
    const trial = this.trialHistoryRepository.create({
      tenantId,
      trialTier: dto.tier,
      originalTier: tenant.tier,
      startedAt: now,
      endsAt,
      status: 'active',
      metadata: {
        billingCycle: dto.billingCycle,
      },
    });

    await this.trialHistoryRepository.save(trial);

    // Upgrade tenant tier for trial period
    tenant.tier = dto.tier;
    await this.tenantsRepository.save(tenant);

    // Send trial started email
    await this.sendTrialStartedEmail(tenant, dto.tier, endsAt);

    this.logger.log(
      `Trial started for tenant ${tenantId}: ${tenant.tier} -> ${dto.tier} for ${TRIAL_DURATION_DAYS} days`,
    );

    return {
      success: true,
      trialTier: dto.tier,
      endsAt,
      trialDays: TRIAL_DURATION_DAYS,
      message: `Your ${TRIAL_DURATION_DAYS}-day ${dto.tier} trial has started!`,
    };
  }

  /**
   * Convert active trial to paid subscription
   */
  async convertTrial(
    tenantId: string,
    userId: string,
    userEmail: string,
    dto: ConvertTrialDto,
  ): Promise<ConvertTrialResponseDto> {
    const activeTrial = await this.trialHistoryRepository.findOne({
      where: {
        tenantId,
        status: 'active',
      },
    });

    if (!activeTrial) {
      throw new BadRequestException('No active trial to convert');
    }

    const tenant = await this.tenantsRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Get the plan code for this tier
    const planCode = TIER_TO_PLAN_CODE[activeTrial.trialTier];
    const billingCycle = dto.billingCycle || 'monthly';

    // Check if Stripe is configured
    if (!this.paymentsService.isConfigured()) {
      // Development mode - just convert without payment
      await this.completeConversion(tenantId, userId);
      return {
        success: true,
        message: `Converted to ${activeTrial.trialTier} tier (development mode)`,
      };
    }

    // Create Stripe checkout session for payment
    try {
      const { sessionId, url } =
        await this.paymentsService.createCheckoutSession({
          planCode,
          billingCycle,
          email: userEmail,
          tenantId,
          successUrl: `${this.frontendUrl}/dashboard/settings?payment=success&trial_conversion=true`,
          cancelUrl: `${this.frontendUrl}/dashboard/settings?payment=cancelled`,
        });

      this.logger.log(
        `Trial conversion checkout created for tenant ${tenantId}, session: ${sessionId}`,
      );

      return {
        success: true,
        checkoutUrl: url,
        sessionId,
        message: 'Redirecting to payment...',
      };
    } catch (error) {
      this.logger.error(
        `Failed to create checkout session for trial conversion: ${error}`,
      );
      throw new BadRequestException('Failed to create payment session');
    }
  }

  /**
   * Complete trial conversion after successful payment
   */
  async completeConversion(tenantId: string, userId?: string): Promise<void> {
    const activeTrial = await this.trialHistoryRepository.findOne({
      where: {
        tenantId,
        status: 'active',
      },
    });

    if (!activeTrial) {
      this.logger.warn(`No active trial found for conversion: ${tenantId}`);
      return;
    }

    const now = new Date();

    // Update trial record
    activeTrial.status = 'converted';
    activeTrial.convertedAt = now;
    activeTrial.endedAt = now;
    if (userId) {
      activeTrial.metadata = {
        ...activeTrial.metadata,
        convertedByUserId: userId,
      };
    }

    await this.trialHistoryRepository.save(activeTrial);

    // Tenant tier is already set to trial tier, so just need to update subscription
    const subscription = await this.subscriptionsRepository.findOne({
      where: { tenantId },
    });

    if (subscription) {
      subscription.status = 'active';
      subscription.planId = TIER_TO_PLAN_CODE[activeTrial.trialTier];
      await this.subscriptionsRepository.save(subscription);
    }

    // Send conversion confirmation email
    const tenant = await this.tenantsRepository.findOne({
      where: { id: tenantId },
    });

    if (tenant) {
      await this.sendConversionConfirmationEmail(tenant, activeTrial.trialTier);
    }

    this.logger.log(
      `Trial converted to paid for tenant ${tenantId}: ${activeTrial.trialTier}`,
    );
  }

  /**
   * Get trial history for a tenant
   */
  async getTrialHistory(tenantId: string): Promise<TrialHistoryItemDto[]> {
    const trials = await this.trialHistoryRepository.find({
      where: { tenantId },
      order: { startedAt: 'DESC' },
    });

    return trials.map((trial) => ({
      id: trial.id,
      trialTier: trial.trialTier,
      originalTier: trial.originalTier,
      startedAt: trial.startedAt,
      endsAt: trial.endsAt,
      status: trial.status,
      endedAt: trial.endedAt,
      convertedAt: trial.convertedAt,
    }));
  }

  /**
   * Cancel an active trial (returns to original tier)
   */
  async cancelTrial(tenantId: string, reason?: string): Promise<void> {
    const activeTrial = await this.trialHistoryRepository.findOne({
      where: {
        tenantId,
        status: 'active',
      },
    });

    if (!activeTrial) {
      throw new BadRequestException('No active trial to cancel');
    }

    const tenant = await this.tenantsRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const now = new Date();

    // Update trial record
    activeTrial.status = 'cancelled';
    activeTrial.endedAt = now;
    if (reason) {
      activeTrial.metadata = {
        ...activeTrial.metadata,
        cancellationReason: reason,
      };
    }

    await this.trialHistoryRepository.save(activeTrial);

    // Revert tenant to original tier
    tenant.tier = activeTrial.originalTier;
    await this.tenantsRepository.save(tenant);

    this.logger.log(
      `Trial cancelled for tenant ${tenantId}, reverted to ${activeTrial.originalTier}`,
    );
  }

  /**
   * Handle Stripe webhook for trial conversion completion
   */
  async handleTrialConversionPayment(
    tenantId: string,
    stripeSubscriptionId: string,
  ): Promise<void> {
    const activeTrial = await this.trialHistoryRepository.findOne({
      where: {
        tenantId,
        status: 'active',
      },
    });

    if (activeTrial) {
      activeTrial.stripeSubscriptionId = stripeSubscriptionId;
      await this.trialHistoryRepository.save(activeTrial);
      await this.completeConversion(tenantId);
    }
  }

  /**
   * Scheduled job: Check for expiring trials and send warning emails
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkExpiringTrials(): Promise<void> {
    const warningThreshold = new Date(
      Date.now() + WARNING_EMAIL_DAYS * 24 * 60 * 60 * 1000,
    );

    // Find trials ending within warning period that haven't received warning email
    const expiringTrials = await this.trialHistoryRepository.find({
      where: {
        status: 'active',
        endsAt: LessThan(warningThreshold),
        warningEmailSent: false,
      },
    });

    for (const trial of expiringTrials) {
      const tenant = await this.tenantsRepository.findOne({
        where: { id: trial.tenantId },
      });

      if (tenant) {
        await this.sendTrialExpiringEmail(tenant, trial);

        trial.warningEmailSent = true;
        await this.trialHistoryRepository.save(trial);

        this.logger.log(
          `Sent trial expiring warning email for tenant ${trial.tenantId}`,
        );
      }
    }
  }

  /**
   * Scheduled job: Handle expired trials
   * Runs every 15 minutes
   */
  @Cron('*/15 * * * *')
  async handleExpiredTrials(): Promise<void> {
    const now = new Date();

    // Find expired active trials
    const expiredTrials = await this.trialHistoryRepository.find({
      where: {
        status: 'active',
        endsAt: LessThan(now),
      },
    });

    for (const trial of expiredTrials) {
      const tenant = await this.tenantsRepository.findOne({
        where: { id: trial.tenantId },
      });

      if (!tenant) continue;

      // Update trial status
      trial.status = 'expired';
      trial.endedAt = now;
      await this.trialHistoryRepository.save(trial);

      // Downgrade tenant to original tier
      tenant.tier = trial.originalTier;
      await this.tenantsRepository.save(tenant);

      // Send trial expired email
      await this.sendTrialExpiredEmail(tenant, trial);

      this.logger.log(
        `Trial expired for tenant ${trial.tenantId}, downgraded from ${trial.trialTier} to ${trial.originalTier}`,
      );
    }
  }

  /**
   * Email sending helpers
   */
  private async sendTrialStartedEmail(
    tenant: Tenant,
    trialTier: TenantTier,
    endsAt: Date,
  ): Promise<void> {
    const email = tenant.contactEmail;
    if (!email) return;

    const tierNames: Record<TenantTier, string> = {
      home: 'Home',
      enterprise: 'Enterprise',
      msp: 'MSP',
    };

    const subject = `Your ${tierNames[trialTier]} trial has started!`;
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Trial Started</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Trial Started!</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="font-size: 16px;">Hi ${tenant.name},</p>

    <p style="font-size: 16px;">
      Your <strong>${TRIAL_DURATION_DAYS}-day ${tierNames[trialTier]} trial</strong> has started!
      You now have access to all ${tierNames[trialTier]} features until <strong>${endsAt.toLocaleDateString()}</strong>.
    </p>

    <div style="background: #eff6ff; border-radius: 8px; padding: 20px; margin: 25px 0;">
      <h3 style="color: #1e40af; margin-top: 0;">What you can explore:</h3>
      <ul style="padding-left: 20px; margin: 0;">
        ${
          trialTier === 'enterprise'
            ? `
        <li>Advanced threat protection</li>
        <li>Custom block pages</li>
        <li>SIEM integration</li>
        <li>Priority support</li>
        `
            : ''
        }
        ${
          trialTier === 'msp'
            ? `
        <li>Multi-tenant management</li>
        <li>Client billing & invoicing</li>
        <li>Policy templates</li>
        <li>White-label options</li>
        <li>API access</li>
        `
            : ''
        }
      </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${this.frontendUrl}/dashboard" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Explore Your New Features
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280;">
      Your trial will automatically end on ${endsAt.toLocaleDateString()}.
      You can convert to a paid subscription at any time to keep your features.
    </p>
  </div>
</body>
</html>`;

    await this.sendEmail(email, subject, htmlContent);
  }

  private async sendTrialExpiringEmail(
    tenant: Tenant,
    trial: TrialHistory,
  ): Promise<void> {
    const email = tenant.contactEmail;
    if (!email) return;

    const daysRemaining = Math.ceil(
      (trial.endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    const tierNames: Record<TenantTier, string> = {
      home: 'Home',
      enterprise: 'Enterprise',
      msp: 'MSP',
    };

    const subject = `Your ${tierNames[trial.trialTier]} trial ends in ${daysRemaining} days`;
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Trial Ending Soon</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 10px; padding: 30px;">
    <h2 style="color: #92400e; margin-top: 0;">Trial Ending Soon</h2>

    <p>Hi ${tenant.name},</p>

    <p>
      Your <strong>${tierNames[trial.trialTier]} trial</strong> will end in <strong>${daysRemaining} days</strong> (${trial.endsAt.toLocaleDateString()}).
    </p>

    <p>
      To keep your ${tierNames[trial.trialTier]} features, convert to a paid subscription before your trial expires.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${this.frontendUrl}/dashboard/settings?tab=billing" style="background: #f59e0b; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Convert to Paid
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280;">
      If you don't convert, you'll be automatically downgraded to the ${tierNames[trial.originalTier]} tier.
      Don't worry - all your data and settings will be preserved.
    </p>
  </div>
</body>
</html>`;

    await this.sendEmail(email, subject, htmlContent);
  }

  private async sendTrialExpiredEmail(
    tenant: Tenant,
    trial: TrialHistory,
  ): Promise<void> {
    const email = tenant.contactEmail;
    if (!email) return;

    const tierNames: Record<TenantTier, string> = {
      home: 'Home',
      enterprise: 'Enterprise',
      msp: 'MSP',
    };

    const subject = `Your ${tierNames[trial.trialTier]} trial has ended`;
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Trial Ended</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 30px;">
    <h2 style="color: #374151; margin-top: 0;">Trial Ended</h2>

    <p>Hi ${tenant.name},</p>

    <p>
      Your <strong>${tierNames[trial.trialTier]} trial</strong> has ended.
      You've been moved back to the <strong>${tierNames[trial.originalTier]}</strong> tier.
    </p>

    <p>
      Don't worry - all your data, policies, and settings have been preserved.
      You can upgrade to ${tierNames[trial.trialTier]} at any time to regain access to those features.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${this.frontendUrl}/dashboard/settings?tab=billing" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Upgrade Now
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280;">
      Thank you for trying Flux Shield ${tierNames[trial.trialTier]}!
    </p>
  </div>
</body>
</html>`;

    await this.sendEmail(email, subject, htmlContent);
  }

  private async sendConversionConfirmationEmail(
    tenant: Tenant,
    tier: TenantTier,
  ): Promise<void> {
    const email = tenant.contactEmail;
    if (!email) return;

    const tierNames: Record<TenantTier, string> = {
      home: 'Home',
      enterprise: 'Enterprise',
      msp: 'MSP',
    };

    const subject = `Welcome to Flux Shield ${tierNames[tier]}!`;
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Subscription Confirmed</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Subscription Confirmed!</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="font-size: 16px;">Hi ${tenant.name},</p>

    <p style="font-size: 16px;">
      Thank you for subscribing to <strong>Flux Shield ${tierNames[tier]}</strong>!
      Your subscription is now active.
    </p>

    <div style="background: #ecfdf5; border-radius: 8px; padding: 20px; margin: 25px 0;">
      <p style="margin: 0; color: #065f46;">
        All your settings, policies, and configurations have been preserved.
        You can continue using all ${tierNames[tier]} features without interruption.
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${this.frontendUrl}/dashboard" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Go to Dashboard
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280;">
      Manage your subscription in Settings > Billing at any time.
    </p>
  </div>
</body>
</html>`;

    await this.sendEmail(email, subject, htmlContent);
  }

  private async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
  ): Promise<void> {
    // Use the email service if available
    try {
      // For now, just log in development
      this.logger.log(`[Email] To: ${to}, Subject: ${subject}`);

      // The email service can be extended to support generic emails
      // For now we'll just log as the EmailService has specific methods
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error}`);
    }
  }
}
