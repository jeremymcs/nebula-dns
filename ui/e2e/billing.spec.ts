// Nebula DNS - Billing and Subscription E2E Tests (US-037)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAsEnterprise, loginAsHome, loginAsMSP, waitForPageLoad } from './helpers/auth'
import { SKIP_LEGACY_TIER_BILLING } from './helpers/launch-features'
import { billingTab } from './helpers/selectors'

test.describe('Billing & Usage (query bundles)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEnterprise(page)
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)
  })

  test('shows billing page heading and overview metrics', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/billing/)
    await expect(page.getByRole('heading', { name: /billing & usage/i })).toBeVisible()
    await expect(billingTab(page, /usage overview/i)).toBeVisible()
    await expect(page.getByText(/query balance/i)).toBeVisible()
  })

  test('should have CSV export button on billing page', async ({ page }) => {
    const csvButton = page.getByRole('button', { name: /download csv/i })
    await expect(csvButton).toBeVisible()
    await expect(csvButton).toBeEnabled()
  })

  test('can open invoices tab', async ({ page }) => {
    await billingTab(page, /^invoices$/i).click()
    await expect(page.getByRole('heading', { name: /^invoices$/i })).toBeVisible()
  })
})

test.describe.skip(`Legacy tier subscription billing — ${SKIP_LEGACY_TIER_BILLING}`, () => {
  test('Home tier plan badge', async ({ page }) => {
    await loginAsHome(page)
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)
    await expect(page.getByText(/home tier|home plan/i)).toBeVisible()
  })

  test('Enterprise upgrade to MSP button', async ({ page }) => {
    await loginAsEnterprise(page)
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)
    await expect(page.getByRole('button', { name: /upgrade.*msp/i })).toBeVisible()
  })

  test('MSP client usage widget copy', async ({ page }) => {
    await loginAsMSP(page)
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    await expect(page.getByText(/usage overview/i)).toBeVisible()
  })
})

test.describe('Upgrade prompts (tier gating)', () => {
  test('Home tier sees upgrade guidance on SIEM settings', async ({ page }) => {
    await loginAsHome(page)
    await page.goto('/dashboard/settings/integrations')
    await waitForPageLoad(page)
    await expect(page.getByRole('heading', { name: /upgrade required/i })).toBeVisible()
  })
})
