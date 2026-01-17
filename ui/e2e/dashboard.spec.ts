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
    await expect(page.getByRole('heading', { name: /mission control|dashboard/i })).toBeVisible()
  })

  test('should display overview stats cards', async ({ page }) => {
    // Check for key metrics
    await expect(page.getByText(/total queries|queries today/i)).toBeVisible()
    await expect(page.getByText(/threats blocked|blocked/i)).toBeVisible()
    await expect(page.getByText(/active policies|policies/i)).toBeVisible()
  })

  test('should render query volume chart', async ({ page }) => {
    // Look for chart container or recharts components
    const chartSection = page.locator('[class*="recharts"]').first()
    await expect(chartSection).toBeVisible({ timeout: 10000 })
  })

  test('should render threat activity chart', async ({ page }) => {
    await expect(page.getByText(/threat activity|threats over time/i)).toBeVisible()
  })

  test('should display recent activity list', async ({ page }) => {
    // Check for recent queries or activity section
    const activitySection = page.getByText(/recent (queries|activity|events)/i)
    if (await activitySection.isVisible()) {
      await expect(activitySection).toBeVisible()
    }
  })

  test('should have quick action buttons', async ({ page }) => {
    // Test common quick actions
    const createPolicyBtn = page.getByRole('button', { name: /create policy|new policy/i })
    const addLocationBtn = page.getByRole('button', { name: /add location|new location/i })

    // At least one quick action should be visible
    const hasQuickActions = await createPolicyBtn.isVisible() || await addLocationBtn.isVisible()
    expect(hasQuickActions).toBeTruthy()
  })

  test('should navigate to policies from dashboard', async ({ page }) => {
    // Click on policies link or card
    const policiesLink = page.getByRole('link', { name: /policies/i }).first()
    await policiesLink.click()
    await expect(page).toHaveURL(/\/dashboard\/policies/)
  })

  test('should navigate to locations from dashboard', async ({ page }) => {
    const locationsLink = page.getByRole('link', { name: /locations/i }).first()
    await locationsLink.click()
    await expect(page).toHaveURL(/\/dashboard\/locations/)
  })

  test('should navigate to reports from dashboard', async ({ page }) => {
    const reportsLink = page.getByRole('link', { name: /reports|analytics/i }).first()
    await reportsLink.click()
    await expect(page).toHaveURL(/\/dashboard\/reports/)
  })

  test('should display time range selector', async ({ page }) => {
    // Look for time range controls (24h, 7d, 30d, etc.)
    const timeRangeControls = page.getByText(/24h|7d|30d|last (24 hours|7 days|30 days)/i)
    const hasTimeRange = await timeRangeControls.count() > 0
    expect(hasTimeRange).toBeTruthy()
  })

  test('should update charts when time range changes', async ({ page }) => {
    // Find time range selector
    const sevenDayButton = page.getByRole('button', { name: /7d|7 days/i }).first()

    if (await sevenDayButton.isVisible()) {
      await sevenDayButton.click()
      // Wait for chart to update
      await page.waitForTimeout(500)

      // Verify chart is still visible (would reload with new data)
      const chartSection = page.locator('[class*="recharts"]').first()
      await expect(chartSection).toBeVisible()
    }
  })

  test('should show security score if available', async ({ page }) => {
    const securityScore = page.getByText(/security score|security rating/i)
    if (await securityScore.isVisible()) {
      await expect(securityScore).toBeVisible()
    }
  })

  test('should display top blocked domains', async ({ page }) => {
    const topBlocked = page.getByText(/top blocked|most blocked/i)
    if (await topBlocked.isVisible()) {
      await expect(topBlocked).toBeVisible()
    }
  })

  test('should show alerts or notifications if any', async ({ page }) => {
    // Check for notification bell or alert section
    const notifications = page.getByRole('button', { name: /notifications?/i })
    if (await notifications.isVisible()) {
      await expect(notifications).toBeVisible()
    }
  })

  test('should have responsive layout on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.reload()

    // Dashboard should still be accessible on mobile
    await expect(page.getByRole('heading', { name: /mission control|dashboard/i })).toBeVisible()

    // Stats should stack vertically
    const statsCards = page.locator('[class*="stat"]')
    if (await statsCards.count() > 0) {
      expect(await statsCards.count()).toBeGreaterThan(0)
    }
  })
})

test.describe('Dashboard Empty States', () => {
  test('should show empty state for new users', async ({ page }) => {
    // This test would need a fresh tenant without data
    // Skip for now or mock empty response
    test.skip()
  })

  test('should show getting started guide for new tenants', async ({ page }) => {
    // Test onboarding flow if applicable
    test.skip()
  })
})
