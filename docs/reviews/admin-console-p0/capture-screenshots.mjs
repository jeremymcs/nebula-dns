/**
 * Capture Flux Shield admin console P0 screenshots.
 * Requires API on :4010 and admin-ui on :4012 (see repo CLAUDE.md).
 *
 *   export ADMIN_PASSWORD='...'  # do not commit
 *   node docs/reviews/admin-console-p0/capture-screenshots.mjs
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = __dirname
const BASE = process.env.ADMIN_UI_URL || 'http://localhost:4012'
const API = process.env.API_URL || 'http://localhost:4010'
const EMAIL = process.env.ADMIN_EMAIL || 'admin@nebula.local'
const PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123456789!'
const MSP_ID = process.env.DEMO_TENANT_ID || '550e8400-e29b-41d4-a716-446655440000'

const shots = [
  { file: 'login-mfa-challenge.png', capture: captureMfaChallenge },
  { file: 'login-mfa-enroll.png', capture: captureMfaEnroll },
  { file: 'dashboard.png', path: '/', auth: true },
  { file: 'admin-users.png', path: '/users', auth: true },
  { file: 'billing.png', path: `/tenants/${MSP_ID}/billing`, auth: true },
  { file: 'health.png', path: '/health', auth: true },
]

async function loginThroughMfa(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForTimeout(1500)
  if (page.url().includes('/login/mfa/enroll')) {
    const start = await page.request.post(`${API}/admin/mfa/enroll/start`, {
      headers: { Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('admin_token'))}` },
    })
    if (!start.ok()) throw new Error('MFA enroll start failed')
    const enrollCode = process.env.ADMIN_MFA_ENROLL_CODE
    if (!enrollCode) {
      await page.screenshot({ path: path.join(OUT, 'login-mfa-enroll.png'), fullPage: true })
      throw new Error('Set ADMIN_MFA_ENROLL_CODE to complete enrollment screenshot flow')
    }
    await page.fill('input#enroll-code', enrollCode)
    await page.getByRole('button', { name: /Verify/i }).click()
    await page.waitForURL('**/')
  } else if (page.url().includes('/login/mfa')) {
    const code = process.env.ADMIN_MFA_CODE
    if (!code) {
      await page.screenshot({ path: path.join(OUT, 'login-mfa-challenge.png'), fullPage: true })
      throw new Error('Set ADMIN_MFA_CODE for TOTP screenshot, or reset admin MFA in DB')
    }
    await page.fill('input#mfa-code', code)
    await page.getByRole('button', { name: /Verify/i }).click()
    await page.waitForURL(url => !url.pathname.includes('/login'))
  }
}

async function captureMfaChallenge(page) {
  await loginThroughMfa(page)
}

async function captureMfaEnroll(page) {
  await page.goto(`${BASE}/login/mfa/enroll`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: path.join(OUT, 'login-mfa-enroll.png'), fullPage: true })
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  try {
    await loginThroughMfa(page)
  } catch (e) {
    console.warn(String(e))
  }

  for (const shot of shots) {
    if (shot.capture) {
      try {
        await shot.capture(page)
      } catch (e) {
        console.warn(`Skip ${shot.file}:`, e.message)
      }
      continue
    }
    if (shot.auth) {
      await page.goto(`${BASE}${shot.path}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1200)
      await page.screenshot({ path: path.join(OUT, shot.file), fullPage: true })
    }
  }

  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
