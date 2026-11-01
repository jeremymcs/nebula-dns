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
    await route.fulfill(
      jsonResponse({
        isMsp: tier === 'msp',
        partnerId: tier === 'msp' ? 'msp-partner-1' : null,
        currentOrg: null,
        organizations: [],
      }),
    )
  })

  const samplePolicies = {
    data: [
      {
        id: 'policy-1',
        name: 'Corporate baseline',
        description: 'Default security posture',
        enabled: true,
        priority: 1,
        locationCount: 3,
      },
      {
        id: 'policy-2',
        name: 'Guest Wi‑Fi',
        description: 'Stricter filtering for guest networks',
        enabled: true,
        priority: 2,
        locationCount: 1,
      },
    ],
    pagination: { cursor: null, hasMore: false },
  }

  await page.route('**/backend/policies**', async (route) => {
    await route.fulfill(jsonResponse(samplePolicies))
  })

  await page.route('**/backend/locations**', async (route) => {
    await route.fulfill(
      jsonResponse({
        data: [
          { id: 'loc-1', name: 'HQ Network', status: 'active' },
          { id: 'loc-2', name: 'Branch — Austin', status: 'active' },
        ],
        pagination: { cursor: null, hasMore: false },
      }),
    )
  })

  await page.route('**/backend/agents**', async (route) => {
    await route.fulfill(
      jsonResponse({
        data: [{ id: 'agent-1', name: 'MacBook — IT', status: 'online' }],
        pagination: { cursor: null, hasMore: false },
      }),
    )
  })

  await page.route('**/backend/reports/summary**', async (route) => {
    await route.fulfill(
      jsonResponse({
        totalQueries: 284_920,
        blockedQueries: 12_440,
        allowedQueries: 272_480,
        blockRate: 4.37,
        threatsBlocked: 892,
        avgResponseTime: 18,
        cacheHitRate: 94.2,
      }),
    )
  })

  await page.route('**/backend/reports/trends**', async (route) => {
    const now = Date.now()
    const trends = Array.from({ length: 24 }, (_, i) => ({
      timestamp: new Date(now - (23 - i) * 3600_000).toISOString(),
      total: 8000 + i * 120,
      allowed: 7600 + i * 110,
      blocked: 400 + i * 10,
    }))
    await route.fulfill(jsonResponse(trends))
  })

  await page.route('**/backend/reports/top-blocked**', async (route) => {
    await route.fulfill(
      jsonResponse([
        { domain: 'malware-c2.example', category: 'Malware', count: 420, lastBlocked: new Date().toISOString() },
        { domain: 'phish-login.example', category: 'Phishing', count: 318, lastBlocked: new Date().toISOString() },
      ]),
    )
  })

  await page.route('**/backend/reports/blocks-by-category**', async (route) => {
    await route.fulfill(
      jsonResponse([
        { category: 'Malware', count: 520, percentage: 42 },
        { category: 'Phishing', count: 310, percentage: 25 },
        { category: 'Adult', count: 180, percentage: 14 },
      ]),
    )
  })

  await page.route('**/backend/reports/locations**', async (route) => {
    await route.fulfill(
      jsonResponse([
        {
          locationId: 'loc-1',
          locationName: 'HQ Network',
          totalQueries: 120_000,
          blockedQueries: 5200,
          blockRate: 4.3,
        },
      ]),
    )
  })

  await page.route('**/backend/reports/logs**', async (route) => {
    await route.fulfill(
      jsonResponse({
        data: [
          {
            id: 'log-1',
            domain: 'ads.example.net',
            action: 'blocked',
            category: 'Ads',
            timestamp: new Date().toISOString(),
          },
        ],
        pagination: { cursor: null, hasMore: false },
      }),
    )
  })

  await page.route('**/backend/reports/**', async (route) => {
    const url = route.request().url()
    if (url.includes('data-status')) {
      await route.fulfill(jsonResponse({ hasData: true, lastIngestAt: new Date().toISOString() }))
      return
    }
    await route.fulfill(jsonResponse({}))
  })

  await page.route('**/backend/scheduled-reports**', async (route) => {
    await route.fulfill(jsonResponse({ data: [], pagination: { cursor: null, hasMore: false } }))
  })

  await page.route('**/backend/tenants/**', async (route) => {
    await route.fulfill(
      jsonResponse({
        id: user.tenantId,
        name: user.tenantName,
        tier,
        subscriptionStatus: 'active',
      }),
    )
  })

  await page.route('**/backend/lists**', async (route) => {
    await route.fulfill(jsonResponse({ data: [], pagination: { cursor: null, hasMore: false } }))
  })

  await page.route('**/backend/users**', async (route) => {
    await route.fulfill(jsonResponse({ data: [], pagination: { cursor: null, hasMore: false } }))
  })

  await page.route('**/backend/onboarding/**', async (route) => {
    await route.fulfill(jsonResponse({ completed: true, steps: [] }))
  })

  await page.route('**/backend/api-keys**', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill(
        jsonResponse({
          key: 'nneb_e2e_test_key_shown_once',
          keyId: 'key-e2e-1',
          name: 'Test API Key',
        }),
      )
      return
    }
    await route.fulfill(
      jsonResponse({ data: [], pagination: { cursor: null, hasMore: false } }),
    )
  })

  await page.route('**/backend/mfa/**', async (route) => {
    const url = route.request().url()
    if (url.includes('/status')) {
      await route.fulfill(
        jsonResponse({
          enabled: false,
          backupCodes: { total: 10, remaining: 10 },
        }),
      )
      return
    }
    if (url.includes('/setup')) {
      await route.fulfill(
        jsonResponse({
          data: {
            secret: 'TESTMFASECRET',
            qrCodeUrl: 'otpauth://totp/FluxShield:test?secret=TESTMFASECRET',
            backupCodes: ['code-1', 'code-2'],
          },
        }),
      )
      return
    }
    await route.fulfill(jsonResponse({ ok: true }))
  })

  await page.route('**/backend/sessions**', async (route) => {
    await route.fulfill(jsonResponse({ data: [] }))
  })

  await page.route('**/backend/audit-logs**', async (route) => {
    await route.fulfill(jsonResponse({ data: [], pagination: { cursor: null, hasMore: false } }))
  })
}
