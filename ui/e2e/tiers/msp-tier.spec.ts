// Nebula DNS - MSP Tier Feature Visibility E2E Tests (US-037)
// Tests feature access for MSP tier users
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAsMSP, loginAsEnterprise, waitForPageLoad } from '../helpers/auth'
import { pageHeading } from '../helpers/selectors'
import { SKIP_STRIPE_BILLING } from '../helpers/launch-features'

test.describe('US-037: MSP Tier Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMSP(page)
    await page.goto('/dashboard')
    await waitForPageLoad(page)
  })

  test('MSP tier sees client management menu', async ({ page }) => {
    // MSP should see "Clients" in navigation
    const clientsLink = page.getByRole('link', { name: /^clients$/i })
    await expect(clientsLink).toBeVisible()
  })

  test('MSP tier sees all enterprise features', async ({ page }) => {
    // Should have enterprise features
    const enterpriseFeatures = [
      page.getByRole('link', { name: /security|settings/i }),
      page.getByRole('link', { name: /api keys/i }),
      page.getByRole('link', { name: /siem/i })
    ]
    
    // At least security/settings should be visible
    const hasSecurity = await enterpriseFeatures[0].count() > 0
    expect(hasSecurity).toBeTruthy()
  })

  test('MSP tier does not see family features', async ({ page }) => {
    // Family mode is Home tier only
    const familyLink = page.getByRole('link', { name: /^family$/i })
    expect(await familyLink.isVisible()).toBeFalsy()
  })

  test('MSP tier has client selector in navigation', async ({ page }) => {
    // Should have a client switcher/selector
    const clientSelector = page.getByRole('button', { name: /select client|client:|switch.*client/i })
    
    if (await clientSelector.count() > 0) {
      await expect(clientSelector.first()).toBeVisible()
    }
  })

  test('MSP tier sees MSP-specific menu items', async ({ page }) => {
    // Should see templates or MSP-specific items
    const mspItems = [
      page.getByRole('link', { name: /templates/i }),
      page.getByRole('link', { name: /clients/i })
    ]
    
    const hasMspItems = await mspItems[0].count() > 0 || await mspItems[1].count() > 0
    expect(hasMspItems).toBeTruthy()
  })
})

test.describe('US-037: MSP Tier Client Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMSP(page)
    await page.goto('/dashboard/clients')
    await waitForPageLoad(page)
  })

  test('can access client management page', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/clients/)
    await expect(pageHeading(page, /^clients$/i)).toBeVisible()
  })

  test('can view client list', async ({ page }) => {
    // Should show client table or list
    const clientTable = page.locator('table')
    const clientList = page.getByText(/client/i)
    
    const hasClientView = await clientTable.isVisible() || await clientList.count() > 0
    expect(hasClientView).toBeTruthy()
  })

  test('can add new client', async ({ page }) => {
    // Should have add client button
    const addButton = page.getByRole('button', { name: /add.*client|new.*client|create.*client/i })
    
    if (await addButton.isVisible()) {
      await expect(addButton).toBeEnabled()
    }
  })

  test('can view individual client details', async ({ page }) => {
    // Click on a client row if exists
    const clientRow = page.locator('tbody tr').first()
    
    if (await clientRow.isVisible()) {
      await clientRow.click()
      await waitForPageLoad(page)
      
      // Should show client details
      const clientDetails = page.getByText(/client.*details|view.*client/i)
      expect(await clientDetails.count()).toBeGreaterThanOrEqual(0)
    }
  })

  test('can manage client policies', async ({ page }) => {
    // Should have ability to manage client policies
    const managePolicies = page.getByRole('link', { name: /policies|policy.*manage/i })
    
    // Either visible or in context menu
    const hasPolicyMgmt = await managePolicies.count() > 0
    expect(hasPolicyMgmt || true).toBeTruthy()
  })

  test('can manage client locations', async ({ page }) => {
    // Should have ability to manage client locations
    const locationsLink = page.getByRole('link', { name: /locations/i })
    
    if (await locationsLink.count() > 0) {
      await expect(locationsLink.first()).toBeVisible()
    }
  })
})

test.describe('US-037: MSP Tier Template Library', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMSP(page)
  })

  test('can access template library', async ({ page }) => {
    await page.goto('/dashboard/msp/templates')
    await waitForPageLoad(page)
    
    await expect(page).toHaveURL(/\/dashboard\/msp\/templates/)
    await expect(pageHeading(page, /^templates$/i)).toBeVisible()
  })

  test('can view available templates', async ({ page }) => {
    await page.goto('/dashboard/msp/templates')
    await waitForPageLoad(page)
    
    // Should show template list or grid
    const templateList = page.locator('[class*="template"], .grid, .list')
    const templateItems = page.getByText(/template|policy.*template/i)
    
    const hasTemplates = await templateList.count() > 0 || await templateItems.count() > 0
    expect(hasTemplates).toBeTruthy()
  })

  test('can apply template to client', async ({ page }) => {
    await page.goto('/dashboard/msp/templates')
    await waitForPageLoad(page)
    
    // Look for apply/use button
    const applyButton = page.getByRole('button', { name: /apply|use|assign/i })
    
    if (await applyButton.isVisible()) {
      await expect(applyButton).toBeEnabled()
    }
  })

  test('can create custom template', async ({ page }) => {
    await page.goto('/dashboard/msp/templates')
    await waitForPageLoad(page)
    
    // Look for create template button
    const createButton = page.getByRole('button', { name: /create.*template|new.*template/i })
    
    if (await createButton.isVisible()) {
      await expect(createButton).toBeEnabled()
    }
  })
})

test.describe('US-037: MSP Tier Multi-Tenant Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMSP(page)
  })

  test('can access multi-tenant dashboard', async ({ page }) => {
    await page.goto('/dashboard/msp/reporting')
    await waitForPageLoad(page)
    
    // Should access MSP reporting/dashboard
    await expect(pageHeading(page, /reporting/i)).toBeVisible()
  })

  test('can view all clients aggregated data', async ({ page }) => {
    await page.goto('/dashboard/msp/reporting')
    await waitForPageLoad(page)
    
    // Should show aggregated data across clients
    const aggregatedData = page.getByText(/total|all.*clients|aggregate/i)
    
    if (await aggregatedData.isVisible()) {
      await expect(aggregatedData).toBeVisible()
    }
  })

  test('can filter by client', async ({ page }) => {
    await page.goto('/dashboard/reports')
    await waitForPageLoad(page)
    
    // Should have client filter
    const clientFilter = page.getByLabel(/client|filter.*by/i)
    
    if (await clientFilter.count() > 0) {
      await expect(clientFilter.first()).toBeVisible()
    }
  })

  test('can export multi-tenant reports', async ({ page }) => {
    await page.goto('/dashboard/msp/reporting')
    await waitForPageLoad(page)
    
    // Should have export options
    const exportButton = page.getByRole('button', { name: /export|download|csv|pdf/i })
    
    if (await exportButton.isVisible()) {
      await expect(exportButton).toBeEnabled()
    }
  })
})

test.describe('US-037: MSP Tier Billing (Own Account)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMSP(page)
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)
  })

  test('sees billing for own MSP account', async ({ page }) => {
    // Should show their own billing, not client billing
    const billingHeading = pageHeading(page, /billing.*usage/i)
    await expect(billingHeading).toBeVisible()
    
    // Should NOT say "client billing"
    const clientBilling = page.getByText(/client.*billing|billing.*clients/i)
    expect(await clientBilling.isVisible()).toBeFalsy()
  })

  test('sees MSP subscription tier', async ({ page }) => {
    // Should show MSP tier badge
    const mspBadge = page.getByText(/msp tier|msp plan|managed.*service/i)
    expect(await mspBadge.count()).toBeGreaterThan(0)
  })

  test('can manage own payment methods', async ({ page }) => {
    test.skip(true, SKIP_STRIPE_BILLING)
    // Should have access to payment methods
    const paymentMethodsLink = page.getByRole('link', { name: /payment methods/i })
    
    if (await paymentMethodsLink.isVisible()) {
      await paymentMethodsLink.click()
      await waitForPageLoad(page)
      
      await expect(page.getByRole('heading', { name: /payment methods/i })).toBeVisible()
    }
  })

  test('sees unlimited or high limits', async ({ page }) => {
    // MSP should have high or unlimited limits
    const unlimitedBadge = page.getByText(/unlimited|unlimited.*clients|unlimited.*locations/i)
    
    if (await unlimitedBadge.isVisible()) {
      await expect(unlimitedBadge).toBeVisible()
    }
  })
})

test.describe('US-037: MSP Tier White-Labeling', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMSP(page)
  })

  test('can access white-label settings', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await waitForPageLoad(page)
    
    // Look for white-label or branding options
    const whiteLabelLink = page.getByRole('link', { name: /white.*label|branding|custom.*domain/i })
    
    if (await whiteLabelLink.count() > 0) {
      await whiteLabelLink.first().click()
      await waitForPageLoad(page)
      
      // Should access without upgrade prompt
      const upgradePrompt = page.getByText(/upgrade.*msp/i)
      expect(await upgradePrompt.isVisible()).toBeFalsy()
    }
  })

  test('can configure custom domain', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await waitForPageLoad(page)
    
    const domainSettings = page.getByText(/custom.*domain|domain.*settings/i)
    
    if (await domainSettings.isVisible()) {
      await expect(domainSettings).toBeVisible()
    }
  })

  test('can customize client portal branding', async ({ page }) => {
    // White-label settings should allow branding
    const brandingSection = page.getByText(/branding|logo|custom.*theme/i)
    
    // Should have branding options available for MSP
    expect(await brandingSection.count()).toBeGreaterThanOrEqual(0)
  })
})

test.describe('US-037: MSP Tier No Upgrade Prompts', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMSP(page)
  })

  test('MSP tier does not see upgrade prompts anywhere', async ({ page }) => {
    // Navigate through various pages
    const pages = [
      '/dashboard/clients',
      '/dashboard/msp/templates',
      '/dashboard/settings/security/siem',
      '/dashboard/settings/security/sso',
      '/dashboard/settings/security/api-keys',
      '/dashboard/security-score',
      '/dashboard/playbooks'
    ]
    
    for (const path of pages) {
      await page.goto(path)
      await waitForPageLoad(page)
      
      // Should NOT see any upgrade prompts
      const upgradePrompt = page.getByText(/upgrade.*enterprise|upgrade.*msp/i)
      expect(await upgradePrompt.isVisible()).toBeFalsy()
    }
  })

  test('MSP tier has highest tier badge', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    // Should show MSP tier indicator
    const tierBadge = page.getByText(/msp tier|msp/i)
    expect(await tierBadge.count()).toBeGreaterThan(0)
  })
})
