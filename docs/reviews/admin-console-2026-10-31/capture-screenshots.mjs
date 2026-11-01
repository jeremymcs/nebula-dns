/**
 * One-off capture script for ADMIN-CONSOLE-EVAL-2026-10-31 (not part of product CI).
 * Run: node docs/reviews/admin-console-2026-10-31/capture-screenshots.mjs
 */
import { chromium, devices } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = __dirname
const BASE = process.env.ADMIN_UI_URL || 'http://localhost:4012'
const MSP_ID = '550e8400-e29b-41d4-a716-446655440000'
const EMAIL = process.env.ADMIN_EMAIL || 'admin@nebula.local'
const PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123456789!'

const routes = [
  { name: 'dashboard', path: '/', auth: true },
  { name: 'msps-list', path: '/msps', auth: true },
  { name: 'msps-new', path: '/msps/new', auth: true },
  { name: 'msps-detail', path: `/msps/${MSP_ID}`, auth: true },
  { name: 'health', path: '/health', auth: true },
  { name: 'alerting', path: '/settings/alerting', auth: true },
  { name: 'admin-users', path: '/users', auth: true },
  { name: 'tenant-billing', path: `/tenants/${MSP_ID}/billing`, auth: true },
  { name: 'login', path: '/login', auth: false },
  { name: 'invite-accept', path: '/invite/accept', auth: false },
]

const viewports = [
  { tag: 'desktop', width: 1440, height: 900 },
  {
    tag: 'iphone',
    width: devices['iPhone 13'].viewport.width,
    height: devices['iPhone 13'].viewport.height,
  },
]

const networkFailures = []
const consoleErrors = []
const actionLog = []

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30000 })
  await page.waitForTimeout(1500)
}

async function capture(page, route, vp) {
  const url = `${BASE}${route.path}`
  await page.setViewportSize({ width: vp.width, height: vp.height })
  if (route.auth) {
    // already logged in in shared context
  }
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  const file = path.join(OUT, `${route.name}-${vp.tag}.png`)
  await page.screenshot({ path: file, fullPage: true })
  return file
}

async function runActions(page, vpTag) {
  if (vpTag !== 'desktop') return

  // MSP list: open first row link if present
  try {
    await page.goto(`${BASE}/msps`, { waitUntil: 'networkidle' })
    const viewLink = page.getByRole('link', { name: /view|manage|details/i }).first()
    if (await viewLink.count()) {
      await viewLink.click()
      actionLog.push({ page: 'msps', action: 'open-msp-detail', ok: true })
    }
  } catch (e) {
    actionLog.push({ page: 'msps', action: 'open-msp-detail', ok: false, error: String(e) })
  }

  // MSP detail: client menu actions
  try {
    await page.goto(`${BASE}/msps/${MSP_ID}`, { waitUntil: 'networkidle' })
    const menuBtn = page.locator('button[aria-label="Client actions"]').first()
    if (await menuBtn.count()) {
      await menuBtn.click()
      await page.getByRole('menuitem', { name: /billing/i }).click().catch(() => {})
      actionLog.push({ page: 'msps-detail', action: 'client-billing-menu', ok: true })
    }
  } catch (e) {
    actionLog.push({ page: 'msps-detail', action: 'client-menu', ok: false, error: String(e) })
  }

  // Alerting: open add slack modal
  try {
    await page.goto(`${BASE}/settings/alerting`, { waitUntil: 'networkidle' })
    const addSlack = page.getByRole('button', { name: /slack/i }).first()
    if (await addSlack.count()) {
      await addSlack.click()
      await page.waitForTimeout(500)
      await page.getByRole('button', { name: /cancel/i }).click().catch(() => {})
      actionLog.push({ page: 'alerting', action: 'open-slack-modal', ok: true })
    }
  } catch (e) {
    actionLog.push({ page: 'alerting', action: 'open-slack-modal', ok: false, error: String(e) })
  }

  // Admin users: invite modal
  try {
    await page.goto(`${BASE}/users`, { waitUntil: 'networkidle' })
    const invite = page.getByRole('button', { name: /invite/i }).first()
    if (await invite.count()) {
      await invite.click()
      await page.waitForTimeout(400)
      await page.getByRole('button', { name: /cancel/i }).click().catch(() => {})
      actionLog.push({ page: 'users', action: 'open-invite-modal', ok: true })
    }
  } catch (e) {
    actionLog.push({ page: 'users', action: 'open-invite-modal', ok: false, error: String(e) })
  }

  // Health: refresh
  try {
    await page.goto(`${BASE}/health`, { waitUntil: 'networkidle' })
    const refresh = page.getByRole('button', { name: /refresh/i }).first()
    if (await refresh.count()) {
      await refresh.click()
      actionLog.push({ page: 'health', action: 'refresh', ok: true })
    }
  } catch (e) {
    actionLog.push({ page: 'health', action: 'refresh', ok: false, error: String(e) })
  }
}

async function main() {
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({ text: msg.text(), url: page.url() })
    }
  })
  page.on('response', res => {
    if (res.status() >= 400 && res.url().includes('/backend/')) {
      networkFailures.push({ status: res.status(), url: res.url() })
    }
  })

  await login(page)

  for (const vp of viewports) {
    for (const route of routes.filter(r => r.auth)) {
      await capture(page, route, vp)
    }
  }

  // Unauthenticated pages
  await context.clearCookies()
  await page.evaluate(() => localStorage.clear())
  for (const vp of viewports) {
    for (const route of routes.filter(r => !r.auth)) {
      await capture(page, route, vp)
    }
  }

  // Re-login for actions
  await login(page)
  await runActions(page, 'desktop')

  fs.writeFileSync(
    path.join(OUT, 'browser-telemetry.json'),
    JSON.stringify({ networkFailures, consoleErrors, actionLog }, null, 2)
  )

  await browser.close()
  console.log('Screenshots and telemetry written to', OUT)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
