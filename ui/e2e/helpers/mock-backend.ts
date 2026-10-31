// Playwright helpers: stub /backend/* so dashboard E2E does not require a live API.
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Page } from '@playwright/test'

type TenantTier = 'home' | 'enterprise' | 'msp'

const tierUsers: Record<
  TenantTier,
  { id: string; email: string; name: string; tenantId: string; tenantName: string; role: string }
> = {
  home: {
    id: 'user-home-1',
    email: 'home_user@test.com',
    name: 'Home User',
    tenantId: 'home-tenant-1',
    tenantName: 'Home Family',
    role: 'admin',
  },
  enterprise: {
    id: 'user-enterprise-1',
    email: 'enterprise_user@test.com',
    name: 'Enterprise User',
    tenantId: 'enterprise-tenant-1',
    tenantName: 'Enterprise Corp',
    role: 'admin',
  },
  msp: {
    id: 'user-msp-1',
    email: 'msp_user@test.com',
    name: 'MSP Admin',
    tenantId: 'msp-tenant-1',
    tenantName: 'MSP Provider Inc',
    role: 'admin',
  },
}

function jsonResponse(body: unknown, status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  }
}

/** Install default backend stubs for authenticated dashboard flows. */
export async function installBackendMocks(
  page: Page,
  tier: TenantTier = 'enterprise',
): Promise<void> {
  const user = tierUsers[tier]

  await page.route('**/backend/auth/me', async (route) => {
    await route.fulfill(
      jsonResponse({
        ...user,
        tenantTier: tier,
        mfaEnabled: false,
      }),
    )
  })

  await page.route('**/backend/auth/refresh', async (route) => {
    await route.fulfill(
      jsonResponse({
        accessToken: 'test-token-for-e2e',
        refreshToken: 'test-refresh-for-e2e',
        user: { ...user, tenantTier: tier },
      }),
    )
  })

  await page.route('**/backend/subscription/**', async (route) => {
    const url = route.request().url()
    if (url.includes('msp-info')) {
      await route.fulfill(
        jsonResponse({
          isMspManaged: tier === 'msp',
          mspName: tier === 'msp' ? 'MSP Provider Inc' : undefined,
        }),
      )
      return
    }
    if (url.includes('grace-period')) {
      await route.fulfill(
        jsonResponse({
          tenantId: user.tenantId,
          tenantName: user.tenantName,
          subscriptionStatus: 'active',
          graceStartDate: null,
          daysRemaining: null,
        }),
      )
      return
    }
    await route.fulfill(
      jsonResponse({ status: 'active', canResolve: true }),
    )
  })

  await page.route('**/backend/auth/organizations', async (route) => {
    await route.fulfill(jsonResponse({ organizations: [] }))
  })

  await page.route('**/backend/api-keys**', async (route) => {
    await route.fulfill(
      jsonResponse({ data: [], pagination: { cursor: null, hasMore: false } }),
    )
  })
}
