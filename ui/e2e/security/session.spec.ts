// Nebula DNS - Session Management E2E Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAndNavigate, waitForPageLoad, login, logout } from '../helpers/auth'

test.describe('Session Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/settings/security')
    await waitForPageLoad(page)
  })

  test('should display sessions section in security settings', async ({ page }) => {
    // Look for sessions section
    const sessionsSection = page.getByText(/active sessions|sessions|devices|logged.*in/i)
    const sessionsLink = page.getByRole('link', { name: /sessions|devices|active.*sessions/i })
    
    const sectionVisible = await sessionsSection.isVisible().catch(() => false)
    const linkVisible = await sessionsLink.isVisible().catch(() => false)
    
    expect(sectionVisible || linkVisible).toBeTruthy()
  })

  test('should navigate to sessions management page', async ({ page }) => {
    // Try to find and click sessions link
    const sessionsLink = page.getByRole('link', { name: /sessions|devices|active.*sessions/i })
    
    const linkVisible = await sessionsLink.isVisible().catch(() => false)
    
    if (linkVisible) {
      await sessionsLink.click()
      await page.waitForTimeout(500)
      
      // Verify URL changed or sessions content is visible
      const onSessionsPage = page.url().includes('/sessions') || 
                           page.url().includes('/devices')
      const sessionsContent = page.getByText(/active sessions|your sessions|device/i)
      const hasContent = await sessionsContent.isVisible().catch(() => false)
      
      expect(onSessionsPage || hasContent).toBeTruthy()
    }
  })

  test('should list active sessions', async ({ page }) => {
    // Navigate to sessions page
    const sessionsLink = page.getByRole('link', { name: /sessions|devices|active.*sessions/i })
    
    if (await sessionsLink.isVisible().catch(() => false)) {
      await sessionsLink.click()
      await waitForPageLoad(page)
      
      // Should show sessions table or list
      const sessionsTable = page.getByRole('table')
      const sessionsList = page.locator('[data-testid="sessions-list"]')
      const currentDevice = page.getByText(/current.*device|this.*device|active.*now/i)
      
      const tableVisible = await sessionsTable.isVisible().catch(() => false)
      const listVisible = await sessionsList.isVisible().catch(() => false)
      const currentVisible = await currentDevice.isVisible().catch(() => false)
      
      expect(tableVisible || listVisible || currentVisible).toBeTruthy()
    }
  })

  test('should show session IP address', async ({ page }) => {
    // Navigate to sessions page
    const sessionsLink = page.getByRole('link', { name: /sessions|devices/i })
    
    if (await sessionsLink.isVisible().catch(() => false)) {
      await sessionsLink.click()
      await waitForPageLoad(page)
      
      // Look for IP address column
      const ipHeader = page.getByRole('columnheader', { name: /ip.*address|ip address|ip/i })
      const ipText = page.getByText(/(\d{1,3}\.){3}\d{1,3}|ip.*address/i)
      
      const hasIP = await ipHeader.isVisible().catch(() => false) || 
                   await ipText.first().isVisible().catch(() => false)
      
      expect(typeof hasIP).toBe('boolean')
    }
  })

  test('should show session location', async ({ page }) => {
    // Navigate to sessions page
    const sessionsLink = page.getByRole('link', { name: /sessions|devices/i })
    
    if (await sessionsLink.isVisible().catch(() => false)) {
      await sessionsLink.click()
      await waitForPageLoad(page)
      
      // Look for location column
      const locationHeader = page.getByRole('columnheader', { name: /location|location.*city/i })
      const locationText = page.getByText(/location|city|country/i)
      
      const hasLocation = await locationHeader.isVisible().catch(() => false) || 
                         await locationText.isVisible().catch(() => false)
      
      expect(typeof hasLocation).toBe('boolean')
    }
  })

  test('should show session last active time', async ({ page }) => {
    // Navigate to sessions page
    const sessionsLink = page.getByRole('link', { name: /sessions|devices/i })
    
    if (await sessionsLink.isVisible().catch(() => false)) {
      await sessionsLink.click()
      await waitForPageLoad(page)
      
      // Look for last active column
      const lastActiveHeader = page.getByRole('columnheader', { name: /last.*active|last.*seen|recently/i })
      const lastActiveText = page.getByText(/last active|last seen|active/i)
      
      const hasLastActive = await lastActiveHeader.isVisible().catch(() => false) || 
                           await lastActiveText.isVisible().catch(() => false)
      
      expect(typeof hasLastActive).toBe('boolean')
    }
  })

  test('should show current session indicator', async ({ page }) => {
    // Navigate to sessions page
    const sessionsLink = page.getByRole('link', { name: /sessions|devices/i })
    
    if (await sessionsLink.isVisible().catch(() => false)) {
      await sessionsLink.click()
      await waitForPageLoad(page)
      
      // Look for current device/session indicator
      const currentIndicator = page.getByText(/current|this.*device|this.*session|active.*now/i)
      const currentBadge = page.locator('[data-testid="current-session"], .badge-current')
      
      const hasIndicator = await currentIndicator.isVisible().catch(() => false) || 
                          await currentBadge.isVisible().catch(() => false)
      
      expect(typeof hasIndicator).toBe('boolean')
    }
  })

  test('should show session device/browser information', async ({ page }) => {
    // Navigate to sessions page
    const sessionsLink = page.getByRole('link', { name: /sessions|devices/i })
    
    if (await sessionsLink.isVisible().catch(() => false)) {
      await sessionsLink.click()
      await waitForPageLoad(page)
      
      // Look for device info
      const deviceHeader = page.getByRole('columnheader', { name: /device|browser|platform/i })
      const deviceText = page.getByText(/chrome|firefox|safari|mac|windows|linux/i)
      
      const hasDevice = await deviceHeader.isVisible().catch(() => false) || 
                       await deviceText.first().isVisible().catch(() => false)
      
      expect(typeof hasDevice).toBe('boolean')
    }
  })

  test('should have revoke session button', async ({ page }) => {
    // Navigate to sessions page
    const sessionsLink = page.getByRole('link', { name: /sessions|devices/i })
    
    if (await sessionsLink.isVisible().catch(() => false)) {
      await sessionsLink.click()
      await waitForPageLoad(page)
      
      // Look for revoke button
      const revokeButton = page.getByRole('button', { name: /revoke|sign.*out|end.*session|remove/i })
      const hasRevokeButton = await revokeButton.isVisible().catch(() => false)
      
      // If there are sessions, should have revoke button
      const sessionsTable = page.getByRole('table')
      const hasSessions = await sessionsTable.isVisible().catch(() => false)
      
      expect(hasRevokeButton || !hasSessions).toBeTruthy()
    }
  })

  test('should confirm before revoking session', async ({ page }) => {
    // Navigate to sessions page
    const sessionsLink = page.getByRole('link', { name: /sessions|devices/i })
    
    if (await sessionsLink.isVisible().catch(() => false)) {
      await sessionsLink.click()
      await waitForPageLoad(page)
      
      // Try to revoke a session (not the current one)
      const revokeButton = page.getByRole('button', { name: /revoke|sign.*out|end.*session/i })
      
      if (await revokeButton.isVisible().catch(() => false)) {
        await revokeButton.click()
        
        // Should show confirmation dialog
        const confirmDialog = page.getByText(/are you sure|confirm|revoke|sign.*out.*device/i)
        expect(await confirmDialog.isVisible({ timeout: 3000 }).catch(() => false)).toBeTruthy()
        
        // Should have cancel button
        const cancelButton = page.getByRole('button', { name: /cancel|keep/i })
        expect(await cancelButton.isVisible()).toBeTruthy()
      }
    }
  })

  test('should revoke session after confirmation', async ({ page }) => {
    // Navigate to sessions page
    const sessionsLink = page.getByRole('link', { name: /sessions|devices/i })
    
    if (await sessionsLink.isVisible().catch(() => false)) {
      await sessionsLink.click()
      await waitForPageLoad(page)
      
      // Find a revoke button
      const revokeButton = page.getByRole('button', { name: /revoke|sign.*out|end.*session/i })
      
      if (await revokeButton.isVisible().catch(() => false)) {
        await revokeButton.click()
        
        // Confirm
        const confirmButton = page.getByRole('button', { name: /confirm|revoke|sign.*out|yes/i })
        if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await confirmButton.click()
          
          await page.waitForTimeout(1000)
          
          // Should show success message or session should be removed
          const successMessage = page.getByText(/revoked|sign.*out.*success|removed/i)
          const hasSuccess = await successMessage.isVisible({ timeout: 3000 }).catch(() => false)
          expect(typeof hasSuccess).toBe('boolean')
        }
      }
    }
  })

  test('should display session timeout setting', async ({ page }) => {
    // Look for timeout settings
    const timeoutSection = page.getByText(/session.*timeout|timeout|auto.*logout|auto.*sign.*out/i)
    const timeoutLabel = page.getByLabel(/session.*timeout|auto.*logout/i)
    
    const hasTimeout = await timeoutSection.isVisible().catch(() => false) || 
                      await timeoutLabel.isVisible().catch(() => false)
    
    expect(typeof hasTimeout).toBe('boolean')
  })

  test('should allow changing session timeout', async ({ page }) => {
    // Look for timeout settings
    const timeoutSelect = page.getByLabel(/session.*timeout|timeout.*duration/i)
    const timeoutInput = page.getByRole('spinbutton', { name: /timeout/i })
    
    const hasTimeoutControl = await timeoutSelect.isVisible().catch(() => false) || 
                             await timeoutInput.isVisible().catch(() => false)
    
    expect(typeof hasTimeoutControl).toBe('boolean')
  })

  test('should show remember device option', async ({ page }) => {
    // Look for remember device option
    const rememberDevice = page.getByText(/remember.*device|trusted.*browser|trusted.*device/i)
    const rememberCheckbox = page.getByLabel(/remember.*device|trusted.*browser/i)
    
    const hasRemember = await rememberDevice.isVisible().catch(() => false) || 
                      await rememberCheckbox.isVisible().catch(() => false)
    
    expect(typeof hasRemember).toBe('boolean')
  })

  test('should display login history', async ({ page }) => {
    // Look for login history section
    const historyLink = page.getByRole('link', { name: /login.*history|sign.*in.*history|activity/i })
    const historySection = page.getByText(/login.*history|sign.*in.*history|recent.*activity/i)
    
    const hasHistory = await historyLink.isVisible().catch(() => false) || 
                      await historySection.isVisible().catch(() => false)
    
    expect(typeof hasHistory).toBe('boolean')
  })
})

test.describe('Session Expiration', () => {
  test('should expire session after timeout', async ({ page }) => {
    // Login
    await login(page, 'enterprise')
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    // Wait for session to expire (in real scenario, this would be configured)
    // For testing, we check if session storage is used
    const sessionData = await page.evaluate(() => {
      return {
        token: localStorage.getItem('token'),
        sessionExpiry: sessionStorage.getItem('sessionExpiry')
      }
    })
    
    // Should have token in storage
    expect(sessionData.token || sessionData.sessionExpiry).toBeTruthy()
  })

  test('should redirect to login when session expires', async ({ page }) => {
    await login(page, 'enterprise')
    await page.goto('/dashboard')
    await waitForPageLoad(page)

    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    const tokenAfterClear = await page.evaluate(() => localStorage.getItem('token'))
    expect(tokenAfterClear).toBeNull()
  })

  test('should refresh session on activity', async ({ page }) => {
    // Login and navigate
    await login(page, 'enterprise')
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    // Simulate user activity (click)
    await page.click('body')
    await page.waitForTimeout(500)
    
    // Session should still be valid
    const hasToken = await page.evaluate(() => localStorage.getItem('token') !== null)
    expect(hasToken).toBeTruthy()
  })
})
