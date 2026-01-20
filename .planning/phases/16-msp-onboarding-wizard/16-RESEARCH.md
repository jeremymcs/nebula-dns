# Phase 16: MSP Onboarding Wizard - Research

**Researched:** 2026-01-19
**Domain:** Multi-step wizard UI, form validation, admin API integration
**Confidence:** HIGH

## Summary

This phase builds a multi-step wizard for admins to onboard new MSP accounts through Mission Control. The backend API endpoint already exists (`POST /admin/msp/tenants` with `CreateMspTenantDto`), and the codebase has established patterns for both wizards and forms.

The codebase provides:
- An existing onboarding wizard pattern (`ui/src/components/onboarding/OnboardingWizard.tsx`) with step navigation, progress indicators, and framer-motion animations
- React Hook Form + Zod validation pattern (documented in `FORM_VALIDATION_QUICKSTART.md`)
- Admin API helper patterns in `useAdminApi.ts` with `adminFetcher`
- Modal component for dialog-based wizards
- Input, Select, Button components with error states

**Primary recommendation:** Build a new MSP onboarding wizard as a dedicated page at `/mission-control/msps/new` (not modal) following the existing wizard pattern structure, using React Hook Form with Zod for validation and the existing admin API patterns.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-hook-form | ^7.71.1 | Form state management | Already used throughout codebase |
| @hookform/resolvers | ^5.2.2 | Zod integration | Links RHF to Zod schemas |
| zod | ^4.3.5 | Schema validation | Established pattern in `ui/src/lib/validations/` |
| framer-motion | ^12.23.26 | Step transitions | Used in existing OnboardingWizard |
| swr | ^2.2.4 | Data mutations | Used for API calls with `mutate` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx | ^2.1.0 | Conditional classes | Styling step states |
| @heroicons/react | ^2.1.1 | Icons | Step indicators, UI elements |
| @headlessui/react | ^1.7.18 | Accessible dialogs | Cancel confirmation modal |

### No New Packages Required
All required libraries are already installed. The wizard can be built entirely with existing dependencies.

## Architecture Patterns

### Recommended Project Structure
```
ui/src/
  app/
    mission-control/
      msps/
        new/
          page.tsx               # Wizard page
  components/
    admin/
      msp-onboarding/
        index.tsx                # Re-exports
        MspOnboardingWizard.tsx  # Main wizard component
        types.ts                 # Step types, form data types
        steps/
          CompanyInfoStep.tsx    # Step 1: Company info
          AdminUserStep.tsx      # Step 2: Admin user setup
          SettingsStep.tsx       # Step 3: Tier & settings
          ReviewStep.tsx         # Step 4: Review & confirm
        SuccessConfirmation.tsx  # Post-creation confirmation
  lib/
    validations/
      msp-onboarding.schema.ts   # Zod schema for wizard form
  hooks/
    useAdminApi.ts               # UPDATE: Add createMsp mutation
```

### Pattern 1: Multi-Step Wizard State Management
**What:** Centralized wizard state with step tracking and form data
**When to use:** Multi-step forms with validation between steps
**Example:**
```typescript
// Source: ui/src/components/onboarding/OnboardingWizard.tsx
interface WizardState {
  step: number
  formData: MspOnboardingFormData
  isComplete: boolean
  isSubmitting: boolean
}

const [state, setState] = useState<WizardState>({
  step: 0,
  formData: initialFormData,
  isComplete: false,
  isSubmitting: false,
})

const updateState = useCallback((updates: Partial<WizardState>) => {
  setState((prev) => ({ ...prev, ...updates }))
}, [])
```

### Pattern 2: Step-Based Form Validation
**What:** Validate only current step fields before allowing progression
**When to use:** Wizard forms where each step has its own validation
**Example:**
```typescript
// Source: CONTEXT.md decision - Dual validation
// Create per-step schemas
const step1Schema = z.object({
  name: z.string().min(2).max(255),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
})

const step2Schema = z.object({
  adminEmail: z.string().email(),
  adminName: z.string().min(2).max(255).optional(),
})

// Full schema for final submission
const fullSchema = step1Schema.merge(step2Schema).merge(step3Schema)

// Use mode: 'onBlur' + trigger() on Next
const { trigger } = useForm({ mode: 'onBlur' })
const handleNext = async () => {
  const isValid = await trigger(stepFields[currentStep])
  if (isValid) goNext()
}
```

### Pattern 3: Progress Indicator with Clickable Steps
**What:** Numbered stepper showing current position with jump-to navigation
**When to use:** 4+ step wizards where users may want to review
**Example:**
```typescript
// Source: ui/src/components/onboarding/OnboardingWizard.tsx
<div className="flex items-center gap-2">
  {STEPS.map((step, index) => (
    <div key={step.id} className="flex items-center">
      <button
        onClick={() => canJumpTo(index) && setStep(index)}
        disabled={!canJumpTo(index)}
        className={clsx(
          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
          index < currentStep ? 'bg-success-500 text-white cursor-pointer' :
          index === currentStep ? 'bg-nebula-500 text-white' :
          'bg-space-200 dark:bg-space-700 text-space-500'
        )}
      >
        {index < currentStep ? '✓' : index + 1}
      </button>
      {index < STEPS.length - 1 && (
        <div className={clsx('w-8 h-0.5 mx-1',
          index < currentStep ? 'bg-success-500' : 'bg-space-200 dark:bg-space-700'
        )} />
      )}
    </div>
  ))}
</div>
```

### Pattern 4: localStorage Draft Persistence
**What:** Save wizard progress to localStorage for recovery
**When to use:** Long forms where users may accidentally navigate away
**Example:**
```typescript
// Source: CONTEXT.md decision
const STORAGE_KEY = 'msp-onboarding-draft'

// Save on form change
useEffect(() => {
  if (formData.name) { // Only save if there's meaningful data
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      formData,
      step: currentStep,
      savedAt: Date.now(),
    }))
  }
}, [formData, currentStep])

// Restore on mount
useEffect(() => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    const { formData, step, savedAt } = JSON.parse(saved)
    // Only restore if saved < 24 hours ago
    if (Date.now() - savedAt < 24 * 60 * 60 * 1000) {
      setFormData(formData)
      setStep(step)
    }
  }
}, [])

// Clear on success
const handleSuccess = () => {
  localStorage.removeItem(STORAGE_KEY)
}
```

### Anti-Patterns to Avoid
- **Separate form instances per step:** Use one useForm instance for entire wizard to maintain state
- **Validating all fields on every change:** Only validate current step fields
- **Modal for multi-step wizard:** Too constrained; use full page
- **Storing passwords in localStorage draft:** Never persist sensitive data

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form state | Manual useState | react-hook-form | Handles validation, errors, touched state |
| Validation | Custom validators | Zod + zodResolver | Type-safe, composable, consistent with backend |
| Step transitions | CSS transitions | framer-motion AnimatePresence | Existing pattern, smooth exit animations |
| Progress dots | Custom component | Copy from OnboardingWizard.tsx | Already tested pattern |
| Cancel confirmation | Custom modal | ConfirmDialog component | Existing in `ui/src/components/ui/Modal.tsx` |

**Key insight:** The existing OnboardingWizard component is a near-perfect template. Adapt its structure rather than inventing new patterns.

## Common Pitfalls

### Pitfall 1: Losing Form State Between Steps
**What goes wrong:** Form values disappear when navigating between steps
**Why it happens:** Creating new useForm instances or not preserving state
**How to avoid:** Single useForm instance at wizard level, pass register/errors to step components
**Warning signs:** User completes step 1, goes to step 2, goes back, step 1 is empty

### Pitfall 2: Submit Button Double-Click
**What goes wrong:** Form submitted multiple times, duplicate MSPs created
**Why it happens:** No loading state or button disable during submission
**How to avoid:** Track isSubmitting state, disable button, show spinner
**Warning signs:** Multiple API calls in network tab

### Pitfall 3: Draft Conflicts with Successful Submit
**What goes wrong:** After creating MSP, refreshing page shows old draft
**Why it happens:** localStorage not cleared on successful submission
**How to avoid:** Clear localStorage on success before redirect
**Warning signs:** "Continue draft?" prompt after just creating an MSP

### Pitfall 4: Email Already Exists Error Handling
**What goes wrong:** User gets confusing error after completing all 4 steps
**Why it happens:** Email uniqueness only checked on final submit
**How to avoid:** Check email availability on Step 2 blur (debounced API call)
**Warning signs:** 409 Conflict after completing entire wizard

### Pitfall 5: Form Touched State After Step Navigation
**What goes wrong:** Error messages appear on all fields in new step immediately
**Why it happens:** Global touched state carried across steps
**How to avoid:** Only show errors for fields user has interacted with using RHF's `touchedFields`
**Warning signs:** Step 2 shows all errors before user types anything

## Code Examples

### API Mutation for Creating MSP
```typescript
// Source: hooks/useAdminApi.ts (new addition)
export async function createMspTenant(data: CreateMspTenantDto): Promise<MspTenantCreatedResponseDto> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
  if (!token) throw new Error('Admin authentication required')

  const res = await fetch(`${API_URL}/admin/msp/tenants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `Request failed (${res.status})`)
  }

  return res.json()
}
```

### Zod Schema for Wizard Form
```typescript
// Source: lib/validations/msp-onboarding.schema.ts (new file)
import { z } from 'zod'

// Step 1: Company Info
export const mspCompanyInfoSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name must not exceed 255 characters'),
  slug: z.string()
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .min(2, 'Slug must be at least 2 characters')
    .max(100, 'Slug must not exceed 100 characters')
    .optional()
    .or(z.literal('')),
  contactEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  contactPhone: z.string().max(50).optional().or(z.literal('')),
})

// Step 2: Admin User
export const mspAdminUserSchema = z.object({
  adminEmail: z.string().email('Admin email must be a valid email address'),
  adminName: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name must not exceed 255 characters')
    .optional()
    .or(z.literal('')),
})

// Step 3: Settings
export const mspSettingsSchema = z.object({
  locationLimit: z.number()
    .int('Location limit must be a whole number')
    .min(1, 'Location limit must be at least 1')
    .max(10000, 'Location limit must not exceed 10000')
    .optional()
    .nullable(),
  clientLimit: z.number()
    .int('Client limit must be a whole number')
    .min(1, 'Client limit must be at least 1')
    .max(10000, 'Client limit must not exceed 10000')
    .optional()
    .nullable(),
})

// Full schema for final validation
export const mspOnboardingSchema = mspCompanyInfoSchema
  .merge(mspAdminUserSchema)
  .merge(mspSettingsSchema)

export type MspOnboardingFormData = z.infer<typeof mspOnboardingSchema>
```

### Step Component Pattern
```typescript
// Source: Pattern from OnboardingWizard.tsx
interface StepProps {
  formData: MspOnboardingFormData
  errors: FieldErrors<MspOnboardingFormData>
  register: UseFormRegister<MspOnboardingFormData>
  isSubmitting: boolean
}

export function CompanyInfoStep({ formData, errors, register, isSubmitting }: StepProps) {
  return (
    <div className="space-y-4">
      <Input
        label="MSP Organization Name"
        {...register('name')}
        error={errors.name?.message}
        disabled={isSubmitting}
        placeholder="Acme Managed Services"
      />
      <Input
        label="URL Slug (optional)"
        {...register('slug')}
        error={errors.slug?.message}
        disabled={isSubmitting}
        placeholder="acme-managed-services"
        helperText="Auto-generated from name if not provided"
      />
      {/* ... more fields */}
    </div>
  )
}
```

### Success Confirmation Pattern
```typescript
// Source: ui/src/components/msp/CreateClientModal.tsx (success state)
function SuccessConfirmation({ msp, onViewDetails, onCreateAnother, onBackToList }) {
  return (
    <div className="text-center py-8">
      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-success-100 dark:bg-success-900/30">
        <CheckCircleIcon className="h-10 w-10 text-success-600 dark:text-success-400" />
      </div>
      <h3 className="mt-4 text-xl font-semibold text-space-900 dark:text-white">
        MSP Created Successfully
      </h3>
      <p className="mt-2 text-sm text-space-600 dark:text-space-400">
        {msp.name} has been created with admin {msp.adminEmail}
      </p>

      <div className="mt-6 bg-space-50 dark:bg-space-800 rounded-xl p-4 text-left">
        <h4 className="font-medium text-space-900 dark:text-white mb-2">MSP Details</h4>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-space-500">ID:</dt>
            <dd className="font-mono text-space-700 dark:text-space-300">{msp.id}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-space-500">Slug:</dt>
            <dd className="text-space-700 dark:text-space-300">{msp.slug}</dd>
          </div>
          {/* ... more details */}
        </dl>
      </div>

      <div className="mt-6 flex gap-3 justify-center">
        <Button variant="secondary" onClick={onBackToList}>
          Back to MSPs
        </Button>
        <Button variant="secondary" onClick={onCreateAnother}>
          Create Another
        </Button>
        <Button variant="primary" onClick={() => onViewDetails(msp.id)}>
          View MSP Details
        </Button>
      </div>
    </div>
  )
}
```

## Backend API Reference

### POST /admin/msp/tenants

**Auth:** AdminAuthGuard (Bearer token from `admin_token` localStorage)

**Request Body (CreateMspTenantDto):**
```typescript
interface CreateMspTenantDto {
  name: string               // Required: 2-255 chars
  slug?: string              // Optional: 2-100 chars, lowercase letters/numbers/hyphens
  adminEmail: string         // Required: Valid email
  adminName?: string         // Optional: 2-255 chars
  contactEmail?: string      // Optional: Valid email (defaults to adminEmail)
  contactPhone?: string      // Optional: max 50 chars
  locationLimit?: number     // Optional: 1-10000
  clientLimit?: number       // Optional: 1-10000
}
```

**Response (MspTenantCreatedResponseDto):**
```typescript
interface MspTenantCreatedResponseDto {
  id: string                 // UUID
  name: string
  slug: string
  status: 'active'
  tier: 'msp'
  adminUserId: string        // Created admin user UUID
  adminEmail: string
  welcomeEmailSent: boolean
  locationLimit: number | null
  clientLimit: number | null
  createdAt: string          // ISO timestamp
}
```

**Error Responses:**
- 400: Validation error (field-level errors in response)
- 409: Email already in use / Slug already in use
- 401: Admin authentication required

## Wizard Flow Design

### Step 1: Company Information
**Fields:** name (required), slug (optional), contactEmail (optional), contactPhone (optional)
**Validation:** Name length, slug format, email format
**UX Notes:**
- Auto-generate slug preview from name as user types
- Show "Slug will be auto-generated" helper if empty

### Step 2: Admin User
**Fields:** adminEmail (required), adminName (optional)
**Validation:** Valid email format, name length
**UX Notes:**
- Consider debounced email availability check
- Helper text: "A welcome email with login credentials will be sent"

### Step 3: Settings
**Fields:** locationLimit (optional), clientLimit (optional)
**Validation:** Integer range 1-10000 if provided
**UX Notes:**
- Use number inputs with min/max
- Show "Unlimited" placeholder when empty
- Could add preset buttons: "Starter (50)", "Growth (200)", "Unlimited"

### Step 4: Review & Confirm
**Display:** All entered data in read-only format
**Actions:** Edit (jump to step), Submit
**UX Notes:**
- Group by step sections
- Show default values for optional fields (e.g., "Auto-generated" for slug)
- Prominent Submit button with loading state

### Success Confirmation
**Display:** Created MSP details, admin email, credentials info
**Actions:** View Details, Create Another, Back to MSP List

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Modal wizards | Full-page wizards | 2024 | Better for complex forms |
| Redux form state | React Hook Form | 2022 | Simpler, better DX |
| Custom validation | Zod schemas | 2023 | Type-safe, composable |
| CSS transitions | framer-motion | Existing | Smoother step animations |

**Current in codebase:**
- OnboardingWizard uses full-screen overlay (modal-like but full page)
- CreateClientModal uses modal (simpler, fewer steps)

**Recommendation for MSP Wizard:** Full page at `/mission-control/msps/new` because:
1. Four steps with multiple fields = too complex for modal
2. Consistent with user expectations for admin creation flows
3. localStorage draft recovery works better with stable URL

## Open Questions

### 1. Email Availability Check
- **What we know:** Backend returns 409 if email exists on submit
- **What's unclear:** Should we add a dedicated endpoint for checking email availability?
- **Recommendation:** For now, let error surface on submit. Could add debounced check in future.

### 2. Welcome Email Configuration
- **What we know:** `welcomeEmailSent` in response indicates if email was dispatched
- **What's unclear:** Should admin be able to skip/delay welcome email?
- **Recommendation:** Accept current backend behavior. Show email status in confirmation.

### 3. Draft Expiration
- **What we know:** Need localStorage persistence per CONTEXT.md
- **What's unclear:** How long should drafts be valid?
- **Recommendation:** 24-hour expiration with timestamp check on restore

## Sources

### Primary (HIGH confidence)
- `/ui/src/components/onboarding/OnboardingWizard.tsx` - Existing wizard pattern
- `/ui/src/components/onboarding/types.ts` - Step type definitions
- `/api/src/modules/admin/dto/msp-onboarding.dto.ts` - Backend DTOs with validation rules
- `/api/src/modules/admin/admin.service.ts` - createMspTenant implementation
- `/ui/src/hooks/useAdminApi.ts` - Admin API patterns
- `/ui/FORM_VALIDATION_QUICKSTART.md` - RHF + Zod patterns
- `/ui/src/components/msp/CreateClientModal.tsx` - Similar form + success pattern

### Supporting (HIGH confidence)
- `/ui/src/components/ui/Input.tsx` - Input component with error states
- `/ui/src/components/ui/Modal.tsx` - ConfirmDialog for cancel confirmation
- `/ui/src/components/ui/Button.tsx` - Button with isLoading state
- `/ui/package.json` - Confirmed dependencies

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH - All libraries already installed and used in codebase
- Architecture: HIGH - Following existing OnboardingWizard pattern exactly
- Validation: HIGH - Backend DTOs define exact rules to match
- Pitfalls: HIGH - Based on common multi-step form issues

**Research date:** 2026-01-19
**Valid until:** 2026-02-19 (stable patterns, no pending major changes)
