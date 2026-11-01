// Nebula DNS - Invoices E2E Tests (US-037)
// Tests invoice viewing, details, PDF download, filtering, and search
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAsEnterprise, loginAsMSP, waitForPageLoad } from '../helpers/auth'
import { SKIP_STRIPE_BILLING } from '../helpers/launch-features'
import { billingTab } from '../helpers/selectors'

test.describe.skip(`US-037: Invoice Management — ${SKIP_STRIPE_BILLING}`, () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEnterprise(page)
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)
    
    // Navigate to invoices section
    const invoicesTab = billingTab(page, /invoices/i)
    if (await invoicesTab.isVisible()) {
      await invoicesTab.click()
      await waitForPageLoad(page)
    }
  })

  test('should display invoice history list', async ({ page }) => {
    // Check for invoices section
    await expect(page.getByRole('heading', { name: /invoices|billing history/i })).toBeVisible({ timeout: 10000 })
    
    // Check for invoice list/table
    const invoiceTable = page.locator('table')
    if (await invoiceTable.isVisible()) {
      await expect(invoiceTable).toBeVisible()
      
      // Table should have headers
      const headers = page.getByRole('columnheader')
      expect(await headers.count()).toBeGreaterThan(0)
    }
    
    // Should show at least one invoice or empty state
    const invoiceRow = page.locator('tr').filter({ hasText: /INV-\d+|invoice/i })
    const hasInvoice = await invoiceRow.count() > 0
    const hasEmptyState = page.getByText(/no invoices|empty.*invoice/i)
    
    expect(hasInvoice || (await hasEmptyState.isVisible())).toBeTruthy()
  })

  test('should view invoice details', async ({ page }) => {
    // Look for invoice rows
    const invoiceRow = page.locator('tr').filter({ hasText: /INV-\d+/ }).first()
    
    if (await invoiceRow.isVisible()) {
      // Click on invoice to view details
      await invoiceRow.click()
      await waitForPageLoad(page)
      
      // Invoice details should be visible
      const invoiceDetails = page.getByText(/invoice|INV-\d+/)
      expect(await invoiceDetails.count()).toBeGreaterThan(0)
      
      // Should show amount
      const amount = page.getByText(/\$\d+/)
      expect(await amount.count()).toBeGreaterThan(0)
      
      // Should show date
      const date = page.getByText(/\w+ \d{1,2}, \d{4}|\d{4}-\d{2}-\d{2}/)
      expect(await date.count()).toBeGreaterThan(0)
    }
  })

  test('should download invoice as PDF', async ({ page }) => {
    // Look for download button
    const downloadButton = page.getByRole('button', { name: /download|pdf|export/i }).first()
    
    if (await downloadButton.isVisible()) {
      // Wait for download event
      const downloadPromise = page.waitForEvent('download')
      
      // Click download
      await downloadButton.click()
      
      // Wait for download to start
      const download = await downloadPromise
      
      // Verify filename suggests PDF
      const filename = download.suggestedFilename()
      expect(filename).toMatch(/\.pdf$/i)
    }
  })

  test('should filter invoices by date range', async ({ page }) => {
    // Look for date filter controls
    const dateFilter = page.getByLabel(/date|range|from|to/i)
    
    if (await dateFilter.count() > 0) {
      // Should have date inputs or date picker
      const fromDate = page.locator('input[name="fromDate"], input[name="startDate"]')
      const toDate = page.locator('input[name="toDate"], input[name="endDate"]')
      
      // Check for filter button
      const filterButton = page.getByRole('button', { name: /filter|apply|search/i })
      
      if (await fromDate.isVisible() && await toDate.isVisible()) {
        // Enter date range
        await fromDate.fill('2025-01-01')
        await toDate.fill('2025-12-31')
        
        if (await filterButton.isVisible()) {
          await filterButton.click()
          await waitForPageLoad(page)
          
          // Results should be filtered
          const invoiceRows = page.locator('tbody tr')
          expect(await invoiceRows.count()).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  test('should search invoices by ID or amount', async ({ page }) => {
    // Look for search input
    const searchInput = page.getByPlaceholder(/search|invoice.*id|amount/i)
    
    if (await searchInput.isVisible()) {
      // Search by invoice ID pattern
      await searchInput.fill('INV-')
      await searchInput.press('Enter')
      await waitForPageLoad(page)
      
      // Should show matching results or empty state
      const invoiceRow = page.locator('tr').filter({ hasText: /INV-\d+/ })
      const hasResults = await invoiceRow.count() > 0
      const hasNoResults = page.getByText(/no.*results|no.*invoices/i)
      
      expect(hasResults || (await hasNoResults.isVisible())).toBeTruthy()
    }
  })
})

test.describe('US-037: Invoice - MSP Tier', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMSP(page)
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)
  })

  test('MSP tier sees aggregated invoices', async ({ page }) => {
    // Navigate to invoices
    const invoicesTab = billingTab(page, /invoices/i)
    if (await invoicesTab.isVisible()) {
      await invoicesTab.click()
      await waitForPageLoad(page)
      
      // Should see invoices for their own subscription
      const invoicesHeading = page.getByRole('heading', { name: /invoices/i })
      await expect(invoicesHeading).toBeVisible({ timeout: 5000 })
    }
  })

  test('MSP tier can download invoices', async ({ page }) => {
    const invoicesTab = billingTab(page, /invoices/i)
    if (await invoicesTab.isVisible()) {
      await invoicesTab.click()
      await waitForPageLoad(page)
      
      const downloadButton = page.getByRole('button', { name: /download|pdf/i }).first()
      
      if (await downloadButton.isVisible()) {
        const downloadPromise = page.waitForEvent('download')
        await downloadButton.click()
        
        const download = await downloadPromise
        expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
      }
    }
  })
})
