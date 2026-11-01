// Nebula DNS - Navigation E2E Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { pageHeading, loginHeading } from './helpers/selectors'

test.describe('Public Navigation', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/flux shield/i)
  })

  test('should have working login link', async ({ page }) => {
    await page.goto('/')
    await expect(loginHeading(page)).toBeVisible()
  })
})

test.describe.skip('Partner Portal — /partners/login is not part of the Flux Shield tenant UI', () => {
  test('should display partner login page', async ({ page }) => {
    await page.goto('/partners/login')
    await expect(page.getByText(/partner/i)).toBeVisible()
  })
})

test.describe('Responsive Design', () => {
  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await expect(loginHeading(page)).toBeVisible()
  })

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')
    await expect(loginHeading(page)).toBeVisible()
  })
})
