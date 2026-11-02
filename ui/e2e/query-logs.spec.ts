// Flux Shield - Query Logs, Live Stream and Integrations menu links
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect, Page } from '@playwright/test'
import { loginAndNavigate } from './helpers/auth'

const now = Date.now()
const LOGS = [
  { id: 'l1', domain: 'cdn-update-check.top', action: 'block', category: 'malware', locationName: 'Panama City HQ', clientIp: '10.0.4.21', queryType: 'A', responseTime: 2, cached: false },
  { id: 'l2', domain: 'portal.office.com', action: 'allow', category: 'business', locationName: 'Panama City HQ', clientIp: '10.0.4.18', queryType: 'A', responseTime: 11, cached: true },
  { id: 'l3', domain: 'secure-account-verify.co', action: 'block', category: 'phishing', locationName: 'Destin office', clientIp: '10.1.0.40', queryType: 'AAAA', responseTime: 3, cached: false },
  { id: 'l4', domain: 'pixel.adtrack-sync.net', action: 'block', category: 'ads_tracking', locationName: 'Guest Wi-Fi', clientIp: '172.16.2.9', queryType: 'A', responseTime: 2, cached: false },
  { id: 'l5', domain: 'api.github.com', action: 'allow', category: 'technology', locationName: 'Roaming agents', clientIp: '100.64.3.12', queryType: 'A', responseTime: 14, cached: false },
].map((row, i) => ({ ...row, timestamp: new Date(now - i * 4000).toISOString() }))

async function mockLogs(page: Page, seen: string[] = []) {
  await page.route('**/backend/reports/logs**', async (route) => {
    const url = new URL(route.request().url())
    seen.push(url.search)
    const action = url.searchParams.get('action')
    const data = action ? LOGS.filter((l) => l.action === action) : LOGS
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data, total: data.length, pagination: { cursor: null, hasMore: false } }),
    })
  })
}

test.describe('Query logs', () => {
  test('lists queries and filters by decision', async ({ page }) => {
    const seen: string[] = []
    await loginAndNavigate(page, '/dashboard', 'enterprise')
    await mockLogs(page, seen)
    await page.goto('/dashboard/logs')

    await expect(page.getByRole('heading', { level: 1, name: 'Query logs' })).toBeVisible()
    await expect(page.getByText('cdn-update-check.top')).toBeVisible()
    await expect(page.getByText('api.github.com')).toBeVisible()

    await page.getByRole('tab', { name: 'Blocked' }).click()
    await expect(page.getByText('api.github.com')).toBeHidden()
    expect(seen.some((q) => q.includes('action=block'))).toBe(true)
  })
})

test.describe('Live stream', () => {
  test('shows incoming queries and can pause', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard', 'enterprise')
    await mockLogs(page)
    await page.goto('/dashboard/logs/live')

    await expect(page.getByRole('heading', { level: 1, name: /Live stream/ })).toBeVisible()
    await expect(page.getByText('secure-account-verify.co')).toBeVisible()

    await page.getByRole('button', { name: 'Pause' }).click()
    await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
  })
})

test('old Integrations link lands on Settings › Integrations', async ({ page }) => {
  await loginAndNavigate(page, '/dashboard/integrations', 'enterprise')
  await expect(page).toHaveURL(/\/dashboard\/settings\/integrations/)
})
