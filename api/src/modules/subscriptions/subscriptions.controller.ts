import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Headers,
  RawBodyRequest,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { SubscriptionsService } from './subscriptions.service';
import {
  CreateSignupDto,
  CreateCheckoutSessionDto,
} from './dto/create-signup.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';

@Controller()
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly configService: ConfigService,
  ) {}

  // ==================== PUBLIC ENDPOINTS ====================

  @Get('plans')
  async getPlans() {
    const plans = await this.subscriptionsService.getPlans();
    return { data: plans };
  }

  @Get('plans/:id')
  async getPlan(@Param('id') id: string) {
    return this.subscriptionsService.getPlan(id);
  }

  @Post('signup')
  async signup(@Body() dto: CreateSignupDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const signupRequest = await this.subscriptionsService.createSignupRequest(
      dto,
      ipAddress,
      userAgent,
    );

    // For free plans, process immediately
    if (dto.planId === 'free') {
      const result = await this.subscriptionsService.processSignup(
        signupRequest.id,
      );
      return {
        success: true,
        message: 'Account created successfully',
        tenantId: result.tenant.id,
        redirectUrl: '/login',
      };
    }

    // For paid plans, return the signup request ID for checkout
    return {
      success: true,
      signupRequestId: signupRequest.id,
      requiresPayment: true,
    };
  }

  @Post('signup/:id/complete')
  async completeSignup(@Param('id') id: string) {
    const result = await this.subscriptionsService.processSignup(id);
    return {
      success: true,
      message: 'Account created successfully',
      tenantId: result.tenant.id,
      redirectUrl: '/login',
    };
  }

  // ==================== STRIPE WEBHOOK ====================

  @Post('webhooks/stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    // In production, verify the webhook signature
    // const stripe = require('stripe')(this.configService.get('STRIPE_SECRET_KEY'));
    // const event = stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);

    // For now, just process the event directly
    const event = req.body;
    await this.subscriptionsService.handleStripeWebhook(event);
    return { received: true };
  }

  // ==================== AUTHENTICATED ENDPOINTS ====================

  @UseGuards(JwtAuthGuard)
  @Get('subscription')
  async getSubscription(@CurrentTenant() tenantId: string) {
    const subscription =
      await this.subscriptionsService.getSubscription(tenantId);
    return { data: subscription };
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscription/cancel')
  async cancelSubscription(@CurrentTenant() tenantId: string) {
    const subscription =
      await this.subscriptionsService.cancelSubscription(tenantId);
    return {
      success: true,
      message: 'Subscription will be canceled at the end of the billing period',
      data: subscription,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscription/resume')
  async resumeSubscription(@CurrentTenant() tenantId: string) {
    const subscription =
      await this.subscriptionsService.resumeSubscription(tenantId);
    return {
      success: true,
      message: 'Subscription resumed',
      data: subscription,
    };
  }
}
