/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Stripe Payment Service
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export interface CreateCheckoutSessionParams {
  planCode: string;
  billingCycle: 'monthly' | 'yearly';
  email: string;
  tenantId?: string;
  signupRequestId?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface SubscriptionInfo {
  id: string;
  status: string;
  planCode: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe | null;
  private readonly webhookSecret: string;

  // Map plan codes to Stripe price IDs
  private readonly priceIds: Map<string, { monthly: string; yearly: string }>;

  constructor(private readonly configService: ConfigService) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey);
      this.logger.log('Stripe client initialized');
    } else {
      this.stripe = null;
      this.logger.warn('Stripe not configured - payment features disabled');
    }

    this.webhookSecret =
      this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';

    // Initialize price IDs from environment
    this.priceIds = new Map([
      [
        'starter',
        {
          monthly: this.configService.get('STRIPE_PRICE_STARTER_MONTHLY') || '',
          yearly: this.configService.get('STRIPE_PRICE_STARTER_YEARLY') || '',
        },
      ],
      [
        'pro',
        {
          monthly: this.configService.get('STRIPE_PRICE_PRO_MONTHLY') || '',
          yearly: this.configService.get('STRIPE_PRICE_PRO_YEARLY') || '',
        },
      ],
      [
        'enterprise',
        {
          monthly:
            this.configService.get('STRIPE_PRICE_ENTERPRISE_MONTHLY') || '',
          yearly:
            this.configService.get('STRIPE_PRICE_ENTERPRISE_YEARLY') || '',
        },
      ],
    ]);
  }

  isConfigured(): boolean {
    return this.stripe !== null;
  }

  /**
   * Create a Stripe checkout session for subscription
   */
  async createCheckoutSession(
    params: CreateCheckoutSessionParams,
  ): Promise<{ sessionId: string; url: string }> {
    if (!this.stripe) {
      throw new BadRequestException('Payment system not configured');
    }

    const {
      planCode,
      billingCycle,
      email,
      tenantId,
      signupRequestId,
      successUrl,
      cancelUrl,
    } = params;

    // Get price ID for the plan
    const planPrices = this.priceIds.get(planCode);
    if (!planPrices) {
      throw new BadRequestException(`Unknown plan: ${planCode}`);
    }

    const priceId =
      billingCycle === 'yearly' ? planPrices.yearly : planPrices.monthly;
    if (!priceId) {
      throw new BadRequestException(
        `Price not configured for ${planCode} ${billingCycle}`,
      );
    }

    try {
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        payment_method_types: ['card'],
        customer_email: email,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        subscription_data: {
          trial_period_days: 14,
          metadata: {
            planCode,
            tenantId: tenantId || '',
            signupRequestId: signupRequestId || '',
          },
        },
        metadata: {
          planCode,
          tenantId: tenantId || '',
          signupRequestId: signupRequestId || '',
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
      };

      const session = await this.stripe.checkout.sessions.create(sessionParams);

      this.logger.log(`Checkout session created: ${session.id} for ${email}`);

      return {
        sessionId: session.id,
        url: session.url || '',
      };
    } catch (error) {
      this.logger.error('Failed to create checkout session', error);
      throw new BadRequestException('Failed to create payment session');
    }
  }

  /**
   * Create a billing portal session for customers to manage their subscription
   */
  async createPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<string> {
    if (!this.stripe) {
      throw new BadRequestException('Payment system not configured');
    }

    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      return session.url;
    } catch (error) {
      this.logger.error('Failed to create portal session', error);
      throw new BadRequestException('Failed to create billing portal session');
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(
    subscriptionId: string,
  ): Promise<SubscriptionInfo | null> {
    if (!this.stripe) {
      return null;
    }

    try {
      const subscription =
        await this.stripe.subscriptions.retrieve(subscriptionId);
      const subData = subscription as any;

      return {
        id: subData.id,
        status: subData.status,
        planCode: subData.metadata?.planCode || 'unknown',
        currentPeriodStart: new Date(subData.current_period_start * 1000),
        currentPeriodEnd: new Date(subData.current_period_end * 1000),
        cancelAtPeriodEnd: subData.cancel_at_period_end,
      };
    } catch (error) {
      this.logger.error(`Failed to get subscription ${subscriptionId}`, error);
      return null;
    }
  }

  /**
   * Cancel a subscription at period end
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    if (!this.stripe) {
      throw new BadRequestException('Payment system not configured');
    }

    try {
      await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      this.logger.log(
        `Subscription ${subscriptionId} set to cancel at period end`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to cancel subscription ${subscriptionId}`,
        error,
      );
      throw new BadRequestException('Failed to cancel subscription');
    }
  }

  /**
   * Resume a canceled subscription
   */
  async resumeSubscription(subscriptionId: string): Promise<void> {
    if (!this.stripe) {
      throw new BadRequestException('Payment system not configured');
    }

    try {
      await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });
      this.logger.log(`Subscription ${subscriptionId} resumed`);
    } catch (error) {
      this.logger.error(
        `Failed to resume subscription ${subscriptionId}`,
        error,
      );
      throw new BadRequestException('Failed to resume subscription');
    }
  }

  /**
   * Verify and parse Stripe webhook
   */
  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    if (!this.stripe) {
      throw new BadRequestException('Payment system not configured');
    }

    if (!this.webhookSecret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret,
      );
    } catch (error) {
      this.logger.error('Webhook signature verification failed', error);
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  /**
   * Get customer by email (or create one)
   */
  async getOrCreateCustomer(email: string, name?: string): Promise<string> {
    if (!this.stripe) {
      throw new BadRequestException('Payment system not configured');
    }

    try {
      // Search for existing customer
      const customers = await this.stripe.customers.list({
        email,
        limit: 1,
      });

      if (customers.data.length > 0) {
        return customers.data[0].id;
      }

      // Create new customer
      const customer = await this.stripe.customers.create({
        email,
        name,
      });

      return customer.id;
    } catch (error) {
      this.logger.error('Failed to get/create customer', error);
      throw new BadRequestException('Failed to process customer');
    }
  }

  // ===========================================
  // Admin Billing Operations (08-01)
  // ===========================================

  /**
   * List invoices for a customer with pagination
   * Uses limit + 1 pattern to detect if more results exist
   */
  async listInvoices(
    customerId: string,
    options: { limit?: number; startingAfter?: string } = {},
  ): Promise<{ invoices: Stripe.Invoice[]; hasMore: boolean }> {
    if (!this.stripe) {
      throw new BadRequestException('Payment system not configured');
    }

    const limit = options.limit || 20;
    const params: Stripe.InvoiceListParams = {
      customer: customerId,
      limit: limit + 1, // Fetch one extra to check hasMore
    };

    if (options.startingAfter) {
      params.starting_after = options.startingAfter;
    }

    try {
      const result = await this.stripe.invoices.list(params);
      const hasMore = result.data.length > limit;

      return {
        invoices: result.data.slice(0, limit),
        hasMore,
      };
    } catch (error) {
      this.logger.error(`Failed to list invoices for ${customerId}`, error);
      throw new BadRequestException('Failed to list invoices');
    }
  }

  /**
   * Get invoice PDF URL with customer ownership validation
   * Verifies the invoice belongs to the expected customer before returning
   */
  async getInvoicePdfWithValidation(
    invoiceId: string,
    expectedCustomerId: string,
  ): Promise<{ url: string; invoice: Stripe.Invoice }> {
    if (!this.stripe) {
      throw new BadRequestException('Payment system not configured');
    }

    try {
      const invoice = await this.stripe.invoices.retrieve(invoiceId);

      // Verify invoice belongs to expected customer
      if (invoice.customer !== expectedCustomerId) {
        throw new ForbiddenException(
          'Invoice does not belong to this customer',
        );
      }

      if (!invoice.invoice_pdf) {
        throw new NotFoundException('Invoice PDF not available');
      }

      return { url: invoice.invoice_pdf, invoice };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error(`Failed to get invoice PDF for ${invoiceId}`, error);
      throw new BadRequestException('Failed to retrieve invoice');
    }
  }

  /**
   * Get default payment method for a customer
   * Returns the customer's default payment method or null if not set
   */
  async getDefaultPaymentMethod(
    customerId: string,
  ): Promise<Stripe.PaymentMethod | null> {
    if (!this.stripe) {
      return null;
    }

    try {
      const customer = await this.stripe.customers.retrieve(customerId);

      // Handle deleted customer
      if ((customer as Stripe.DeletedCustomer).deleted) {
        return null;
      }

      const defaultPmId = (customer as Stripe.Customer).invoice_settings
        ?.default_payment_method;
      if (!defaultPmId || typeof defaultPmId !== 'string') {
        return null;
      }

      return this.stripe.paymentMethods.retrieve(defaultPmId);
    } catch (error) {
      this.logger.warn(
        `Failed to get payment method for ${customerId}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Apply credit to customer balance
   * Amount is negated (credit reduces next invoice)
   * Positive input = credit for customer
   */
  async applyCredit(
    customerId: string,
    amountCents: number,
    description: string,
    metadata?: Record<string, string>,
  ): Promise<Stripe.CustomerBalanceTransaction> {
    if (!this.stripe) {
      throw new BadRequestException('Payment system not configured');
    }

    try {
      // Stripe convention: negative = credit for customer
      const transaction = await this.stripe.customers.createBalanceTransaction(
        customerId,
        {
          amount: -Math.abs(amountCents), // Ensure negative for credit
          currency: 'usd',
          description,
          metadata,
        },
      );

      this.logger.log(
        `Applied credit of ${amountCents} cents to customer ${customerId}`,
      );

      return transaction;
    } catch (error) {
      this.logger.error(`Failed to apply credit to ${customerId}`, error);
      throw new BadRequestException('Failed to apply credit');
    }
  }

  /**
   * Update subscription to new price/plan
   * Supports immediate change (with proration) or end-of-period change
   */
  async changeSubscriptionPlan(
    subscriptionId: string,
    newPriceId: string,
    timing: 'immediate' | 'end_of_period',
  ): Promise<Stripe.Subscription> {
    if (!this.stripe) {
      throw new BadRequestException('Payment system not configured');
    }

    try {
      const subscription =
        await this.stripe.subscriptions.retrieve(subscriptionId);
      const subscriptionItemId = subscription.items.data[0]?.id;

      if (!subscriptionItemId) {
        throw new BadRequestException('Subscription has no items');
      }

      const updateParams: Stripe.SubscriptionUpdateParams = {
        items: [
          {
            id: subscriptionItemId,
            price: newPriceId,
          },
        ],
        proration_behavior: timing === 'immediate' ? 'always_invoice' : 'none',
      };

      const updated = await this.stripe.subscriptions.update(
        subscriptionId,
        updateParams,
      );

      this.logger.log(
        `Subscription ${subscriptionId} plan changed to ${newPriceId} (${timing})`,
      );

      return updated;
    } catch (error) {
      this.logger.error(
        `Failed to change subscription plan for ${subscriptionId}`,
        error,
      );
      throw new BadRequestException('Failed to change subscription plan');
    }
  }

  /**
   * Extend trial period for a subscription
   * Only works for subscriptions currently in trialing status
   * Validates trial won't exceed Stripe's 730-day maximum
   */
  async extendTrialPeriod(
    subscriptionId: string,
    additionalDays: number,
  ): Promise<Stripe.Subscription> {
    if (!this.stripe) {
      throw new BadRequestException('Payment system not configured');
    }

    try {
      const subscription =
        await this.stripe.subscriptions.retrieve(subscriptionId);

      if (subscription.status !== 'trialing') {
        throw new BadRequestException('Subscription is not on trial');
      }

      const currentTrialEnd =
        subscription.trial_end || Math.floor(Date.now() / 1000);
      const newTrialEnd = currentTrialEnd + additionalDays * 24 * 60 * 60;

      // Stripe limits trial to 730 days from creation
      const maxTrialEnd = Math.floor(Date.now() / 1000) + 730 * 24 * 60 * 60;
      if (newTrialEnd > maxTrialEnd) {
        throw new BadRequestException('Trial cannot exceed 730 days total');
      }

      const updated = await this.stripe.subscriptions.update(subscriptionId, {
        trial_end: newTrialEnd,
      });

      this.logger.log(
        `Extended trial for subscription ${subscriptionId} by ${additionalDays} days`,
      );

      return updated;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to extend trial for ${subscriptionId}`, error);
      throw new BadRequestException('Failed to extend trial period');
    }
  }

  // ===========================================
  // Payment Method Operations (Phase 10)
  // ===========================================

  /**
   * List all payment methods for a customer
   * Returns only card-type payment methods
   */
  async listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    if (!this.stripe) {
      throw new BadRequestException('Payment system not configured');
    }

    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });
      return paymentMethods.data;
    } catch (error) {
      this.logger.error(`Failed to list payment methods for ${customerId}`, error);
      throw new BadRequestException('Failed to list payment methods');
    }
  }

  /**
   * Create a SetupIntent for adding a new payment method
   * Returns client_secret for Stripe.js confirmation
   */
  async createSetupIntent(customerId: string): Promise<{ clientSecret: string }> {
    if (!this.stripe) {
      throw new BadRequestException('Payment system not configured');
    }

    try {
      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
      });

      this.logger.log(`Created SetupIntent for customer ${customerId}`);

      return { clientSecret: setupIntent.client_secret || '' };
    } catch (error) {
      this.logger.error(`Failed to create SetupIntent for ${customerId}`, error);
      throw new BadRequestException('Failed to create setup intent');
    }
  }

  /**
   * Set the default payment method for a customer
   * Updates customer's invoice_settings.default_payment_method
   */
  async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string,
  ): Promise<void> {
    if (!this.stripe) {
      throw new BadRequestException('Payment system not configured');
    }

    try {
      await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      this.logger.log(
        `Set default payment method ${paymentMethodId} for customer ${customerId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to set default payment method for ${customerId}`,
        error,
      );
      throw new BadRequestException('Failed to set default payment method');
    }
  }

  /**
   * Detach a payment method from a customer
   * Removes the payment method from the customer's account
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    if (!this.stripe) {
      throw new BadRequestException('Payment system not configured');
    }

    try {
      await this.stripe.paymentMethods.detach(paymentMethodId);

      this.logger.log(`Detached payment method ${paymentMethodId}`);
    } catch (error) {
      this.logger.error(
        `Failed to detach payment method ${paymentMethodId}`,
        error,
      );
      throw new BadRequestException('Failed to remove payment method');
    }
  }

  /**
   * Get a specific payment method with optional ownership validation
   * Throws ForbiddenException if expectedCustomerId doesn't match
   */
  async getPaymentMethod(
    paymentMethodId: string,
    expectedCustomerId?: string,
  ): Promise<Stripe.PaymentMethod> {
    if (!this.stripe) {
      throw new BadRequestException('Payment system not configured');
    }

    try {
      const paymentMethod =
        await this.stripe.paymentMethods.retrieve(paymentMethodId);

      // Validate ownership if expected customer provided
      if (expectedCustomerId && paymentMethod.customer !== expectedCustomerId) {
        throw new ForbiddenException(
          'Payment method does not belong to this customer',
        );
      }

      return paymentMethod;
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Check if payment method not found
      if (
        (error as any).code === 'resource_missing' ||
        (error as any).statusCode === 404
      ) {
        throw new NotFoundException('Payment method not found');
      }

      this.logger.error(
        `Failed to retrieve payment method ${paymentMethodId}`,
        error,
      );
      throw new BadRequestException('Failed to retrieve payment method');
    }
  }
}
