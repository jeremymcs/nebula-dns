# Phase 14: Billing Portal UI - Research

**Researched:** 2026-01-19
**Domain:** Admin billing management UI with Stripe integration
**Confidence:** HIGH

## Summary

Phase 14 builds the admin billing management interface for Mission Control. The backend API endpoints already exist from Phase 8 (admin billing operations) and Phase 10 (payment methods). The UI needs to consume these endpoints and provide interfaces for subscription management, invoice viewing, credit application, tier changes, trial/grace period extensions, and payment method management.

The existing codebase provides strong patterns to follow: SWR hooks in `useAdminApi.ts`, reusable UI components in `ui/src/components/ui/`, and the MSP detail page as a layout reference. The main new complexity is Stripe Elements integration for adding payment methods via SetupIntent.

**Primary recommendation:** Build as a dedicated billing page at `/mission-control/msps/[id]/billing` using existing admin hooks patterns, with Stripe Elements in a modal for payment method collection.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SWR | 2.2.4 | Data fetching with caching | Already used for admin hooks |
| React Hook Form | 7.71.1 | Form handling | Already in project |
| Zod | 4.3.5 | Validation | Already in project |
| @headlessui/react | 1.7.18 | Modal/Dialog components | Already used for Modal component |
| @heroicons/react | 2.1.1 | Icons | Already used throughout |
| clsx | 2.1.0 | Class utilities | Already used |

### New Required (Payment Method Modal)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @stripe/stripe-js | latest | Stripe.js loader | Required for Stripe Elements |
| @stripe/react-stripe-js | latest | React bindings for Elements | Required for PaymentElement |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PaymentElement | CardElement | PaymentElement is newer, supports more methods, recommended by Stripe |
| Full billing page | Slide-over panel | Full page better for complex billing operations per CONTEXT.md decisions |

**Installation:**
```bash
cd ui && npm install @stripe/stripe-js @stripe/react-stripe-js
```

## Architecture Patterns

### Recommended Project Structure
```
ui/src/
├── app/mission-control/msps/[id]/billing/
│   └── page.tsx                    # Billing page (main component)
├── components/billing/             # Billing-specific components
│   ├── SubscriptionStatusCard.tsx  # Subscription overview
│   ├── InvoiceTable.tsx           # Invoice list with expandable rows
│   ├── PaymentMethodList.tsx      # Payment method cards/list
│   ├── AddPaymentMethodModal.tsx  # Stripe Elements modal
│   ├── ApplyCreditModal.tsx       # Credit application form
│   ├── ChangeTierModal.tsx        # Tier comparison & change
│   ├── ExtendTrialModal.tsx       # Trial extension form
│   └── ExtendGraceModal.tsx       # Grace period extension form
├── hooks/
│   └── useAdminBilling.ts         # SWR hooks for billing endpoints
└── lib/
    └── stripe.ts                  # Stripe initialization
```

### Pattern 1: Admin Billing Hooks (Following useAdminApi.ts)
**What:** SWR hooks for billing API endpoints
**When to use:** All billing data fetching
**Example:**
```typescript
// Source: Based on existing useAdminApi.ts patterns
export interface SubscriptionStatus {
  tenantId: string
  tenantName: string
  tier: 'home' | 'enterprise' | 'msp'
  status: string
  billingCycle: string
  currentPeriodEnd?: string
  stripeCustomerId?: string
  stripeCustomerLink?: string
  billingEmail?: string
  paymentMethodLast4?: string
  cancelAtPeriodEnd: boolean
  trialEnd?: string
  gracePeriod?: {
    startDate: string
    daysRemaining: number
  }
}

export function useAdminSubscriptionStatus(tenantId: string) {
  return useSWR<SubscriptionStatus>(
    `/admin/tenants/${tenantId}/billing/subscription`,
    adminFetcher,
    defaultConfig
  )
}
```

### Pattern 2: Stripe Elements Provider Setup
**What:** Initialize Stripe and wrap payment form
**When to use:** Payment method collection modal
**Example:**
```typescript
// Source: Stripe docs - https://docs.stripe.com/sdks/stripejs-react
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function AddPaymentMethodModal({ clientSecret, onSuccess }) {
  return (
    <Modal isOpen onClose={...}>
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <PaymentForm onSuccess={onSuccess} />
      </Elements>
    </Modal>
  )
}
```

### Pattern 3: SetupIntent Flow for Adding Payment Methods
**What:** Create SetupIntent on backend, confirm on frontend
**When to use:** Adding new payment methods
**Example:**
```typescript
// 1. Get SetupIntent from backend
const { data } = await adminRequest('POST', `/admin/tenants/${tenantId}/billing/payment-methods`)
const { clientSecret } = data

// 2. Open modal with Elements provider using clientSecret

// 3. In PaymentForm component:
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js'

function PaymentForm({ onSuccess }) {
  const stripe = useStripe()
  const elements = useElements()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return

    const { error } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: 'if_required',
    })

    if (error) {
      // Handle error
    } else {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <Button type="submit" disabled={!stripe}>Add Payment Method</Button>
    </form>
  )
}
```

### Anti-Patterns to Avoid
- **Direct Stripe API calls from frontend:** Always go through backend for security
- **Storing card data in state:** Use Stripe Elements which never exposes card data
- **Skipping confirmation modals:** All billing actions need confirmation per CONTEXT.md
- **Hardcoding Stripe keys:** Use environment variables

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Card input UI | Custom inputs | Stripe PaymentElement | PCI compliance, SCA handling |
| Invoice PDF generation | Backend PDF creation | Stripe's invoice_pdf URL | Already provided by Stripe |
| Credit card validation | Regex validation | Stripe Elements validation | Edge cases, international cards |
| Payment method icons | Custom SVGs | Stripe provides brand info | Automatically updated |

**Key insight:** Stripe handles the sensitive parts (card collection, PCI compliance). Our UI just orchestrates the flow.

## Common Pitfalls

### Pitfall 1: Not Loading Stripe Before Render
**What goes wrong:** Components fail if Stripe isn't loaded yet
**Why it happens:** `useStripe()` returns null until loaded
**How to avoid:** Always check `if (!stripe || !elements) return` before submission
**Warning signs:** Submit button doesn't work, silent failures

### Pitfall 2: Not Refreshing Data After Mutations
**What goes wrong:** UI shows stale data after adding payment method or changing tier
**Why it happens:** SWR cache not invalidated
**How to avoid:** Call `mutate()` after successful mutations
**Warning signs:** User has to refresh page to see changes

### Pitfall 3: Missing Error States for Empty Billing Data
**What goes wrong:** UI crashes or shows blank when tenant has no Stripe customer
**Why it happens:** Backend returns empty objects for tenants without billing setup
**How to avoid:** Handle `stripeCustomerId: null` case with helpful empty state
**Warning signs:** "No billing information" should show CTA to add payment method

### Pitfall 4: Not Disabling Actions During Loading
**What goes wrong:** Double-submissions, race conditions
**Why it happens:** User clicks button while request in flight
**How to avoid:** Track loading state, disable buttons during submission
**Warning signs:** Duplicate credits applied, duplicate tier change requests

### Pitfall 5: Forgetting Invoice Pagination
**What goes wrong:** UI loads all invoices at once causing slow load
**Why it happens:** Ignoring the pagination cursor from API
**How to avoid:** Implement Load More with cursor-based pagination
**Warning signs:** Slow page load for tenants with many invoices

## Code Examples

Verified patterns from existing codebase:

### Admin API Request Pattern (for mutations)
```typescript
// Source: Based on ui/src/hooks/useAdminApi.ts pattern
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export async function adminRequest<T>(
  method: 'POST' | 'PATCH' | 'DELETE',
  endpoint: string,
  body?: unknown
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
  if (!token) throw new Error('Admin authentication required')

  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `Request failed (${res.status})`)
  }

  return res.json()
}
```

### Confirmation Modal Pattern
```typescript
// Source: ui/src/components/ui/Modal.tsx - ConfirmDialog
<ConfirmDialog
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={handleConfirmedAction}
  title="Apply Credit"
  message={`Apply $${(amountCents / 100).toFixed(2)} credit to ${tenantName}?`}
  confirmText="Apply Credit"
  variant="info"
  isLoading={isApplying}
/>
```

### StatCard Pattern for Billing Overview
```typescript
// Source: ui/src/components/ui/Card.tsx - StatCard
<StatCard
  title="Current Tier"
  value={subscription.tier.toUpperCase()}
  icon={<CheckBadgeIcon className="h-6 w-6" />}
  variant="primary"
/>
```

### Invoice Row Expansion Pattern
```typescript
// Source: Pattern from expandable table rows in codebase
const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null)

<tr onClick={() => setExpandedInvoice(invoice.id === expandedInvoice ? null : invoice.id)}>
  {/* Invoice row */}
</tr>
{expandedInvoice === invoice.id && (
  <tr>
    <td colSpan={6}>
      {/* Line items */}
    </td>
  </tr>
)}
```

## Existing API Endpoints Summary

All endpoints require AdminAuthGuard (`admin_token`). Base path: `/admin/tenants/:tenantId/billing`

| Endpoint | Method | Purpose | Response DTO |
|----------|--------|---------|--------------|
| `/subscription` | GET | Subscription status | `SubscriptionStatusResponseDto` |
| `/invoices` | GET | List invoices (paginated) | `InvoiceListResponseDto` |
| `/invoices/:invoiceId/pdf` | GET | Download invoice PDF | PDF stream |
| `/credits` | POST | Apply credit | `CreditAppliedResponseDto` |
| `/tier` | POST | Change tier | `TierChangeResponseDto` |
| `/trial/extend` | POST | Extend trial | `ExtensionResponseDto` |
| `/grace/extend` | POST | Extend grace period | `ExtensionResponseDto` |
| `/payment-methods` | GET | List payment methods | `PaymentMethodListResponseDto` |
| `/payment-methods` | POST | Create SetupIntent | `CreateSetupIntentResponseDto` |
| `/payment-methods/default` | PATCH | Set default | `SetDefaultPaymentMethodResponseDto` |
| `/payment-methods/:id` | DELETE | Delete payment method | `DeletePaymentMethodResponseDto` |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CardElement | PaymentElement | 2022+ | PaymentElement handles more payment methods, better SCA |
| confirmCardSetup | confirmSetup | Stripe recommends | Works with PaymentElement |
| Manual address collection | Elements handles billing | Stripe Elements | Less code, better UX |

**Deprecated/outdated:**
- `stripe.handleCardSetup()` - Use `stripe.confirmSetup()` instead
- `react-stripe-elements` (old package) - Use `@stripe/react-stripe-js`

## Open Questions

Things that couldn't be fully resolved:

1. **Credit expiration date handling**
   - What we know: CONTEXT.md mentions optional expiry date for credits
   - What's unclear: Current backend `ApplyCreditDto` doesn't have expiry field
   - Recommendation: Implement UI without expiry first, add if backend updated

2. **Tier feature comparison data**
   - What we know: CONTEXT.md wants side-by-side comparison before tier change
   - What's unclear: Where tier feature definitions come from (hardcoded vs API)
   - Recommendation: Hardcode tier features in frontend initially, can be made dynamic later

3. **Invoice line items expansion**
   - What we know: CONTEXT.md wants expandable rows with line items
   - What's unclear: Current `InvoiceDto` doesn't include line items
   - Recommendation: May need additional API call to fetch invoice details, or accept limitation

## Sources

### Primary (HIGH confidence)
- `/Users/jeremymcspadden/Github/nebula-dns/api/src/modules/admin/admin.controller.ts` - All billing endpoints defined
- `/Users/jeremymcspadden/Github/nebula-dns/api/src/modules/admin/admin-billing.service.ts` - Service implementation
- `/Users/jeremymcspadden/Github/nebula-dns/api/src/modules/admin/dto/billing.dto.ts` - All DTOs
- `/Users/jeremymcspadden/Github/nebula-dns/ui/src/hooks/useAdminApi.ts` - Existing admin hooks pattern
- `/Users/jeremymcspadden/Github/nebula-dns/ui/src/app/mission-control/msps/[id]/page.tsx` - MSP detail page pattern

### Secondary (MEDIUM confidence)
- [Stripe React Docs](https://docs.stripe.com/sdks/stripejs-react) - React Stripe.js integration
- [Stripe SetupIntent Reference](https://docs.stripe.com/js/setup_intents) - confirmSetup API

### Tertiary (LOW confidence)
- Web search results on Stripe best practices 2025 - PaymentElement is recommended

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing project libraries, only adding Stripe packages
- Architecture: HIGH - Following established patterns in codebase
- Pitfalls: HIGH - Based on actual API analysis and Stripe documentation

**Research date:** 2026-01-19
**Valid until:** 60 days (stable patterns, API already exists)

## Plan Breakdown Recommendation

Given the CONTEXT.md decisions and research findings, recommend 3 plans:

### Plan 14-01: Billing Page Layout & Subscription Display
- Create billing page route `/mission-control/msps/[id]/billing`
- Add billing hooks (`useAdminBilling.ts`)
- Build SubscriptionStatusCard with stat cards
- Add alert banner for critical states (suspended)
- Navigate from MSP detail "View Billing" button

### Plan 14-02: Invoice History & Actions UI
- Build InvoiceTable with expandable rows
- Implement PDF download (icon + View link)
- Add ApplyCreditModal with confirmation
- Add ChangeTierModal with tier comparison
- Add ExtendTrialModal and ExtendGraceModal

### Plan 14-03: Payment Methods Management
- Install Stripe packages
- Create Stripe initialization in `lib/stripe.ts`
- Build PaymentMethodList component
- Build AddPaymentMethodModal with Stripe Elements
- Implement set default and delete actions
