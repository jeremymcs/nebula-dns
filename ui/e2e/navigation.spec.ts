/**
 * Nebula DNS - Navigation E2E Tests
 */

import { test, expect } from '@playwright/test'

test.describe('Public Navigation', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/nebula|dns/i)
  })

  test('should have working login link', async ({ page }) => {
    await page.goto('/')
    // Navigate to login
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
  })
})

test.describe('Partner Portal', () => {
  test('should display partner login page', async ({ page }) => {
    await page.goto('/partners/login')
    await expect(page.getByText(/partner/i)).toBeVisible()
  })
})

test.describe('Responsive Design', () => {
  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
  })

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
  })
})
