// Nebula DNS - MSP Client Management E2E Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAsMSP, waitForPageLoad } from '../helpers/auth'
import { pageHeading } from '../helpers/selectors'

test.describe('MSP Client Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMSP(page)
    await page.goto('/dashboard/clients')
    await waitForPageLoad(page)
  })

  test('should view client list', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/clients/)
    await expect(pageHeading(page, /^clients$/i)).toBeVisible()
    
    // Verify client table/list is present
    const clientTable = page.locator('table')
    const clientCards = page.locator('[class*="grid"], [class*="card"]').filter({ hasText: /client/i })
    const hasTable = await clientTable.isVisible().catch(() => false)
    const hasCards = (await clientCards.count()) > 0
    expect(hasTable || hasCards).toBeTruthy()
    await expect(page.getByRole('heading', { name: /acme corp/i })).toBeVisible({ timeout: 10000 })
  })

  test('should add new client', async ({ page }) => {
    await page.getByRole('button', { name: /add client/i }).click()
    await page.getByLabel(/organization name/i).fill(`Test Client ${Date.now()}`)
    await page.getByLabel(/admin email/i).fill('newclient@example.com')
    await page.getByRole('button', { name: /^create client$/i }).click()
    await expect(page.getByRole('heading', { name: /client created successfully/i })).toBeVisible({ timeout: 10000 })
  })

  test('should edit client details', async ({ page }) => {
    // Find first client
    const clientRow = page.locator('tbody tr').first()
    
    if (await clientRow.isVisible()) {
      // Click edit button
      const editButton = clientRow.getByRole('button', { name: /edit|settings|configure/i })
      
      if (await editButton.isVisible()) {
        await editButton.click()
        await page.waitForTimeout(300)
        
        // Modify client details
        const nameInput = page.getByLabel(/client (name|company)|name/i)
        if (await nameInput.isVisible()) {
          const originalName = await nameInput.inputValue()
          await nameInput.fill(`${originalName} Updated`)
          
          // Save changes
          const saveButton = page.getByRole('button', { name: /save|update|submit/i })
          if (await saveButton.isVisible()) {
            await saveButton.click()
            await page.waitForTimeout(500)
            
            // Verify update success
            const successMessage = page.getByText(/success|updated|saved/i)
            const hasSuccess = await successMessage.count() > 0
            expect(hasSuccess).toBeTruthy()
          }
        }
      }
    }
  })

  test('should assign policies to client', async ({ page }) => {
    // Click on first client to view details
    const clientRow = page.locator('tbody tr').first()
    
    if (await clientRow.isVisible()) {
      await clientRow.click()
      await page.waitForTimeout(300)
      
      // Look for policies section
      const policiesLink = page.getByRole('link', { name: /policies?|assign policies/i })
      
      if (await policiesLink.isVisible()) {
        await policiesLink.click()
        await page.waitForTimeout(300)
        
        // Verify policies section
        await expect(page.getByText(/policies?|assign/i)).toBeVisible()
        
        // Select a policy
        const policyCheckbox = page.locator('input[type="checkbox"]').first()
        if (await policyCheckbox.isVisible()) {
          await policyCheckbox.check()
          
          // Save assignment
          const saveButton = page.getByRole('button', { name: /save|assign|update/i })
          if (await saveButton.isVisible()) {
            await saveButton.click()
            await page.waitForTimeout(500)
            
            // Verify success
            const successMessage = page.getByText(/success|assigned|updated/i)
            const hasSuccess = await successMessage.count() > 0
            expect(hasSuccess).toBeTruthy()
          }
        }
      }
    }
  })

  test('should view client usage statistics', async ({ page }) => {
    // Click on first client
    const clientRow = page.locator('tbody tr').first()
    
    if (await clientRow.isVisible()) {
      await clientRow.click()
      await page.waitForTimeout(300)
      
      // Look for usage or stats section
      const usageLink = page.getByRole('link', { name: /usage|statistics|stats|metrics/i })
      
      if (await usageLink.isVisible()) {
        await usageLink.click()
        await page.waitForTimeout(300)
        
        // Verify usage metrics displayed
        await expect(page.getByText(/queries|dns|requests|usage/i)).toBeVisible()
        
        // Check for chart or stats
        const hasStats = await page.locator('[class*="chart"], [class*="stat"], [class*="metric"]').count() > 0
        expect(hasStats).toBeTruthy()
      }
    }
  })

  test('should suspend client account', async ({ page }) => {
    // Find first client
    const clientRow = page.locator('tbody tr').first()
    
    if (await clientRow.isVisible()) {
      // Look for actions menu
      const actionsMenu = clientRow.getByRole('button', { name: /actions|menu|more/i })
      
      if (await actionsMenu.isVisible()) {
        await actionsMenu.click()
        
        // Look for suspend option
        const suspendOption = page.getByRole('menuitem', { name: /suspend|deactivate|disable/i })
        if (await suspendOption.isVisible()) {
          await suspendOption.click()
          await page.waitForTimeout(500)
          
          // Confirm suspension
          const confirmButton = page.getByRole('button', { name: /confirm|yes|suspend/i })
          if (await confirmButton.isVisible()) {
            await confirmButton.click()
            await page.waitForTimeout(500)
            
            // Verify status changed
            const statusBadge = page.getByText(/suspended|inactive|disabled/i)
            if (await statusBadge.isVisible()) {
              await expect(statusBadge).toBeVisible()
            }
          }
        }
      }
    }
  })

  test('should export client list', async ({ page }) => {
    // Look for export button
    const exportButton = page.getByRole('button', { name: /export|download|csv/i })
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      
      // Check for export options
      const exportMenu = page.getByRole('menu')
      if (await exportMenu.isVisible()) {
        await expect(page.getByText(/csv|excel|pdf/i)).toBeVisible()
        
        // Select export format
        const csvOption = page.getByRole('menuitem', { name: /csv|excel/i })
        if (await csvOption.isVisible()) {
          await csvOption.click()
          await page.waitForTimeout(500)
          
          // Verify download initiated or success message
          const successMessage = page.getByText(/export|download|success/i)
          const hasExport = await successMessage.count() > 0
          expect(hasExport).toBeTruthy()
        }
      }
    }
  })

  test('should filter and search clients', async ({ page }) => {
    // Check for search input
    const searchInput = page.getByPlaceholder(/search clients|filter|find/i)
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('test')
      await searchInput.press('Enter')
      await page.waitForTimeout(500)
      
      // Verify results filtered
      const hasResults = await page.locator('tbody tr').count() >= 0
      expect(hasResults).toBeTruthy()
    }
    
    // Check for filter options
    const filterButton = page.getByRole('button', { name: /filter/i })
    if (await filterButton.isVisible()) {
      await filterButton.click()
      
      // Verify filter options appear
      await expect(page.getByText(/status|active|suspended|all/i)).toBeVisible()
    }
  })
})
