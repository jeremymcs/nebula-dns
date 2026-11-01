// E2E launch feature flags — keep skipped coverage tied to product intent.
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test } from '@playwright/test'

/** Stripe checkout / saved cards are disabled until publishable key is configured. */
export const stripeBillingEnabled = Boolean(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim(),
)

export const SKIP_STRIPE_BILLING =
  'Stripe billing flows are disabled at launch (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is unset).'

export const SKIP_LEGACY_TIER_BILLING =
  'Legacy tier subscription billing UI was replaced by query bundle billing in Flux Shield.'

export const SKIP_ADMIN_CONSOLE_IN_TENANT_UI =
  'Platform admin console is a separate admin-ui app; tenant UI E2E does not host /admin routes.'

export function skipUnlessStripeBilling() {
  test.skip(!stripeBillingEnabled, SKIP_STRIPE_BILLING)
}
