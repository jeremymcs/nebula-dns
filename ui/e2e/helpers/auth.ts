// Nebula DNS - E2E Test Authentication Helpers
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Page, expect } from '@playwright/test'
import { installBackendMocks } from './mock-backend'

type TenantTier = 'home' | 'enterprise' | 'msp'

/**
 * Login helper for E2E tests
 * Sets up authentication token in localStorage
 */
export async function login(page: Page, tier: TenantTier = 'enterprise') {
  await installBackendMocks(page, tier)

  await page.addInitScript(({ tier }) => {
    const tierConfig = {
      home: {
        id: 'home-tenant-1',
        email: 'home_user@test.com',
        name: 'Home User',
        tenantName: 'Home Family'
      },
      enterprise: {
        id: 'enterprise-tenant-1',
        email: 'enterprise_user@test.com',
        name: 'Enterprise User',
        tenantName: 'Enterprise Corp'
      },
      msp: {
        id: 'msp-tenant-1',
        email: 'msp_user@test.com',
        name: 'MSP Admin',
        tenantName: 'MSP Provider Inc'
      }
    }

    const config = tierConfig[tier]

    localStorage.setItem('token', `test-token-for-e2e-${tier}`)
    localStorage.setItem('refreshToken', 'test-refresh-for-e2e')
    localStorage.setItem('user', JSON.stringify({
      id: `user-${tier}-1`,
      email: config.email,
      name: config.name,
      role: 'admin',
      tenantId: config.id,
      tenantTier: tier,
    }))
    localStorage.setItem('tenant', JSON.stringify({
      id: config.id,
      name: config.tenantName,
      tier: tier,
      subscriptionStatus: 'active',
      locationLimit: tier === 'home' ? 5 : tier === 'enterprise' ? 50 : null,
      clientLimit: tier === 'msp' ? null : undefined
    }))
  }, { tier })

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  await expectDashboardShell(page)
}

/**
 * Login as Home tier user
 */
export async function loginAsHome(page: Page) {
  await login(page, 'home')
}

/**
 * Login as Enterprise tier user
 */
export async function loginAsEnterprise(page: Page) {
  await login(page, 'enterprise')
}

/**
 * Login as MSP tier user
 */
export async function loginAsMSP(page: Page) {
  await login(page, 'msp')
}

/**
 * Login and navigate to a specific dashboard page
 */
export async function loginAndNavigate(page: Page, path: string, tier: TenantTier = 'enterprise') {
  await login(page, tier)
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await expectDashboardShell(page)
}

export async function expectDashboardShell(page: Page) {
  const shell = page
    .getByRole('link', { name: /flux shield/i })
    .or(page.getByRole('heading', { level: 1, name: /^dashboard$/i }))
    .or(page.locator('a[href="/dashboard"]').first())
  await shell.first().waitFor({ state: 'visible', timeout: 20_000 })
}

/**
 * Logout helper for E2E tests
 */
export async function logout(page: Page) {
  await page.evaluate(() => {
    localStorage.clear()
  })
  await page.goto('/')
}

/**
 * Wait for page to be fully loaded with data
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('domcontentloaded')
  await expectDashboardShell(page)
}

/** Home tier dashboard title (Family Protection). */
export function homeDashboardHeading(page: Page) {
  return page.getByRole('heading', { level: 1, name: /family protection|dashboard/i })
}

/** Assert tier-gated page shows upgrade / access messaging. */
export async function expectTierRestricted(page: Page) {
  const restriction = page
    .getByRole('heading', { name: /upgrade required|access denied|msp feature only/i })
    .or(
      page.getByText(
        /upgrade.*enterprise|upgrade.*msp|enterprise.*required|msp.*required|msp feature only|access denied|forbidden|not available|upgrade required|contact support to upgrade/i,
      ),
    )
    .or(page.getByRole('button', { name: /upgrade to (enterprise|msp)/i }))
    .or(page.getByRole('link', { name: /upgrade to (enterprise|msp)/i }))

  await expect(restriction.first()).toBeVisible({ timeout: 15_000 })
}
