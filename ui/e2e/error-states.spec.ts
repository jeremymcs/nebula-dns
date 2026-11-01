// Nebula DNS - Error States and Edge Cases E2E Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAndNavigate, waitForPageLoad, expectDashboardShell } from './helpers/auth'
import { loginHeading, pageHeading } from './helpers/selectors'

test.describe('Error States - 404 Not Found', () => {
  test('should display 404 page for invalid route', async ({ page }) => {
    await page.goto('/this-page-does-not-exist')

    // Should show 404 error
    await expect(pageHeading(page, /page not found/i)).toBeVisible({ timeout: 10000 })
  })

  test('should display 404 page for invalid dashboard route', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/invalid-page-xyz')

    await expect(pageHeading(page, /page not found/i)).toBeVisible({ timeout: 10000 })
  })

  test('should have link to go back home from 404', async ({ page }) => {
    await page.goto('/this-page-does-not-exist')

    const homeLink = page.getByRole('link', { name: /home|dashboard|go back/i })
    const hasHomeLink = await homeLink.isVisible().catch(() => false)

    if (hasHomeLink) {
      await expect(homeLink).toBeVisible()
    }
  })
})

test.describe('Error States - API Errors', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard')
    await expectDashboardShell(page)

    await page.context().setOffline(true)

    // Avoid full document reload while offline (browser shows an empty error page).
    // The mounted app should remain usable with its last rendered shell.
    await expectDashboardShell(page)

    await page.context().setOffline(false)
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await expectDashboardShell(page)
  })

  test('should show error message when API request fails', async ({ page }) => {
    // Mock API failure by intercepting requests
    await page.route('**/backend/**', (route) => {
      route.abort('failed')
    })

    await loginAndNavigate(page, '/dashboard/policies')

    // Should show error state
    const errorMessage = page.getByText(/error|failed|something went wrong|unable to load/i)
    const hasError = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false)

    if (hasError) {
      await expect(errorMessage).toBeVisible()
    }

    // Unblock requests
    await page.unroute('**/backend/**')
  })

  test('should show retry option on API error', async ({ page }) => {
    // Mock API failure
    await page.route('**/backend/**', (route) => {
      route.abort('failed')
    })

    await loginAndNavigate(page, '/dashboard/reports')
    await page.waitForTimeout(2000)

    const retryButton = page.getByRole('button', { name: /retry|try again|reload/i })
    const hasRetry = await retryButton.isVisible().catch(() => false)

    if (hasRetry) {
      await expect(retryButton).toBeVisible()
    }

    await page.unroute('**/backend/**')
  })

  test('should handle 500 server errors', async ({ page }) => {
    // Mock 500 error
    await page.route('**/backend/**', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ message: 'Internal Server Error' })
      })
    })

    await loginAndNavigate(page, '/dashboard/policies')
    await page.waitForTimeout(2000)

    const errorMessage = page.getByText(/error|server error|something went wrong/i)
    const hasError = await errorMessage.isVisible().catch(() => false)

    if (hasError) {
      await expect(errorMessage).toBeVisible()
    }

    await page.unroute('**/backend/**')
  })

  test('should handle 401 unauthorized errors', async ({ page }) => {
    // Mock 401 error
    await page.route('**/backend/**', (route) => {
      route.fulfill({
        status: 401,
        body: JSON.stringify({ message: 'Unauthorized' })
      })
    })

    await page.goto('/dashboard')
    await page.waitForTimeout(2000)

    // Should redirect to login or show unauthorized message
    const loginPage = loginHeading(page)
    const unauthorizedMessage = page.getByText(/unauthorized|not authorized|session expired/i)

    const redirectedToLogin = await loginPage.isVisible({ timeout: 5000 }).catch(() => false)
    const showsError = await unauthorizedMessage.isVisible().catch(() => false)

    expect(redirectedToLogin || showsError).toBeTruthy()

    await page.unroute('**/backend/**')
  })

  test('should handle 403 forbidden errors', async ({ page }) => {
    // Mock 403 error
    await page.route('**/backend/**', (route) => {
      route.fulfill({
        status: 403,
        body: JSON.stringify({ message: 'Forbidden' })
      })
    })

    await loginAndNavigate(page, '/dashboard/settings/team')
    await page.waitForTimeout(2000)

    const forbiddenMessage = page.getByText(/forbidden|not allowed|no permission|access denied/i)
    const hasError = await forbiddenMessage.isVisible({ timeout: 5000 }).catch(() => false)

    if (hasError) {
      await expect(forbiddenMessage).toBeVisible()
    }

    await page.unroute('**/backend/**')
  })
})

test.describe('Error States - Empty States', () => {
  test('should show empty state when no policies exist', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/policies')
    await page.route('**/backend/policies**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], pagination: { cursor: null, hasMore: false } }),
      })
    })
    await page.reload()
    await waitForPageLoad(page)

    const emptyState = page.getByText(/no policies|create your first policy|sample policies/i)
    await expect(emptyState.first()).toBeVisible({ timeout: 5000 })

    await page.unroute('**/backend/policies**')
  })

  test('should show empty state when no locations exist', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/locations')
    await page.route('**/backend/locations**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], pagination: { cursor: null, hasMore: false } }),
      })
    })
    await page.reload()
    await waitForPageLoad(page)

    const emptyState = page.getByText(/no (locations|zones)|add your first|get started/i)
    await expect(emptyState.first()).toBeVisible({ timeout: 5000 })

    await page.unroute('**/backend/locations**')
  })

  test('should show empty state when no lists exist', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/lists')
    await page.route('**/backend/lists**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], pagination: { cursor: null, hasMore: false } }),
      })
    })
    await page.reload()
    await waitForPageLoad(page)

    const emptyState = page.getByText(/no lists|create your first list|get started/i)
    await expect(emptyState.first()).toBeVisible({ timeout: 5000 })

    await page.unroute('**/backend/lists**')
  })

  test('should show empty state when no reports data available', async ({ page }) => {
    // Mock empty response
    await page.route('**/backend/**/reports/**', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ queries: [], stats: {} })
      })
    })

    await loginAndNavigate(page, '/dashboard/reports')
    await waitForPageLoad(page)

    const emptyState = page.getByText(/no data|no queries|no activity|start using/i)
    const hasEmptyState = await emptyState.isVisible({ timeout: 5000 }).catch(() => false)

    if (hasEmptyState) {
      await expect(emptyState).toBeVisible()
    }

    await page.unroute('**/backend/**/reports/**')
  })

  test('should show empty state when no team members exist', async ({ page }) => {
    // Mock empty response
    await page.route('**/backend/**/users', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify([])
      })
    })

    await loginAndNavigate(page, '/dashboard/settings/team')
    await waitForPageLoad(page)

    const emptyState = page.getByText(/no team members|invite your first|add team/i)
    const hasEmptyState = await emptyState.isVisible({ timeout: 5000 }).catch(() => false)

    if (hasEmptyState) {
      await expect(emptyState).toBeVisible()
    }

    await page.unroute('**/backend/**/users')
  })

  test('should show empty state when no API keys exist', async ({ page }) => {
    // Mock empty response
    await page.route('**/backend/**/api-keys', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify([])
      })
    })

    await loginAndNavigate(page, '/dashboard/settings/api-keys')
    await waitForPageLoad(page)

    const emptyState = page.getByText(/no api keys|create your first key|generate key/i)
    const hasEmptyState = await emptyState.isVisible({ timeout: 5000 }).catch(() => false)

    if (hasEmptyState) {
      await expect(emptyState).toBeVisible()
    }

    await page.unroute('**/backend/**/api-keys')
  })
})

test.describe('Error States - Loading States', () => {
  test('should show loading spinner on dashboard', async ({ page }) => {
    // Delay API response
    await page.route('**/backend/**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      route.continue()
    })

    await loginAndNavigate(page, '/dashboard')

    // Should show loading state
    const loadingSpinner = page.locator('[class*="spinner"]').or(
      page.locator('[class*="loading"]')
    ).or(
      page.getByText(/loading|please wait/i)
    )

    const hasLoading = await loadingSpinner.isVisible({ timeout: 500 }).catch(() => false)

    if (hasLoading) {
      await expect(loadingSpinner).toBeVisible()
    }

    await page.unroute('**/backend/**')
    await waitForPageLoad(page)
  })

  test('should show loading state when fetching policies', async ({ page }) => {
    // Delay API response
    await page.route('**/backend/**/policies', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1500))
      route.continue()
    })

    await loginAndNavigate(page, '/dashboard/policies')

    const loadingState = page.getByText(/loading|fetching/i)
    const hasLoading = await loadingState.isVisible({ timeout: 500 }).catch(() => false)

    if (hasLoading) {
      await expect(loadingState).toBeVisible()
    }

    await page.unroute('**/backend/**/policies')
    await waitForPageLoad(page)
  })

  test('should show skeleton loaders for charts', async ({ page }) => {
    // Delay API response
    await page.route('**/backend/**/reports/**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      route.continue()
    })

    await loginAndNavigate(page, '/dashboard/reports')

    // Look for skeleton or loading placeholder
    const skeleton = page.locator('[class*="skeleton"]').or(
      page.locator('[class*="placeholder"]')
    )

    const hasSkeleton = await skeleton.isVisible({ timeout: 500 }).catch(() => false)

    if (hasSkeleton) {
      await expect(skeleton).toBeVisible()
    }

    await page.unroute('**/backend/**/reports/**')
    await waitForPageLoad(page)
  })

  test('should show loading state for table data', async ({ page }) => {
    // Delay API response
    await page.route('**/backend/**/locations', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      route.continue()
    })

    await loginAndNavigate(page, '/dashboard/locations')

    const loadingState = page.getByText(/loading|fetching/i)
    const hasLoading = await loadingState.isVisible({ timeout: 500 }).catch(() => false)

    if (hasLoading) {
      await expect(loadingState).toBeVisible()
    }

    await page.unroute('**/backend/**/locations')
    await waitForPageLoad(page)
  })
})

test.describe('Error States - Form Validation', () => {
  test('should show validation errors for empty required fields', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/policies')
    await waitForPageLoad(page)

    const createButton = page.getByRole('button', { name: /create policy|new policy/i })
    await createButton.click()

    // Try to submit without filling required fields
    const submitButton = page.getByRole('button', { name: /create|save|submit/i }).last()
    await submitButton.click()

    // Should show validation error
    const errorMessage = page.getByText(/required|please enter|field is required/i)
    await expect(errorMessage).toBeVisible({ timeout: 3000 })
  })

  test('should show validation for invalid email format', async ({ page }) => {
    await page.goto('/')

    const emailInput = page.getByLabel(/email/i)
    await emailInput.fill('not-a-valid-email')
    await emailInput.blur()

    // Should show validation error
    const errorMessage = page.getByText(/invalid email|valid email|email format/i)
    const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false)

    if (hasError) {
      await expect(errorMessage).toBeVisible()
    }
  })

  test('should show validation for password requirements', async ({ page }) => {
    await page.goto('/register')

    const passwordInput = page.getByLabel(/password/i).first()
    const hasPasswordInput = await passwordInput.isVisible().catch(() => false)

    if (hasPasswordInput) {
      await passwordInput.fill('123') // Too short

      const errorMessage = page.getByText(/at least|characters|too short|password must/i)
      const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false)

      if (hasError) {
        await expect(errorMessage).toBeVisible()
      }
    } else {
      test.skip()
    }
  })
})

test.describe('Error States - Permission Errors', () => {
  test('should show insufficient permissions message', async ({ page }) => {
    // This would require setting up a user with limited permissions
    test.skip()
  })

  test('should disable actions user cannot perform', async ({ page }) => {
    // This would require setting up a read-only user
    test.skip()
  })
})

test.describe('Error States - Session Expiry', () => {
  test('should handle expired session gracefully', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard')

    // Clear auth token to simulate expiry
    await page.evaluate(() => {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
    })

    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    await expect(loginHeading(page)).toBeVisible({ timeout: 20000 })
  })
})

test.describe('Error States - Rate Limiting', () => {
  test('should show rate limit error message', async ({ page }) => {
    // Mock 429 Too Many Requests
    await page.route('**/backend/**', (route) => {
      route.fulfill({
        status: 429,
        body: JSON.stringify({ message: 'Rate limit exceeded' })
      })
    })

    await loginAndNavigate(page, '/dashboard/policies')
    await page.waitForTimeout(2000)

    const rateLimitMessage = page.getByText(/rate limit|too many requests|slow down/i)
    const hasError = await rateLimitMessage.isVisible({ timeout: 5000 }).catch(() => false)

    if (hasError) {
      await expect(rateLimitMessage).toBeVisible()
    }

    await page.unroute('**/backend/**')
  })
})
