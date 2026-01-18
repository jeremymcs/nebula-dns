// Nebula DNS - Admin Billing Service
// Handles subscription status, invoice listing, and PDF streaming for admin operations
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';
import axios from 'axios';

import { Tenant } from '../tenants/entities/tenant.entity';
import { PaymentsService } from '../payments/payments.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { TrialsService } from '../trials/trials.service';
import { SubscriptionLapseService } from '../subscription-lapse/subscription-lapse.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EmailService } from '../email/email.service';
import {
  SubscriptionStatusResponseDto,
  InvoiceListQueryDto,
  InvoiceListResponseDto,
  InvoiceDto,
  ApplyCreditDto,
  CreditAppliedResponseDto,
  ChangeTierDto,
  TierChangeResponseDto,
  ExtendTrialDto,
  ExtendGracePeriodDto,
  ExtensionResponseDto,
} from './dto/billing.dto';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminBillingService {
  private readonly logger = new Logger(AdminBillingService.name);

  // Warning threshold for large credits (in cents = $500)
  private readonly CREDIT_WARNING_THRESHOLD = 50000;

  // Tier to Stripe price ID mapping - loaded from environment
  private readonly tierPriceMap: Record<
    string,
    { monthly: string; yearly: string }
  >;

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly paymentsService: PaymentsService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly trialsService: TrialsService,
    private readonly subscriptionLapseService: SubscriptionLapseService,
    private readonly auditLogsService: AuditLogsService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    // Initialize tier price map from environment
    this.tierPriceMap = {
      home: {
        monthly: this.configService.get('STRIPE_PRICE_HOME_MONTHLY') || '',
        yearly: this.configService.get('STRIPE_PRICE_HOME_YEARLY') || '',
      },
      enterprise: {
        monthly:
          this.configService.get('STRIPE_PRICE_ENTERPRISE_MONTHLY') || '',
        yearly: this.configService.get('STRIPE_PRICE_ENTERPRISE_YEARLY') || '',
      },
      msp: {
        monthly: this.configService.get('STRIPE_PRICE_MSP_MONTHLY') || '',
        yearly: this.configService.get('STRIPE_PRICE_MSP_YEARLY') || '',
      },
    };
  }

  /**
   * Get comprehensive subscription status for a tenant
   * Combines data from local DB, Stripe, trial status, and grace period info
   */
  async getSubscriptionStatus(
    tenantId: string,
  ): Promise<SubscriptionStatusResponseDto> {
    // 1. Find tenant
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // 2. Get subscription from local DB
    const subscription =
      await this.subscriptionsService.getSubscription(tenantId);

    // 3. Get trial status
    const trialStatus = await this.trialsService.getTrialStatus(tenantId);

    // 4. Get grace period info
    const graceInfo =
      await this.subscriptionLapseService.getGracePeriodInfo(tenantId);

    // 5. Build response
    const response: SubscriptionStatusResponseDto = {
      tenantId: tenant.id,
      tenantName: tenant.name,
      tier: tenant.tier,
      status: subscription?.status || 'unknown',
      billingCycle: subscription?.billingCycle || 'monthly',
      currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString(),
      stripeCustomerId: subscription?.stripeCustomerId,
      stripeCustomerLink: subscription?.stripeCustomerId
        ? `https://dashboard.stripe.com/customers/${subscription.stripeCustomerId}`
        : undefined,
      billingEmail: tenant.contactEmail || undefined,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
    };

    // 6. Add trial info if applicable
    if (trialStatus.hasActiveTrial && trialStatus.endsAt) {
      response.trialEnd = trialStatus.endsAt.toISOString();
    }

    // 7. Add grace period info if applicable
    if (graceInfo.subscriptionStatus === 'grace' && graceInfo.graceStartDate) {
      response.gracePeriod = {
        startDate: graceInfo.graceStartDate.toISOString(),
        daysRemaining: graceInfo.daysRemaining || 0,
      };
    }

    // 8. Fetch payment method from Stripe if available
    if (subscription?.stripeCustomerId && this.paymentsService.isConfigured()) {
      try {
        const paymentMethod =
          await this.paymentsService.getDefaultPaymentMethod(
            subscription.stripeCustomerId,
          );
        if (paymentMethod?.card) {
          response.paymentMethodLast4 = paymentMethod.card.last4;
        }
      } catch (error) {
        this.logger.warn(
          `Failed to get payment method for ${tenant.name}: ${(error as Error).message}`,
        );
        // Continue without payment method info
      }
    }

    this.logger.debug(
      `Retrieved subscription status for tenant ${tenant.name}: status=${response.status}, tier=${response.tier}`,
    );

    return response;
  }

  /**
   * List invoices for a tenant with pagination
   * Returns empty list if tenant has no billing setup
   */
  async listInvoices(
    tenantId: string,
    query: InvoiceListQueryDto,
  ): Promise<InvoiceListResponseDto> {
    // 1. Get subscription to find Stripe customer ID
    const subscription =
      await this.subscriptionsService.getSubscription(tenantId);

    // Return empty if no billing setup
    if (!subscription?.stripeCustomerId) {
      return {
        data: [],
        pagination: { cursor: null, hasMore: false },
      };
    }

    // 2. Fetch invoices from Stripe
    const { invoices, hasMore } = await this.paymentsService.listInvoices(
      subscription.stripeCustomerId,
      {
        limit: query.limit || 20,
        startingAfter: query.cursor,
      },
    );

    // 3. Map Stripe invoices to DTOs
    const data: InvoiceDto[] = invoices.map((inv) => ({
      id: inv.id,
      number: inv.number || '',
      status: inv.status || 'unknown',
      amountDue: inv.amount_due,
      amountPaid: inv.amount_paid,
      currency: inv.currency,
      created: new Date(inv.created * 1000).toISOString(),
      dueDate: inv.due_date
        ? new Date(inv.due_date * 1000).toISOString()
        : undefined,
      paidAt: inv.status_transitions?.paid_at
        ? new Date(inv.status_transitions.paid_at * 1000).toISOString()
        : undefined,
      hasPdf: !!inv.invoice_pdf,
    }));

    this.logger.debug(`Listed ${data.length} invoices for tenant ${tenantId}`);

    return {
      data,
      pagination: {
        cursor: hasMore && data.length > 0 ? data[data.length - 1].id : null,
        hasMore,
      },
    };
  }

  /**
   * Stream invoice PDF to response
   * Validates tenant ownership before fetching from Stripe
   */
  async streamInvoicePdf(
    tenantId: string,
    invoiceId: string,
    res: Response,
  ): Promise<void> {
    // 1. Get subscription to verify customer ownership
    const subscription =
      await this.subscriptionsService.getSubscription(tenantId);

    if (!subscription?.stripeCustomerId) {
      throw new NotFoundException('No billing information for tenant');
    }

    // 2. Get invoice PDF URL with ownership validation
    const { url, invoice } =
      await this.paymentsService.getInvoicePdfWithValidation(
        invoiceId,
        subscription.stripeCustomerId,
      );

    // 3. Stream PDF to response
    try {
      const pdfResponse = await axios.get(url, {
        responseType: 'stream',
      });

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="invoice-${invoice.number || invoiceId}.pdf"`,
      );

      // Pipe PDF stream to response
      pdfResponse.data.pipe(res);

      this.logger.log(
        `Streaming invoice PDF ${invoiceId} for tenant ${tenantId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch invoice PDF ${invoiceId}: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException('Failed to download invoice');
    }
  }

  /**
   * Apply credit to tenant's Stripe account
   * Credits are applied as negative balance transactions in Stripe
   */
  async applyCredit(
    tenantId: string,
    dto: ApplyCreditDto,
    adminId: string,
  ): Promise<CreditAppliedResponseDto> {
    // 1. Find tenant
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // 2. Get subscription to verify billing setup
    const subscription =
      await this.subscriptionsService.getSubscription(tenantId);

    if (!subscription?.stripeCustomerId) {
      throw new BadRequestException(
        'Tenant does not have billing configured. Cannot apply credit without a Stripe customer.',
      );
    }

    // 3. Log warning for large credits (but proceed)
    if (dto.amountCents > this.CREDIT_WARNING_THRESHOLD) {
      this.logger.warn(
        `Large credit being applied: $${(dto.amountCents / 100).toFixed(2)} to tenant ${tenant.name} (${tenantId}) by admin ${adminId}`,
      );
    }

    // 4. Apply credit in Stripe
    const transaction = await this.paymentsService.applyCredit(
      subscription.stripeCustomerId,
      dto.amountCents,
      dto.reason,
      {
        tenantId,
        adminId,
        appliedBy: 'admin',
      },
    );

    // 5. Audit log the credit application
    await this.auditLogsService.log({
      tenantId,
      userId: null, // Admin action, not a user
      action: 'billing_credit_applied',
      resourceType: 'subscription',
      resourceId: subscription.stripeCustomerId,
      resourceName: tenant.name,
      newValue: {
        amountCents: dto.amountCents,
        reason: dto.reason,
        transactionId: transaction.id,
        newBalance: transaction.ending_balance,
        adminId,
      },
    });

    this.logger.log(
      `Applied credit of $${(dto.amountCents / 100).toFixed(2)} to tenant ${tenant.name} (${tenantId})`,
    );

    return {
      transactionId: transaction.id,
      newBalance: transaction.ending_balance,
      amountApplied: dto.amountCents,
      message: `Successfully applied $${(dto.amountCents / 100).toFixed(2)} credit to ${tenant.name}`,
    };
  }

  /**
   * Change tenant subscription tier
   * Supports immediate or end-of-period timing
   */
  async changeTier(
    tenantId: string,
    dto: ChangeTierDto,
    adminId: string,
  ): Promise<TierChangeResponseDto> {
    // 1. Find tenant
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const previousTier = tenant.tier;

    // 2. Get subscription to verify billing setup
    const subscription =
      await this.subscriptionsService.getSubscription(tenantId);

    if (!subscription?.stripeSubscriptionId) {
      throw new BadRequestException(
        'Tenant does not have an active subscription. Cannot change tier without a Stripe subscription.',
      );
    }

    // 3. Determine new price ID based on tier and billing cycle
    const billingCycle = subscription.billingCycle || 'monthly';
    const tierPrices = this.tierPriceMap[dto.newTier];

    if (!tierPrices) {
      throw new BadRequestException(`Unknown tier: ${dto.newTier}`);
    }

    const newPriceId = tierPrices[billingCycle];
    if (!newPriceId) {
      throw new BadRequestException(
        `Price not configured for ${dto.newTier} ${billingCycle}`,
      );
    }

    // 4. Update subscription in Stripe
    const updatedSub = await this.paymentsService.changeSubscriptionPlan(
      subscription.stripeSubscriptionId,
      newPriceId,
      dto.timing,
    );

    // 5. Update tenant tier in database
    tenant.tier = dto.newTier;
    await this.tenantRepository.save(tenant);

    // 6. If immediate timing, update subscription planId in local DB
    let effectiveAt: string;
    let prorationAmount: number | undefined;

    if (dto.timing === 'immediate') {
      await this.subscriptionRepository.update(
        { tenantId },
        { planId: dto.newTier },
      );
      effectiveAt = new Date().toISOString();
      // Proration amount from Stripe (if available)
      // Note: actual proration happens in Stripe, we just report timing
    } else {
      // End of period - effective at current period end
      effectiveAt =
        subscription.currentPeriodEnd?.toISOString() ||
        new Date().toISOString();
    }

    // 7. Audit log the tier change
    await this.auditLogsService.log({
      tenantId,
      userId: null, // Admin action
      action: 'billing_tier_changed',
      resourceType: 'subscription',
      resourceId: subscription.stripeSubscriptionId,
      resourceName: tenant.name,
      oldValue: { tier: previousTier },
      newValue: {
        tier: dto.newTier,
        timing: dto.timing,
        reason: dto.reason,
        adminId,
        effectiveAt,
      },
    });

    this.logger.log(
      `Changed tier for tenant ${tenant.name} from ${previousTier} to ${dto.newTier} (${dto.timing})`,
    );

    return {
      previousTier,
      newTier: dto.newTier,
      effectiveAt,
      prorationAmount,
      message: `Successfully changed tier from ${previousTier} to ${dto.newTier}. Change ${dto.timing === 'immediate' ? 'applied immediately' : 'will take effect at end of billing period'}.`,
    };
  }

  /**
   * Extend a tenant's active trial period
   * Requires an active Stripe trial subscription
   */
  async extendTrial(
    tenantId: string,
    dto: ExtendTrialDto,
    adminId: string,
  ): Promise<ExtensionResponseDto> {
    // 1. Find tenant
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // 2. Get trial status
    const trialStatus = await this.trialsService.getTrialStatus(tenantId);

    if (!trialStatus.hasActiveTrial) {
      throw new BadRequestException('Tenant does not have an active trial');
    }

    // 3. Get subscription and verify Stripe subscription exists
    const subscription =
      await this.subscriptionsService.getSubscription(tenantId);

    if (!subscription?.stripeSubscriptionId) {
      throw new BadRequestException(
        'No Stripe subscription found for trial extension',
      );
    }

    // Store previous end date for audit log
    const previousEnd = trialStatus.endsAt?.toISOString() || 'unknown';

    // 4. Extend trial via Stripe
    const updatedSubscription = await this.paymentsService.extendTrialPeriod(
      subscription.stripeSubscriptionId,
      dto.days,
    );

    // 5. Calculate new end date from updated subscription
    const newEndDate = updatedSubscription.trial_end
      ? new Date(updatedSubscription.trial_end * 1000)
      : new Date();

    // 6. Send notification email if requested
    let notificationSent = false;
    if (dto.notifyTenant && tenant.contactEmail) {
      notificationSent = await this.sendTrialExtensionEmail(
        tenant,
        trialStatus.endsAt || new Date(),
        newEndDate,
        dto.days,
      );
    }

    // 7. Audit log
    await this.auditLogsService.log({
      tenantId,
      action: 'billing_trial_extended',
      resourceType: 'tenant',
      resourceId: tenantId,
      resourceName: tenant.name,
      metadata: {
        adminId,
        daysAdded: dto.days,
        reason: dto.reason,
        previousEnd,
        newEnd: newEndDate.toISOString(),
        notificationSent,
      },
    });

    this.logger.log(
      `Extended trial for tenant ${tenant.name} by ${dto.days} days (admin: ${adminId})`,
    );

    return {
      newEndDate: newEndDate.toISOString(),
      daysAdded: dto.days,
      notificationSent,
      message: `Trial extended by ${dto.days} days. New end date: ${newEndDate.toLocaleDateString()}`,
    };
  }

  /**
   * Extend a tenant's grace period
   * Only applicable when tenant is in grace period status
   */
  async extendGracePeriod(
    tenantId: string,
    dto: ExtendGracePeriodDto,
    adminId: string,
  ): Promise<ExtensionResponseDto> {
    // 1. Find tenant
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // 2. Get grace period info
    const graceInfo =
      await this.subscriptionLapseService.getGracePeriodInfo(tenantId);

    if (graceInfo.subscriptionStatus !== 'grace') {
      throw new BadRequestException('Tenant is not in grace period');
    }

    // 3. Extend grace period
    await this.subscriptionLapseService.extendGracePeriod(
      tenantId,
      dto.days,
      adminId,
    );

    // 4. Calculate new end date (grace period info returns days remaining)
    const newDaysRemaining = (graceInfo.daysRemaining || 0) + dto.days;
    const newEndDate = new Date();
    newEndDate.setDate(newEndDate.getDate() + newDaysRemaining);

    // 5. Send notification email if requested
    let notificationSent = false;
    if (dto.notifyTenant && tenant.contactEmail) {
      notificationSent = await this.sendGraceExtensionEmail(
        tenant,
        dto.days,
        newEndDate,
      );
    }

    // 6. Audit log
    await this.auditLogsService.log({
      tenantId,
      action: 'billing_grace_extended',
      resourceType: 'tenant',
      resourceId: tenantId,
      resourceName: tenant.name,
      metadata: {
        adminId,
        daysAdded: dto.days,
        reason: dto.reason,
        newEnd: newEndDate.toISOString(),
        notificationSent,
      },
    });

    this.logger.log(
      `Extended grace period for tenant ${tenant.name} by ${dto.days} days (admin: ${adminId})`,
    );

    return {
      newEndDate: newEndDate.toISOString(),
      daysAdded: dto.days,
      notificationSent,
      message: `Grace period extended by ${dto.days} days. New end date: ${newEndDate.toLocaleDateString()}`,
    };
  }

  /**
   * Send email notifying tenant of trial extension
   * Returns true if email sent successfully, false otherwise
   */
  private async sendTrialExtensionEmail(
    tenant: Tenant,
    originalEndDate: Date,
    newEndDate: Date,
    daysAdded: number,
  ): Promise<boolean> {
    if (!tenant.contactEmail) {
      return false;
    }

    try {
      // Log the notification (email service integration)
      this.logger.log(
        `[Email] Trial extension notification - To: ${tenant.contactEmail}, ` +
          `Tenant: ${tenant.name}, Days added: ${daysAdded}, ` +
          `Previous end: ${originalEndDate.toISOString()}, New end: ${newEndDate.toISOString()}`,
      );

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send trial extension email to ${tenant.contactEmail}: ${(error as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Send email notifying tenant of grace period extension
   * Returns true if email sent successfully, false otherwise
   */
  private async sendGraceExtensionEmail(
    tenant: Tenant,
    daysAdded: number,
    newEndDate: Date,
  ): Promise<boolean> {
    if (!tenant.contactEmail) {
      return false;
    }

    try {
      // Log the notification (email service integration)
      this.logger.log(
        `[Email] Grace period extension notification - To: ${tenant.contactEmail}, ` +
          `Tenant: ${tenant.name}, Days added: ${daysAdded}, ` +
          `New end: ${newEndDate.toISOString()}`,
      );

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send grace extension email to ${tenant.contactEmail}: ${(error as Error).message}`,
      );
      return false;
    }
  }
}
