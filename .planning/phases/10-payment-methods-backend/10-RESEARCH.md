# Phase 10: Payment Methods Backend - Research

**Researched:** 2026-01-18
**Domain:** Stripe PaymentMethod API, NestJS Admin Endpoints
**Confidence:** HIGH

## Summary

Phase 10 implements three admin API endpoints for managing tenant payment methods via Stripe: listing payment methods (PAY-01), adding a payment method (PAY-02), and setting the default payment method (PAY-03). The existing codebase has strong patterns to follow from Phase 8's admin billing operations.

The Stripe integration is already established in `PaymentsService` with a properly initialized Stripe client using `STRIPE_SECRET_KEY`. The subscription entity stores `stripeCustomerId` which is the key reference for all Stripe customer operations. The existing `AdminBillingService` pattern demonstrates how to validate tenant existence, verify Stripe customer setup, and audit log operations.

**Primary recommendation:** Extend `PaymentsService` with three new methods for payment method operations, then expose them through new endpoints in `AdminController` following the exact patterns established in Phase 8 billing operations (route structure, DTOs, guard usage, audit logging).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe | ^20.0.0 | Stripe API client | Already in use, current major version |
| @nestjs/common | - | NestJS framework | Project standard |
| class-validator | - | DTO validation | Project standard |
| class-transformer | - | DTO transformation | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @nestjs/swagger | - | API documentation | All endpoints need Swagger decorators |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct PaymentMethod.attach() | SetupIntent flow | SetupIntent is recommended by Stripe for better auth/SCA handling, but adds complexity. For admin-only operations where the admin is adding cards on behalf of tenant, direct approach is simpler. |

## Architecture Patterns

### Recommended Project Structure

Extend existing files (no new modules needed):

```
api/src/modules/
├── payments/
│   └── payments.service.ts         # Add: listPaymentMethods(), attachPaymentMethod(), setDefaultPaymentMethod()
├── admin/
│   ├── admin.controller.ts         # Add: 3 new endpoints under /admin/tenants/:tenantId/billing/payment-methods/*
│   ├── admin-billing.service.ts    # Add: listPaymentMethods(), addPaymentMethod(), setDefaultPaymentMethod()
│   └── dto/
│       └── billing.dto.ts          # Add: PaymentMethodDto, AddPaymentMethodDto, PaymentMethodListResponseDto, etc.
```

### Pattern 1: Admin Billing Service Layer

**What:** AdminBillingService acts as orchestrator between controller, PaymentsService, and AuditLogsService
**When to use:** All admin billing operations that require tenant validation + Stripe + audit logging
**Example:**
```typescript
// Source: admin-billing.service.ts (existing pattern)
async listPaymentMethods(tenantId: string): Promise<PaymentMethodListResponseDto> {
  // 1. Find tenant (throw NotFoundException if not found)
  const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
  if (!tenant) throw new NotFoundException('Tenant not found');

  // 2. Get subscription to find Stripe customer ID
  const subscription = await this.subscriptionsService.getSubscription(tenantId);

  // 3. Return empty if no billing setup
  if (!subscription?.stripeCustomerId) {
    return { data: [], total: 0 };
  }

  // 4. Fetch from Stripe via PaymentsService
  const paymentMethods = await this.paymentsService.listPaymentMethods(
    subscription.stripeCustomerId
  );

  // 5. Map to DTOs and return
  return { data: paymentMethods.map(pm => this.mapPaymentMethod(pm)), total: paymentMethods.length };
}
```

### Pattern 2: Controller Endpoint Structure

**What:** Follow exact pattern from existing billing endpoints
**When to use:** All three new endpoints
**Example:**
```typescript
// Source: admin.controller.ts (existing pattern)
@Get('tenants/:tenantId/billing/payment-methods')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('admin-jwt')
@ApiOperation({
  summary: 'List tenant payment methods',
  description: 'Returns all payment methods attached to the tenant\'s Stripe customer.',
})
@ApiParam({ name: 'tenantId', description: 'Tenant UUID', type: 'string' })
@ApiResponse({ status: 200, description: 'Payment methods retrieved', type: PaymentMethodListResponseDto })
@ApiResponse({ status: 404, description: 'Tenant not found' })
@ApiResponse({ status: 401, description: 'Admin authentication required' })
async listPaymentMethods(
  @Param('tenantId', ParseUUIDPipe) tenantId: string,
): Promise<PaymentMethodListResponseDto> {
  return this.adminBillingService.listPaymentMethods(tenantId);
}
```

### Pattern 3: SetupIntent Flow for Adding Payment Methods

**What:** Use Stripe SetupIntent for secure payment method collection
**When to use:** PAY-02 - Adding a payment method
**Example:**
```typescript
// Source: Stripe official recommendation
// Step 1: Backend creates SetupIntent
async createSetupIntent(customerId: string): Promise<{ clientSecret: string }> {
  const setupIntent = await this.stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    usage: 'off_session', // Allow future off-session charges
  });
  return { clientSecret: setupIntent.client_secret };
}

// Step 2: Frontend uses client_secret to collect card via Stripe.js
// Step 3: Frontend confirms SetupIntent with Stripe.js
// Step 4: Payment method is auto-attached to customer on success
```

### Anti-Patterns to Avoid
- **Direct PaymentMethod.attach() without SetupIntent:** Leads to higher decline rates and SCA issues
- **Storing card details:** Never store raw card data; only Stripe payment method IDs
- **Not checking stripeCustomerId:** Must validate customer exists before operations
- **Allowing delete of only/default payment method:** Need protection logic

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Card validation | Custom regex/luhn check | Stripe validates everything | Stripe handles all validation including SCA |
| Customer creation | Manual Stripe customer create | Existing getOrCreateCustomer() in PaymentsService | Already handles find-or-create pattern |
| Default payment setting | Custom tracking | Stripe invoice_settings.default_payment_method | Stripe tracks this natively |

**Key insight:** Let Stripe do the heavy lifting. The admin is just orchestrating API calls - validation, storage, and compliance are all handled by Stripe.

## Common Pitfalls

### Pitfall 1: No Stripe Customer Exists
**What goes wrong:** Tenant has no stripeCustomerId, operations fail
**Why it happens:** Tenant signed up for free tier or hasn't gone through Stripe checkout
**How to avoid:** Check for stripeCustomerId before operations, return empty/create as appropriate
**Warning signs:** NotFoundException from Stripe on customer operations

### Pitfall 2: Deleting Only Payment Method
**What goes wrong:** Admin deletes last payment method, subscription charges fail
**Why it happens:** No protection logic
**How to avoid:** Count payment methods before delete; reject if count === 1
**Warning signs:** Subscription falls into past_due status

### Pitfall 3: Deleting Default Payment Method Without Fallback
**What goes wrong:** Default is deleted, no other payment method becomes default
**Why it happens:** Stripe doesn't auto-promote another method
**How to avoid:** If deleting default, either: (a) reject, or (b) set another method as default first
**Warning signs:** Invoice charges fail due to no default payment method

### Pitfall 4: Not Handling Stripe API Errors Gracefully
**What goes wrong:** Raw Stripe errors leak to frontend
**Why it happens:** No error normalization
**How to avoid:** Wrap Stripe calls in try/catch, log full error, return normalized BadRequestException
**Warning signs:** Error messages exposing Stripe internal details

### Pitfall 5: Missing Audit Logs
**What goes wrong:** No trail of payment method changes
**Why it happens:** Forgot to add audit logging
**How to avoid:** Follow Phase 8 pattern - audit log every mutation (add, set-default, delete)
**Warning signs:** Admin actions not visible in audit logs

## Code Examples

Verified patterns from existing codebase:

### Stripe Client Usage Pattern
```typescript
// Source: api/src/modules/payments/payments.service.ts
// Existing pattern for Stripe client initialization and null-safe usage
private readonly stripe: Stripe | null;

constructor(private readonly configService: ConfigService) {
  const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
  if (stripeSecretKey) {
    this.stripe = new Stripe(stripeSecretKey);
  } else {
    this.stripe = null;
  }
}

isConfigured(): boolean {
  return this.stripe !== null;
}

// Always check before use
async someMethod(): Promise<Result> {
  if (!this.stripe) {
    throw new BadRequestException('Payment system not configured');
  }
  // ... use this.stripe
}
```

### Listing Payment Methods (Stripe API)
```typescript
// Source: Stripe API Reference - List a Customer's PaymentMethods
// https://docs.stripe.com/api/payment_methods/customer_list
async listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
  if (!this.stripe) {
    throw new BadRequestException('Payment system not configured');
  }

  try {
    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card', // Filter to cards only
    });
    return paymentMethods.data;
  } catch (error) {
    this.logger.error(`Failed to list payment methods for ${customerId}`, error);
    throw new BadRequestException('Failed to list payment methods');
  }
}
```

### Setting Default Payment Method
```typescript
// Source: Stripe API Reference - Update Customer invoice_settings
// https://docs.stripe.com/api/customers/update
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
  } catch (error) {
    this.logger.error(`Failed to set default payment method`, error);
    throw new BadRequestException('Failed to set default payment method');
  }
}
```

### Admin Endpoint Pattern with Audit Logging
```typescript
// Source: api/src/modules/admin/admin-billing.service.ts (existing pattern)
async setDefaultPaymentMethod(
  tenantId: string,
  paymentMethodId: string,
  adminId: string,
): Promise<SetDefaultPaymentMethodResponseDto> {
  // 1. Find tenant
  const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
  if (!tenant) throw new NotFoundException('Tenant not found');

  // 2. Verify billing setup
  const subscription = await this.subscriptionsService.getSubscription(tenantId);
  if (!subscription?.stripeCustomerId) {
    throw new BadRequestException('Tenant does not have billing configured');
  }

  // 3. Verify payment method belongs to customer
  const pm = await this.paymentsService.getPaymentMethod(
    paymentMethodId,
    subscription.stripeCustomerId, // Ownership validation
  );

  // 4. Set as default
  await this.paymentsService.setDefaultPaymentMethod(
    subscription.stripeCustomerId,
    paymentMethodId,
  );

  // 5. Audit log
  await this.auditLogsService.log({
    tenantId,
    userId: null,
    action: 'billing_payment_method_default_set', // New action type
    resourceType: 'subscription',
    resourceId: subscription.stripeCustomerId,
    resourceName: tenant.name,
    newValue: {
      paymentMethodId,
      last4: pm.card?.last4,
      brand: pm.card?.brand,
      adminId,
    },
  });

  return {
    paymentMethodId,
    message: `Successfully set payment method ending in ${pm.card?.last4} as default`,
  };
}
```

### DTO Pattern for Payment Methods
```typescript
// Source: api/src/modules/admin/dto/billing.dto.ts (extend with new DTOs)
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

  @ApiProperty({ description: 'When the payment method was created' })
  created: string;
}

export class PaymentMethodListResponseDto {
  @ApiProperty({ type: [PaymentMethodDto] })
  data: PaymentMethodDto[];

  @ApiProperty({ description: 'Total count' })
  total: number;
}

export class CreateSetupIntentResponseDto {
  @ApiProperty({ description: 'Client secret for Stripe.js SetupIntent confirmation' })
  clientSecret: string;
}

export class SetDefaultPaymentMethodDto {
  @ApiProperty({ description: 'Payment method ID to set as default' })
  @IsString()
  paymentMethodId: string;
}

export class SetDefaultPaymentMethodResponseDto {
  @ApiProperty({ description: 'The payment method that was set as default' })
  paymentMethodId: string;

  @ApiProperty({ description: 'Success message' })
  message: string;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PaymentMethod.attach() directly | SetupIntent flow | Stripe recommendation 2023+ | Better SCA compliance, fewer declines |
| Sources (old Stripe API) | PaymentMethods API | Deprecated years ago | Modern API with better features |

**Deprecated/outdated:**
- Stripe Sources API: Replaced by PaymentMethods API
- Direct attach without SetupIntent: Works but not recommended for production

## Open Questions

Things that couldn't be fully resolved:

1. **Delete Endpoint Scope**
   - What we know: CONTEXT.md says "Claude's discretion on whether to include DELETE endpoint in this phase"
   - What's unclear: User preference on including delete functionality
   - Recommendation: Include DELETE endpoint with protection (cannot delete only/default payment method) - it completes the CRUD pattern and will be needed for Phase 14 UI

2. **Auto-Create Stripe Customer**
   - What we know: CONTEXT.md says "Claude's discretion on Stripe customer auto-creation if tenant has none"
   - What's unclear: Should CreateSetupIntent automatically create customer?
   - Recommendation: Yes - use existing `getOrCreateCustomer()` pattern from PaymentsService. If tenant has no stripeCustomerId, create one before SetupIntent.

3. **Payment Types**
   - What we know: CONTEXT.md says "Claude's discretion on payment types to support (cards only vs all Stripe types)"
   - What's unclear: Business need for other payment types
   - Recommendation: Cards only for Phase 10. Bank accounts, SEPA, etc. can be added later if needed.

## Implementation Approach

### Recommended Endpoints

| Endpoint | Method | Path | Purpose |
|----------|--------|------|---------|
| List | GET | `/admin/tenants/:tenantId/billing/payment-methods` | PAY-01: List all payment methods |
| Add | POST | `/admin/tenants/:tenantId/billing/payment-methods` | PAY-02: Create SetupIntent for adding payment method |
| Set Default | PATCH | `/admin/tenants/:tenantId/billing/payment-methods/default` | PAY-03: Set default payment method |
| Delete (optional) | DELETE | `/admin/tenants/:tenantId/billing/payment-methods/:paymentMethodId` | Remove a payment method |

### New Audit Actions Required

Add to `AuditAction` type in audit-log.entity.ts:
- `billing_payment_method_added`
- `billing_payment_method_default_set`
- `billing_payment_method_deleted` (if DELETE implemented)

### Flow for PAY-02 (Add Payment Method)

1. Admin calls POST `/admin/tenants/:tenantId/billing/payment-methods`
2. Backend gets/creates Stripe customer for tenant
3. Backend creates SetupIntent with customer ID
4. Backend returns `clientSecret` to admin UI
5. Admin UI uses Stripe.js to collect card details and confirm SetupIntent
6. Stripe auto-attaches payment method to customer on confirmation
7. Admin UI shows success; payment method appears in list

## Sources

### Primary (HIGH confidence)
- Existing codebase: `api/src/modules/payments/payments.service.ts` - Stripe client patterns
- Existing codebase: `api/src/modules/admin/admin-billing.service.ts` - Admin billing operation patterns
- Existing codebase: `api/src/modules/admin/admin.controller.ts` - Endpoint patterns
- Existing codebase: `api/src/modules/admin/dto/billing.dto.ts` - DTO patterns

### Secondary (MEDIUM confidence)
- [Stripe PaymentMethods API](https://docs.stripe.com/api/payment_methods) - List, attach, detach operations
- [Stripe SetupIntents API](https://docs.stripe.com/api/setup_intents) - Recommended flow for saving cards
- [Stripe Customer Update](https://docs.stripe.com/api/customers/update) - Setting default payment method

### Tertiary (LOW confidence)
- None - all findings verified with official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing dependencies, well-documented patterns
- Architecture: HIGH - Directly extending existing patterns from Phase 8
- Pitfalls: HIGH - Based on existing codebase patterns and Stripe documentation

**Research date:** 2026-01-18
**Valid until:** 2026-02-18 (30 days - stable APIs, no expected changes)
