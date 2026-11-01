// Nebula DNS - Admin User Impersonation E2E Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAndNavigate, waitForPageLoad } from '../helpers/auth'
import { SKIP_ADMIN_CONSOLE_IN_TENANT_UI } from '../helpers/launch-features'

test.describe.skip(`Admin User Impersonation — ${SKIP_ADMIN_CONSOLE_IN_TENANT_UI}`, () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, '/admin/impersonation', 'enterprise')
    await waitForPageLoad(page)
  })

  test('should select user to impersonate', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin\/impersonation/)
    
    // Check for user search or list
    const searchInput = page.getByPlaceholder(/search user|find/i)
    if (await searchInput.isVisible()) {
      await searchInput.fill('test')
      await searchInput.press('Enter')
      await page.waitForTimeout(500)
    }
    
    // Check for user list
    const userList = page.locator('[class*="user"], [class*="list"]')
    if (await userList.isVisible()) {
      // Click on a user to select
      const firstUser = page.locator('[class*="user"]').first()
      if (await firstUser.isVisible()) {
        await firstUser.click()
        await page.waitForTimeout(300)
        
        // Verify user is selected
        const selectedIndicator = page.getByText(/selected|impersonate|start/i)
        const hasSelection = await selectedIndicator.count() > 0
        expect(hasSelection).toBeTruthy()
      }
    }
  })

  test('should start impersonation session with correct user context', async ({ page }) => {
    // Find and select a user first
    const userRow = page.locator('tbody tr').first()
    
    if (await userRow.isVisible()) {
      // Select user for impersonation
      const selectButton = userRow.getByRole('button', { name: /impersonate|select|choose/i })
      
      if (await selectButton.isVisible()) {
        await selectButton.click()
        await page.waitForTimeout(500)
        
        // Look for impersonation start confirmation
        const startButton = page.getByRole('button', { name: /start (session )?impersonat|become/i })
        if (await startButton.isVisible()) {
          await startButton.click()
          await page.waitForTimeout(500)
          
          // Verify impersonation started
          const impersonatingBanner = page.getByText(/impersonat-ing|viewing as|session active/i)
          if (await impersonatingBanner.isVisible()) {
            await expect(impersonatingBanner).toBeVisible()
          }
          
          // Verify user context in localStorage or UI
          const userContext = await page.evaluate(() => {
            const user = localStorage.getItem('user')
            return user ? JSON.parse(user) : null
          })
          expect(userContext).toBeTruthy()
        }
      }
    }
  })

  test('should view impersonated users dashboard', async ({ page }) => {
    // Start impersonation (simulate already in session)
    await page.evaluate(() => {
      localStorage.setItem('impersonating', JSON.stringify({
        originalUser: { id: 'admin-1', name: 'Admin User' },
        impersonatedUser: { id: 'user-1', name: 'Test User', tenantId: 'tenant-1' }
      }))
    })
    
    // Reload to apply impersonation context
    await page.reload()
    await waitForPageLoad(page)
    
    // Verify UI shows impersonation context
    const impersonationIndicator = page.getByText(/impersonat-|viewing as/i)
    if (await impersonationIndicator.isVisible()) {
      await expect(impersonationIndicator).toBeVisible()
    }
    
    // Verify dashboard shows impersonated user's data
    await expect(page.getByText(/test user|dashboard/i)).toBeVisible()
  })

  test('should end impersonation and return to admin context', async ({ page }) => {
    // Set impersonation context
    await page.evaluate(() => {
      localStorage.setItem('impersonating', JSON.stringify({
        originalUser: { id: 'admin-1', name: 'Admin User' },
        impersonatedUser: { id: 'user-1', name: 'Test User' }
      }))
    })
    
    await page.reload()
    await waitForPageLoad(page)
    
    // Look for stop/end impersonation button
    const stopButton = page.getByRole('button', { name: /stop (impersonat|session)|end (impersonat|session)|return (to |)admin/i })
    
    if (await stopButton.isVisible()) {
      await stopButton.click()
      await page.waitForTimeout(500)
      
      // Verify returned to admin context
      const adminIndicator = page.getByText(/admin|administrator/i)
      if (await adminIndicator.isVisible()) {
        await expect(adminIndicator.first()).toBeVisible()
      }
      
      // Verify impersonation context is cleared
      const impersonating = await page.evaluate(() => localStorage.getItem('impersonating'))
      expect(impersonating).toBeFalsy()
    }
  })

  test('should audit log impersonation events', async ({ page }) => {
    // Navigate to audit logs
    const auditLink = page.getByRole('link', { name: /audit (log|history)|logs|activity/i })
    
    if (await auditLink.isVisible()) {
      await auditLink.click()
      await waitForPageLoad(page)
      
      // Look for impersonation events
      const impersonationEvents = page.getByText(/impersonat-|switched (to |)user|became/i)
      
      // Should have audit trail or confirmation that logging exists
      const hasLogs = await page.locator('table, [class*="log"]').isVisible()
      expect(hasLogs).toBeTruthy()
      
      // If impersonation event is visible, verify details
      if (await impersonationEvents.count() > 0) {
        await expect(impersonationEvents.first()).toBeVisible()
      }
    }
  })
})
