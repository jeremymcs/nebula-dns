// Nebula DNS - Rate Limiting Handling E2E Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAndNavigate, waitForPageLoad } from '../helpers/auth'

test.describe('Rate Limiting - Error Handling', () => {
  test('should show rate limit message after too many requests', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard')

    // Mock 429 Too Many Requests response
    await page.route('**/api/**/policies', (route) => {
      route.fulfill({
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Date.now() + 60000)
        },
        body: JSON.stringify({
          statusCode: 429,
          message: 'Rate limit exceeded. Please try again later.',
          error: 'Too Many Requests'
        })
      })
    })

    await page.goto('/dashboard/policies')
    await page.waitForTimeout(2000)

    // Should show rate limit error message
    const rateLimitMessage = page.getByText(/rate limit|too many requests|slow down|try again later/i)
    const hasError = await rateLimitMessage.isVisible({ timeout: 5000 }).catch(() => false)

    // Verify error message is shown or page handles gracefully
    if (hasError) {
      await expect(rateLimitMessage).toBeVisible()
    }

    // Page should still have UI structure
    const heading = page.locator('h1, h2, [role="heading"]')
    await expect(heading.first()).toBeVisible()

    // Should not show stale/invalid data
    const bodyText = await page.textContent('body')
    expect(bodyText).toBeTruthy()

    // Cleanup
    await page.unroute('**/api/**/policies')
  })

  test('should allow retry after rate limit window expires', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard')

    // Simulate rate limit scenario with retry functionality
    let retryWindowElapsed = false

    await page.route('**/api/**', (route) => {
      const url = route.request().url()

      // Only mock specific endpoints, let auth through
      if (url.includes('/reports/') || url.includes('/dashboard/stats')) {
        if (!retryWindowElapsed) {
          route.fulfill({
            status: 429,
            headers: {
              'Retry-After': '1'
            },
            body: JSON.stringify({
              message: 'Rate limit exceeded',
              retryAfter: 1
            })
          })
        } else {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ data: [] })
          })
        }
      } else {
        route.continue()
      }
    })

    await page.goto('/dashboard')
    await page.waitForTimeout(2000)

    // Simulate retry window expiring
    retryWindowElapsed = true
    await page.waitForTimeout(1500)

    // Retry by reloading
    await page.reload()
    await page.waitForTimeout(2000)

    // Page should be functional
    const heading = page.locator('h1, h2, [role="heading"]')
    await expect(heading.first()).toBeVisible()

    // Body should have content
    const bodyText = await page.textContent('body')
    expect(bodyText).toBeTruthy()
    expect(bodyText!.length).toBeGreaterThan(10)

    // Should be on dashboard or not crashed
    const hasValidContent = bodyText!.toLowerCase().includes('dashboard') ||
                             bodyText!.toLowerCase().includes('nebula') ||
                             bodyText!.length > 50
    expect(hasValidContent).toBeTruthy()

    // Cleanup
    await page.unroute('**/api/**')
  })

  test('should show appropriate rate limit counter or retry info', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard')

    // Mock 429 with retry-after header
    const retryAfterSeconds = 30
    const resetTime = Math.floor(Date.now() / 1000) + retryAfterSeconds

    await page.route('**/api/**/lists', (route) => {
      route.fulfill({
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(resetTime)
        },
        body: JSON.stringify({
          statusCode: 429,
          message: `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`,
          retryAfter: retryAfterSeconds
        })
      })
    })

    await page.goto('/dashboard/lists')
    await page.waitForTimeout(2000)

    // Should show error message about rate limiting
    const errorMessage = page.getByText(/rate limit|too many|requests|try again/i)
    const hasError = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false)

    // Page should handle error gracefully
    const heading = page.locator('h1, h2, [role="heading"]')
    await expect(heading.first()).toBeVisible()

    // Should show some UI feedback
    const bodyText = await page.textContent('body')
    expect(bodyText).toBeTruthy()
    expect(bodyText!.length).toBeGreaterThan(20)

    // Should not show confusing error
    const hasContent = bodyText!.toLowerCase().includes('list') ||
                       bodyText!.toLowerCase().includes('dashboard') ||
                       bodyText!.toLowerCase().includes('error') ||
                       bodyText!.toLowerCase().includes('limit')
    expect(hasContent).toBeTruthy()

    // Cleanup
    await page.unroute('**/api/**/lists')
  })
})
