import { chromium, devices } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '../../docs/reviews/admin-console-p1')
const BASE = process.env.ADMIN_UI_URL || 'http://localhost:4012'
const MSP_ID = '550e8400-e29b-41d4-a716-446655440000'
const EMAIL = process.env.ADMIN_EMAIL || 'admin@nebula.local'
const PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123456789!'

const routes = [
  { name: 'tenants-index', path: '/tenants' },
  { name: 'tenants-detail', path: `/tenants/${MSP_ID}` },
  { name: 'audit', path: '/audit' },
  { name: 'health-certs', path: '/health' },
  { name: 'alerting', path: '/settings/alerting' },
  { name: 'msps-detail-usage', path: `/msps/${MSP_ID}` },
]

const viewports = [
  { tag: 'desktop', width: 1440, height: 900 },
  {
    tag: 'iphone',
    width: devices['iPhone 13'].viewport.width,
    height: devices['iPhone 13'].viewport.height,
  },
]

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 30000,
  })
  await page.waitForTimeout(1500)
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await login(page)

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    for (const route of routes) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1500)
      const file = path.join(OUT, `${route.name}-${vp.tag}.png`)
      await page.screenshot({ path: file, fullPage: true })
      console.log('saved', file)
    }
  }

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
