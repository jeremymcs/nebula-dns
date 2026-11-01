// Nebula DNS - Authentication E2E Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { installBackendMocks } from './helpers/mock-backend'

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
    await expect(page.getByLabel(/email address/i)).toBeVisible()
    await expect(page.getByLabel(/^password$/i)).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await installBackendMocks(page)
    await page.goto('/')
    await page.getByLabel(/email address/i).fill('invalid@example.com')
    await page.getByLabel(/^password$/i).fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByText(/invalid credentials|login failed/i)).toBeVisible({ timeout: 10000 })
  })

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
  })

  test.skip('should navigate to forgot password', async ({ page }) => {
    // Forgot-password UI is not implemented in the dashboard app yet.
    await page.goto('/')
    await page.getByRole('link', { name: /forgot.*password/i }).click()
    await expect(page).toHaveURL(/\/forgot-password/)
  })
})

test.describe('Authenticated User', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('token', 'test-token-for-e2e')
    })
  })

  test.skip('should access dashboard after login', async ({ page }) => {
    // Skip until we have proper test auth setup
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
  })
})
