// Nebula DNS - TopNav user menu mobile E2E
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect, devices } from '@playwright/test'
import { loginAndNavigate, waitForPageLoad } from './helpers/auth'

test.use({
  ...devices['Desktop Chrome'],
  viewport: devices['iPhone 13'].viewport,
  isMobile: true,
  hasTouch: true,
  userAgent: devices['iPhone 13'].userAgent,
})

test.describe('TopNav account menu', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, '/dashboard')
    await waitForPageLoad(page)
  })

  test('opens account menu and shows Sign out on iPhone', async ({ page }) => {
    const accountButton = page.getByRole('button', { name: 'Account menu' })
    await accountButton.scrollIntoViewIfNeeded()
    await accountButton.click()
    await expect(page.getByRole('menuitem', { name: /^sign out$/i })).toBeVisible({
      timeout: 5000,
    })
  })

  test('mobile header menu button opens navigation panel', async ({ page }) => {
    await page.getByRole('button', { name: 'Open navigation menu' }).click()
    await expect(page.getByRole('dialog', { name: 'Navigation menu' })).toBeVisible()
    await expect(
      page.getByRole('link', { name: /^policies$/i }).first(),
    ).toBeVisible({
      timeout: 5000,
    })
  })
})

test('opens account menu on desktop Chrome', async ({ browser }) => {
  const context = await browser.newContext({ ...devices['Desktop Chrome'] })
  const page = await context.newPage()
  await loginAndNavigate(page, '/dashboard')
  await waitForPageLoad(page)

  await page.getByRole('button', { name: 'Account menu' }).click()
  await expect(page.getByRole('menuitem', { name: /sign out/i })).toBeVisible()
  await context.close()
})
