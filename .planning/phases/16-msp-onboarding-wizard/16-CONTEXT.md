# Phase 16: MSP Onboarding Wizard - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Multi-step wizard UI for creating new MSP accounts. The wizard guides admins through 4 steps: company info, admin user setup, initial settings, and review/confirmation. Accessible from MSP listing or dashboard. Each step validates input before progression, and admin sees confirmation with MSP details after successful creation.

</domain>

<decisions>
## Implementation Decisions

### Step navigation
- Claude's discretion on whether to allow jumping to any completed step vs linear navigation
- Claude's discretion on progress indicator style (numbered stepper vs horizontal bar)
- Validation timing: Both on field blur (instant feedback) AND on Next click (final check)
- Claude's discretion on cancel behavior and confirmation

### Form behavior
- Auto-save draft to localStorage so admin can resume if they navigate away
- Claude's discretion on password handling (auto-generate vs manual entry)
- Claude's discretion on default values for settings step
- Claude's discretion on duplicate MSP name check timing

### Review & confirmation
- Claude's discretion on inline edit vs jump-to-step for review modifications
- Claude's discretion on success confirmation style (full page vs modal vs toast+redirect)
- Claude's discretion on "Create Another" option
- Claude's discretion on email notifications (ops admin, MSP admin, both, or neither)

### Error handling
- Claude's discretion on validation error display (inline only vs inline+summary)
- Claude's discretion on submit failure handling (stay on review vs auto-retry)
- Claude's discretion on loading state indication
- Claude's discretion on server error navigation (auto-jump to error step vs manual)

### Claude's Discretion
- Step navigation model (jumpable vs linear)
- Progress indicator design
- Cancel confirmation behavior
- Password field approach (auto-generate vs manual)
- Default values for settings fields
- Duplicate name validation timing
- Review step edit interaction
- Success confirmation flow
- "Create Another" button inclusion
- Email notification recipients
- Error display patterns
- Submit failure recovery
- Loading state design
- Server error step navigation

</decisions>

<specifics>
## Specific Ideas

- Dual validation: blur for instant field feedback, Next click for step-level validation
- localStorage draft persistence for wizard state recovery

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-msp-onboarding-wizard*
*Context gathered: 2026-01-19*
