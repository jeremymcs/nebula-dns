/**
 * Shared E2E mock API responses for Playwright route stubs and e2e-mock-api.mjs.
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

const defaultUser = {
  id: 'user-enterprise-1',
  email: 'enterprise_user@test.com',
  name: 'Enterprise User',
  role: 'admin',
  tenantId: 'enterprise-tenant-1',
  tenantName: 'Enterprise Corp',
  tenantTier: 'enterprise',
  mfaEnabled: false,
}

const tierUsers = {
  home: {
    ...defaultUser,
    id: 'user-home-1',
    email: 'home_user@test.com',
    name: 'Home User',
    tenantId: 'home-tenant-1',
    tenantName: 'Home Family',
    tenantTier: 'home',
  },
  enterprise: defaultUser,
  msp: {
    ...defaultUser,
    id: 'user-msp-1',
    email: 'msp_user@test.com',
    name: 'MSP Admin',
    tenantId: 'msp-tenant-1',
    tenantName: 'MSP Provider Inc',
    tenantTier: 'msp',
  },
}

function json(body, status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  }
}

function csv(body, status = 200) {
  return {
    status,
    contentType: 'text/csv',
    body,
  }
}

const emptyPage = { data: [], pagination: { cursor: null, hasMore: false } }

const usageStatsByTier = {
  home: {
    locations: { current: 3, limit: 5, percentage: 60 },
    billingPeriod: {
      start: '2026-10-01T00:00:00.000Z',
      end: '2026-10-31T23:59:59.000Z',
    },
    plan: { name: 'Home', tier: 'home' },
  },
  enterprise: {
    locations: { current: 12, limit: 50, percentage: 24 },
    billingPeriod: {
      start: '2026-10-01T00:00:00.000Z',
      end: '2026-10-31T23:59:59.000Z',
    },
    plan: { name: 'Enterprise', tier: 'enterprise' },
  },
  msp: {
    locations: { current: 120, limit: 9999, percentage: 12 },
    clients: { current: 8, limit: 9999, percentage: 8 },
    billingPeriod: {
      start: '2026-10-01T00:00:00.000Z',
      end: '2026-10-31T23:59:59.000Z',
    },
    plan: { name: 'MSP', tier: 'msp' },
  },
}

export function getMockResponse(rawUrl, method = 'GET', authHeader = '') {
  let pathname = rawUrl
  try {
    pathname = new URL(rawUrl, 'http://127.0.0.1').pathname
  } catch {
    pathname = rawUrl.split('?')[0]
  }

  const tier =
    authHeader.includes('home') || pathname.includes('home-tenant') || authHeader.includes('e2e-home')
      ? 'home'
      : authHeader.includes('msp') || pathname.includes('msp-tenant') || authHeader.includes('e2e-msp')
        ? 'msp'
        : 'enterprise'

  if (pathname.startsWith('/health')) {
    return json({ status: 'ok' })
  }

  if (pathname === '/auth/login' && method === 'POST') {
    return json({ message: 'Invalid credentials' }, 401)
  }

  if (pathname.startsWith('/auth/me')) {
    return json(tierUsers[tier] || defaultUser)
  }

  if (pathname.startsWith('/auth/refresh')) {
    return json({
      accessToken: 'test-token-for-e2e',
      refreshToken: 'test-refresh-for-e2e',
      user: tierUsers[tier] || defaultUser,
    })
  }

  if (pathname.startsWith('/auth/organizations')) {
    const sampleOrgs =
      tier === 'msp'
        ? [
            {
              id: 'client-1',
              name: 'Acme Corp',
              slug: 'acme-corp',
              status: 'active',
            },
          ]
        : []
    return json({
      isMsp: tier === 'msp',
      partnerId: tier === 'msp' ? 'msp-partner-1' : null,
      currentOrg: sampleOrgs[0] ?? null,
      organizations: sampleOrgs,
    })
  }

  if (pathname.startsWith('/subscription/')) {
    if (pathname.includes('msp-info')) {
      return json({ isMspManaged: tier === 'msp', mspName: tier === 'msp' ? 'MSP Provider Inc' : undefined })
    }
    if (pathname.includes('grace-period')) {
      return json({
        tenantId: tierUsers[tier]?.tenantId || defaultUser.tenantId,
        tenantName: tierUsers[tier]?.tenantName || defaultUser.tenantName,
        subscriptionStatus: 'active',
        graceStartDate: null,
        daysRemaining: null,
      })
    }
    return json({ status: 'active', canResolve: true })
  }

  if (pathname.startsWith('/api-keys') && method === 'POST') {
    return json({
      key: 'nneb_e2e_test_key_shown_once',
      keyId: 'key-e2e-1',
      name: 'Test API Key',
    })
  }

  if (pathname.startsWith('/api-keys')) {
    return json(emptyPage)
  }

  if (pathname.startsWith('/mfa/')) {
    if (pathname.includes('status')) {
      return json({ enabled: false, backupCodes: { total: 10, remaining: 10 } })
    }
    if (pathname.includes('setup')) {
      return json({
        data: {
          secret: 'TESTMFASECRET',
          qrCodeUrl: 'otpauth://totp/FluxShield:test?secret=TESTMFASECRET',
          backupCodes: ['code-1', 'code-2'],
        },
      })
    }
    return json({ ok: true })
  }

  if (pathname.startsWith('/sessions') || pathname.startsWith('/auth/sessions')) {
    return json({ data: [] })
  }

  if (pathname.startsWith('/audit-logs')) {
    return json(emptyPage)
  }

  if (pathname.startsWith('/policies')) {
    return json(emptyPage)
  }

  if (pathname.startsWith('/locations')) {
    return json(emptyPage)
  }

  if (pathname.startsWith('/lists')) {
    return json(emptyPage)
  }

  if (pathname.startsWith('/siem')) {
    return json({
      data: [
        {
          id: 'siem-1',
          name: 'Splunk SIEM',
          type: 'splunk',
          isEnabled: false,
          errorCount: 0,
        },
      ],
      pagination: { cursor: null, hasMore: false },
    })
  }

  if (pathname.startsWith('/webhooks')) {
    if (method === 'POST') {
      return json({
        data: {
          id: 'webhook-e2e-1',
          name: 'E2E Webhook',
          url: 'https://hooks.example.com/e2e',
          events: ['policy.created'],
          isEnabled: true,
          failureCount: 0,
        },
      })
    }
    return json(emptyPage)
  }

  if (pathname.startsWith('/sso')) {
    return json({
      data: {
        providerType: null,
        isEnabled: false,
        autoProvisionUsers: true,
        defaultRole: 'readonly',
      },
    })
  }

  if (pathname.startsWith('/invitations')) {
    if (method === 'POST') {
      return json({
        id: 'invitation-e2e-1',
        email: 'newmember@example.com',
        role: 'analyst',
        status: 'pending',
      })
    }
    return json(emptyPage)
  }

  if (pathname.startsWith('/users') || pathname.startsWith('/team')) {
    const member = tierUsers[tier] || tierUsers.enterprise
    return json({
      data: [
        {
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role || 'admin',
          status: 'active',
        },
      ],
      pagination: { cursor: null, hasMore: false },
    })
  }

  if (pathname.startsWith('/scheduled-reports')) {
    if (method === 'POST') {
      return json({
        data: {
          id: 'sched-e2e-1',
          name: 'Weekly Summary',
          schedule: '0 9 * * 1',
          format: 'pdf',
          isEnabled: true,
          nextRunAt: new Date(Date.now() + 86400000).toISOString(),
        },
      })
    }
    return json({
      data: [
        {
          id: 'sched-1',
          name: 'Weekly Security Summary',
          schedule: '0 9 * * 1',
          format: 'pdf',
          isEnabled: true,
          nextRunAt: new Date(Date.now() + 86400000).toISOString(),
          recipients: ['admin@example.com'],
        },
      ],
      pagination: { cursor: null, hasMore: false },
    })
  }

  if (pathname.startsWith('/reports/dashboard/home')) {
    return json({
      threatsBlockedToday: 42,
      threatsBlockedThisWeek: 210,
      activeNetworks: 3,
      topBlockedCategories: [{ category: 'malware', count: 12 }],
      protectionStatus: 'active',
    })
  }

  if (pathname.startsWith('/reports/summary')) {
    return json({
      totalQueries: 125000,
      blockedQueries: 4200,
      allowedQueries: 120800,
      blockRate: 3.36,
      threatsBlocked: 890,
      avgResponseTime: 12,
      cacheHitRate: 88,
    })
  }

  if (pathname.startsWith('/reports/top-blocked')) {
    return json([
      { domain: 'bad.example.com', category: 'malware', count: 120, lastBlocked: new Date().toISOString() },
      { domain: 'phish.example.com', category: 'phishing', count: 80, lastBlocked: new Date().toISOString() },
    ])
  }

  if (pathname.startsWith('/reports/blocks-by-category')) {
    return json([
      { category: 'malware', count: 400, percentage: 40 },
      { category: 'phishing', count: 300, percentage: 30 },
    ])
  }

  if (pathname.startsWith('/reports/threats')) {
    return json({
      threats: [],
      heatmap: [],
      trends: [
        { date: '2026-10-27', count: 120 },
        { date: '2026-10-28', count: 145 },
      ],
    })
  }

  if (pathname.startsWith('/reports/trends')) {
    const now = Date.now()
    return json(
      [0, 1, 2, 3, 4, 5, 6].map((offset) => ({
        timestamp: new Date(now - offset * 86400000).toISOString(),
        total: 10000 + offset * 500,
        allowed: 9500 + offset * 480,
        blocked: 500 + offset * 20,
      })),
    )
  }

  if (pathname.startsWith('/reports/locations')) {
    return json([{ locationId: 'loc-1', name: 'HQ', queries: 5000, blocked: 200 }])
  }

  if (pathname.startsWith('/reports/logs')) {
    return json({
      data: [
        {
          id: 'log-1',
          action: 'block',
          domain: 'malware.example.com',
          category: 'malware',
          locationName: 'HQ',
          timestamp: new Date().toISOString(),
        },
      ],
      pagination: { cursor: null, hasMore: false },
    })
  }

  if (pathname.startsWith('/reports/data-status')) {
    return json({ hasData: true, lastIngestAt: new Date().toISOString() })
  }

  if (pathname.startsWith('/reports/security-score')) {
    return json({ score: 82, grade: 'B', factors: [] })
  }

  if (pathname.startsWith('/reports/insights')) {
    return json({ highlights: [] })
  }

  if (pathname.startsWith('/reports/export')) {
    return json({ ok: true, url: '/exports/report-e2e.csv' })
  }

  if (pathname.startsWith('/api/v1/limits/usage/export')) {
    return csv('date,queries,blocked\n2026-10-01,1000,50\n')
  }

  if (pathname.startsWith('/api/v1/limits/usage/breakdown')) {
    const stats = usageStatsByTier[tier] || usageStatsByTier.enterprise
    if (tier === 'msp') {
      return json({
        clients: [
          {
            id: 'client-1',
            name: 'Acme Corp',
            createdAt: '2026-01-15T00:00:00.000Z',
            locationCount: 4,
            status: 'active',
          },
        ],
        projectedMonthlyCost: 499,
        currentPeriodCost: 412.5,
      })
    }
    return json({
      locations: [
        {
          id: 'loc-1',
          name: 'HQ Network',
          createdAt: '2026-02-01T00:00:00.000Z',
          policyId: 'pol-1',
          policyName: 'Default Policy',
          status: 'active',
        },
      ],
      projectedMonthlyCost: 99,
      currentPeriodCost: stats.locations.current * 2.5,
    })
  }

  if (pathname.startsWith('/api/v1/limits/usage/history')) {
    return json([
      { date: '2026-05-01', locations: 3, policies: 2, queries: 10000 },
      { date: '2026-06-01', locations: 3, policies: 2, queries: 12000 },
    ])
  }

  if (pathname.startsWith('/api/v1/limits/usage')) {
    return json(usageStatsByTier[tier] || usageStatsByTier.enterprise)
  }

  if (pathname.startsWith('/msp/billing/overview')) {
    return json({
      partnerId: 'partner-1',
      status: 'active',
      queryBalance: 2500000,
      totalPurchased: 5000000,
      totalUsed: 2500000,
      currentOverage: 0,
      overageRate: 0.5,
      alertThreshold: 80,
      autoPurchaseEnabled: false,
      billingPeriodStart: '2026-10-01T00:00:00.000Z',
      billingPeriodEnd: '2026-10-31T23:59:59.000Z',
      usageThisMonth: 1250000,
      estimatedCost: 499,
    })
  }

  if (pathname.startsWith('/msp/billing/bundles')) {
    return json([
      {
        id: 'bundle-1',
        name: 'Starter Pack',
        description: '1M queries',
        queryCount: '1000000',
        price: '49.00',
        pricePerMillion: '49.00',
        validityDays: 30,
        isActive: true,
      },
    ])
  }

  if (pathname.startsWith('/msp/billing/usage/realtime')) {
    return json({
      todayQueries: 42000,
      todayBlocked: 1200,
      todayThreats: 300,
      lastHourQueries: 3500,
      byTenant: [{ tenantId: 'client-1', tenantName: 'Acme Corp', queries: 12000 }],
    })
  }

  if (pathname.startsWith('/msp/billing/invoices')) {
    return json({
      invoices: [
        {
          id: 'inv-1',
          invoiceNumber: 'INV-1001',
          periodStart: '2026-09-01T00:00:00.000Z',
          periodEnd: '2026-09-30T23:59:59.000Z',
          totalAmount: '499.00',
          status: 'paid',
        },
      ],
      total: 1,
    })
  }

  if (pathname.startsWith('/msp/billing/purchases')) {
    return json({ purchases: [], total: 0 })
  }

  if (pathname.startsWith('/msp/billing/usage')) {
    return json({ usageByDate: [], totalQueries: 0, totalBlocked: 0 })
  }

  if (pathname.startsWith('/msp/clients')) {
    if (method === 'POST') {
      return json({
        client: {
          id: `client-${Date.now()}`,
          name: 'New Test Client',
          slug: 'new-test-client',
          status: 'active',
          plan: 'enterprise',
          locationCount: 0,
          userCount: 1,
          createdAt: new Date().toISOString(),
        },
      })
    }
    return json({
      clients: [
        {
          id: 'client-1',
          name: 'Acme Corp',
          slug: 'acme-corp',
          status: 'active',
          plan: 'enterprise',
          locationCount: 4,
          userCount: 12,
          createdAt: '2026-01-15T00:00:00.000Z',
        },
      ],
    })
  }

  if (pathname.startsWith('/msp/templates')) {
    return json({
      templates: [
        {
          id: 'tpl-1',
          name: 'Baseline Security',
          description: 'Default MSP security template',
          version: 1,
          updatedAt: new Date().toISOString(),
          config: {
            blockCategories: ['malware', 'phishing'],
            warnCategories: [],
            threatBlocking: { enabled: true, feeds: ['malware', 'phishing'] },
            safesearch: { enabled: false, services: [], settings: {} },
            schedules: [],
          },
        },
      ],
    })
  }

  if (pathname.startsWith('/msp/')) {
    return json({ clients: [], templates: [] })
  }

  if (method === 'GET') {
    return json({})
  }

  return json({ ok: true })
}

export { defaultUser, tierUsers, emptyPage, usageStatsByTier }
