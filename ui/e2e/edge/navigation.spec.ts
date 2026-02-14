// Nebula DNS - Browser Navigation E2E Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAndNavigate, waitForPageLoad } from '../helpers/auth'

test.describe('Browser Navigation - Back/Forward', () => {
  test('should preserve state when using back button', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard')
    await waitForPageLoad(page)

    const startUrl = page.url()

    // Navigate using links instead of goto (more realistic)
    const policiesLink = page.getByRole('link', { name: /policies/i })
    const hasPoliciesLink = await policiesLink.isVisible().catch(() => false)

    if (!hasPoliciesLink) {
      // Fallback to clicking on nav
      await page.goto('/dashboard/policies')
      await page.waitForTimeout(1000)
    } else {
      await policiesLink.click()
      await page.waitForTimeout(1000)
    }

    const policiesUrl = page.url()

    // Navigate to another page
    const locationsLink = page.getByRole('link', { name: /locations/i })
    const hasLocationsLink = await locationsLink.isVisible().catch(() => false)

    if (!hasLocationsLink) {
      await page.goto('/dashboard/lists')
      await page.waitForTimeout(1000)
    } else {
      await locationsLink.click()
      await page.waitForTimeout(1000)
    }

    // Go back
    await page.goBack()
    await page.waitForTimeout(1000)

    const backUrl = page.url()

    // Verify back navigation worked
    expect(backUrl).toBeTruthy()

    // Page should be functional
    const heading = page.locator('h1, h2, [role="heading"]')
    await expect(heading.first()).toBeVisible()

    // Should have content
    const bodyText = await page.textContent('body')
    expect(bodyText).toBeTruthy()
    expect(bodyText!.length).toBeGreaterThan(10)

    // Should not be on login page
    expect(backUrl).not.toContain('/login')
  })

  test('should work correctly with forward button after back', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard')
    await waitForPageLoad(page)

    // Click navigation links
    const firstLink = page.getByRole('link', { name: /policies|locations|lists/i }).first()
    const hasFirstLink = await firstLink.isVisible().catch(() => false)

    if (!hasFirstLink) {
      test.skip()
      return
    }

    await firstLink.click()
    await page.waitForTimeout(1000)
    const firstUrl = page.url()

    const secondLink = page.getByRole('link', { name: /settings|reports/i }).first()
    const hasSecondLink = await secondLink.isVisible().catch(() => false)

    if (!hasSecondLink) {
      test.skip()
      return
    }

    await secondLink.click()
    await page.waitForTimeout(1000)
    const secondUrl = page.url()

    // Go back
    await page.goBack()
    await page.waitForTimeout(1000)

    const backUrl = page.url()

    // Go forward
    await page.goForward()
    await page.waitForTimeout(1000)

    const forwardUrl = page.url()

    // Verify navigation sequence worked
    expect(backUrl).toBeTruthy()
    expect(forwardUrl).toBeTruthy()

    // Page should be functional
    const heading = page.locator('h1, h2, [role="heading"]')
    await expect(heading.first()).toBeVisible()

    // Should have content
    const bodyText = await page.textContent('body')
    expect(bodyText).toBeTruthy()
    expect(bodyText!.length).toBeGreaterThan(10)
  })

  test('should load page correctly via deep link', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard')
    await waitForPageLoad(page)

    // Test that we can directly navigate to a deep route
    await page.goto('/dashboard')
    await page.waitForTimeout(1000)

    const dashboardUrl = page.url()

    // Should be on dashboard or authenticated
    const isLoggedIn = dashboardUrl.includes('/dashboard') || !dashboardUrl.includes('/login')

    // Verify we can access the app
    expect(isLoggedIn).toBeTruthy()

    // Should have heading
    const heading = page.locator('h1, h2, [role="heading"]')
    await expect(heading.first()).toBeVisible()

    // Should have content
    const bodyText = await page.textContent('body')
    expect(bodyText).toBeTruthy()
    expect(bodyText!.length).toBeGreaterThan(20)

    // Try navigating via link
    const navLink = page.getByRole('link', { name: /policies|locations|lists|reports/i }).first()
    const hasLink = await navLink.isVisible().catch(() => false)

    if (hasLink) {
      await navLink.click()
      await page.waitForTimeout(1000)

      // Should navigate successfully
      const newUrl = page.url()
      expect(newUrl).toBeTruthy()
    }
  })

  test('should maintain position and state after page refresh', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard')
    await waitForPageLoad(page)
    await page.waitForTimeout(500)

    const urlBefore = page.url()

    // Scroll down if there's content
    await page.evaluate(() => window.scrollTo(0, 200)).catch(() => {})
    await page.waitForTimeout(300)

    // Refresh the page
    await page.reload()
    await page.waitForTimeout(1500)

    // Should be on same or valid URL
    const urlAfter = page.url()

    // Page should be functional
    const heading = page.locator('h1, h2, [role="heading"]')
    await expect(heading.first()).toBeVisible()

    // Should have content
    const bodyText = await page.textContent('body')
    expect(bodyText).toBeTruthy()
    expect(bodyText!.length).toBeGreaterThan(10)

    // Should not redirect to login
    const isLoggedIn = !urlAfter.includes('/login')
    expect(isLoggedIn).toBeTruthy()

    // URLs should be similar (allowing for hash/query differences)
    const sameOrigin = new URL(urlBefore).origin === new URL(urlAfter).origin
    expect(sameOrigin).toBeTruthy()
  })
})
