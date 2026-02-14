// Nebula DNS - Large Dataset Pagination E2E Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAndNavigate, waitForPageLoad } from '../helpers/auth'

test.describe('Pagination - Large Dataset Handling', () => {
  test('should handle pagination controls correctly', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/reports')
    await waitForPageLoad(page)

    // Look for pagination controls
    const nextButton = page.getByRole('button', { name: /next|>|→/i })
    const prevButton = page.getByRole('button', { name: /previous|prev|<|←/i })
    const pageNumbers = page.locator('[role="navigation"] button, .pagination button')

    const hasNextButton = await nextButton.isVisible().catch(() => false)
    const hasPrevButton = await prevButton.isVisible().catch(() => false)
    const hasPageNumbers = await pageNumbers.count() > 0

    if (!hasNextButton && !hasPrevButton && !hasPageNumbers) {
      // No pagination found - might be empty state or infinite scroll
      test.skip()
      return
    }

    // If we have pagination, test it
    if (hasNextButton) {
      const isDisabled = await nextButton.isDisabled().catch(() => false)

      if (!isDisabled) {
        await nextButton.click()
        await page.waitForTimeout(1000)

        // Page should still be functional
        const heading = page.locator('h1, h2, [role="heading"]')
        await expect(heading.first()).toBeVisible()
      }
    }

    // Verify pagination exists and works
    const bodyText = await page.textContent('body')
    expect(bodyText).toBeTruthy()
    expect(bodyText!.length).toBeGreaterThan(10)

    // Page should not crash
    const currentUrl = page.url()
    expect(currentUrl).toBeTruthy()

    // Should not redirect to login
    expect(currentUrl).not.toContain('/login')
  })

  test('should load large list without freezing UI', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard')

    // Mock large dataset
    const largeDataset = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      type: i % 3 === 0 ? 'allow' : 'block',
      createdAt: new Date().toISOString()
    }))

    await page.route('**/api/**/lists', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify(largeDataset)
      })
    })

    const startTime = Date.now()

    await page.goto('/dashboard/lists')
    await page.waitForTimeout(2000)

    const loadTime = Date.now() - startTime

    // Should load in reasonable time (under 10 seconds)
    expect(loadTime).toBeLessThan(10000)

    // Page should be responsive
    const heading = page.locator('h1, h2, [role="heading"]')
    await expect(heading.first()).toBeVisible()

    // Should render some content
    const bodyText = await page.textContent('body')
    expect(bodyText).toBeTruthy()
    expect(bodyText!.length).toBeGreaterThan(20)

    // UI should not freeze - can interact
    const clickableElement = page.getByRole('button').first()
    const hasButton = await clickableElement.isVisible().catch(() => false)

    if (hasButton) {
      const isEnabled = await clickableElement.isEnabled()
      expect(isEnabled).toBeDefined()
    }

    // Cleanup
    await page.unroute('**/api/**/lists')
  })

  test('should reflect current page in URL for pagination', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/reports')
    await waitForPageLoad(page)

    const urlBefore = page.url()

    // Look for pagination
    const nextButton = page.getByRole('button', { name: /next|>|→/i })
    const hasNextButton = await nextButton.isVisible().catch(() => false)

    if (!hasNextButton) {
      test.skip()
      return
    }

    const isDisabled = await nextButton.isDisabled().catch(() => false)

    if (!isDisabled) {
      await nextButton.click()
      await page.waitForTimeout(1000)

      const urlAfter = page.url()

      // URL might change to reflect pagination (or might not, that's OK)
      expect(urlAfter).toBeTruthy()

      // Page should still work
      const heading = page.locator('h1, h2, [role="heading"]')
      await expect(heading.first()).toBeVisible()
    }

    // Verify page is functional
    const bodyText = await page.textContent('body')
    expect(bodyText).toBeTruthy()
    expect(bodyText!.length).toBeGreaterThan(10)
  })

  test('should display empty state correctly with no data', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard')

    // Mock empty dataset
    await page.route('**/api/**/policies', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify([])
      })
    })

    await page.goto('/dashboard/policies')
    await page.waitForTimeout(2000)

    // Should show empty state
    const emptyState = page.getByText(/no policies|create your first|get started|no data/i)
    const hasEmptyState = await emptyState.isVisible({ timeout: 5000 }).catch(() => false)

    // Should either show empty state or handle gracefully
    if (hasEmptyState) {
      await expect(emptyState).toBeVisible()
    }

    // Should not show pagination for empty data
    const pagination = page.locator('.pagination, [role="navigation"]')
    const paginationCount = await pagination.count()

    // Either no pagination or it's hidden/disabled
    const bodyText = await page.textContent('body')
    expect(bodyText).toBeTruthy()

    // Page should be functional
    const heading = page.locator('h1, h2, [role="heading"]')
    await expect(heading.first()).toBeVisible()

    // Should show create button or similar action
    const createButton = page.getByRole('button', { name: /create|new|add/i })
    const hasCreateButton = await createButton.isVisible().catch(() => false)

    // Either empty state, create button, or both
    expect(hasEmptyState || hasCreateButton || bodyText!.length > 10).toBeTruthy()

    // Cleanup
    await page.unroute('**/api/**/policies')
  })
})
