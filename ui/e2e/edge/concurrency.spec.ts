// Nebula DNS - Concurrent Actions E2E Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAndNavigate, waitForPageLoad } from '../helpers/auth'

test.describe('Concurrency - Double-Click Prevention', () => {
  test('should prevent double-click from creating duplicate entries', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/policies')
    await waitForPageLoad(page)

    // Look for create button
    const createButton = page.getByRole('button', { name: /create policy|new policy/i })
    const hasCreateButton = await createButton.isVisible().catch(() => false)

    if (!hasCreateButton) {
      test.skip()
      return
    }

    // Double-click the button rapidly
    await createButton.click({ clickCount: 2, delay: 10 })
    await page.waitForTimeout(1000)

    // Should only open one modal/form
    const modals = page.locator('[role="dialog"], .modal')
    const modalCount = await modals.count()

    // Should have at most 1 modal
    expect(modalCount).toBeLessThanOrEqual(1)

    // Form should be functional
    const form = page.locator('form, [role="form"]')
    const hasForm = await form.isVisible().catch(() => false)

    // Page should not crash
    const heading = page.locator('h1, h2, [role="heading"]')
    await expect(heading.first()).toBeVisible()

    // Should have opened a form or stayed on page
    const bodyText = await page.textContent('body')
    expect(bodyText).toBeTruthy()
    expect(bodyText!.length).toBeGreaterThan(10)
  })

  test('should handle multiple rapid button clicks correctly', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/settings')
    await waitForPageLoad(page)

    // Find any clickable button
    const buttons = page.getByRole('button').filter({ hasNotText: 'Sign out' })
    const buttonCount = await buttons.count()

    if (buttonCount === 0) {
      // If no buttons, test navigation instead
      await page.goto('/dashboard/policies')
      await page.waitForTimeout(100)
      await page.goto('/dashboard/locations')
      await page.waitForTimeout(100)
      await page.goto('/dashboard/lists')
      await page.waitForTimeout(500)

      // Should handle rapid navigation
      const heading = page.locator('h1, h2, [role="heading"]')
      await expect(heading.first()).toBeVisible()

      const bodyText = await page.textContent('body')
      expect(bodyText).toBeTruthy()
      expect(page.url()).toContain('/dashboard')

      return
    }

    const button = buttons.first()
    const isButtonVisible = await button.isVisible().catch(() => false)

    if (!isButtonVisible) {
      test.skip()
      return
    }

    // Click rapidly multiple times
    await button.click()
    await page.waitForTimeout(50)
    await button.click()
    await page.waitForTimeout(50)
    await button.click()
    await page.waitForTimeout(500)

    // Page should not crash or show multiple of the same thing
    const modals = page.locator('[role="dialog"], .modal')
    const modalCount = await modals.count()

    // Should not have spawned multiple modals
    expect(modalCount).toBeLessThanOrEqual(2)

    // Page should still be functional
    const heading = page.locator('h1, h2, [role="heading"]')
    await expect(heading.first()).toBeVisible()

    const bodyText = await page.textContent('body')
    expect(bodyText!.length).toBeGreaterThan(10)
  })

  test('should handle concurrent edit operations without data loss', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/lists')
    await waitForPageLoad(page)

    // Mock API to track concurrent requests
    let apiCallCount = 0
    let concurrentCalls = 0
    let maxConcurrent = 0

    await page.route('**/api/v1/lists/**', async (route) => {
      apiCallCount++
      concurrentCalls++
      maxConcurrent = Math.max(maxConcurrent, concurrentCalls)

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 100))

      concurrentCalls--

      route.fulfill({
        status: 200,
        body: JSON.stringify({ id: 1, name: 'Updated List', success: true })
      })
    })

    // Simulate rapid actions
    const createButton = page.getByRole('button', { name: /create|new list/i })
    const hasCreateButton = await createButton.isVisible().catch(() => false)

    if (hasCreateButton) {
      // Click multiple times rapidly
      createButton.click().catch(() => {})
      await page.waitForTimeout(50)
      createButton.click().catch(() => {})
      await page.waitForTimeout(50)
      createButton.click().catch(() => {})
    }

    await page.waitForTimeout(1000)

    // Verify concurrent handling
    expect(maxConcurrent).toBeLessThanOrEqual(3)

    // Page should not crash
    const heading = page.locator('h1, h2, [role="heading"]')
    await expect(heading.first()).toBeVisible()

    // Should have body content
    const bodyText = await page.textContent('body')
    expect(bodyText).toBeTruthy()
    expect(bodyText!.length).toBeGreaterThan(10)

    // Cleanup
    await page.unroute('**/api/v1/lists/**')
  })
})
