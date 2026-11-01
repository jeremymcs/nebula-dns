// Nebula DNS - Usage Tracking E2E Tests (US-013 & US-014)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAsEnterprise, loginAsHome, waitForPageLoad } from '../helpers/auth'
import { SKIP_LEGACY_TIER_BILLING } from '../helpers/launch-features'
import { billingTab } from '../helpers/selectors'

test.describe('Usage on billing page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEnterprise(page)
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)
  })

  test('shows usage overview tab content', async ({ page }) => {
    await billingTab(page, /usage overview/i).click()
    await expect(page.getByRole('heading', { name: /usage breakdown/i })).toBeVisible({
      timeout: 10000,
    })
  })

  test('shows query bundle catalog', async ({ page }) => {
    await billingTab(page, /query bundles/i).click()
    await expect(page.getByText(/starter pack|purchase bundle/i).first()).toBeVisible()
  })
})

test.describe.skip(`Legacy usage meters — ${SKIP_LEGACY_TIER_BILLING}`, () => {
  test('Home tier location usage fraction', async ({ page }) => {
    await loginAsHome(page)
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)
    await expect(page.getByText(/\d+\/\d+/)).toBeVisible()
  })

  test('usage progress bar', async ({ page }) => {
    await loginAsEnterprise(page)
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)
    await expect(page.locator('[role="progressbar"]').first()).toBeVisible()
  })
})
