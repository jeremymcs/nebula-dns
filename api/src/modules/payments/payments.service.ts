/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Stripe Payment Service
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
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
}
