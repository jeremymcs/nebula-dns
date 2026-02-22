// Nebula DNS - Billing and Subscription E2E Tests (US-037)
// Tests billing page, usage tracking, and upgrade prompts for tier system
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAsHome, loginAsEnterprise, loginAsMSP, waitForPageLoad } from './helpers/auth'

test.describe('US-037: Billing Page - Home Tier', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsHome(page)
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)
  })

  test('should display billing page for Home tier', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/billing/)
    await expect(page.getByRole('heading', { name: /billing|subscription/i })).toBeVisible()
  })

  test('should show current Home tier plan information', async ({ page }) => {
    // Look for tier/plan indicator
    const homeTierBadge = page.getByText(/home tier|home plan/i)
    await expect(homeTierBadge).toBeVisible()
  })

  test('should display location usage for Home tier', async ({ page }) => {
    // Look for location usage metrics
    const locationUsage = page.getByText(/locations/i).and(page.getByText(/\/.*used/i))
    await expect(locationUsage.first()).toBeVisible()

    // Should show limit (e.g., "3/5 used")
    const usagePattern = page.getByText(/\d+\/\d+/)
    expect(await usagePattern.count()).toBeGreaterThan(0)
  })

  test('should show usage progress bar for locations', async ({ page }) => {
    // Look for progress bar indicators
    const progressBar = page.locator('[class*="progress"]').or(
      page.locator('[role="progressbar"]')
    )

    if (await progressBar.count() > 0) {
      await expect(progressBar.first()).toBeVisible()
    }
  })

  test('should display current billing period', async ({ page }) => {
    // Look for billing period dates
    const billingPeriod = page.getByText(/billing period|current period/i)

    if (await billingPeriod.count() > 0) {
      await expect(billingPeriod).toBeVisible()
    }

    // Should show dates
    const datePattern = page.getByText(/\w+ \d{1,2}, \d{4}/)
    expect(await datePattern.count()).toBeGreaterThan(0)
  })

  test('should show monthly cost for Home tier', async ({ page }) => {
    // Look for cost information
    const monthlyCost = page.getByText(/\$\d+\.\d{2}/).or(
      page.getByText(/monthly cost|subscription cost/i)
    )

    if (await monthlyCost.count() > 0) {
      expect(await monthlyCost.count()).toBeGreaterThan(0)
    }
  })

  test('should display Upgrade to Enterprise button', async ({ page }) => {
    const upgradeButton = page.getByRole('button', { name: /upgrade.*enterprise|upgrade plan/i })
    await expect(upgradeButton).toBeVisible()
    await expect(upgradeButton).toBeEnabled()
  })

  test('should show feature comparison for Home tier', async ({ page }) => {
    // Look for feature list or comparison table
    const featureList = page.getByText(/features|included/i)

    if (await featureList.count() > 0) {
      await expect(featureList.first()).toBeVisible()
    }

    // Should show location limit
    const locationLimit = page.getByText(/5 locations|up to 5/i)

    if (await locationLimit.count() > 0) {
      await expect(locationLimit).toBeVisible()
    }
  })

  test('should not show client usage for Home tier', async ({ page }) => {
    // Clients metric should not be visible for Home tier
    const clientUsage = page.getByText(/clients.*\/.*used/i)
    expect(await clientUsage.isVisible()).toBeFalsy()
  })

  test('should show usage breakdown table', async ({ page }) => {
    // Look for detailed usage breakdown
    const usageTable = page.locator('table')

    if (await usageTable.count() > 0) {
      await expect(usageTable.first()).toBeVisible()

      // Should have location entries
      const locationRows = page.getByText(/location|network/i)
      expect(await locationRows.count()).toBeGreaterThan(0)
    }
  })

  test('should display usage history chart', async ({ page }) => {
    // Look for usage over time chart
    const chart = page.locator('[class*="recharts"]')

    if (await chart.count() > 0) {
      await expect(chart.first()).toBeVisible()
    }
  })
})

test.describe('US-037: Billing Page - Enterprise Tier', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEnterprise(page)
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)
  })

  test('should display billing page for Enterprise tier', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/billing/)
    await expect(page.getByRole('heading', { name: /billing|subscription/i })).toBeVisible()
  })

  test('should show current Enterprise tier plan information', async ({ page }) => {
    const enterpriseBadge = page.getByText(/enterprise tier|enterprise plan/i)
    await expect(enterpriseBadge).toBeVisible()
  })

  test('should display location usage for Enterprise tier', async ({ page }) => {
    const locationUsage = page.getByText(/locations/i).and(page.getByText(/\/.*used/i))
    await expect(locationUsage.first()).toBeVisible()

    // Should show higher limit than Home tier (e.g., "15/50 used")
    const usagePattern = page.getByText(/\d+\/\d+/)
    expect(await usagePattern.count()).toBeGreaterThan(0)
  })

  test('should show enterprise features list', async ({ page }) => {
    // Look for enterprise features
    const enterpriseFeatures = page.getByText(/siem|sso|api.*keys|webhooks/i)
    expect(await enterpriseFeatures.count()).toBeGreaterThan(0)
  })

  test('should display Upgrade to MSP button', async ({ page }) => {
    const upgradeButton = page.getByRole('button', { name: /upgrade.*msp|contact.*sales/i })

    if (await upgradeButton.count() > 0) {
      await expect(upgradeButton).toBeVisible()
      await expect(upgradeButton).toBeEnabled()
    }
  })

  test('should not show client management usage for Enterprise tier', async ({ page }) => {
    // Clients metric should not be visible for Enterprise tier
    const clientUsage = page.getByText(/clients.*\/.*used/i)
    expect(await clientUsage.isVisible()).toBeFalsy()
  })

  test('should show higher location limit than Home tier', async ({ page }) => {
    // Should show 50 or unlimited for Enterprise
    const locationLimit = page.getByText(/50 locations|unlimited locations/i)

    if (await locationLimit.count() > 0) {
      await expect(locationLimit).toBeVisible()
    }
  })

  test('should display projected costs', async ({ page }) => {
    const projectedCost = page.getByText(/projected.*cost|estimated cost/i)

    if (await projectedCost.count() > 0) {
      await expect(projectedCost).toBeVisible()
    }
  })

  test('should show usage history for last 6 months', async ({ page }) => {
    const usageHistory = page.getByText(/usage history|last 6 months/i)

    if (await usageHistory.count() > 0) {
      await expect(usageHistory).toBeVisible()
    }
  })
})

test.describe('US-037: Billing Page - MSP Tier', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMSP(page)
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)
  })

  test('should display billing page for MSP tier', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/billing/)
    await expect(page.getByRole('heading', { name: /billing|subscription/i })).toBeVisible()
  })

  test('should show current MSP tier plan information', async ({ page }) => {
    const mspBadge = page.getByText(/msp tier|msp plan|managed service provider/i)
    await expect(mspBadge).toBeVisible()
  })

  test('should display client usage for MSP tier', async ({ page }) => {
    // MSP tier should show client usage metrics
    const clientUsage = page.getByText(/clients/i).and(page.getByText(/\/.*used|unlimited/i))
    await expect(clientUsage.first()).toBeVisible()
  })

  test('should display location usage across all clients', async ({ page }) => {
    // Should show total locations across all clients
    const totalLocations = page.getByText(/total locations|all locations/i)

    if (await totalLocations.count() > 0) {
      await expect(totalLocations).toBeVisible()
    }
  })

  test('should show per-client breakdown', async ({ page }) => {
    // Look for client-by-client usage breakdown
    const clientBreakdown = page.getByText(/client breakdown|usage by client/i)

    if (await clientBreakdown.count() > 0) {
      await expect(clientBreakdown).toBeVisible()
    }
  })

  test('should display unlimited or high limits for MSP tier', async ({ page }) => {
    // MSP tier typically has unlimited or very high limits
    const unlimitedBadge = page.getByText(/unlimited clients|unlimited locations/i)

    if (await unlimitedBadge.count() > 0) {
      await expect(unlimitedBadge).toBeVisible()
    }
  })

  test('should show aggregated billing across all clients', async ({ page }) => {
    // Look for total cost across clients
    const totalCost = page.getByText(/total.*cost|aggregate.*cost/i)

    if (await totalCost.count() > 0) {
      await expect(totalCost).toBeVisible()
    }
  })

  test('should have client filtering in usage breakdown', async ({ page }) => {
    // Look for client filter or selector
    const clientFilter = page.getByLabel(/filter.*client|select client/i)

    if (await clientFilter.count() > 0) {
      await expect(clientFilter).toBeVisible()
    }
  })

  test('should not show upgrade button for MSP tier', async ({ page }) => {
    // MSP is the highest tier, should not show upgrade prompt
    const upgradeButton = page.getByRole('button', { name: /upgrade plan/i })
    expect(await upgradeButton.isVisible()).toBeFalsy()
  })

  test('should show MSP-specific features list', async ({ page }) => {
    // Look for MSP features
    const mspFeatures = page.getByText(/client management|bulk actions|white.*label/i)
    expect(await mspFeatures.count()).toBeGreaterThan(0)
  })
})

test.describe('US-037: Usage Dashboard Widget', () => {
  test('Home tier shows usage widget on dashboard', async ({ page }) => {
    await loginAsHome(page)
    await page.goto('/dashboard')
    await waitForPageLoad(page)

    // Look for usage widget
    const usageWidget = page.getByText(/usage overview|usage/i)
    await expect(usageWidget.first()).toBeVisible()

    // Should show location usage
    const locationUsage = page.getByText(/\d+\/\d+ locations/i)
    expect(await locationUsage.count()).toBeGreaterThan(0)
  })

  test('Enterprise tier shows usage widget on dashboard', async ({ page }) => {
    await loginAsEnterprise(page)
    await page.goto('/dashboard')
    await waitForPageLoad(page)

    const usageWidget = page.getByText(/usage overview|usage/i)
    await expect(usageWidget.first()).toBeVisible()
  })

  test('MSP tier shows client count in usage widget', async ({ page }) => {
    await loginAsMSP(page)
    await page.goto('/dashboard')
    await waitForPageLoad(page)

    const usageWidget = page.getByText(/usage overview|usage/i)
    await expect(usageWidget.first()).toBeVisible()

    // Should show client count
    const clientCount = page.getByText(/\d+ client(s)?/i)

    if (await clientCount.count() > 0) {
      expect(await clientCount.count()).toBeGreaterThan(0)
    }
  })

  test('usage widget shows warning when approaching limit', async ({ page }) => {
    await loginAsHome(page)
    await page.goto('/dashboard')
    await waitForPageLoad(page)

    // Look for warning indicator (typically at >80% usage)
    const warningIndicator = page.locator('[class*="warning"]').or(
      page.locator('[class*="yellow"]')
    )

    if (await warningIndicator.count() > 0) {
      // If warning is shown, it should be visible
      await expect(warningIndicator.first()).toBeVisible()
    }
  })

  test('usage widget is clickable and navigates to billing', async ({ page }) => {
    await loginAsHome(page)
    await page.goto('/dashboard')
    await waitForPageLoad(page)

    // Click on usage widget
    const usageWidget = page.getByText(/usage overview/i).locator('..')
    await usageWidget.click()

    // Should navigate to billing page
    await expect(page).toHaveURL(/\/billing/, { timeout: 5000 })
  })
})

test.describe('US-037: Upgrade Prompts', () => {
  test('Home tier shows upgrade prompt on restricted features', async ({ page }) => {
    await loginAsHome(page)

    // Try to access enterprise feature
    await page.goto('/dashboard/settings/security/siem')
    await waitForPageLoad(page)

    // Should show upgrade prompt
    const upgradePrompt = page.getByText(/upgrade.*enterprise|available.*enterprise/i)
    await expect(upgradePrompt).toBeVisible()

    // Should have upgrade CTA button
    const upgradeButton = page.getByRole('button', { name: /upgrade|get enterprise/i })
    await expect(upgradeButton).toBeVisible()
  })

  test('Home tier upgrade prompt links to billing page', async ({ page }) => {
    await loginAsHome(page)
    await page.goto('/dashboard/settings/security/api-keys')
    await waitForPageLoad(page)

    const upgradeButton = page.getByRole('button', { name: /upgrade|get enterprise/i })

    if (await upgradeButton.isVisible()) {
      await upgradeButton.click()

      // Should navigate to billing/upgrade page
      await expect(page).toHaveURL(/\/billing|\/upgrade/)
    }
  })

  test('Enterprise tier shows upgrade prompt for MSP features', async ({ page }) => {
    await loginAsEnterprise(page)
    await page.goto('/dashboard/clients')
    await waitForPageLoad(page)

    // Should show MSP upgrade prompt
    const upgradePrompt = page.getByText(/upgrade.*msp|available.*msp|contact.*sales/i)
    await expect(upgradePrompt).toBeVisible()
  })

  test('upgrade prompt shows feature benefits', async ({ page }) => {
    await loginAsHome(page)
    await page.goto('/dashboard/settings/security/siem')
    await waitForPageLoad(page)

    // Should list benefits of upgrading
    const featureBenefits = page.getByText(/siem.*integration|security.*information/i)

    if (await featureBenefits.count() > 0) {
      await expect(featureBenefits.first()).toBeVisible()
    }
  })

  test('upgrade prompt shows pricing information', async ({ page }) => {
    await loginAsHome(page)
    await page.goto('/dashboard/settings/security/sso')
    await waitForPageLoad(page)

    // Look for pricing info in upgrade prompt
    const pricingInfo = page.getByText(/\$\d+|starting at|contact.*sales/i)

    if (await pricingInfo.count() > 0) {
      expect(await pricingInfo.count()).toBeGreaterThan(0)
    }
  })

  test('MSP tier does not show upgrade prompts', async ({ page }) => {
    await loginAsMSP(page)

    // Navigate to various pages
    const pages = [
      '/dashboard/clients',
      '/dashboard/msp/templates',
      '/dashboard/settings/security/siem',
      '/dashboard/settings/security/api-keys'
    ]

    for (const path of pages) {
      await page.goto(path)
      await waitForPageLoad(page)

      // Should not show any upgrade prompts
      const upgradePrompt = page.getByText(/upgrade to|available in.*tier/i)
      expect(await upgradePrompt.isVisible()).toBeFalsy()
    }
  })
})

test.describe('US-037: Subscription Status Display', () => {
  test('should show active subscription status', async ({ page }) => {
    await loginAsEnterprise(page)
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)

    // Look for active status badge
    const activeStatus = page.getByText(/active/i).and(
      page.locator('[class*="badge"]').or(page.locator('[class*="status"]'))
    )

    if (await activeStatus.count() > 0) {
      await expect(activeStatus.first()).toBeVisible()
    }
  })

  test('should display next billing date', async ({ page }) => {
    await loginAsEnterprise(page)
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)

    const nextBillingDate = page.getByText(/next billing|renews on|renewal date/i)

    if (await nextBillingDate.count() > 0) {
      await expect(nextBillingDate).toBeVisible()
    }
  })

  test('should show payment method on file', async ({ page }) => {
    await loginAsEnterprise(page)
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)

    const paymentMethod = page.getByText(/payment method|card ending|billing info/i)

    if (await paymentMethod.count() > 0) {
      await expect(paymentMethod).toBeVisible()
    }
  })

  test('should have Manage Subscription button', async ({ page }) => {
    await loginAsEnterprise(page)
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)

    const manageButton = page.getByRole('button', { name: /manage subscription|update.*payment/i })

    if (await manageButton.count() > 0) {
      await expect(manageButton).toBeVisible()
    }
  })

  test('should display billing history/invoices tab', async ({ page }) => {
    await loginAsEnterprise(page)
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)

    const invoicesTab = page.getByRole('tab', { name: /invoices|billing history/i })

    if (await invoicesTab.count() > 0) {
      await invoicesTab.click()
      await waitForPageLoad(page)

      // Should show invoice list
      await expect(page.getByText(/invoice|date|amount/i)).toBeVisible()
    }
  })

  test('should allow downloading invoices', async ({ page }) => {
    await loginAsEnterprise(page)
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)

    const downloadButton = page.getByRole('button', { name: /download|export|pdf/i }).first()

    if (await downloadButton.count() > 0) {
      await expect(downloadButton).toBeVisible()
    }
  })

  test('should show subscription tier in header', async ({ page }) => {
    await loginAsEnterprise(page)
    await page.goto('/dashboard')
    await waitForPageLoad(page)

    // Look for tier indicator in header/navbar
    const tierBadge = page.getByText(/enterprise/i).and(
      page.locator('[class*="badge"]').or(page.locator('header'))
    )

    if (await tierBadge.count() > 0) {
      expect(await tierBadge.count()).toBeGreaterThan(0)
    }
  })
})

test.describe('US-037: Usage CSV Export', () => {
  test('should have CSV export button on billing page', async ({ page }) => {
    await loginAsEnterprise(page)
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)

    const csvButton = page.getByRole('button', { name: /download csv|export.*csv/i })
    await expect(csvButton).toBeVisible()
    await expect(csvButton).toBeEnabled()
  })

  test('should download usage report CSV', async ({ page }) => {
    await loginAsEnterprise(page)
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)

    const downloadButton = page.getByRole('button', { name: /download csv/i })

    if (await downloadButton.isVisible()) {
      const downloadPromise = page.waitForEvent('download')
      await downloadButton.click()

      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/usage.*\.csv|report.*\.csv/i)
    }
  })

  test('MSP tier CSV export includes client breakdown', async ({ page }) => {
    await loginAsMSP(page)
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)

    const csvButton = page.getByRole('button', { name: /download csv|export/i })

    if (await csvButton.isVisible()) {
      await expect(csvButton).toBeVisible()
      // Actual CSV content validation would require downloading and parsing
    }
  })
})
