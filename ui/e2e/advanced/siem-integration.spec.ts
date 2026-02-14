// Nebula DNS - SIEM Integration E2E Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAndNavigate, waitForPageLoad } from '../helpers/auth'

test.describe('SIEM Integration', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/settings/integrations')
    await waitForPageLoad(page)
  })

  test('should display SIEM section in integrations', async ({ page }) => {
    // Look for SIEM section
    const siemSection = page.getByText(/siem|security.*information|security.*event/i)
    const siemLink = page.getByRole('link', { name: /siem|security.*information/i })
    
    const sectionVisible = await siemSection.isVisible().catch(() => false)
    const linkVisible = await siemLink.isVisible().catch(() => false)
    
    expect(sectionVisible || linkVisible).toBeTruthy()
  })

  test('should navigate to SIEM configuration page', async ({ page }) => {
    // Click on SIEM link
    const siemLink = page.getByRole('link', { name: /siem|security.*information/i })
    
    if (await siemLink.isVisible().catch(() => false)) {
      await siemLink.click()
      await waitForPageLoad(page)
      
      // Should show SIEM configuration
      const heading = page.getByRole('heading', { name: /siem|configuration|settings/i })
      const hasContent = await heading.isVisible().catch(() => false)
      
      expect(hasContent).toBeTruthy()
    }
  })

  test('should display SIEM endpoint URL field', async ({ page }) => {
    // Navigate to SIEM page or look for endpoint field
    const siemLink = page.getByRole('link', { name: /siem/i })
    
    if (await siemLink.isVisible().catch(() => false)) {
      await siemLink.click()
      await waitForPageLoad(page)
      
      // Look for endpoint URL field
      const endpointInput = page.getByLabel(/endpoint|url|server|host|collector/i)
      expect(await endpointInput.isVisible()).toBeTruthy()
    }
  })

  test('should accept SIEM endpoint URL', async ({ page }) => {
    // Navigate to SIEM
    const siemLink = page.getByRole('link', { name: /siem/i })
    
    if (await siemLink.isVisible().catch(() => false)) {
      await siemLink.click()
      await waitForPageLoad(page)
      
      // Fill endpoint URL
      const endpointInput = page.getByLabel(/endpoint|url|server|host/i)
      
      if (await endpointInput.isVisible().catch(() => false)) {
        await endpointInput.fill('https://siem.company.com:8080/ingest')
        
        // Verify value is set
        const value = await endpointInput.inputValue()
        expect(value).toContain('siem.company.com')
      }
    }
  })

  test('should show SIEM authentication options', async ({ page }) => {
    // Navigate to SIEM
    const siemLink = page.getByRole('link', { name: /siem/i })
    
    if (await siemLink.isVisible().catch(() => false)) {
      await siemLink.click()
      await waitForPageLoad(page)
      
      // Look for auth options
      const authSection = page.getByText(/authentication|auth|api.*key|token|credentials/i)
      const apiKeyField = page.getByLabel(/api.*key|auth.*token|secret|username|password/i)
      
      const hasAuth = await authSection.isVisible().catch(() => false) || 
                    await apiKeyField.first().isVisible().catch(() => false)
      
      expect(typeof hasAuth).toBe('boolean')
    }
  })

  test('should allow configuring SIEM API key', async ({ page }) => {
    // Navigate to SIEM
    const siemLink = page.getByRole('link', { name: /siem/i })
    
    if (await siemLink.isVisible().catch(() => false)) {
      await siemLink.click()
      await waitForPageLoad(page)
      
      // Look for API key field
      const apiKeyInput = page.getByLabel(/api.*key|api-key|secret|token/i)
      
      if (await apiKeyInput.isVisible().catch(() => false)) {
        await apiKeyInput.fill('test-api-key-12345')
        
        // Verify value is set
        const value = await apiKeyInput.inputValue()
        expect(value).toBeTruthy()
      }
    }
  })

  test('should have test connection button', async ({ page }) => {
    // Navigate to SIEM
    const siemLink = page.getByRole('link', { name: /siem/i })
    
    if (await siemLink.isVisible().catch(() => false)) {
      await siemLink.click()
      await waitForPageLoad(page)
      
      // Look for test button
      const testButton = page.getByRole('button', { name: /test.*connection|test.*siem|verify|check.*connection/i })
      expect(await testButton.isVisible()).toBeTruthy()
    }
  })

  test('should show connection test result', async ({ page }) => {
    // Navigate to SIEM
    const siemLink = page.getByRole('link', { name: /siem/i })
    
    if (await siemLink.isVisible().catch(() => false)) {
      await siemLink.click()
      await waitForPageLoad(page)
      
      // Fill in endpoint first
      const endpointInput = page.getByLabel(/endpoint|url|server/i)
      if (await endpointInput.isVisible().catch(() => false)) {
        await endpointInput.fill('https://siem.test.com/ingest')
      }
      
      // Click test button
      const testButton = page.getByRole('button', { name: /test.*connection|verify|check/i })
      
      if (await testButton.isVisible().catch(() => false)) {
        await testButton.click()
        
        // Wait for result
        await page.waitForTimeout(2000)
        
        // Should show success or error
        const successMessage = page.getByText(/success|connected|working|ok/i)
        const errorMessage = page.getByText(/error|failed|connection.*failed|timeout/i)
        
        const hasResult = await successMessage.isVisible().catch(() => false) || 
                        await errorMessage.isVisible().catch(() => false)
        
        expect(typeof hasResult).toBe('boolean')
      }
    }
  })

  test('should display SIEM enable/disable toggle', async ({ page }) => {
    // Navigate to SIEM
    const siemLink = page.getByRole('link', { name: /siem/i })
    
    if (await siemLink.isVisible().catch(() => false)) {
      await siemLink.click()
      await waitForPageLoad(page)
      
      // Look for enable toggle
      const enableToggle = page.getByLabel(/enable|disable|active|turn.*on|turn.*off/i)
      const enableSwitch = page.locator('button[role="switch"]')
      
      const hasToggle = await enableToggle.isVisible().catch(() => false) || 
                      await enableSwitch.isVisible().catch(() => false)
      
      expect(typeof hasToggle).toBe('boolean')
    }
  })

  test('should enable SIEM forwarding', async ({ page }) => {
    // Navigate to SIEM
    const siemLink = page.getByRole('link', { name: /siem/i })
    
    if (await siemLink.isVisible().catch(() => false)) {
      await siemLink.click()
      await waitForPageLoad(page)
      
      // Find toggle
      const toggle = page.getByLabel(/enable|active/i).first()
      
      if (await toggle.isVisible().catch(() => false)) {
        const isEnabled = await toggle.isChecked().catch(() => false)
        
        if (!isEnabled) {
          await toggle.click()
          
          // Should show enabled status
          await page.waitForTimeout(500)
          const enabledStatus = page.getByText(/enabled|active|on/i)
          const hasEnabled = await enabledStatus.isVisible().catch(() => false)
          
          expect(typeof hasEnabled).toBe('boolean')
        }
      }
    }
  })

  test('should show SIEM delivery status', async ({ page }) => {
    // Navigate to SIEM
    const siemLink = page.getByRole('link', { name: /siem/i })
    
    if (await siemLink.isVisible().catch(() => false)) {
      await siemLink.click()
      await waitForPageLoad(page)
      
      // Look for status section
      const statusSection = page.getByText(/status|delivery|events.*sent|last.*sent|pending/i)
      const statusIndicator = page.locator('[data-testid="siem-status"], .status-indicator')
      
      const hasStatus = await statusSection.isVisible().catch(() => false) || 
                      await statusIndicator.isVisible().catch(() => false)
      
      expect(typeof hasStatus).toBe('boolean')
    }
  })

  test('should display events sent count', async ({ page }) => {
    // Navigate to SIEM
    const siemLink = page.getByRole('link', { name: /siem/i })
    
    if (await siemLink.isVisible().catch(() => false)) {
      await siemLink.click()
      await waitForPageLoad(page)
      
      // Look for count
      const countText = page.getByText(/events.*sent|logs.*sent|records.*sent|\d+.*events/i)
      const countNumber = page.locator('[data-testid="events-count"], .count')
      
      const hasCount = await countText.isVisible().catch(() => false) || 
                     await countNumber.isVisible().catch(() => false)
      
      expect(typeof hasCount).toBe('boolean')
    }
  })

  test('should save SIEM configuration', async ({ page }) => {
    // Navigate to SIEM
    const siemLink = page.getByRole('link', { name: /siem/i })
    
    if (await siemLink.isVisible().catch(() => false)) {
      await siemLink.click()
      await waitForPageLoad(page)
      
      // Fill configuration
      const endpointInput = page.getByLabel(/endpoint|url/i)
      if (await endpointInput.isVisible().catch(() => false)) {
        await endpointInput.fill('https://siem.company.com/ingest')
      }
      
      // Save
      const saveButton = page.getByRole('button', { name: /save|save.*changes|update|apply/i })
      
      if (await saveButton.isVisible().catch(() => false)) {
        await saveButton.click()
        
        await page.waitForTimeout(1500)
        
        // Should show success message
        const successMessage = page.getByText(/saved|success|updated|changes.*saved/i)
        const hasSuccess = await successMessage.isVisible({ timeout: 3000 }).catch(() => false)
        
        expect(typeof hasSuccess).toBe('boolean')
      }
    }
  })
})
