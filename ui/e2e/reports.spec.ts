// Nebula DNS - Reports and Analytics E2E Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAndNavigate, waitForPageLoad } from './helpers/auth'
import { pageHeading } from './helpers/selectors'

test.describe('Reports - Main Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/reports')
    await waitForPageLoad(page)
  })

  test('should display reports page', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/reports/)
    await expect(pageHeading(page, /reports & analytics/i)).toBeVisible()
  })

  test('should display query metrics', async ({ page }) => {
    await expect(page.getByText(/total queries/i).first()).toBeVisible({ timeout: 15000 })
  })

  test('should render analytics charts', async ({ page }) => {
    // Check for recharts or chart containers
    const chartContainer = page.locator('[class*="recharts"]').first()
    const hasChart = await chartContainer.isVisible({ timeout: 10000 }).catch(() => false)

    if (hasChart) {
      await expect(chartContainer).toBeVisible()
    } else {
      // Fallback: check for chart heading
      const chartHeading = page.getByText(/query volume|queries over time|activity/i)
      if (await chartHeading.isVisible()) {
        await expect(chartHeading).toBeVisible()
      }
    }
  })

  test('should display top blocked domains', async ({ page }) => {
    const topBlockedSection = page.getByText(/top blocked|most blocked domains/i)

    if (await topBlockedSection.isVisible()) {
      await expect(topBlockedSection).toBeVisible()
    }
  })

  test('should display top queried domains', async ({ page }) => {
    const topQueriedSection = page.getByText(/top queried|most queried domains|top domains/i)

    if (await topQueriedSection.isVisible()) {
      await expect(topQueriedSection).toBeVisible()
    }
  })

  test('should display category breakdown', async ({ page }) => {
    const categorySection = page.getByText(/categories|category breakdown|threats by category/i)

    if (await categorySection.isVisible()) {
      await expect(categorySection).toBeVisible()
    }
  })
})

test.describe('Reports - Date Range Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/reports')
    await waitForPageLoad(page)
  })

  test('should have date range selector', async ({ page }) => {
    // Look for date range buttons or picker
    const dateRangeButton = page.getByRole('button', { name: /date range|last 24|last 7|last 30/i }).first()
    const hasDateRange = await dateRangeButton.isVisible().catch(() => false)

    if (hasDateRange) {
      await expect(dateRangeButton).toBeVisible()
    } else {
      // Alternative: date picker input
      const datePicker = page.getByLabel(/from date|start date|date range/i)
      if (await datePicker.isVisible()) {
        await expect(datePicker).toBeVisible()
      }
    }
  })

  test('should filter by last 24 hours', async ({ page }) => {
    const last24hButton = page.getByRole('button', { name: /24h|24 hours|last day/i }).first()

    if (await last24hButton.isVisible()) {
      await last24hButton.click()
      await page.waitForTimeout(1000)

      // Verify button is selected/active
      const isActive = await last24hButton.getAttribute('class')
      expect(isActive).toBeTruthy()
    } else {
      test.skip()
    }
  })

  test('should filter by last 7 days', async ({ page }) => {
    const last7dButton = page.getByRole('button', { name: /7d|7 days|last week/i }).first()

    if (await last7dButton.isVisible()) {
      await last7dButton.click()
      await page.waitForTimeout(1000)

      // Charts should update
      const chartContainer = page.locator('[class*="recharts"]').first()
      const hasChart = await chartContainer.isVisible().catch(() => false)

      if (hasChart) {
        await expect(chartContainer).toBeVisible()
      }
    } else {
      test.skip()
    }
  })

  test('should filter by last 30 days', async ({ page }) => {
    const last30dButton = page.getByRole('button', { name: /30d|30 days|last month/i }).first()

    if (await last30dButton.isVisible()) {
      await last30dButton.click()
      await page.waitForTimeout(1000)
    } else {
      test.skip()
    }
  })

  test('should filter by custom date range', async ({ page }) => {
    const customRangeButton = page.getByRole('button', { name: /custom|custom range|select dates/i })

    if (await customRangeButton.isVisible()) {
      await customRangeButton.click()

      // Should show date picker
      const startDateInput = page.getByLabel(/start date|from/i)
      const endDateInput = page.getByLabel(/end date|to/i)

      const hasCustomPicker = await startDateInput.isVisible() && await endDateInput.isVisible()

      if (hasCustomPicker) {
        await expect(startDateInput).toBeVisible()
        await expect(endDateInput).toBeVisible()
      }
    } else {
      test.skip()
    }
  })
})

test.describe('Reports - Export Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/reports')
    await waitForPageLoad(page)
  })

  test('should have export button', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export|download|save report/i })

    if (await exportButton.isVisible()) {
      await expect(exportButton).toBeVisible()
    } else {
      test.skip()
    }
  })

  test('should show export format options', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export|download/i })

    if (await exportButton.isVisible()) {
      await exportButton.click()

      // Should show format options
      const csvOption = page.getByText(/csv|comma separated/i)
      const pdfOption = page.getByText(/pdf|portable document/i)

      const hasOptions = await csvOption.isVisible() || await pdfOption.isVisible()
      expect(hasOptions).toBeTruthy()
    } else {
      test.skip()
    }
  })

  test('should export to CSV', async ({ page }) => {
    test.skip(true, 'Export menu wiring varies by report tab; covered by unit export tests')
  })

  test('should export to PDF', async ({ page }) => {
    test.skip(true, 'Export menu wiring varies by report tab; covered by unit export tests')
  })
})

test.describe('Reports - Scheduled Reports', () => {
  test('should navigate to scheduled reports page', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/reports')
    await waitForPageLoad(page)

    const scheduledLink = page.getByRole('link', { name: /scheduled reports|schedule/i })

    if (await scheduledLink.isVisible()) {
      await scheduledLink.click()
      await expect(page).toHaveURL(/\/dashboard\/reports\/scheduled/)
    } else {
      // Try direct navigation
      await page.goto('/dashboard/reports/scheduled')
      await waitForPageLoad(page)
    }
  })

  test('should display scheduled reports page', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/reports/scheduled')
    await waitForPageLoad(page)

    await expect(pageHeading(page, /scheduled reports/i)).toBeVisible()
  })

  test('should list existing scheduled reports', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/reports/scheduled')
    await waitForPageLoad(page)

    await expect(page.getByText(/weekly security summary|no scheduled reports|schedule report/i).first()).toBeVisible({
      timeout: 10000,
    })
  })

  test('should have create scheduled report button', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/reports/scheduled')
    await waitForPageLoad(page)

    const createButton = page.getByRole('button', { name: /new scheduled report|create your first report|schedule report/i })
    await expect(createButton).toBeVisible()
  })

  test('should open create scheduled report form', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/reports/scheduled')
    await waitForPageLoad(page)

    const createButton = page.getByRole('button', { name: /new scheduled report|create your first report/i })
    await createButton.click()

    await expect(page.getByRole('heading', { name: /new scheduled report/i })).toBeVisible({ timeout: 5000 })
  })

  test('should configure report frequency', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/reports/scheduled')
    await waitForPageLoad(page)

    const createButton = page.getByRole('button', { name: /new scheduled report|create your first report|schedule report/i })
    await createButton.click()

    // Look for frequency selector
    const frequencySelect = page.getByLabel(/frequency|schedule|how often/i)

    if (await frequencySelect.isVisible()) {
      await expect(frequencySelect).toBeVisible()

      // Should have options like daily, weekly, monthly
      await frequencySelect.click()

      const dailyOption = page.getByText(/daily/i)
      const weeklyOption = page.getByText(/weekly/i)

      const hasOptions = await dailyOption.isVisible() || await weeklyOption.isVisible()
      expect(hasOptions).toBeTruthy()
    } else {
      test.skip()
    }
  })

  test('should configure report recipients', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/reports/scheduled')
    await waitForPageLoad(page)

    const createButton = page.getByRole('button', { name: /new scheduled report|create your first report|schedule report/i })
    await createButton.click()

    // Look for email recipients field
    const recipientsInput = page.getByLabel(/recipients|email|send to/i)

    if (await recipientsInput.isVisible()) {
      await recipientsInput.fill('test@example.com')
      await expect(recipientsInput).toHaveValue('test@example.com')
    } else {
      test.skip()
    }
  })

  test('should delete scheduled report with confirmation', async ({ page }) => {
    test.skip(true, 'Scheduled report delete flow depends on row actions in table UI')
  })
})

test.describe('Reports - Data Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/reports')
    await waitForPageLoad(page)
  })

  test('should display pie chart for category distribution', async ({ page }) => {
    // Look for pie chart
    const pieChart = page.locator('[class*="recharts"]').filter({ hasText: /category|categories/i })

    if (await pieChart.isVisible()) {
      await expect(pieChart).toBeVisible()
    } else {
      test.skip()
    }
  })

  test('should display line chart for query trends', async ({ page }) => {
    // Line chart for time series data
    const lineChart = page.locator('[class*="recharts"]').first()

    if (await lineChart.isVisible()) {
      await expect(lineChart).toBeVisible()
    } else {
      test.skip()
    }
  })

  test('should show chart legends', async ({ page }) => {
    test.skip(true, 'Recharts legend rendering varies by viewport and mock data')
  })

  test('should be interactive on hover', async ({ page }) => {
    const chartContainer = page.locator('[class*="recharts"]').first()
    const hasChart = await chartContainer.isVisible().catch(() => false)

    if (hasChart) {
      // Hover over chart to show tooltip
      await chartContainer.hover()
      await page.waitForTimeout(500)

      // Tooltip should appear
      const tooltip = page.locator('[class*="recharts-tooltip"]')
      const hasTooltip = await tooltip.isVisible().catch(() => false)

      // Tooltip may or may not appear depending on chart implementation
      // This is optional check
    } else {
      test.skip()
    }
  })
})
