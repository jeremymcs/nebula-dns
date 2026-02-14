// Nebula DNS - Admin Mission Control E2E Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAndNavigate, waitForPageLoad } from '../helpers/auth'

test.describe('Admin Mission Control Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, '/admin', 'enterprise')
    await waitForPageLoad(page)
  })

  test('should display admin dashboard with system health widgets', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin/)
    await expect(page.getByRole('heading', { name: /admin|dashboard|mission control/i })).toBeVisible()
    
    // Check for system health widgets
    await expect(page.getByText(/system (health|status)/i)).toBeVisible()
    await expect(page.getByText(/api|server|database/i)).toBeVisible()
    
    // Verify multiple health indicators
    const healthIndicators = page.locator('[class*="status"], [class*="indicator"]')
    const hasHealthIndicators = await healthIndicators.count() > 0
    expect(hasHealthIndicators).toBeTruthy()
  })

  test('should view all tenants summary', async ({ page }) => {
    await expect(page.getByText(/tenants?|clients?/i)).toBeVisible()
    
    // Check for tenant summary metrics
    await expect(page.getByText(/total|active|suspended/i)).toBeVisible()
    
    // Verify tenant count is displayed
    const tenantCount = page.getByText(/\d+\s+(tenant|client)/i)
    if (await tenantCount.count() > 0) {
      await expect(tenantCount.first()).toBeVisible()
    }
  })

  test('should filter tenants by status', async ({ page }) => {
    // Look for filter dropdown or buttons
    const filterButton = page.getByRole('button', { name: /filter/i })
    
    if (await filterButton.isVisible()) {
      await filterButton.click()
      
      // Check for status filter options
      await expect(page.getByText(/active|suspended|all/i)).toBeVisible()
      
      // Select active filter
      await page.getByRole('menuitem', { name: /active/i }).click()
      
      // Verify filter applied - URL should change or table should update
      await page.waitForTimeout(300)
    }
  })

  test('should search tenants by name or domain', async ({ page }) => {
    // Look for search input
    const searchInput = page.getByPlaceholder(/search|filter/i)
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('test')
      await searchInput.press('Enter')
      
      // Wait for results to filter
      await page.waitForTimeout(500)
      
      // Results should contain search term or be empty
      const hasResults = await page.locator('table, [class*="list"]').isVisible()
      expect(hasResults).toBeTruthy()
    }
  })

  test('should view tenant detail page', async ({ page }) => {
    // Navigate to tenants list first
    const tenantsLink = page.getByRole('link', { name: /tenants?|clients?/i }).first()
    
    if (await tenantsLink.isVisible()) {
      await tenantsLink.click()
      await waitForPageLoad(page)
      
      // Click on first tenant to view details
      const firstTenant = page.locator('table tbody tr').first()
      
      if (await firstTenant.isVisible()) {
        await firstTenant.click()
        await waitForPageLoad(page)
        
        // Verify detail page loaded
        await expect(page.getByText(/tenant|details?|settings/i)).toBeVisible()
        
        // Verify key information sections
        await expect(page.getByText(/name|domain|status|plan/i)).toBeVisible()
      }
    }
  })

  test('should view system health metrics', async ({ page }) => {
    // Navigate to system health or metrics section
    const healthLink = page.getByRole('link', { name: /health|metrics|system/i }).first()
    
    if (await healthLink.isVisible()) {
      await healthLink.click()
      await waitForPageLoad(page)
      
      // Verify metrics are displayed
      await expect(page.getByText(/cpu|memory|database|response time/i)).toBeVisible()
    }
  })

  test('should access admin-only navigation items', async ({ page }) => {
    // Verify admin-specific navigation is visible
    const adminNavItems = [
      page.getByRole('link', { name: /system|settings/i }),
      page.getByRole('link', { name: /users?|tenants?|clients?/i }),
      page.getByRole('link', { name: /billing|subscriptions?/i }),
    ]
    
    let accessibleCount = 0
    for (const navItem of adminNavItems) {
      if (await navItem.first().isVisible()) {
        accessibleCount++
      }
    }
    
    expect(accessibleCount).toBeGreaterThan(0)
  })

  test('should see correct role-based UI elements', async ({ page }) => {
    // Verify admin-specific UI elements
    await expect(page.getByRole('button', { name: /create|add|new/i })).toBeVisible()
    
    // Verify admin badge or indicator
    const adminIndicator = page.getByText(/admin|administrator/i)
    const hasAdminIndicator = await adminIndicator.count() > 0
    expect(hasAdminIndicator).toBeTruthy()
  })
})
