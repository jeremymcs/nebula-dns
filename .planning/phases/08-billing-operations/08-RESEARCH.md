# Phase 8: Billing Operations - Research

**Researched:** 2026-01-18
**Domain:** Admin billing management via Stripe API
**Confidence:** HIGH

## Summary

This phase implements admin billing operations for viewing and managing tenant billing. The admin dashboard needs capabilities to view subscription status, invoice history, apply credits/adjustments, change subscription tiers, and extend trials/grace periods. All operations require integration with Stripe API and must be fully audit-logged.

The research confirms strong patterns exist in the codebase:
1. **PaymentsService** already wraps the Stripe client with basic subscription operations
2. **SubscriptionsService** manages local subscription state and syncs with Stripe
3. **TrialsService** handles trial management with extension capabilities
4. **SubscriptionLapseService** manages grace periods with extension functionality
5. **AdminController/Service** provides authenticated admin endpoints with audit logging

The key additions needed:
1. Wrap additional Stripe APIs for invoice listing, credit balance, subscription updates
2. Create admin-facing DTOs that combine Stripe data with local data
3. Add new audit action types for billing operations
4. Implement invoice PDF proxy endpoint

**Primary recommendation:** Extend AdminService with billing methods that:
1. Fetch subscription details from both local DB and Stripe for complete view
2. List invoices via Stripe API with pagination, serve PDF downloads
3. Create customer balance transactions for credits/adjustments
4. Update subscriptions with immediate or end-of-period timing
5. Extend trials/grace periods using existing service patterns
6. Audit log all billing operations with admin context

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `stripe` | ^20.0.0 | Stripe API client | Already in package.json, used by PaymentsService |
| `typeorm` | 0.3.x | Database operations | Already in use for subscription entity |
| `class-validator` | 0.14.x | DTO validation | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@nestjs/schedule` | ^4.0.0 | Cron jobs for grace period checks | Already configured |
| `axios` | existing | HTTP client for PDF fetch | Already available in codebase |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Proxy invoice PDF | Redirect to Stripe URL | URLs expire, less seamless UX |
| Immediate tier change | Always end-of-period | Less flexibility for admin |
| Manual credit entry | Stripe credit notes | Credit notes more complex, limited use cases |

**Installation:**
No new packages required. All dependencies already present in `api/package.json`.

## Architecture Patterns

### Recommended Project Structure
```
api/src/modules/admin/
├── admin.controller.ts       # Add billing endpoints
├── admin.service.ts          # Add billing methods
├── admin-billing.service.ts  # NEW: Dedicated billing operations service
├── dto/
│   ├── billing.dto.ts        # NEW: All billing-related DTOs
│   └── ... existing DTOs
└── ... existing files

api/src/modules/payments/
├── payments.service.ts       # Extend with invoice, credit, tier change methods
└── ... existing files
```

### Pattern 1: Stripe API Extension in PaymentsService

**What:** Add new Stripe API operations to existing PaymentsService for invoice listing, credit balance, and subscription updates.

**When to use:** Any direct Stripe API interaction should go through PaymentsService.

**Example:**
```typescript
// Source: Extend existing PaymentsService
/**
 * List invoices for a customer
 */
async listInvoices(
  customerId: string,
  options: { limit?: number; startingAfter?: string } = {},
): Promise<{ invoices: StripeInvoice[]; hasMore: boolean }> {
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

  const result = await this.stripe.invoices.list(params);
  const hasMore = result.data.length > limit;

  return {
    invoices: result.data.slice(0, limit),
    hasMore,
  };
}

/**
 * Get invoice PDF content
 */
async getInvoicePdf(invoiceId: string): Promise<{ url: string }> {
  if (!this.stripe) {
    throw new BadRequestException('Payment system not configured');
  }

  const invoice = await this.stripe.invoices.retrieve(invoiceId);
  if (!invoice.invoice_pdf) {
    throw new NotFoundException('Invoice PDF not available');
  }

  return { url: invoice.invoice_pdf };
}

/**
 * Apply credit to customer balance
 * Negative amount = credit (reduces next invoice)
 * Positive amount = debit (increases next invoice)
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

  // Stripe convention: negative = credit for customer
  return this.stripe.customers.createBalanceTransaction(customerId, {
    amount: -Math.abs(amountCents), // Ensure negative for credit
    currency: 'usd',
    description,
    metadata,
  });
}

/**
 * Update subscription to new price/plan
 */
async changeSubscriptionPlan(
  subscriptionId: string,
  newPriceId: string,
  timing: 'immediate' | 'end_of_period',
): Promise<Stripe.Subscription> {
  if (!this.stripe) {
    throw new BadRequestException('Payment system not configured');
  }

  const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
  const subscriptionItemId = subscription.items.data[0]?.id;

  if (!subscriptionItemId) {
    throw new BadRequestException('Subscription has no items');
  }

  const updateParams: Stripe.SubscriptionUpdateParams = {
    items: [{
      id: subscriptionItemId,
      price: newPriceId,
    }],
    proration_behavior: timing === 'immediate' ? 'always_invoice' : 'none',
  };

  if (timing === 'end_of_period') {
    // Schedule change for billing cycle end
    updateParams.cancel_at_period_end = false;
    updateParams.billing_cycle_anchor = 'unchanged';
  }

  return this.stripe.subscriptions.update(subscriptionId, updateParams);
}
```

### Pattern 2: Admin Billing DTOs

**What:** Define request/response DTOs for all billing operations with proper Swagger documentation.

**When to use:** All admin billing endpoints.

**Example:**
```typescript
// Source: New dto/billing.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsInt, IsEnum, IsOptional, Min, Max, MinLength, MaxLength, IsBoolean } from 'class-validator';

// ===========================================
// Subscription Status DTOs
// ===========================================

export class SubscriptionStatusResponseDto {
  @ApiProperty({ description: 'Tenant ID' })
  tenantId: string;

  @ApiProperty({ description: 'Tenant name' })
  tenantName: string;

  @ApiProperty({ description: 'Current tier', enum: ['home', 'enterprise', 'msp'] })
  tier: string;

  @ApiProperty({ description: 'Subscription status', enum: ['active', 'past_due', 'canceled', 'trialing', 'paused'] })
  status: string;

  @ApiProperty({ description: 'Billing cycle', enum: ['monthly', 'yearly'] })
  billingCycle: string;

  @ApiPropertyOptional({ description: 'Current period end date' })
  currentPeriodEnd?: string;

  @ApiPropertyOptional({ description: 'Stripe customer ID' })
  stripeCustomerId?: string;

  @ApiPropertyOptional({ description: 'Stripe customer portal link' })
  stripeCustomerLink?: string;

  @ApiPropertyOptional({ description: 'Billing email' })
  billingEmail?: string;

  @ApiPropertyOptional({ description: 'Payment method last 4 digits' })
  paymentMethodLast4?: string;

  @ApiPropertyOptional({ description: 'Trial end date if on trial' })
  trialEnd?: string;

  @ApiPropertyOptional({ description: 'Grace period info if applicable' })
  gracePeriod?: {
    startDate: string;
    daysRemaining: number;
  };

  @ApiProperty({ description: 'Whether subscription will cancel at period end' })
  cancelAtPeriodEnd: boolean;
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

  @ApiProperty({ description: 'Invoice date' })
  created: string;

  @ApiPropertyOptional({ description: 'Due date' })
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Paid date' })
  paidAt?: string;

  @ApiProperty({ description: 'Whether PDF is available' })
  hasPdf: boolean;
}

export class InvoiceListQueryDto {
  @ApiPropertyOptional({ description: 'Number of invoices to return', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Cursor for pagination (invoice ID)' })
  @IsOptional()
  @IsString()
  cursor?: string;
}

export class InvoiceListResponseDto {
  @ApiProperty({ type: [InvoiceDto] })
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
  @ApiProperty({ description: 'Amount in cents (positive for credit)' })
  @IsInt()
  @Min(1)
  @Max(1000000) // Max $10,000
  amountCents: number;

  @ApiProperty({ description: 'Reason for the credit', minLength: 5, maxLength: 500 })
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

  @ApiProperty({ description: 'Amount applied' })
  amountApplied: number;

  @ApiProperty({ description: 'Message' })
  message: string;
}

// ===========================================
// Tier Change DTOs
// ===========================================

export class ChangeTierDto {
  @ApiProperty({ description: 'New tier', enum: ['home', 'enterprise', 'msp'] })
  @IsEnum(['home', 'enterprise', 'msp'])
  newTier: 'home' | 'enterprise' | 'msp';

  @ApiProperty({ description: 'When to apply the change', enum: ['immediate', 'end_of_period'] })
  @IsEnum(['immediate', 'end_of_period'])
  timing: 'immediate' | 'end_of_period';

  @ApiProperty({ description: 'Reason for the tier change', minLength: 5, maxLength: 500 })
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

  @ApiProperty({ description: 'Proration amount if immediate (cents)' })
  prorationAmount?: number;

  @ApiProperty({ description: 'Message' })
  message: string;
}

// ===========================================
// Trial/Grace Extension DTOs
// ===========================================

export class ExtendTrialDto {
  @ApiProperty({ description: 'Number of days to extend', minimum: 1, maximum: 30 })
  @IsInt()
  @Min(1)
  @Max(30) // Per-extension max
  days: number;

  @ApiProperty({ description: 'Reason for extension', minLength: 5, maxLength: 500 })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({ description: 'Whether to notify tenant via email', default: false })
  @IsOptional()
  @IsBoolean()
  notifyTenant?: boolean;
}

export class ExtendGracePeriodDto {
  @ApiProperty({ description: 'Number of days to extend', minimum: 1, maximum: 14 })
  @IsInt()
  @Min(1)
  @Max(14) // Per-extension max
  days: number;

  @ApiProperty({ description: 'Reason for extension', minLength: 5, maxLength: 500 })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({ description: 'Whether to notify tenant via email', default: false })
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

  @ApiProperty({ description: 'Message' })
  message: string;
}
```

### Pattern 3: Admin Billing Controller Endpoints

**What:** Add billing endpoints to AdminController following existing patterns.

**When to use:** All admin billing operations.

**Example:**
```typescript
// Source: Extend AdminController
// ===========================================
// Billing Operations Endpoints
// ===========================================

/**
 * Get subscription status for a tenant
 */
@Get('tenants/:tenantId/billing/subscription')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('admin-jwt')
@ApiOperation({ summary: 'Get tenant subscription status' })
@ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
@ApiResponse({ status: 200, type: SubscriptionStatusResponseDto })
@ApiResponse({ status: 404, description: 'Tenant not found' })
async getSubscriptionStatus(
  @Param('tenantId', ParseUUIDPipe) tenantId: string,
): Promise<SubscriptionStatusResponseDto> {
  return this.adminBillingService.getSubscriptionStatus(tenantId);
}

/**
 * List invoices for a tenant
 */
@Get('tenants/:tenantId/billing/invoices')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('admin-jwt')
@ApiOperation({ summary: 'List tenant invoices' })
@ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
@ApiResponse({ status: 200, type: InvoiceListResponseDto })
@ApiResponse({ status: 404, description: 'Tenant not found' })
async listInvoices(
  @Param('tenantId', ParseUUIDPipe) tenantId: string,
  @Query() query: InvoiceListQueryDto,
): Promise<InvoiceListResponseDto> {
  return this.adminBillingService.listInvoices(tenantId, query);
}

/**
 * Download invoice PDF
 */
@Get('tenants/:tenantId/billing/invoices/:invoiceId/pdf')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('admin-jwt')
@ApiOperation({ summary: 'Download invoice PDF' })
@ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
@ApiParam({ name: 'invoiceId', description: 'Stripe invoice ID' })
@ApiResponse({ status: 200, description: 'PDF file stream' })
@ApiResponse({ status: 404, description: 'Invoice not found' })
async downloadInvoicePdf(
  @Param('tenantId', ParseUUIDPipe) tenantId: string,
  @Param('invoiceId') invoiceId: string,
  @Res() res: Response,
): Promise<void> {
  await this.adminBillingService.streamInvoicePdf(tenantId, invoiceId, res);
}

/**
 * Apply credit to tenant account
 */
@Post('tenants/:tenantId/billing/credits')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('admin-jwt')
@ApiOperation({ summary: 'Apply credit to tenant account' })
@ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
@ApiResponse({ status: 201, type: CreditAppliedResponseDto })
@ApiResponse({ status: 400, description: 'Validation error' })
@ApiResponse({ status: 404, description: 'Tenant not found' })
async applyCredit(
  @Param('tenantId', ParseUUIDPipe) tenantId: string,
  @Body() dto: ApplyCreditDto,
  @Req() req: Request,
): Promise<CreditAppliedResponseDto> {
  const admin = req.user as AdminUser;
  return this.adminBillingService.applyCredit(tenantId, dto, admin.adminId);
}

/**
 * Change tenant subscription tier
 */
@Post('tenants/:tenantId/billing/tier')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('admin-jwt')
@ApiOperation({ summary: 'Change tenant subscription tier' })
@ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
@ApiResponse({ status: 200, type: TierChangeResponseDto })
@ApiResponse({ status: 400, description: 'Validation error or limits exceeded warning' })
@ApiResponse({ status: 404, description: 'Tenant not found' })
async changeTier(
  @Param('tenantId', ParseUUIDPipe) tenantId: string,
  @Body() dto: ChangeTierDto,
  @Req() req: Request,
): Promise<TierChangeResponseDto> {
  const admin = req.user as AdminUser;
  return this.adminBillingService.changeTier(tenantId, dto, admin.adminId);
}

/**
 * Extend tenant trial period
 */
@Post('tenants/:tenantId/billing/trial/extend')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('admin-jwt')
@ApiOperation({ summary: 'Extend tenant trial period' })
@ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
@ApiResponse({ status: 200, type: ExtensionResponseDto })
@ApiResponse({ status: 400, description: 'No active trial or validation error' })
@ApiResponse({ status: 404, description: 'Tenant not found' })
async extendTrial(
  @Param('tenantId', ParseUUIDPipe) tenantId: string,
  @Body() dto: ExtendTrialDto,
  @Req() req: Request,
): Promise<ExtensionResponseDto> {
  const admin = req.user as AdminUser;
  return this.adminBillingService.extendTrial(tenantId, dto, admin.adminId);
}

/**
 * Extend tenant grace period
 */
@Post('tenants/:tenantId/billing/grace/extend')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('admin-jwt')
@ApiOperation({ summary: 'Extend tenant grace period' })
@ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
@ApiResponse({ status: 200, type: ExtensionResponseDto })
@ApiResponse({ status: 400, description: 'Not in grace period or validation error' })
@ApiResponse({ status: 404, description: 'Tenant not found' })
async extendGracePeriod(
  @Param('tenantId', ParseUUIDPipe) tenantId: string,
  @Body() dto: ExtendGracePeriodDto,
  @Req() req: Request,
): Promise<ExtensionResponseDto> {
  const admin = req.user as AdminUser;
  return this.adminBillingService.extendGracePeriod(tenantId, dto, admin.adminId);
}
```

### Pattern 4: Invoice PDF Streaming

**What:** Fetch invoice PDF from Stripe and stream to client via our API.

**When to use:** Invoice PDF download.

**Example:**
```typescript
// Source: AdminBillingService
import { Response } from 'express';
import axios from 'axios';

async streamInvoicePdf(
  tenantId: string,
  invoiceId: string,
  res: Response,
): Promise<void> {
  // 1. Verify tenant ownership of this invoice
  const subscription = await this.subscriptionsService.getSubscription(tenantId);
  if (!subscription?.stripeCustomerId) {
    throw new NotFoundException('No billing information for tenant');
  }

  // 2. Get invoice PDF URL from Stripe
  const { url } = await this.paymentsService.getInvoicePdf(invoiceId);

  // 3. Verify invoice belongs to this customer
  const invoice = await this.stripe.invoices.retrieve(invoiceId);
  if (invoice.customer !== subscription.stripeCustomerId) {
    throw new ForbiddenException('Invoice does not belong to this tenant');
  }

  // 4. Stream PDF to response
  try {
    const pdfResponse = await axios.get(url, {
      responseType: 'stream',
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${invoice.number}.pdf"`,
    );

    pdfResponse.data.pipe(res);
  } catch (error) {
    this.logger.error(`Failed to fetch invoice PDF: ${error.message}`);
    throw new InternalServerErrorException('Failed to download invoice');
  }
}
```

### Pattern 5: Audit Logging for Billing Operations

**What:** Add new audit action types for billing operations.

**When to use:** All billing mutation operations.

**Example:**
```typescript
// Source: Add to audit-log.entity.ts AuditAction type
export type AuditAction =
  | ... existing actions
  | 'billing_credit_applied'
  | 'billing_tier_changed'
  | 'billing_trial_extended'
  | 'billing_grace_extended';

// Source: AdminBillingService
async applyCredit(
  tenantId: string,
  dto: ApplyCreditDto,
  adminId: string,
): Promise<CreditAppliedResponseDto> {
  // ... apply credit logic ...

  // Audit log
  await this.auditLogsService.log({
    tenantId,
    userId: null, // Admin action, not user action
    action: 'billing_credit_applied',
    resourceType: 'subscription',
    resourceId: tenantId,
    resourceName: tenant.name,
    newValue: {
      amountCents: dto.amountCents,
      reason: dto.reason,
    },
    metadata: {
      adminId,
      stripeTransactionId: transaction.id,
      newBalance: transaction.ending_balance,
    },
  });

  return { ... };
}
```

### Anti-Patterns to Avoid
- **Returning Stripe URLs directly:** URLs expire; always proxy or return temporary URLs
- **Skipping ownership verification:** Always verify tenant owns the invoice/subscription before accessing
- **Missing audit logs:** Every billing mutation must be logged with admin context
- **Hard-coding tier limits:** Use existing tier system for limit validation
- **Synchronous PDF download:** Stream the PDF instead of buffering entire file

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Grace period extension | New grace logic | Existing `SubscriptionLapseService.extendGracePeriod()` | Already handles edge cases |
| Trial extension | New trial logic | Existing `TrialsService` patterns + Stripe `trial_end` | Already exists |
| Tier validation | New tier checks | Existing `TenantTier` enum and tier system | Already defined |
| Stripe error handling | Custom error mapping | Let Stripe errors bubble with logging | Stripe errors are descriptive |
| Customer ID lookup | Direct DB query | Existing `SubscriptionsService.getSubscription()` | Already fetches related data |

**Key insight:** The existing PaymentsService, SubscriptionsService, TrialsService, and SubscriptionLapseService contain most of the core logic. The admin billing operations wrap these with additional authorization, validation, and audit logging.

## Common Pitfalls

### Pitfall 1: Invoice PDF URL Expiration
**What goes wrong:** PDF URLs from Stripe expire after 30-120 days
**Why it happens:** Stripe generates signed URLs with expiration
**How to avoid:** Fetch fresh URL from Stripe API for each download, don't cache
**Warning signs:** "Access Denied" or 403 errors when downloading PDFs

### Pitfall 2: Credit Amount Sign Convention
**What goes wrong:** Credit applied as debit (wrong sign)
**Why it happens:** Stripe uses negative amounts for credits to customer
**How to avoid:** Always negate amount when applying credit: `amount: -Math.abs(amountCents)`
**Warning signs:** Customer balance increases instead of decreases

### Pitfall 3: Tier Change Without Stripe Sync
**What goes wrong:** Local tier changes but Stripe subscription not updated
**Why it happens:** Only updating tenant entity without updating Stripe
**How to avoid:** Always update both Stripe subscription and local entities
**Warning signs:** Stripe invoices have wrong amount, tier mismatch

### Pitfall 4: Missing Ownership Verification
**What goes wrong:** Admin can access invoices for wrong tenant
**Why it happens:** Using invoiceId directly without verifying customer ownership
**How to avoid:** Always verify `invoice.customer === subscription.stripeCustomerId`
**Warning signs:** Cross-tenant data access

### Pitfall 5: Large Credit Without Warning
**What goes wrong:** Admin applies large credit accidentally
**Why it happens:** No soft limit or confirmation for large amounts
**How to avoid:** Add warning threshold (e.g., $500), require confirmation above threshold
**Warning signs:** Unexpected large credits in Stripe dashboard

### Pitfall 6: Trial Extension on Non-Trial Subscription
**What goes wrong:** Trying to extend trial when subscription is not trialing
**Why it happens:** Not checking current subscription status
**How to avoid:** Verify subscription is in 'trialing' status before extension
**Warning signs:** Stripe API error or unexpected billing behavior

### Pitfall 7: Grace Extension After Suspension
**What goes wrong:** Grace period extended but tenant remains suspended
**Why it happens:** Forgetting to update tenant and client subscription status
**How to avoid:** Use existing `SubscriptionLapseService.extendGracePeriod()` which handles this
**Warning signs:** Tenant still can't access service after extension

## Code Examples

Verified patterns from existing codebase and Stripe documentation:

### AdminBillingService Implementation
```typescript
// Source: New api/src/modules/admin/admin-billing.service.ts
import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';
import axios from 'axios';

import { Tenant } from '../tenants/entities/tenant.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { PaymentsService } from '../payments/payments.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { TrialsService } from '../trials/trials.service';
import { SubscriptionLapseService } from '../subscription-lapse/subscription-lapse.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';

import {
  SubscriptionStatusResponseDto,
  InvoiceListQueryDto,
  InvoiceListResponseDto,
  ApplyCreditDto,
  CreditAppliedResponseDto,
  ChangeTierDto,
  TierChangeResponseDto,
  ExtendTrialDto,
  ExtendGracePeriodDto,
  ExtensionResponseDto,
} from './dto/billing.dto';

// Credit warning threshold in cents ($500)
const CREDIT_WARNING_THRESHOLD = 50000;

// Tier to Stripe price mapping
const TIER_PRICE_MAP: Record<string, { monthly: string; yearly: string }> = {
  home: { monthly: 'price_home_monthly', yearly: 'price_home_yearly' },
  enterprise: { monthly: 'price_enterprise_monthly', yearly: 'price_enterprise_yearly' },
  msp: { monthly: 'price_msp_monthly', yearly: 'price_msp_yearly' },
};

@Injectable()
export class AdminBillingService {
  private readonly logger = new Logger(AdminBillingService.name);

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
  ) {}

  /**
   * Get comprehensive subscription status for a tenant
   */
  async getSubscriptionStatus(tenantId: string): Promise<SubscriptionStatusResponseDto> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const subscription = await this.subscriptionsService.getSubscription(tenantId);
    const trialStatus = await this.trialsService.getTrialStatus(tenantId);
    const graceInfo = await this.subscriptionLapseService.getGracePeriodInfo(tenantId);

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

    // Add trial info if applicable
    if (trialStatus.hasActiveTrial) {
      response.trialEnd = trialStatus.endsAt?.toISOString();
    }

    // Add grace period info if applicable
    if (graceInfo.subscriptionStatus === 'grace' && graceInfo.graceStartDate) {
      response.gracePeriod = {
        startDate: graceInfo.graceStartDate.toISOString(),
        daysRemaining: graceInfo.daysRemaining || 0,
      };
    }

    // Fetch payment method from Stripe if available
    if (subscription?.stripeCustomerId && this.paymentsService.isConfigured()) {
      try {
        // This would need a new method in PaymentsService
        const paymentMethod = await this.paymentsService.getDefaultPaymentMethod(
          subscription.stripeCustomerId,
        );
        if (paymentMethod?.card) {
          response.paymentMethodLast4 = paymentMethod.card.last4;
        }
      } catch (error) {
        this.logger.warn(`Failed to get payment method: ${error.message}`);
      }
    }

    return response;
  }

  /**
   * List invoices for a tenant
   */
  async listInvoices(
    tenantId: string,
    query: InvoiceListQueryDto,
  ): Promise<InvoiceListResponseDto> {
    const subscription = await this.subscriptionsService.getSubscription(tenantId);

    if (!subscription?.stripeCustomerId) {
      return {
        data: [],
        pagination: { cursor: null, hasMore: false },
      };
    }

    const { invoices, hasMore } = await this.paymentsService.listInvoices(
      subscription.stripeCustomerId,
      {
        limit: query.limit || 20,
        startingAfter: query.cursor,
      },
    );

    return {
      data: invoices.map((inv) => ({
        id: inv.id,
        number: inv.number || '',
        status: inv.status || 'unknown',
        amountDue: inv.amount_due,
        amountPaid: inv.amount_paid,
        currency: inv.currency,
        created: new Date(inv.created * 1000).toISOString(),
        dueDate: inv.due_date ? new Date(inv.due_date * 1000).toISOString() : undefined,
        paidAt: inv.status_transitions?.paid_at
          ? new Date(inv.status_transitions.paid_at * 1000).toISOString()
          : undefined,
        hasPdf: !!inv.invoice_pdf,
      })),
      pagination: {
        cursor: hasMore ? invoices[invoices.length - 1]?.id : null,
        hasMore,
      },
    };
  }

  /**
   * Stream invoice PDF to response
   */
  async streamInvoicePdf(
    tenantId: string,
    invoiceId: string,
    res: Response,
  ): Promise<void> {
    const subscription = await this.subscriptionsService.getSubscription(tenantId);

    if (!subscription?.stripeCustomerId) {
      throw new NotFoundException('No billing information for tenant');
    }

    const { url, invoice } = await this.paymentsService.getInvoicePdfWithValidation(
      invoiceId,
      subscription.stripeCustomerId,
    );

    try {
      const pdfResponse = await axios.get(url, {
        responseType: 'stream',
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="invoice-${invoice.number || invoiceId}.pdf"`,
      );

      pdfResponse.data.pipe(res);
    } catch (error) {
      this.logger.error(`Failed to fetch invoice PDF: ${error.message}`);
      throw new InternalServerErrorException('Failed to download invoice');
    }
  }

  /**
   * Apply credit to tenant account
   */
  async applyCredit(
    tenantId: string,
    dto: ApplyCreditDto,
    adminId: string,
  ): Promise<CreditAppliedResponseDto> {
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const subscription = await this.subscriptionsService.getSubscription(tenantId);
    if (!subscription?.stripeCustomerId) {
      throw new BadRequestException('Tenant has no billing setup');
    }

    // Soft warning for large credits (logged but not blocked)
    if (dto.amountCents > CREDIT_WARNING_THRESHOLD) {
      this.logger.warn(
        `Large credit applied by admin ${adminId}: $${dto.amountCents / 100} to ${tenant.name}`,
      );
    }

    const transaction = await this.paymentsService.applyCredit(
      subscription.stripeCustomerId,
      dto.amountCents,
      dto.reason,
      { adminId, tenantId },
    );

    // Audit log
    await this.auditLogsService.log({
      tenantId,
      userId: null,
      action: 'billing_credit_applied' as any,
      resourceType: 'subscription',
      resourceId: tenantId,
      resourceName: tenant.name,
      newValue: {
        amountCents: dto.amountCents,
        reason: dto.reason,
      },
      metadata: {
        adminId,
        stripeTransactionId: transaction.id,
        newBalance: transaction.ending_balance,
      },
    });

    this.logger.log(
      `Admin ${adminId} applied $${dto.amountCents / 100} credit to ${tenant.name}`,
    );

    return {
      transactionId: transaction.id,
      newBalance: transaction.ending_balance,
      amountApplied: dto.amountCents,
      message: `Credit of $${(dto.amountCents / 100).toFixed(2)} applied successfully`,
    };
  }

  // ... Additional methods for changeTier, extendTrial, extendGracePeriod
}
```

### Extended Stripe Methods in PaymentsService
```typescript
// Source: Add to existing PaymentsService

/**
 * Get default payment method for customer
 */
async getDefaultPaymentMethod(customerId: string): Promise<Stripe.PaymentMethod | null> {
  if (!this.stripe) return null;

  try {
    const customer = await this.stripe.customers.retrieve(customerId);
    if (customer.deleted) return null;

    const defaultPmId = (customer as Stripe.Customer).invoice_settings?.default_payment_method;
    if (!defaultPmId || typeof defaultPmId !== 'string') return null;

    return this.stripe.paymentMethods.retrieve(defaultPmId);
  } catch (error) {
    this.logger.warn(`Failed to get payment method for ${customerId}: ${error.message}`);
    return null;
  }
}

/**
 * Get invoice PDF URL with customer ownership validation
 */
async getInvoicePdfWithValidation(
  invoiceId: string,
  expectedCustomerId: string,
): Promise<{ url: string; invoice: Stripe.Invoice }> {
  if (!this.stripe) {
    throw new BadRequestException('Payment system not configured');
  }

  const invoice = await this.stripe.invoices.retrieve(invoiceId);

  if (invoice.customer !== expectedCustomerId) {
    throw new ForbiddenException('Invoice does not belong to this customer');
  }

  if (!invoice.invoice_pdf) {
    throw new NotFoundException('Invoice PDF not available');
  }

  return { url: invoice.invoice_pdf, invoice };
}

/**
 * Extend trial period for a subscription
 */
async extendTrialPeriod(
  subscriptionId: string,
  additionalDays: number,
): Promise<Stripe.Subscription> {
  if (!this.stripe) {
    throw new BadRequestException('Payment system not configured');
  }

  const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

  if (subscription.status !== 'trialing') {
    throw new BadRequestException('Subscription is not on trial');
  }

  const currentTrialEnd = subscription.trial_end || Math.floor(Date.now() / 1000);
  const newTrialEnd = currentTrialEnd + (additionalDays * 24 * 60 * 60);

  // Stripe limits trial to 730 days
  const maxTrialEnd = Math.floor(Date.now() / 1000) + (730 * 24 * 60 * 60);
  if (newTrialEnd > maxTrialEnd) {
    throw new BadRequestException('Trial cannot exceed 730 days total');
  }

  return this.stripe.subscriptions.update(subscriptionId, {
    trial_end: newTrialEnd,
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct database billing changes | Stripe API with local sync | Standard | Consistent billing state |
| Redirect to Stripe for PDF | Proxy through API | This phase | Better UX, control |
| Manual grace period tracking | SubscriptionLapseService | Existing | Automated, reliable |
| Email-based credit requests | Admin API endpoint | This phase | Auditable, immediate |

**Deprecated/outdated:**
- Direct Stripe dashboard for admin operations: Use admin API for audit trail
- Modifying subscription entities without Stripe sync: Always sync both

## Open Questions

Things that couldn't be fully resolved:

1. **Proration Calculation Preview**
   - What we know: Stripe calculates proration automatically with `always_invoice`
   - What's unclear: Should we show proration amount preview before confirming?
   - Recommendation: Use Stripe's `upcoming invoice` API for preview (optional enhancement)

2. **Credit Warning Threshold**
   - What we know: Need soft limit with warning for large credits
   - What's unclear: Exact threshold amount
   - Recommendation: Start with $500 (50000 cents), make configurable

3. **Tier Downgrade with Exceeded Limits**
   - What we know: CONTEXT.md says allow downgrade with warning
   - What's unclear: Should we enforce any hard blocks?
   - Recommendation: Log warning, allow proceed per CONTEXT.md decision

4. **Trial Extension Email Template**
   - What we know: Admin can choose to notify tenant
   - What's unclear: Exact email content for admin-initiated extensions
   - Recommendation: Create simple template indicating extension and new end date

## Sources

### Primary (HIGH confidence)
- [Stripe API: Customer Balance Transaction](https://docs.stripe.com/api/customer_balance_transactions/create) - Credit/debit operations
- [Stripe API: List Invoices](https://docs.stripe.com/api/invoices/list) - Invoice listing with customer filter
- [Stripe API: Update Subscription](https://docs.stripe.com/api/subscriptions/update) - Tier change with proration
- [Stripe API: The Invoice Object](https://docs.stripe.com/api/invoices/object) - Invoice PDF URL field
- [Stripe Documentation: Prorations](https://docs.stripe.com/billing/subscriptions/prorations) - Proration behavior
- [Stripe Documentation: Trials](https://docs.stripe.com/billing/subscriptions/trials) - Trial extension via trial_end

### Secondary (MEDIUM confidence)
- Existing codebase: `api/src/modules/payments/payments.service.ts` - Stripe client patterns
- Existing codebase: `api/src/modules/subscriptions/subscriptions.service.ts` - Subscription management
- Existing codebase: `api/src/modules/trials/trials.service.ts` - Trial management patterns
- Existing codebase: `api/src/modules/subscription-lapse/subscription-lapse.service.ts` - Grace period patterns
- Existing codebase: `api/src/modules/admin/admin.service.ts` - Admin endpoint patterns

### Tertiary (LOW confidence)
- None - all patterns verified with official docs or codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Stripe library exists, patterns verified in codebase
- Architecture: HIGH - Extends existing AdminController patterns
- Stripe API: HIGH - Verified against official Stripe documentation
- Pitfalls: HIGH - Derived from Stripe docs and real-world experience

**Research date:** 2026-01-18
**Valid until:** 60 days (Stripe API stable, codebase-specific patterns)

---

*Phase: 08-billing-operations*
*Research completed: 2026-01-18*
