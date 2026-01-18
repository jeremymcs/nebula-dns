// Nebula DNS - Admin Billing Service
// Handles subscription status, invoice listing, and PDF streaming for admin operations
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
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
import {
  SubscriptionStatusResponseDto,
  InvoiceListQueryDto,
  InvoiceListResponseDto,
  InvoiceDto,
} from './dto/billing.dto';

@Injectable()
export class AdminBillingService {
  private readonly logger = new Logger(AdminBillingService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly paymentsService: PaymentsService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly trialsService: TrialsService,
    private readonly subscriptionLapseService: SubscriptionLapseService,
  ) {}

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
    if (
      graceInfo.subscriptionStatus === 'grace' &&
      graceInfo.graceStartDate
    ) {
      response.gracePeriod = {
        startDate: graceInfo.graceStartDate.toISOString(),
        daysRemaining: graceInfo.daysRemaining || 0,
      };
    }

    // 8. Fetch payment method from Stripe if available
    if (subscription?.stripeCustomerId && this.paymentsService.isConfigured()) {
      try {
        const paymentMethod = await this.paymentsService.getDefaultPaymentMethod(
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

    this.logger.debug(
      `Listed ${data.length} invoices for tenant ${tenantId}`,
    );

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
}
