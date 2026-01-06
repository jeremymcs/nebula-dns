/**
 * Nebula DNS - Authentication E2E Tests
 */

import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('invalid@example.com')
    await page.getByLabel(/password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByText(/invalid credentials|unauthorized/i)).toBeVisible({ timeout: 10000 })
  })

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('should navigate to forgot password', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: /forgot.*password/i }).click()
    await expect(page).toHaveURL(/\/forgot-password/)
  })
})

test.describe('Authenticated User', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication by setting localStorage
    await page.goto('/login')
    await page.evaluate(() => {
      localStorage.setItem('token', 'test-token-for-e2e')
    })
  })

  test.skip('should access dashboard after login', async ({ page }) => {
    // Skip until we have proper test auth setup
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: /dashboard|mission control/i })).toBeVisible()
  })
})
