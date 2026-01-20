---
phase: 16
plan: 01
subsystem: admin-ui
tags: [wizard, form-validation, msp, zod, react-hook-form]
dependency-graph:
  requires:
    - phase-09 (admin auth)
    - phase-11 (MSP listing)
  provides:
    - MSP onboarding wizard shell
    - Zod validation schemas for MSP creation
    - createMspTenant API function
  affects:
    - plan-16-02 (step content)
tech-stack:
  added: []
  patterns: [multi-step-wizard, per-step-validation, jumpable-steps]
key-files:
  created:
    - ui/src/lib/validations/msp-onboarding.schema.ts
    - ui/src/components/admin/msp-onboarding/types.ts
    - ui/src/components/admin/msp-onboarding/MspOnboardingWizard.tsx
    - ui/src/components/admin/msp-onboarding/index.ts
    - ui/src/app/mission-control/msps/new/page.tsx
  modified:
    - ui/src/hooks/useAdminApi.ts
decisions:
  - id: 16-01-001
    choice: "Jumpable steps vs linear navigation"
    decision: "Jumpable - users can click completed steps to navigate back"
  - id: 16-01-002
    choice: "Step validation trigger"
    decision: "mode: onBlur + trigger(stepFields) on Next click per CONTEXT.md"
  - id: 16-01-003
    choice: "Progress indicator style"
    decision: "Numbered circles with checkmarks for completed, connecting lines"
metrics:
  duration: 4 min
  completed: 2026-01-19
---

# Phase 16 Plan 01: MSP Onboarding Wizard Foundation Summary

**One-liner:** Wizard shell with Zod validation, API function, and 4-step navigation (placeholder content).

## What Was Built

### Task 1: Zod Validation Schema and API Function (014334e)
Created validation infrastructure matching backend DTO:

**msp-onboarding.schema.ts:**
- `mspCompanyInfoSchema` - name, slug, contactEmail, contactPhone
- `mspAdminUserSchema` - adminEmail, adminName
- `mspSettingsSchema` - locationLimit, clientLimit (nullable numbers)
- `mspOnboardingSchema` - merged schema for full form
- `MspOnboardingFormData` - TypeScript type
- `STEP_FIELDS` - field names grouped by step index

**useAdminApi.ts additions:**
- `CreateMspTenantDto` interface
- `MspTenantCreatedResponse` interface
- `createMspTenant()` async function for POST /admin/msp/tenants

### Task 2: Wizard Types and Main Component (2572e05)
Created wizard component following existing OnboardingWizard pattern:

**types.ts:**
- `WizardStep` interface with id, title, description
- `WIZARD_STEPS` array with 4 steps: Company Info, Admin User, Settings, Review
- `MspOnboardingState` interface
- `INITIAL_STATE` constant

**MspOnboardingWizard.tsx:**
- Single useForm instance with zodResolver for entire wizard
- Step state management with useState
- `goNext()` with step-based validation via trigger(stepFields)
- `goBack()` for previous step navigation
- `jumpToStep()` for clicking completed steps
- 4-step progress indicator with circles, checkmarks, connecting lines
- AnimatePresence for step transitions
- Success state with View Details / Back to MSPs buttons
- Loading spinner during submission

### Task 3: Wizard Page Route (4000160)
Created page at /mission-control/msps/new:
- Page title and description
- MspOnboardingWizard centered with max-w-3xl
- Standard Mission Control padding

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Step navigation | Jumpable to completed | Better UX for reviewing entered data |
| Validation timing | onBlur + Next click | Dual validation per CONTEXT.md decision |
| Form state | Single useForm | Prevents state loss between steps |
| Progress indicator | Numbered + checkmarks | Clear visual feedback, matches OnboardingWizard |

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| ui/src/lib/validations/msp-onboarding.schema.ts | Created | 82 |
| ui/src/hooks/useAdminApi.ts | Modified | +59 |
| ui/src/components/admin/msp-onboarding/types.ts | Created | 46 |
| ui/src/components/admin/msp-onboarding/MspOnboardingWizard.tsx | Created | 324 |
| ui/src/components/admin/msp-onboarding/index.ts | Created | 7 |
| ui/src/app/mission-control/msps/new/page.tsx | Created | 29 |

## Verification Results

- [x] TypeScript compiles without errors (excluding pre-existing e2e test issue)
- [x] Wizard page route exists at /mission-control/msps/new
- [x] Progress indicator shows 4 steps
- [x] Completed steps show checkmark and are clickable
- [x] Step 1 Back button is disabled
- [x] zodResolver links to mspOnboardingSchema
- [x] useForm uses MspOnboardingFormData type

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Plan 16-02 can proceed:
- Wizard shell ready for step content
- Validation schemas available for form fields
- createMspTenant function ready for submission
- Types exported for step components

**Dependencies satisfied:**
- WizardStep types exported
- STEP_FIELDS available for validation
- MspOnboardingFormData type exported
- Success state placeholder ready for enhancement
