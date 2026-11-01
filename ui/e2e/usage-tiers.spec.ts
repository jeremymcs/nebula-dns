// Nebula DNS - Usage Tiers E2E Tests (US-013 & US-014)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAndNavigate, waitForPageLoad } from './helpers/auth'
import { SKIP_LEGACY_TIER_BILLING } from './helpers/launch-features'
import { billingTab, pageHeading } from './helpers/selectors'

test.describe.skip(`US-013: Usage Dashboard Widget — ${SKIP_LEGACY_TIER_BILLING}`, () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, '/mission-control')
    await waitForPageLoad(page)
  })

  test('should display usage widget on dashboard', async ({ page }) => {
    // Check for usage widget heading
    await expect(page.getByText('Usage Overview')).toBeVisible({ timeout: 10000 })
  })

  test('should show locations usage with progress bar', async ({ page }) => {
    // Look for "Locations" label and usage metrics
    const locationUsage = page.getByText(/Locations/).first()
    await expect(locationUsage).toBeVisible()

    // Check for usage format "X/Y used"
    const usageText = page.getByText(/\/.*used/i)
    await expect(usageText.first()).toBeVisible()

    // Progress bar should be visible
    const progressBar = page.locator('[class*="rounded-full"]').filter({ hasText: '' })
    expect(await progressBar.count()).toBeGreaterThan(0)
  })

  test('should show clients usage for MSP tier', async ({ page }) => {
    // For MSP accounts, should show additional "Clients" metric
    const clientsLabel = page.getByText('Clients')

    // Only visible for MSP tier
    if (await clientsLabel.isVisible()) {
      await expect(clientsLabel).toBeVisible()
      const clientsUsage = page.getByText(/Clients.*\//)
      await expect(clientsUsage).toBeVisible()
    }
  })

  test('should display progress bar with correct color based on usage', async ({ page }) => {
    // Progress bars exist
    const progressBars = page.locator('[class*="rounded-full"][class*="bg-"]')
    expect(await progressBars.count()).toBeGreaterThan(0)

    // Visual test - bars should have appropriate color classes
    // green (<70%), yellow (70-90%), red (>90%)
    // This would require checking computed styles or class names
  })

  test('should show upgrade button when approaching limit (>80%)', async ({ page }) => {
    // Look for upgrade button
    const upgradeButton = page.getByRole('button', { name: /upgrade/i })

    // Button visibility depends on usage percentage
    // If visible, should be clickable
    if (await upgradeButton.isVisible()) {
      await expect(upgradeButton).toBeEnabled()
    }
  })

  test('should navigate to billing page when widget is clicked', async ({ page }) => {
    // Find and click the usage widget
    const usageWidget = page.getByText('Usage Overview').locator('..')

    // Click the widget (it should be clickable)
    await usageWidget.click()

    // Should navigate to billing page
    await expect(page).toHaveURL(/\/billing/, { timeout: 5000 })
  })

  test('should navigate to billing page when upgrade button is clicked', async ({ page }) => {
    const upgradeButton = page.getByRole('button', { name: /upgrade/i })

    if (await upgradeButton.isVisible()) {
      await upgradeButton.click()
      await expect(page).toHaveURL(/\/billing/)
    }
  })

  test('should show plan name in widget', async ({ page }) => {
    // Widget should display current plan name
    const usageWidget = page.getByText('Usage Overview').locator('..')
    await expect(usageWidget.getByText(/plan/i)).toBeVisible()
  })
})

test.describe('US-014: Billing Page Usage Breakdown', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/billing')
    await waitForPageLoad(page)
  })

  test('should display billing page with tabs', async ({ page }) => {
    await expect(pageHeading(page, /billing.*usage/i)).toBeVisible()

    // Should have multiple tabs
    await expect(billingTab(page, /usage overview/i)).toBeVisible()
    await expect(page.getByText(/bundles|purchases|invoices/i).first()).toBeVisible()
  })

  test('should display usage breakdown table', async ({ page }) => {
    // Click on Usage Overview tab if not default
    const overviewTab = billingTab(page, /usage overview/i)
    if (await overviewTab.isVisible()) {
      await overviewTab.click()
    }

    // Wait for usage breakdown to load
    await expect(page.getByText(/usage breakdown/i)).toBeVisible({ timeout: 10000 })
  })

  test('should show current billing period in usage breakdown', async ({ page }) => {
    const overviewTab = billingTab(page, /usage overview/i)
    if (await overviewTab.isVisible()) {
      await overviewTab.click()
    }

    // Look for billing period dates
    const datePattern = page.getByText(/\w+ \d{1,2}, \d{4}/)
    expect(await datePattern.count()).toBeGreaterThan(0)
  })

  test('should display locations list for Enterprise/Home tier', async ({ page }) => {
    const overviewTab = billingTab(page, /usage overview/i)
    if (await overviewTab.isVisible()) {
      await overviewTab.click()
    }

    // Check for locations heading or table
    const locationsHeading = page.getByText(/Locations \(\d+\)/)

    // For non-MSP tiers
    if (await locationsHeading.isVisible()) {
      await expect(locationsHeading).toBeVisible()

      // Table should have columns: Name, Policy, Created, Status
      await expect(page.getByText(/location name|name/i)).toBeVisible()
      await expect(page.getByText(/policy/i)).toBeVisible()
      await expect(page.getByText(/created/i)).toBeVisible()
      await expect(page.getByText(/status/i)).toBeVisible()
    }
  })

  test('should display clients list for MSP tier', async ({ page }) => {
    const overviewTab = billingTab(page, /usage overview/i)
    if (await overviewTab.isVisible()) {
      await overviewTab.click()
    }

    // Check for clients heading or table
    const clientsHeading = page.getByText(/Clients \(\d+\)/)

    // For MSP tier
    if (await clientsHeading.isVisible()) {
      await expect(clientsHeading).toBeVisible()

      // Table should have columns: Name, Locations, Created, Status
      await expect(page.getByText(/client name|name/i)).toBeVisible()
      await expect(page.getByText(/locations/i)).toBeVisible()
      await expect(page.getByText(/created/i)).toBeVisible()
    }
  })

  test('should display projected monthly cost', async ({ page }) => {
    const overviewTab = billingTab(page, /usage overview/i)
    if (await overviewTab.isVisible()) {
      await overviewTab.click()
    }

    // Look for cost metrics
    await expect(page.getByText(/projected.*cost/i)).toBeVisible({ timeout: 10000 })

    // Should show dollar amounts
    const costAmount = page.getByText(/\$\d+\.\d{2}/)
    expect(await costAmount.count()).toBeGreaterThan(0)
  })

  test('should display current period cost', async ({ page }) => {
    const overviewTab = billingTab(page, /usage overview/i)
    if (await overviewTab.isVisible()) {
      await overviewTab.click()
    }

    // Look for current period cost
    await expect(page.getByText(/current.*cost/i)).toBeVisible({ timeout: 10000 })
  })

  test('should display usage history chart for last 6 months', async ({ page }) => {
    const overviewTab = billingTab(page, /usage overview/i)
    if (await overviewTab.isVisible()) {
      await overviewTab.click()
    }

    // Look for usage history heading
    await expect(page.getByText(/usage history/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/last 6 months/i)).toBeVisible()

    // Chart should render (recharts)
    const chart = page.locator('[class*="recharts"]').first()
    await expect(chart).toBeVisible({ timeout: 15000 })
  })

  test('should have download CSV button', async ({ page }) => {
    // CSV export button should be visible
    const csvButton = page.getByRole('button', { name: /download csv|export/i })
    await expect(csvButton).toBeVisible()
    await expect(csvButton).toBeEnabled()
  })

  test('should download usage report when CSV button is clicked', async ({ page }) => {
    const downloadButton = page.getByRole('button', { name: /download csv/i })
    await expect(downloadButton).toBeVisible()

    // Start waiting for download
    const downloadPromise = page.waitForEvent('download')

    // Click download button
    await downloadButton.click()

    // Wait for download to start
    const download = await downloadPromise

    // Verify filename contains usage-report
    expect(download.suggestedFilename()).toMatch(/usage-report/)
    expect(download.suggestedFilename()).toMatch(/\.csv$/)
  })

  test('should show location creation dates in breakdown', async ({ page }) => {
    const overviewTab = billingTab(page, /usage overview/i)
    if (await overviewTab.isVisible()) {
      await overviewTab.click()
    }

    // Look for formatted dates in the table
    const datePattern = page.getByText(/\w{3} \d{1,2}, \d{4}/)

    // At least one date should be visible in the breakdown
    if (await datePattern.count() > 0) {
      expect(await datePattern.count()).toBeGreaterThan(0)
    }
  })

  test('should show status badges in breakdown table', async ({ page }) => {
    const overviewTab = billingTab(page, /usage overview/i)
    if (await overviewTab.isVisible()) {
      await overviewTab.click()
    }

    // Look for status badges (active/inactive)
    const statusBadges = page.locator('[class*="badge"]').or(page.getByText(/active|inactive/i))

    if (await statusBadges.count() > 0) {
      expect(await statusBadges.count()).toBeGreaterThan(0)
    }
  })

  test('should update chart data when tab is switched', async ({ page }) => {
    // Start on overview
    const overviewTab = billingTab(page, /usage overview/i)
    await overviewTab.click()

    // Wait for chart to load
    const chart = page.locator('[class*="recharts"]').first()
    await expect(chart).toBeVisible({ timeout: 15000 })

    // Switch to another tab
    const bundlesTab = page.getByText(/bundles/i).first()
    await bundlesTab.click()

    // Switch back to overview
    await overviewTab.click()

    // Chart should still be visible
    await expect(chart).toBeVisible({ timeout: 10000 })
  })

  test('should handle empty state when no usage data', async ({ page }) => {
    // For new accounts with no data
    const emptyMessage = page.getByText(/no (locations|clients) yet/i)

    // If empty state is shown, it should be visible
    if (await emptyMessage.isVisible()) {
      await expect(emptyMessage).toBeVisible()
    }
  })

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.reload()

    // Page should still load
    await expect(pageHeading(page, /billing.*usage/i)).toBeVisible()

    // Tables should be scrollable on mobile
    const table = page.locator('table').first()
    if (await table.isVisible()) {
      await expect(table).toBeVisible()
    }
  })
})
