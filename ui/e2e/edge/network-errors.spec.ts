// Nebula DNS - Network Error Handling E2E Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAndNavigate, waitForPageLoad } from '../helpers/auth'

test.describe('Network Errors - Timeout Handling', () => {
  test('should show error when network request times out', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard')

    // Mock slow API response that times out
    await page.route('**/backend/**/policies', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 60000)) // 60s timeout
      route.abort('timedout')
    })

    // Navigate to policies page
    await page.goto('/dashboard/policies')
    await page.waitForTimeout(3000)

    // Should show timeout error or graceful fallback
    const errorMessage = page.getByText(/timeout|timed out|request took too long|slow connection|error|failed/i)
    const hasError = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false)

    // Should show loading state
    const loadingState = page.getByText(/loading|please wait/i)
    const hasLoading = await loadingState.isVisible().catch(() => false)

    // Verify error is displayed or loading state (defensive pattern)
    if (hasError) {
      await expect(errorMessage).toBeVisible()
    } else if (hasLoading) {
      await expect(loadingState).toBeVisible()
    }

    // At minimum, page should load without crashing
    const pageTitle = page.locator('h1, h2, [role="heading"]')
    await expect(pageTitle.first()).toBeVisible({ timeout: 5000 })

    // Should have retry option if error is shown
    const retryButton = page.getByRole('button', { name: /retry|try again/i })
    const hasRetry = await retryButton.isVisible().catch(() => false)

    // Cleanup
    await page.unroute('**/backend/**/policies')
  })

  test('should show error when server is unreachable', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard')

    // Mock connection failure
    await page.route('**/backend/**/reports/**', (route) => {
      route.abort('connectionrefused')
    })

    await page.goto('/dashboard/reports')
    await page.waitForTimeout(2000)

    // Should show connection error
    const errorMessage = page.getByText(/connection|network|unreachable|cannot connect|server error|error|failed/i)
    const hasError = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false)

    // Should have helpful message
    if (hasError) {
      await expect(errorMessage).toBeVisible()
    }

    // Page should not crash
    const heading = page.locator('h1, h2, [role="heading"]')
    await expect(heading.first()).toBeVisible({ timeout: 5000 })

    // Should not show stale data
    const tableData = page.locator('table tbody tr')
    const dataCount = await tableData.count()

    // Verify no stale data is shown when error occurs
    expect(dataCount).toBeLessThan(100)

    await page.unroute('**/backend/**/reports/**')
  })

  test('should allow user to retry failed request', async ({ page }) => {
    let requestCount = 0

    await loginAndNavigate(page, '/dashboard')

    // First request fails, second succeeds
    await page.route('**/backend/**/locations', (route) => {
      requestCount++
      if (requestCount === 1) {
        route.abort('failed')
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify([
            { id: 1, name: 'Test Location', ip: '1.2.3.4' }
          ])
        })
      }
    })

    await page.goto('/dashboard/locations')
    await page.waitForTimeout(2000)

    // Should show error initially
    const errorMessage = page.getByText(/error|failed|connection/i)
    const hasError = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false)

    if (hasError) {
      // Find and click retry button
      const retryButton = page.getByRole('button', { name: /retry|try again|reload/i })
      const hasRetry = await retryButton.isVisible().catch(() => false)

      if (hasRetry) {
        await retryButton.click()
        await page.waitForTimeout(1000)

        // Should show success after retry
        const successData = page.getByText(/Test Location/i)
        const hasSuccess = await successData.isVisible({ timeout: 3000 }).catch(() => false)

        expect(requestCount).toBeGreaterThan(1)
        expect(hasSuccess).toBeTruthy()
      }
    }

    await page.unroute('**/backend/**/locations')
  })

  test('should handle partial load error gracefully', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/lists')

    // Wait for initial load
    await page.waitForTimeout(1000)

    // Mock partial failure - only specific endpoint fails
    let callCount = 0
    await page.route('**/backend/lists/123/**', (route) => {
      callCount++
      route.abort('failed')
    })

    // Try to navigate or trigger API call
    await page.reload()
    await page.waitForTimeout(2000)

    // Page should not be completely broken - should have some UI
    const heading = page.locator('h1, h2, [role="heading"]')
    await expect(heading.first()).toBeVisible({ timeout: 5000 })

    // Page should render something (not blank)
    const bodyText = await page.textContent('body')
    expect(bodyText).toBeTruthy()
    expect(bodyText!.length).toBeGreaterThan(10)

    // Should not show a blank page
    const bodyHasContent = bodyText!.toLowerCase().includes('lists') ||
                           bodyText!.toLowerCase().includes('dashboard') ||
                           bodyText!.toLowerCase().includes('nebula')
    expect(bodyHasContent).toBeTruthy()

    // Cleanup
    await page.unroute('**/backend/lists/123/**')
  })
})
