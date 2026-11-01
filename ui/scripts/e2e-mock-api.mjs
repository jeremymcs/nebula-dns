#!/usr/bin/env node
/**
 * Minimal HTTP stub for Playwright E2E so Next.js /backend proxy and the UI
 * can reach localhost:4010 without a full NestJS stack.
 */
import http from 'http'

const port = Number(process.env.PORT || 4010)

const defaultUser = {
  id: 'user-enterprise-1',
  email: 'enterprise_user@test.com',
  name: 'Enterprise User',
  role: 'admin',
  tenantId: 'enterprise-tenant-1',
  tenantTier: 'enterprise',
  mfaEnabled: false,
}

const server = http.createServer((req, res) => {
  const url = req.url || '/'
  res.setHeader('Content-Type', 'application/json')

  if (url.startsWith('/health')) {
    res.writeHead(200)
    res.end(JSON.stringify({ status: 'ok' }))
    return
  }

  if (url.startsWith('/auth/me')) {
    res.writeHead(200)
    res.end(JSON.stringify(defaultUser))
    return
  }

  if (url.startsWith('/auth/refresh')) {
    res.writeHead(200)
    res.end(
      JSON.stringify({
        accessToken: 'test-token-for-e2e',
        refreshToken: 'test-refresh-for-e2e',
        user: defaultUser,
      }),
    )
    return
  }

  if (url.startsWith('/subscription/')) {
    res.writeHead(200)
    if (url.includes('msp-info')) {
      res.end(JSON.stringify({ isMspManaged: false }))
      return
    }
    if (url.includes('grace-period')) {
      res.end(
        JSON.stringify({
          tenantId: defaultUser.tenantId,
          tenantName: 'Enterprise Corp',
          subscriptionStatus: 'active',
          graceStartDate: null,
          daysRemaining: null,
        }),
      )
      return
    }
    res.end(JSON.stringify({ status: 'active', canResolve: true }))
    return
  }

  if (url.startsWith('/api-keys') && req.method === 'POST') {
    res.writeHead(200)
    res.end(
      JSON.stringify({
        key: 'nneb_e2e_test_key_shown_once',
        keyId: 'key-e2e-1',
        name: 'Test API Key',
      }),
    )
    return
  }

  if (url.startsWith('/api-keys')) {
    res.writeHead(200)
    res.end(JSON.stringify({ data: [], pagination: { cursor: null, hasMore: false } }))
    return
  }

  if (url.startsWith('/mfa/')) {
    res.writeHead(200)
    if (url.includes('status')) {
      res.end(
        JSON.stringify({
          enabled: false,
          backupCodes: { total: 10, remaining: 10 },
        }),
      )
      return
    }
    if (url.includes('setup')) {
      res.end(
        JSON.stringify({
          data: {
            secret: 'TESTMFASECRET',
            qrCodeUrl: 'otpauth://totp/FluxShield:test?secret=TESTMFASECRET',
            backupCodes: ['code-1', 'code-2'],
          },
        }),
      )
      return
    }
    res.end(JSON.stringify({ ok: true }))
    return
  }

  if (url.startsWith('/sessions')) {
    res.writeHead(200)
    res.end(JSON.stringify({ data: [] }))
    return
  }

  if (url.startsWith('/audit-logs')) {
    res.writeHead(200)
    res.end(JSON.stringify({ data: [], pagination: { cursor: null, hasMore: false } }))
    return
  }

  if (url.includes('/policies') || url.includes('/lists') || url.includes('/locations')) {
    res.writeHead(200)
    res.end(JSON.stringify({ data: [], pagination: { cursor: null, hasMore: false } }))
    return
  }

  if (req.method === 'GET') {
    res.writeHead(200)
    res.end(JSON.stringify({}))
    return
  }

  res.writeHead(200)
  res.end(JSON.stringify({ ok: true }))
})

server.listen(port, '127.0.0.1', () => {
  console.log(`E2E mock API listening on http://127.0.0.1:${port}`)
})
