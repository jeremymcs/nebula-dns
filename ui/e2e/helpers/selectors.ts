// Shared Playwright selectors for stable E2E targeting.
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Page } from '@playwright/test'

/** Primary page title (avoids matching empty-state h3 headings). */
export function pageHeading(page: Page, name: string | RegExp) {
  return page.getByRole('heading', { level: 1, name })
}

/** Billing page section tabs render as buttons, not [role=tab]. */
export function billingTab(page: Page, label: string | RegExp) {
  return page.getByRole('button', { name: label })
}
