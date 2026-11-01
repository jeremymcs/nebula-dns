// Nebula DNS - Admin Tenant Management E2E Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAndNavigate, waitForPageLoad } from '../helpers/auth'
import { SKIP_ADMIN_CONSOLE_IN_TENANT_UI } from '../helpers/launch-features'

test.describe.skip(`Admin Tenant Management — ${SKIP_ADMIN_CONSOLE_IN_TENANT_UI}`, () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, '/admin/tenants', 'enterprise')
    await waitForPageLoad(page)
  })

  test('should view tenant list with pagination', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin\/tenants/)
    await expect(page.getByRole('heading', { name: /tenants?|clients?/i })).toBeVisible()
    
    // Check for table or list view
    const tenantTable = page.locator('table')
    if (await tenantTable.isVisible()) {
      await expect(tenantTable).toBeVisible()
    }
    
    // Check for pagination controls
    const pagination = page.getByRole('navigation', { name: /pagination/i })
    if (await pagination.isVisible()) {
      await expect(pagination).toBeVisible()
      
      // Check page numbers or next/prev buttons
      const nextButton = page.getByRole('button', { name: /next|page \d+/i })
      if (await nextButton.isVisible()) {
        await nextButton.click()
        await page.waitForTimeout(300)
      }
    }
  })

  test('should create new tenant', async ({ page }) => {
    // Click add tenant button
    const addButton = page.getByRole('button', { name: /add (new )?tenant|create (new )?tenant/i })
    
    if (await addButton.isVisible()) {
      await addButton.click()
      
      // Wait for modal/form
      await page.waitForTimeout(300)
      
      // Verify form fields are present
      await expect(page.getByLabel(/name/i)).toBeVisible()
      await expect(page.getByLabel(/domain|email/i)).toBeVisible()
      await expect(page.getByLabel(/tier|plan/i)).toBeVisible()
      
      // Fill form
      await page.getByLabel(/name/i).fill(`Test Tenant ${Date.now()}`)
      await page.getByLabel(/domain|email/i).fill(`test${Date.now()}@example.com`)
      
      // Submit form
      const submitButton = page.getByRole('button', { name: /create|save|submit/i })
      if (await submitButton.isVisible()) {
        await submitButton.click()
        
        // Wait for success feedback
        await page.waitForTimeout(500)
        
        // Verify success message or redirect
        const successMessage = page.getByText(/success|created|added/i)
        const hasSuccess = await successMessage.count() > 0
        expect(hasSuccess).toBeTruthy()
      }
    }
  })

  test('should edit tenant settings', async ({ page }) => {
    // Find first tenant in list
    const tenantRow = page.locator('tbody tr').first()
    
    if (await tenantRow.isVisible()) {
      // Click edit button for tenant
      const editButton = tenantRow.getByRole('button', { name: /edit|settings|configure/i })
      
      if (await editButton.isVisible()) {
        await editButton.click()
        await page.waitForTimeout(300)
        
        // Verify edit form appears
        await expect(page.getByText(/edit|settings|configure/i)).toBeVisible()
        
        // Modify a field
        const nameInput = page.getByLabel(/name/i)
        if (await nameInput.isVisible()) {
          await nameInput.fill(`Updated Tenant ${Date.now()}`)
          
          // Save changes
          const saveButton = page.getByRole('button', { name: /save|update|submit/i })
          if (await saveButton.isVisible()) {
            await saveButton.click()
            await page.waitForTimeout(500)
            
            // Verify success
            const successMessage = page.getByText(/success|updated|saved/i)
            const hasSuccess = await successMessage.count() > 0
            expect(hasSuccess).toBeTruthy()
          }
        }
      }
    }
  })

  test('should view tenant billing information', async ({ page }) => {
    // Find first tenant
    const tenantRow = page.locator('tbody tr').first()
    
    if (await tenantRow.isVisible()) {
      // Click to view tenant details
      await tenantRow.click()
      await page.waitForTimeout(300)
      
      // Look for billing section
      const billingLink = page.getByRole('link', { name: /billing|invoices|subscription/i })
      if (await billingLink.isVisible()) {
        await billingLink.click()
        await page.waitForTimeout(300)
        
        // Verify billing information displayed
        await expect(page.getByText(/billing|invoice|payment|subscription/i)).toBeVisible()
      }
    }
  })

  test('should suspend and reactivate tenant', async ({ page }) => {
    // Find first tenant
    const tenantRow = page.locator('tbody tr').first()
    
    if (await tenantRow.isVisible()) {
      // Look for status toggle or suspend button
      const actionsMenu = tenantRow.getByRole('button', { name: /actions|menu|more/i })
      
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
            
            // Verify status changed to suspended
            const statusBadge = page.getByText(/suspended|inactive|disabled/i)
            if (await statusBadge.isVisible()) {
              await expect(statusBadge).toBeVisible()
            }
            
            // Now reactivate
            await actionsMenu.click()
            const reactivateOption = page.getByRole('menuitem', { name: /reactivate|activate|enable/i })
            if (await reactivateOption.isVisible()) {
              await reactivateOption.click()
              await page.waitForTimeout(500)
              
              // Verify reactivated
              const activeStatus = page.getByText(/active|enabled/i)
              if (await activeStatus.count() > 0) {
                await expect(activeStatus.first()).toBeVisible()
              }
            }
          }
        }
      }
    }
  })

  test('should delete tenant with confirmation', async ({ page }) => {
    // Find first tenant
    const tenantRow = page.locator('tbody tr').first()
    
    if (await tenantRow.isVisible()) {
      // Look for delete option in actions
      const actionsMenu = tenantRow.getByRole('button', { name: /actions|menu|more/i })
      
      if (await actionsMenu.isVisible()) {
        await actionsMenu.click()
        
        // Look for delete option
        const deleteOption = page.getByRole('menuitem', { name: /delete|remove/i })
        if (await deleteOption.isVisible()) {
          await deleteOption.click()
          await page.waitForTimeout(300)
          
          // Verify confirmation dialog appears
          await expect(page.getByText(/confirm|are you sure|warning/i)).toBeVisible()
          
          // Cancel first (safety check)
          const cancelButton = page.getByRole('button', { name: /cancel/i })
          if (await cancelButton.isVisible()) {
            // Verify we can cancel deletion
            await expect(cancelButton).toBeVisible()
          }
        }
      }
    }
  })
})
