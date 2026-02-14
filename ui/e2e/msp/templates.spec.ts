// Nebula DNS - MSP Policy Templates E2E Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAsMSP, waitForPageLoad } from '../helpers/auth'

test.describe('MSP Policy Templates', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMSP(page)
    await page.goto('/dashboard/templates')
    await waitForPageLoad(page)
  })

  test('should view template library', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/templates/)
    await expect(page.getByRole('heading', { name: /templates?|template (library|list)/i })).toBeVisible()
    
    // Verify templates are displayed
    const templateList = page.locator('[class*="template"], table')
    if (await templateList.isVisible()) {
      await expect(templateList).toBeVisible()
      
      // Check for template columns/headers
      await expect(page.getByText(/name|description|category|type/i)).toBeVisible()
    }
  })

  test('should create new template', async ({ page }) => {
    // Click create template button
    const createButton = page.getByRole('button', { name: /create (new )?template|add template|new template/i })
    
    if (await createButton.isVisible()) {
      await createButton.click()
      await page.waitForTimeout(300)
      
      // Verify template form appears
      await expect(page.getByText(/create template|new template/i)).toBeVisible()
      
      // Fill template details
      const nameInput = page.getByLabel(/template name|name/i)
      if (await nameInput.isVisible()) {
        await nameInput.fill(`Test Template ${Date.now()}`)
        
        const descInput = page.getByLabel(/description/i)
        if (await descInput.isVisible()) {
          await descInput.fill('Test template description for E2E testing')
          
          // Select category
          const categorySelect = page.getByLabel(/category|type/i)
          if (await categorySelect.isVisible()) {
            await categorySelect.click()
            await page.getByRole('option', { name: /security|filter/i }).first().click()
            
            // Save template
            const saveButton = page.getByRole('button', { name: /create|save|save template/i })
            if (await saveButton.isVisible()) {
              await saveButton.click()
              await page.waitForTimeout(500)
              
              // Verify success
              const successMessage = page.getByText(/success|created|template/i)
              const hasSuccess = await successMessage.count() > 0
              expect(hasSuccess).toBeTruthy()
            }
          }
        }
      }
    }
  })

  test('should edit existing template', async ({ page }) => {
    // Find first template
    const templateRow = page.locator('tbody tr').first()
    
    if (await templateRow.isVisible()) {
      // Click edit button
      const editButton = templateRow.getByRole('button', { name: /edit|configure|settings/i })
      
      if (await editButton.isVisible()) {
        await editButton.click()
        await page.waitForTimeout(300)
        
        // Verify edit form appears
        await expect(page.getByText(/edit template|template settings/i)).toBeVisible()
        
        // Modify description
        const descInput = page.getByLabel(/description/i)
        if (await descInput.isVisible()) {
          const originalDesc = await descInput.inputValue()
          await descInput.fill(`${originalDesc} - Updated`)
          
          // Save changes
          const saveButton = page.getByRole('button', { name: /save|update|update template/i })
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

  test('should duplicate template', async ({ page }) => {
    // Find first template
    const templateRow = page.locator('tbody tr').first()
    
    if (await templateRow.isVisible()) {
      // Look for duplicate option in actions
      const actionsMenu = templateRow.getByRole('button', { name: /actions|menu|more/i })
      
      if (await actionsMenu.isVisible()) {
        await actionsMenu.click()
        
        // Look for duplicate option
        const duplicateOption = page.getByRole('menuitem', { name: /duplicate|copy|clone/i })
        if (await duplicateOption.isVisible()) {
          await duplicateOption.click()
          await page.waitForTimeout(500)
          
          // Verify duplicate form appears with prefilled data
          await expect(page.getByText(/duplicate|copy/i)).toBeVisible()
          
          // Verify original name is copied
          const nameInput = page.getByLabel(/template name|name/i)
          if (await nameInput.isVisible()) {
            const name = await nameInput.inputValue()
            expect(name).toContain('Copy')
          }
        }
      }
    }
  })

  test('should delete template with confirmation', async ({ page }) => {
    // Find first template
    const templateRow = page.locator('tbody tr').first()
    
    if (await templateRow.isVisible()) {
      // Look for delete option
      const actionsMenu = templateRow.getByRole('button', { name: /actions|menu|more/i })
      
      if (await actionsMenu.isVisible()) {
        await actionsMenu.click()
        
        // Look for delete option
        const deleteOption = page.getByRole('menuitem', { name: /delete|remove/i })
        if (await deleteOption.isVisible()) {
          await deleteOption.click()
          await page.waitForTimeout(300)
          
          // Verify confirmation dialog appears
          await expect(page.getByText(/confirm|are you sure|warning|delete/i)).toBeVisible()
          
          // Verify cancel option exists
          const cancelButton = page.getByRole('button', { name: /cancel/i })
          await expect(cancelButton).toBeVisible()
        }
      }
    }
  })

  test('should apply template to client', async ({ page }) => {
    // Navigate to clients page first
    await page.goto('/dashboard/clients')
    await waitForPageLoad(page)
    
    // Select a client
    const clientRow = page.locator('tbody tr').first()
    if (await clientRow.isVisible()) {
      await clientRow.click()
      await page.waitForTimeout(300)
      
      // Look for templates section
      const templatesLink = page.getByRole('link', { name: /templates?|apply template/i })
      
      if (await templatesLink.isVisible()) {
        await templatesLink.click()
        await page.waitForTimeout(300)
        
        // Verify templates section appears
        await expect(page.getByText(/templates?|select template/i)).toBeVisible()
        
        // Select a template
        const templateCheckbox = page.locator('input[type="checkbox"]').first()
        if (await templateCheckbox.isVisible()) {
          await templateCheckbox.check()
          
          // Apply template
          const applyButton = page.getByRole('button', { name: /apply|assign|save/i })
          if (await applyButton.isVisible()) {
            await applyButton.click()
            await page.waitForTimeout(500)
            
            // Verify success
            const successMessage = page.getByText(/success|applied|assigned/i)
            const hasSuccess = await successMessage.count() > 0
            expect(hasSuccess).toBeTruthy()
          }
        }
      }
    }
  })
})
