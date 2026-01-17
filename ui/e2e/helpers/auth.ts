// Nebula DNS - E2E Test Authentication Helpers
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Page } from '@playwright/test'

/**
 * Login helper for E2E tests
 * Sets up authentication token in localStorage
 */
export async function login(page: Page) {
  await page.goto('/login')
  await page.evaluate(() => {
    localStorage.setItem('token', 'test-token-for-e2e')
    localStorage.setItem('user', JSON.stringify({
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      tenantId: 'test-tenant-1'
    }))
  })
}

/**
 * Login and navigate to a specific dashboard page
 */
export async function loginAndNavigate(page: Page, path: string) {
  await login(page)
  await page.goto(path)
}

/**
 * Logout helper for E2E tests
 */
export async function logout(page: Page) {
  await page.evaluate(() => {
    localStorage.clear()
  })
  await page.goto('/login')
}

/**
 * Wait for page to be fully loaded with data
 */
export async function waitForPageLoad(page: Page) {
  // Wait for network to be idle
  await page.waitForLoadState('networkidle')
}
