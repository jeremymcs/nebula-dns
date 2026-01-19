---
phase: 14-billing-portal-ui
plan: 02
subsystem: ui
tags: [swr, react, billing, modals, invoice-table]

# Dependency graph
requires:
  - phase: 14-01
    provides: Billing hooks, billing page foundation, subscription status display
provides:
  - InvoiceTable component with expandable rows and PDF download
  - ApplyCreditModal for applying billing credits
  - ChangeTierModal with side-by-side tier comparison
  - ExtendTrialModal and ExtendGraceModal for period extensions
  - Full billing page with all modals integrated
affects: [14-03-payment-methods]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Expandable table rows with click-to-expand
    - Blob fetch pattern for PDF download with auth
    - Two-step confirmation flow for credit application
    - Side-by-side comparison for tier changes

key-files:
  created:
    - ui/src/components/billing/InvoiceTable.tsx
    - ui/src/components/billing/ApplyCreditModal.tsx
    - ui/src/components/billing/ChangeTierModal.tsx
    - ui/src/components/billing/ExtendTrialModal.tsx
    - ui/src/components/billing/ExtendGraceModal.tsx
  modified:
    - ui/src/app/mission-control/tenants/[id]/billing/page.tsx

key-decisions:
  - "Blob fetch pattern for PDF download (requires auth header, cannot use simple window.open)"
  - "Two-step confirmation for credit application (show summary before submitting)"
  - "Hardcoded tier features in ChangeTierModal (can be made dynamic later per research)"
  - "Extend buttons conditionally shown: trial only if active, grace only if exists"
  - "Single activeModal state for all modals (clean state management)"

patterns-established:
  - "Expandable table row: click row toggles expanded state, colSpan for details"
  - "Form with confirmation step: initial form -> confirm view -> submit"
  - "Date preview in extension modals: show current date and calculated new date"
  - "Modal success handlers: toast + mutate + close"

# Metrics
duration: 5min
completed: 2026-01-19
---

# Phase 14 Plan 02: Invoice History and Actions Summary

**Invoice table with expandable rows and PDF download, plus four billing action modals (credit, tier, trial, grace) integrated into billing page**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-19T20:56:15Z
- **Completed:** 2026-01-19T21:01:21Z
- **Tasks:** 3
- **Files created:** 5
- **Files modified:** 1

## Accomplishments
- Created InvoiceTable component with expandable rows showing additional details
- Implemented PDF download via blob fetch pattern with Authorization header
- Built ApplyCreditModal with amount/reason form and confirmation step
- Built ChangeTierModal with side-by-side tier comparison and feature lists
- Built ExtendTrialModal with days/reason form and date preview
- Built ExtendGraceModal with warning styling and days remaining display
- Integrated all components into billing page with proper wiring

## Task Commits

Each task was committed atomically:

1. **Task 1: Create InvoiceTable component** - `baa4b7f` (feat)
2. **Task 2: Create billing action modals** - `daf1685` (feat)
3. **Task 3: Integrate components into billing page** - `d23dad4` (feat)

## Files Created/Modified
- `ui/src/components/billing/InvoiceTable.tsx` - Invoice table with expandable rows (428 lines)
- `ui/src/components/billing/ApplyCreditModal.tsx` - Credit application modal (195 lines)
- `ui/src/components/billing/ChangeTierModal.tsx` - Tier change modal with comparison (286 lines)
- `ui/src/components/billing/ExtendTrialModal.tsx` - Trial extension modal (197 lines)
- `ui/src/components/billing/ExtendGraceModal.tsx` - Grace period extension modal (201 lines)
- `ui/src/app/mission-control/tenants/[id]/billing/page.tsx` - Updated with all integrations (718 lines)

## Decisions Made
- Blob fetch pattern for PDF download (Stripe invoice PDFs require auth header)
- Two-step confirmation for credits (amount is significant, prevent accidents)
- Hardcoded tier features (research recommended, can be made dynamic later)
- Trial extend button only shown if trial is active (not expired)
- Grace extend button appears in both card and alert banner for visibility

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript error in e2e/lists.spec.ts (unrelated to this plan) - confirmed no errors in plan-specific files.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All billing action modals complete and functional
- Invoice history with PDF download working
- Ready for Plan 14-03: Payment Methods Management (Stripe Elements integration)

---
*Phase: 14-billing-portal-ui*
*Completed: 2026-01-19*
