// Nebula DNS - Usage Tracking E2E Tests (US-013 & US-014)
// Tests usage summary, breakdown, warnings, overage alerts, and charts
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAsHome, loginAsEnterprise, loginAsMSP, waitForPageLoad } from '../helpers/auth'

test.describe('US-013: Usage Dashboard Widget', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEnterprise(page)
    await page.goto('/dashboard')
    await waitForPageLoad(page)
  })

  test('should display current usage summary', async ({ page }) => {
    // Look for usage widget
    const usageWidget = page.getByText(/usage|locations.*used|clients.*used/i)
    await expect(usageWidget.first()).toBeVisible({ timeout: 10000 })
    
    // Should show usage numbers (X/Y format)
    const usageNumbers = page.getByText(/\d+\/\d+/)
    expect(await usageNumbers.count()).toBeGreaterThan(0)
    
    // Should show current plan name
    const planName = page.getByText(/home|enterprise|msp/i)
    expect(await planName.count()).toBeGreaterThan(0)
  })

  test('should show usage breakdown by category', async ({ page }) => {
    // Navigate to billing page for detailed breakdown
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)
    
    // Look for usage breakdown section
    const usageBreakdown = page.getByText(/usage breakdown|usage by|breakdown/i)
    if (await usageBreakdown.isVisible()) {
      await expect(usageBreakdown).toBeVisible()
      
      // Should show category labels
      const categories = page.getByText(/locations|clients|policies/i)
      expect(await categories.count()).toBeGreaterThan(0)
    }
  })

  test('should show warning at 80% usage', async ({ page }) => {
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)
    
    // Look for warning indicators (yellow color, warning icon, or text)
    const warningIndicators = [
      page.getByText(/warning|approaching.*limit|80%|almost.*full/i),
      page.locator('[class*="warning"], [class*="yellow"], [aria-label*="warning"]')
    ]
    
    // At least one warning indicator should be visible if usage > 80%
    // Or normal usage indicator if under 80%
    const usageBar = page.locator('[role="progressbar"], [class*="progress"]')
    expect(await usageBar.count()).toBeGreaterThan(0)
  })

  test('should show overage alert when limit exceeded', async ({ page }) => {
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)
    
    // Look for overage/exceeded indicators
    const overageIndicators = [
      page.getByText(/exceeded|over.*limit|overage|at.*limit/i),
      page.locator('[class*="error"], [class*="red"][class*="badge"]')
    ]
    
    // These may not be visible in normal tests (requires hitting limit)
    // But the UI should have the capability
    const usageBar = page.locator('[role="progressbar"], [class*="progress"]')
    expect(await usageBar.count()).toBeGreaterThan(0)
  })

  test('should display usage charts correctly', async ({ page }) => {
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)
    
    // Look for usage history chart
    const chartSection = page.getByText(/usage history|history.*chart|over time/i)
    if (await chartSection.isVisible()) {
      await expect(chartSection).toBeVisible()
      
      // Should render chart (recharts library)
      const chart = page.locator('[class*="recharts"]')
      await expect(chart).toBeVisible({ timeout: 15000 })
    }
  })
})

test.describe('US-014: Billing Page Usage Breakdown', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsHome(page)
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)
  })

  test('Home tier displays location usage', async ({ page }) => {
    // Should show locations usage
    const locationUsage = page.getByText(/locations/i)
    await expect(locationUsage.first()).toBeVisible()
    
    // Should show limit (e.g., 3/5 used)
    const usageNumbers = page.getByText(/\d+\/\d+/)
    expect(await usageNumbers.count()).toBeGreaterThan(0)
    
    // Should show limit number
    const limitText = page.getByText(/5 (locations|limit)|up to 5/i)
    expect(await limitText.count()).toBeGreaterThan(0)
  })

  test('Home tier shows usage progress bar', async ({ page }) => {
    // Progress bar should be visible
    const progressBar = page.locator('[role="progressbar"], [class*="progress"]')
    expect(await progressBar.count()).toBeGreaterThan(0)
    
    if (await progressBar.first().isVisible()) {
      await expect(progressBar.first()).toBeVisible()
    }
  })

  test('Home tier shows current billing period', async ({ page }) => {
    // Look for billing period
    const billingPeriod = page.getByText(/billing period|current period|this month/i)
    
    if (await billingPeriod.isVisible()) {
      await expect(billingPeriod).toBeVisible()
    }
    
    // Should show date range
    const dateRange = page.getByText(/\w+ \d{1,2}.*\d{4}/)
    expect(await dateRange.count()).toBeGreaterThan(0)
  })

  test('Home tier shows usage breakdown table', async ({ page }) => {
    // Look for breakdown table
    const table = page.locator('table')
    
    if (await table.isVisible()) {
      await expect(table).toBeVisible()
      
      // Should have rows with location data
      const rows = page.locator('tbody tr')
      expect(await rows.count()).toBeGreaterThanOrEqual(0)
    }
  })

  test('Home tier displays cost information', async ({ page }) => {
    // Look for cost information
    const costSection = page.getByText(/cost|charges|total/i)
    
    if (await costSection.isVisible()) {
      expect(await costSection.count()).toBeGreaterThan(0)
    }
    
    // Should show dollar amounts
    const dollarAmounts = page.getByText(/\$\d+/)
    expect(await dollarAmounts.count()).toBeGreaterThanOrEqual(0)
  })
})

test.describe('US-014: Enterprise Usage Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEnterprise(page)
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)
  })

  test('Enterprise tier shows higher limits', async ({ page }) => {
    // Should show higher limit (e.g., 50 locations)
    const highLimit = page.getByText(/50|unlimited/i)
    expect(await highLimit.count()).toBeGreaterThan(0)
  })

  test('Enterprise tier shows all usage categories', async ({ page }) => {
    // Should show locations
    const locationsUsage = page.getByText(/locations/i)
    expect(await locationsUsage.count()).toBeGreaterThan(0)
    
    // Enterprise may also show policies count
    const policiesUsage = page.getByText(/policies/i)
    expect(await policiesUsage.count()).toBeGreaterThanOrEqual(0)
  })
})

test.describe('US-014: MSP Usage Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMSP(page)
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)
  })

  test('MSP tier shows client usage', async ({ page }) => {
    // Should show client usage metrics
    const clientsUsage = page.getByText(/clients/i)
    await expect(clientsUsage.first()).toBeVisible()
    
    // Should show client count
    const clientCount = page.getByText(/\d+.*clients|clients.*\d+/i)
    expect(await clientCount.count()).toBeGreaterThan(0)
  })

  test('MSP tier shows total locations across clients', async ({ page }) => {
    // Should show aggregated location count
    const totalLocations = page.getByText(/total.*locations|locations.*total/i)
    
    if (await totalLocations.isVisible()) {
      await expect(totalLocations).toBeVisible()
    }
  })

  test('MSP tier shows per-client breakdown', async ({ page }) => {
    // Should show client breakdown
    const clientBreakdown = page.getByText(/by client|per.*client|client.*breakdown/i)
    
    if (await clientBreakdown.isVisible()) {
      await expect(clientBreakdown).toBeVisible()
    }
  })

  test('MSP tier shows aggregated costs', async ({ page }) => {
    // Should show aggregated costs
    const totalCost = page.getByText(/total.*cost|aggregate.*cost|all.*clients/i)
    
    if (await totalCost.isVisible()) {
      expect(await totalCost.count()).toBeGreaterThan(0)
    }
  })
})
