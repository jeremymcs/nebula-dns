// Nebula DNS - Subscriptions Controller
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Request } from 'express';
import { tryGetClientIp } from '@/common/http/client-ip';
import { ConfigService } from '@nestjs/config';
import { SubscriptionsService } from './subscriptions.service';
import {
  CreateSignupDto,
  CreateCheckoutSessionDto,
} from './dto/create-signup.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';

@ApiTags('subscriptions')
@Controller()
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly configService: ConfigService,
  ) {}

  // ==================== PUBLIC ENDPOINTS ====================

  @Get('plans')
  @ApiOperation({
    summary: 'List available plans',
    description:
      'Returns all available subscription plans with pricing and feature information.',
  })
  @ApiResponse({ status: 200, description: 'Plans retrieved successfully' })
  async getPlans() {
    const plans = await this.subscriptionsService.getPlans();
    return { data: plans };
  }

  @Get('plans/:id')
  @ApiOperation({
    summary: 'Get plan by ID',
    description:
      'Returns detailed information about a specific subscription plan.',
  })
  @ApiParam({ name: 'id', description: 'Plan identifier', type: 'string' })
  @ApiResponse({ status: 200, description: 'Plan retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async getPlan(@Param('id') id: string) {
    return this.subscriptionsService.getPlan(id);
  }

  @Post('signup')
  @ApiOperation({
    summary: 'Create new account signup',
    description:
      'Initiates the signup process. For free plans, account is created immediately. For paid plans, returns a checkout session.',
  })
  @ApiResponse({ status: 201, description: 'Signup initiated or completed' })
  @ApiResponse({ status: 400, description: 'Invalid signup data' })
  async signup(@Body() dto: CreateSignupDto, @Req() req: Request) {
    const ipAddress = tryGetClientIp(req);
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
  @ApiOperation({
    summary: 'Complete signup after payment',
    description:
      'Completes the signup process after successful payment. Creates the tenant and user account.',
  })
  @ApiParam({ name: 'id', description: 'Signup request ID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Signup completed' })
  @ApiResponse({ status: 404, description: 'Signup request not found' })
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
  @ApiExcludeEndpoint()
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
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current subscription',
    description: 'Returns the current subscription details for the tenant.',
  })
  @ApiResponse({ status: 200, description: 'Subscription retrieved' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getSubscription(@CurrentTenant() tenantId: string) {
    const subscription =
      await this.subscriptionsService.getSubscription(tenantId);
    return { data: subscription };
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscription/cancel')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cancel subscription',
    description:
      'Cancels the subscription at the end of the current billing period. The subscription remains active until then.',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription cancellation scheduled',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
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
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Resume canceled subscription',
    description:
      'Resumes a subscription that was previously canceled but has not yet expired.',
  })
  @ApiResponse({ status: 200, description: 'Subscription resumed' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 400, description: 'Subscription cannot be resumed' })
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
