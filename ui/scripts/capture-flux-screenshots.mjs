#!/usr/bin/env node
/**
 * Capture Flux Shield Design C screenshots (run from ui/: node scripts/capture-flux-screenshots.mjs)
 */
import { chromium } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = process.env.SCREENSHOT_DIR || '/opt/cursor/artifacts/screenshots'
const UI_BASE = process.env.UI_URL || 'http://127.0.0.1:4011'
const ADMIN_BASE = process.env.ADMIN_UI_URL || 'http://127.0.0.1:4012'
const EMAIL_PREVIEW = path.join(__dirname, '../../api/artifacts/email-previews/welcome.html')

function json(body, status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  }
}

const enterpriseUser = {
  id: 'user-enterprise-1',
  email: 'enterprise_user@test.com',
  name: 'Enterprise User',
  role: 'admin',
  tenantId: 'enterprise-tenant-1',
  tenantName: 'Enterprise Corp',
  tenantTier: 'enterprise',
  mfaEnabled: false,
}

const adminUser = {
  id: 'admin-1',
  email: 'admin@nebula.local',
  name: 'Super Admin',
  status: 'active',
  mfaSetupComplete: true,
  lastLoginAt: new Date().toISOString(),
  role: 'super_admin',
  mfaVerified: true,
}

async function installUiMocks(page) {
  await page.route('**/backend/**', async (route) => {
    const url = route.request().url()
    const method = route.request().method()

    if (url.includes('/auth/me')) {
      await route.fulfill(json(enterpriseUser))
      return
    }
    if (url.includes('/auth/refresh')) {
      await route.fulfill(
        json({
          accessToken: 'capture-token',
          refreshToken: 'capture-refresh',
          user: enterpriseUser,
        }),
      )
      return
    }
    if (url.includes('/auth/organizations')) {
      await route.fulfill(
        json({ isMsp: false, partnerId: null, currentOrg: null, organizations: [] }),
      )
      return
    }
    if (url.includes('/subscription/')) {
      if (url.includes('grace-period')) {
        await route.fulfill(
          json({
            tenantId: enterpriseUser.tenantId,
            tenantName: enterpriseUser.tenantName,
            subscriptionStatus: 'active',
            graceStartDate: null,
            daysRemaining: null,
          }),
        )
        return
      }
      await route.fulfill(json({ status: 'active', canResolve: true }))
      return
    }
    if (url.includes('/reports/summary')) {
      await route.fulfill(
        json({
          totalQueries: 284920,
          blockedQueries: 12440,
          allowedQueries: 272480,
          blockRate: 4.37,
          threatsBlocked: 892,
          avgResponseTime: 18,
          cacheHitRate: 94.2,
        }),
      )
      return
    }
    if (url.includes('/reports/trends')) {
      const now = Date.now()
      await route.fulfill(
        json(
          Array.from({ length: 24 }, (_, i) => ({
            timestamp: new Date(now - (23 - i) * 3600000).toISOString(),
            total: 8000 + i * 120,
            allowed: 7600 + i * 110,
            blocked: 400 + i * 10,
          })),
        ),
      )
      return
    }
    if (url.includes('/reports/top-blocked')) {
      await route.fulfill(
        json([
          {
            domain: 'malware-c2.example',
            category: 'Malware',
            count: 420,
            lastBlocked: new Date().toISOString(),
          },
        ]),
      )
      return
    }
    if (url.includes('/reports/blocks-by-category')) {
      await route.fulfill(
        json([
          { category: 'Malware', count: 1247, percentage: 42 },
          { category: 'Phishing', count: 892, percentage: 30 },
          { category: 'Gambling', count: 567, percentage: 19 },
          { category: 'Adult', count: 310, percentage: 9 },
        ]),
      )
      return
    }
    if (url.includes('/reports/locations')) {
      await route.fulfill(
        json([
          {
            locationId: 'loc-1',
            locationName: 'HQ Network',
            totalQueries: 120000,
            blockedQueries: 5200,
            blockRate: 4.3,
          },
        ]),
      )
      return
    }
    if (url.includes('/reports/logs')) {
      await route.fulfill(
        json({
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
      return
    }
    if (url.includes('/policies')) {
      await route.fulfill(
        json({
          data: [
            {
              id: 'policy-1',
              name: 'Corporate baseline',
              description: 'Default security posture',
              enabled: true,
              priority: 1,
              locationCount: 3,
            },
          ],
          pagination: { cursor: null, hasMore: false },
        }),
      )
      return
    }
    if (url.includes('/locations') || url.includes('/agents')) {
      await route.fulfill(
        json({
          data: [{ id: 'loc-1', name: 'HQ Network', status: 'active' }],
          pagination: { cursor: null, hasMore: false },
        }),
      )
      return
    }
    if (method === 'GET') {
      await route.fulfill(json({ data: [], pagination: { cursor: null, hasMore: false } }))
      return
    }
    await route.fulfill(json({ ok: true }))
  })
}

async function seedUiSession(page) {
  await page.addInitScript((user) => {
    localStorage.setItem('token', 'capture-token')
    localStorage.setItem('refreshToken', 'capture-refresh')
    localStorage.setItem('user', JSON.stringify(user))
    localStorage.setItem(
      'tenant',
      JSON.stringify({
        id: user.tenantId,
        name: user.tenantName,
        tier: 'enterprise',
        subscriptionStatus: 'active',
      }),
    )
  }, enterpriseUser)
}

async function installAdminMocks(page) {
  await page.route('**/backend/**', async (route) => {
    const url = route.request().url()
    if (!url.includes('/admin/')) {
      await route.continue()
      return
    }
    if (url.includes('/admin/me')) {
      await route.fulfill(json({ ...adminUser, mfaVerified: true, mfaSetupComplete: true }))
      return
    }
    if (url.includes('/admin/dashboard/stats')) {
      const n = (v) => ({ value: v, available: true })
      await route.fulfill(
        json({
          mspCount: n(12),
          mspPendingCount: n(0),
          mspByStatus: { active: 10, suspended: 1, cancelled: 1 },
          tenantCount: {
            total: n(128),
            byTier: { home: 20, enterprise: 90, msp: 18 },
            mspClients: n(45),
          },
          activeTenants7d: n(95),
          monthlyRevenueCents: { value: 4820000, available: true },
          prevMonthRevenueCents: { value: 4200000, available: true },
          billingEnabled: true,
          demoTenantCount: n(3),
          timestamp: new Date().toISOString(),
        }),
      )
      return
    }
    if (url.includes('/admin/system/health')) {
      const now = new Date().toISOString()
      await route.fulfill(
        json({
          overallStatus: 'healthy',
          services: [
            { name: 'policy-svc', status: 'healthy', lastChecked: now },
            { name: 'dnsdist', status: 'healthy', lastChecked: now },
            { name: 'unbound', status: 'healthy', lastChecked: now },
          ],
          storage: {
            redis: { connected: true, latencyMs: 2 },
            clickhouse: { connected: true, latencyMs: 12, consecutiveFailures: 0 },
          },
          errorRates: {
            lastHour: { errorCount: 0, totalQueries: 120000, errorRate: 0 },
            last24Hours: { errorCount: 3, totalQueries: 2800000, errorRate: 0.0001 },
            isMockData: false,
          },
          queryVolume: {
            totalQueries: 2800000,
            blockedQueries: 42000,
            allowedQueries: 2758000,
            period: '24h',
            isMockData: false,
          },
          timestamp: now,
        }),
      )
      return
    }
    if (url.includes('/admin/users/activity')) {
      await route.fulfill(json({ data: [], pagination: { cursor: null, hasMore: false } }))
      return
    }
    if (url.includes('/admin/system/errors')) {
      await route.fulfill(json([]))
      return
    }
    if (url.includes('/admin/system/certificates')) {
      await route.fulfill(
        json({
          certificates: [],
          checkedAt: new Date().toISOString(),
        }),
      )
      return
    }
    if (url.includes('/admin/tenants')) {
      await route.fulfill(
        json({
          data: [
            {
              id: 'tenant-1',
              name: 'Acme Corp',
              slug: 'acme',
              tier: 'enterprise',
              status: 'active',
              createdAt: new Date().toISOString(),
            },
          ],
          pagination: { cursor: null, hasMore: false },
        }),
      )
      return
    }
    await route.fulfill(json({ data: [], pagination: { cursor: null, hasMore: false } }))
  })
}

async function seedAdminSession(page) {
  await page.addInitScript((admin) => {
    localStorage.setItem('admin_token', 'admin-capture-token')
    localStorage.setItem('admin_user', JSON.stringify(admin))
    localStorage.setItem('admin_mfa_verified', 'true')
    const expiry = new Date(Date.now() + 8 * 3600 * 1000).toISOString()
    localStorage.setItem('admin_session_expiry', expiry)
  }, adminUser)
}

async function shot(page, file, url, waitSelector) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  if (waitSelector) {
    await page.locator(waitSelector).first().waitFor({ state: 'visible', timeout: 45000 })
  }
  await page.waitForTimeout(800)
  const target = path.join(OUT, file)
  await page.screenshot({ path: target, fullPage: false })
  console.log('saved', target)
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()

  await page.goto(`${UI_BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-flux-auth-shell]').waitFor({ state: 'visible', timeout: 60000 })
  await page.screenshot({ path: path.join(OUT, 'ui-login.png') })
  console.log('saved', path.join(OUT, 'ui-login.png'))

  const WWW_BASE = process.env.WWW_URL || 'http://127.0.0.1:4013'
  try {
    await page.goto(`${WWW_BASE}/`, { waitUntil: 'networkidle', timeout: 90000 })
    const cta = page.locator('[data-flux-cta-band]')
    await cta.scrollIntoViewIfNeeded()
    await cta.waitFor({ state: 'visible', timeout: 45000 })
    await page.waitForTimeout(400)
    await cta.screenshot({ path: path.join(OUT, 'www-cta-band.png') })
    console.log('saved', path.join(OUT, 'www-cta-band.png'))
  } catch (e) {
    console.warn('www CTA capture skipped:', e.message)
  }

  await installUiMocks(page)
  await seedUiSession(page)

  await shot(page, 'ui-dashboard.png', `${UI_BASE}/dashboard`, '[data-flux-dashboard]')
  await shot(page, 'ui-policies.png', `${UI_BASE}/dashboard/policies`, '[data-flux-app-shell]')
  await shot(page, 'ui-investigate.png', `${UI_BASE}/dashboard/investigate`, '[data-flux-app-shell]')
  await shot(page, 'ui-reports.png', `${UI_BASE}/dashboard/reports`, '[data-flux-app-shell]')
  await shot(page, 'ui-locations.png', `${UI_BASE}/dashboard/locations`, '[data-flux-app-shell]')
  await shot(page, 'ui-settings.png', `${UI_BASE}/dashboard/settings`, '[data-flux-app-shell]')

  await page.unroute('**/backend/**')
  await page.goto(`${ADMIN_BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-flux-auth-shell]').waitFor({ state: 'visible', timeout: 60000 })
  await page.screenshot({ path: path.join(OUT, 'admin-login.png') })
  console.log('saved', path.join(OUT, 'admin-login.png'))

  await installAdminMocks(page)
  await seedAdminSession(page)
  await page.goto(`${ADMIN_BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.locator('[data-flux-dashboard]').first().waitFor({ state: 'visible', timeout: 60000 })
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(OUT, 'admin-dashboard.png') })
  console.log('saved', path.join(OUT, 'admin-dashboard.png'))

  await shot(page, 'admin-tenants.png', `${ADMIN_BASE}/tenants`, '[data-flux-dashboard]')
  await shot(page, 'admin-health.png', `${ADMIN_BASE}/health`, '[data-flux-dashboard]')

  const emailPage = await context.newPage()
  const emailHtml = fs.readFileSync(EMAIL_PREVIEW, 'utf8')
  await emailPage.setContent(emailHtml, { waitUntil: 'load' })
  await emailPage.setViewportSize({ width: 640, height: 900 })
  await emailPage.waitForTimeout(300)
  await emailPage.screenshot({ path: path.join(OUT, 'email-welcome.png'), fullPage: true })
  console.log('saved', path.join(OUT, 'email-welcome.png'))

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
