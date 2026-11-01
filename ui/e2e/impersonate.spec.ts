// Nebula DNS - Tenant UI impersonation handler E2E
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { installBackendMocks } from './helpers/mock-backend'
import { expectDashboardShell } from './helpers/auth'
import { enterpriseDashboardHeading } from './helpers/selectors'

test.describe('Impersonation handler', () => {
  test('loads dashboard from empty storage after impersonate redirect', async ({ page }) => {
    await installBackendMocks(page, 'enterprise')

    await page.goto('/')
    await page.evaluate(() => localStorage.clear())

    const info = encodeURIComponent(
      JSON.stringify({
        tenantId: 'enterprise-tenant-1',
        tenantName: 'Enterprise Corp',
        tenantTier: 'enterprise',
      }),
    )

    await page.goto(
      `/impersonate?token=test-token-for-e2e-enterprise&info=${info}`,
      { waitUntil: 'domcontentloaded' },
    )

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
    await expectDashboardShell(page)
    await expect(enterpriseDashboardHeading(page)).toBeVisible()

    const storage = await page.evaluate(() => ({
      token: localStorage.getItem('token'),
      user: localStorage.getItem('user'),
      impersonationInfo: localStorage.getItem('impersonation_info'),
    }))

    expect(storage.token).toBe('test-token-for-e2e-enterprise')
    expect(storage.impersonationInfo).toContain('Enterprise Corp')
    expect(storage.user).toContain('enterprise_user@test.com')
  })

  test('shows error instead of login redirect when profile load fails', async ({ page }) => {
    await installBackendMocks(page, 'enterprise')

    await page.route('**/backend/auth/me', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid impersonation token' }),
      })
    })

    await page.goto('/')
    await page.evaluate(() => localStorage.clear())

    const info = encodeURIComponent(
      JSON.stringify({
        tenantId: 'enterprise-tenant-1',
        tenantName: 'Enterprise Corp',
        tenantTier: 'enterprise',
      }),
    )

    await page.goto(
      `/impersonate?token=invalid-token&info=${info}`,
      { waitUntil: 'domcontentloaded' },
    )

    await expect(page.getByRole('heading', { name: /impersonation failed/i })).toBeVisible()
    await expect(page.getByText(/invalid impersonation token/i)).toBeVisible()
    await expect(page).toHaveURL(/\/impersonate/)
  })
})
