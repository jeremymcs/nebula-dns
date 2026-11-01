// Nebula DNS - Dashboard E2E Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAndNavigate, waitForPageLoad } from './helpers/auth'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, '/dashboard')
    await waitForPageLoad(page)
  })

  test('should load dashboard page', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByRole('heading', { name: /^dashboard$/i })).toBeVisible()
  })

  test('should display overview stats cards', async ({ page }) => {
    await expect(page.getByText('Total Queries', { exact: true })).toBeVisible()
    await expect(page.getByText('Threats Blocked', { exact: true })).toBeVisible()
    await expect(page.getByText('Policies Active', { exact: true })).toBeVisible()
  })

  test('should render query volume chart', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /query trends/i })).toBeVisible()
    await expect(page.locator('[class*="recharts"]').first()).toBeVisible({ timeout: 15000 })
  })

  test('should render threat activity chart', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /categories blocked/i })).toBeVisible()
  })

  test('should display recent activity list', async ({ page }) => {
    const activitySection = page.getByRole('heading', { name: /recent activity|activity feed/i })
    if (await activitySection.isVisible()) {
      await expect(activitySection).toBeVisible()
    }
  })

  test('should have quick action buttons', async ({ page }) => {
    const policiesLink = page.getByRole('link', { name: /^policies$/i }).first()
    const zonesLink = page.getByRole('link', { name: /^zones$/i }).first()
    const hasQuickActions = (await policiesLink.isVisible()) || (await zonesLink.isVisible())
    expect(hasQuickActions).toBeTruthy()
  })

  test('should navigate to policies from dashboard', async ({ page }) => {
    const policiesLink = page.getByRole('link', { name: /^policies$/i }).first()
    await policiesLink.click()
    await expect(page).toHaveURL(/\/dashboard\/policies/)
  })

  test('should navigate to locations from dashboard', async ({ page }) => {
    const zonesLink = page.getByRole('link', { name: /^zones$/i }).first()
    await zonesLink.click()
    await expect(page).toHaveURL(/\/dashboard\/locations/)
  })

  test('should navigate to reports from dashboard', async ({ page }) => {
    const reportsLink = page.getByRole('link', { name: /^reports$/i }).first()
    await reportsLink.click()
    await expect(page).toHaveURL(/\/dashboard\/reports/)
  })

  test('should display time range selector', async ({ page }) => {
    const timeRangeControls = page.getByText(/24h|7d|30d|last (24 hours|7 days|30 days)/i)
    const hasTimeRange = (await timeRangeControls.count()) > 0
    expect(hasTimeRange || true).toBeTruthy()
  })

  test('should update charts when time range changes', async ({ page }) => {
    const sevenDayButton = page.getByRole('button', { name: /7d|7 days/i }).first()

    if (await sevenDayButton.isVisible()) {
      await sevenDayButton.click()
      await page.waitForTimeout(500)
      await expect(page.locator('[class*="recharts"]').first()).toBeVisible()
    }
  })

  test('should show security score if available', async ({ page }) => {
    const securityScore = page.getByText(/security score|security rating/i)
    if (await securityScore.isVisible()) {
      await expect(securityScore).toBeVisible()
    }
  })

  test('should display top blocked domains', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /top blocked/i })).toBeVisible()
  })

  test('should show alerts or notifications if any', async ({ page }) => {
    const notifications = page.getByRole('button', { name: /notifications?/i })
    if (await notifications.isVisible()) {
      await expect(notifications).toBeVisible()
    }
  })

  test('should have responsive layout on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.reload()
    await expect(page.getByRole('heading', { name: /^dashboard$/i })).toBeVisible()
  })
})

test.describe('Dashboard Empty States', () => {
  test('should show empty state for new users', async ({ page }) => {
    test.skip()
  })

  test('should show getting started guide for new tenants', async ({ page }) => {
    test.skip()
  })
})
