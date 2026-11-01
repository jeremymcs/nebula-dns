// Shared Playwright selectors for stable E2E targeting.
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Page } from '@playwright/test'

/** Primary page title (avoids matching empty-state h3 headings). */
export function pageHeading(page: Page, name: string | RegExp) {
  return page.getByRole('heading', { level: 1, name })
}

/** Login screen title (h2 on `/`). */
export function loginHeading(page: Page) {
  return page.getByRole('heading', { name: /welcome back/i })
}

/** Billing page section tabs render as buttons, not [role=tab]. */
export function billingTab(page: Page, label: string | RegExp) {
  return page.getByRole('button', { name: label })
}

/** Domain lists filter tabs (All Lists / Allowlists / Blocklists). */
export function listsFilterTab(page: Page, label: string | RegExp) {
  return page.getByRole('button', { name: label })
}

export function newListButton(page: Page, type: 'blocklist' | 'allowlist') {
  return page
    .getByRole('button', {
      name: type === 'blocklist' ? /^new blocklist$/i : /^new allowlist$/i,
    })
    .first()
}

export function listNameInput(page: Page) {
  return page.getByRole('dialog').getByRole('textbox').first()
}

export function addZoneButton(page: Page) {
  return page.getByRole('button', { name: /^add zone$/i }).first()
}

export function createPolicyButton(page: Page) {
  return page.getByRole('button', { name: /^create policy$/i }).first()
}

export function zoneNameInput(page: Page) {
  return page.getByRole('dialog').getByRole('textbox').first()
}

export function policyNameInput(page: Page) {
  return page
    .getByRole('dialog', { name: /create new policy|edit policy/i })
    .getByRole('textbox')
    .first()
}
