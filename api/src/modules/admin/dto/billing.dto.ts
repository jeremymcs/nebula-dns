// Nebula DNS - Admin Billing DTOs
// Request/Response DTOs for admin billing operations (BIL-01, BIL-02)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  IsEnum,
  IsOptional,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

// ===========================================
// Subscription Status DTOs
// ===========================================

export class SubscriptionStatusResponseDto {
  @ApiProperty({ description: 'Tenant ID' })
  tenantId: string;

  @ApiProperty({ description: 'Tenant name' })
  tenantName: string;

  @ApiProperty({
    description: 'Current tier',
    enum: ['home', 'enterprise', 'msp'],
  })
  tier: string;

  @ApiProperty({
    description: 'Subscription status',
    enum: ['active', 'past_due', 'canceled', 'trialing', 'paused'],
  })
  status: string;

  @ApiProperty({
    description: 'Billing cycle',
    enum: ['monthly', 'yearly'],
  })
  billingCycle: string;

  @ApiPropertyOptional({ description: 'Current period end date' })
  currentPeriodEnd?: string;

  @ApiPropertyOptional({ description: 'Stripe customer ID' })
  stripeCustomerId?: string;

  @ApiPropertyOptional({ description: 'Stripe customer dashboard link' })
  stripeCustomerLink?: string;

  @ApiPropertyOptional({ description: 'Billing email' })
  billingEmail?: string;

  @ApiPropertyOptional({ description: 'Payment method last 4 digits' })
  paymentMethodLast4?: string;

  @ApiProperty({
    description: 'Whether subscription will cancel at period end',
  })
  cancelAtPeriodEnd: boolean;

  @ApiPropertyOptional({ description: 'Trial end date if on trial' })
  trialEnd?: string;

  @ApiPropertyOptional({
    description: 'Grace period info if applicable',
    type: 'object',
  })
  gracePeriod?: {
    startDate: string;
    daysRemaining: number;
  };
}

// ===========================================
// Invoice DTOs
// ===========================================

export class InvoiceDto {
  @ApiProperty({ description: 'Stripe invoice ID' })
  id: string;

  @ApiProperty({ description: 'Invoice number' })
  number: string;

  @ApiProperty({ description: 'Invoice status' })
  status: string;

  @ApiProperty({ description: 'Amount due in cents' })
  amountDue: number;

  @ApiProperty({ description: 'Amount paid in cents' })
  amountPaid: number;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Invoice creation date' })
  created: string;

  @ApiPropertyOptional({ description: 'Due date' })
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Paid date' })
  paidAt?: string;

  @ApiProperty({ description: 'Whether PDF is available' })
  hasPdf: boolean;
}

export class InvoiceListQueryDto {
  @ApiPropertyOptional({
    description: 'Number of invoices to return',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Cursor for pagination (invoice ID)' })
  @IsOptional()
  @IsString()
  cursor?: string;
}

export class InvoiceListResponseDto {
  @ApiProperty({ type: [InvoiceDto], description: 'List of invoices' })
  data: InvoiceDto[];

  @ApiProperty({ description: 'Pagination info' })
  pagination: {
    cursor: string | null;
    hasMore: boolean;
  };
}

// ===========================================
// Credit/Adjustment DTOs
// ===========================================

export class ApplyCreditDto {
  @ApiProperty({
    description: 'Amount in cents (positive for credit)',
    minimum: 1,
    maximum: 1000000,
  })
  @IsInt()
  @Min(1)
  @Max(1000000) // Max $10,000
  amountCents: number;

  @ApiProperty({
    description: 'Reason for the credit',
    minLength: 5,
    maxLength: 500,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}

export class CreditAppliedResponseDto {
  @ApiProperty({ description: 'Stripe balance transaction ID' })
  transactionId: string;

  @ApiProperty({ description: 'New customer balance in cents' })
  newBalance: number;

  @ApiProperty({ description: 'Amount applied in cents' })
  amountApplied: number;

  @ApiProperty({ description: 'Success message' })
  message: string;
}

// ===========================================
// Tier Change DTOs
// ===========================================

export class ChangeTierDto {
  @ApiProperty({
    description: 'New tier',
    enum: ['home', 'enterprise', 'msp'],
  })
  @IsEnum(['home', 'enterprise', 'msp'])
  newTier: 'home' | 'enterprise' | 'msp';

  @ApiProperty({
    description: 'When to apply the change',
    enum: ['immediate', 'end_of_period'],
  })
  @IsEnum(['immediate', 'end_of_period'])
  timing: 'immediate' | 'end_of_period';

  @ApiProperty({
    description: 'Reason for the tier change',
    minLength: 5,
    maxLength: 500,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}

export class TierChangeResponseDto {
  @ApiProperty({ description: 'Previous tier' })
  previousTier: string;

  @ApiProperty({ description: 'New tier' })
  newTier: string;

  @ApiProperty({ description: 'When change takes effect' })
  effectiveAt: string;

  @ApiPropertyOptional({ description: 'Proration amount if immediate (cents)' })
  prorationAmount?: number;

  @ApiProperty({ description: 'Success message' })
  message: string;
}

// ===========================================
// Trial/Grace Extension DTOs
// ===========================================

export class ExtendTrialDto {
  @ApiProperty({
    description: 'Number of days to extend',
    minimum: 1,
    maximum: 30,
  })
  @IsInt()
  @Min(1)
  @Max(30) // Per-extension max
  days: number;

  @ApiProperty({
    description: 'Reason for extension',
    minLength: 5,
    maxLength: 500,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({
    description: 'Whether to notify tenant via email',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  notifyTenant?: boolean;
}

export class ExtendGracePeriodDto {
  @ApiProperty({
    description: 'Number of days to extend',
    minimum: 1,
    maximum: 14,
  })
  @IsInt()
  @Min(1)
  @Max(14) // Per-extension max
  days: number;

  @ApiProperty({
    description: 'Reason for extension',
    minLength: 5,
    maxLength: 500,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({
    description: 'Whether to notify tenant via email',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  notifyTenant?: boolean;
}

export class ExtensionResponseDto {
  @ApiProperty({ description: 'New end date' })
  newEndDate: string;

  @ApiProperty({ description: 'Days added' })
  daysAdded: number;

  @ApiProperty({ description: 'Whether notification was sent' })
  notificationSent: boolean;

  @ApiProperty({ description: 'Success message' })
  message: string;
}

// ===========================================
// Payment Method DTOs
// ===========================================

export class PaymentMethodDto {
  @ApiProperty({ description: 'Stripe payment method ID' })
  id: string;

  @ApiProperty({ description: 'Card brand (visa, mastercard, etc.)' })
  brand: string;

  @ApiProperty({ description: 'Last 4 digits of card' })
  last4: string;

  @ApiProperty({ description: 'Expiration month' })
  expMonth: number;

  @ApiProperty({ description: 'Expiration year' })
  expYear: number;

  @ApiProperty({ description: 'Whether this is the default payment method' })
  isDefault: boolean;

  @ApiProperty({
    description: 'When the payment method was created (ISO date)',
  })
  created: string;
}

export class PaymentMethodListResponseDto {
  @ApiProperty({
    type: [PaymentMethodDto],
    description: 'List of payment methods',
  })
  data: PaymentMethodDto[];

  @ApiProperty({ description: 'Total count of payment methods' })
  total: number;
}

export class CreateSetupIntentResponseDto {
  @ApiProperty({
    description: 'Client secret for Stripe.js SetupIntent confirmation',
  })
  clientSecret: string;
}

export class SetDefaultPaymentMethodDto {
  @ApiProperty({ description: 'Payment method ID to set as default' })
  @IsString()
  paymentMethodId: string;
}

export class SetDefaultPaymentMethodResponseDto {
  @ApiProperty({ description: 'The payment method ID that was set as default' })
  paymentMethodId: string;

  @ApiProperty({ description: 'Success message' })
  message: string;
}

export class DeletePaymentMethodResponseDto {
  @ApiProperty({ description: 'The payment method ID that was deleted' })
  paymentMethodId: string;

  @ApiProperty({ description: 'Success message' })
  message: string;
}
