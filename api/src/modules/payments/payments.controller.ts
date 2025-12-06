/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Stripe Payments Controller
 */

import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  RawBodyRequest,
  UseGuards,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/user.decorator';
import { PaymentsService } from './payments.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3001';
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create checkout session for plan upgrade' })
  async createCheckoutSession(
    @CurrentUser() user: any,
    @Body() body: { planCode: string; billingCycle: 'monthly' | 'yearly' },
  ) {
    const { planCode, billingCycle } = body;

    if (!['starter', 'pro', 'enterprise'].includes(planCode)) {
      throw new BadRequestException('Invalid plan code');
    }

    const result = await this.paymentsService.createCheckoutSession({
      planCode,
      billingCycle,
      email: user.email,
      tenantId: user.tenantId,
      successUrl: `${this.frontendUrl}/dashboard/settings?payment=success`,
      cancelUrl: `${this.frontendUrl}/dashboard/settings?payment=cancelled`,
    });

    return result;
  }

  @Post('portal')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe billing portal session' })
  async createPortalSession(@CurrentUser() user: any) {
    const subscription = await this.subscriptionsService.getSubscription(user.tenantId);
    
    if (!subscription?.stripeCustomerId) {
      throw new BadRequestException('No billing information found');
    }

    const url = await this.paymentsService.createPortalSession(
      subscription.stripeCustomerId,
      `${this.frontendUrl}/dashboard/settings`,
    );

    return { url };
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!req.rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    const event = this.paymentsService.constructWebhookEvent(req.rawBody, signature);

    this.logger.log(`Webhook received: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        await this.handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        await this.handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        await this.handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as any;
        await this.handleInvoicePaid(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        await this.handlePaymentFailed(invoice);
        break;
      }

      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(session: any) {
    const { signupRequestId, tenantId, planCode } = session.metadata || {};
    const customerId = session.customer;
    const subscriptionId = session.subscription;

    this.logger.log(`Checkout completed for ${signupRequestId || tenantId}`);

    if (signupRequestId) {
      // Complete new signup
      await this.subscriptionsService.completeSignup(signupRequestId, {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
      });
    } else if (tenantId) {
      // Upgrade existing tenant
      await this.subscriptionsService.updateSubscription(tenantId, {
        planCode,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        status: 'active',
      });
    }
  }

  private async handleSubscriptionUpdated(subscription: any) {
    const { tenantId } = subscription.metadata || {};
    
    if (tenantId) {
      await this.subscriptionsService.updateSubscription(tenantId, {
        status: this.mapStripeStatus(subscription.status),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });
    }
  }

  private async handleSubscriptionDeleted(subscription: any) {
    const { tenantId } = subscription.metadata || {};
    
    if (tenantId) {
      await this.subscriptionsService.updateSubscription(tenantId, {
        status: 'cancelled',
        planCode: 'free',
      });
    }
  }

  private async handleInvoicePaid(invoice: any) {
    this.logger.log(`Invoice paid: ${invoice.id}`);
    // Log for accounting/audit purposes
  }

  private async handlePaymentFailed(invoice: any) {
    const customerEmail = invoice.customer_email;
    this.logger.warn(`Payment failed for ${customerEmail}: ${invoice.id}`);
    
    // TODO: Send email notification about failed payment
    // await this.emailService.sendPaymentFailedEmail({ ... });
  }

  private mapStripeStatus(stripeStatus: string): string {
    const statusMap: Record<string, string> = {
      active: 'active',
      past_due: 'past_due',
      canceled: 'cancelled',
      unpaid: 'unpaid',
      trialing: 'trialing',
    };
    return statusMap[stripeStatus] || 'unknown';
  }
}
