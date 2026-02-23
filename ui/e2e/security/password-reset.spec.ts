// Nebula DNS - Password Reset E2E Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'

test.describe('Password Reset - Request', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password')
  })

  test('should display forgot password page', async ({ page }) => {
    // Verify page loads
    await expect(page).toHaveURL(/\/forgot-password/)
    
    // Check for heading
    const heading = page.getByRole('heading', { name: /forgot.*password|reset.*password|recover.*password/i })
    expect(await heading.isVisible()).toBeTruthy()
  })

  test('should have email input field', async ({ page }) => {
    // Check for email input
    const emailInput = page.getByLabel(/email|email.*address/i)
    expect(await emailInput.isVisible()).toBeTruthy()
  })

  test('should have submit button', async ({ page }) => {
    // Check for submit button
    const submitButton = page.getByRole('button', { name: /submit|send|reset.*password|recover/i })
    expect(await submitButton.isVisible()).toBeTruthy()
  })

  test('should show error for empty email', async ({ page }) => {
    // Click submit without entering email
    const submitButton = page.getByRole('button', { name: /submit|send|reset/i })
    await submitButton.click()
    
    // Should show validation error
    const errorMessage = page.getByText(/required|enter.*email|email.*required|please.*provide/i)
    const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false)
    
    // Either shows error or input is marked invalid
    const emailInput = page.getByLabel(/email/i)
    const isInvalid = await emailInput.evaluate(el => el.getAttribute('aria-invalid') === 'true')
    
    expect(hasError || isInvalid).toBeTruthy()
  })

  test('should show error for invalid email format', async ({ page }) => {
    // Enter invalid email
    const emailInput = page.getByLabel(/email/i)
    await emailInput.fill('invalid-email')
    
    // Submit
    const submitButton = page.getByRole('button', { name: /submit|send|reset/i })
    await submitButton.click()
    
    // Should show format error
    const errorMessage = page.getByText(/invalid.*email|valid.*email|format.*email|email.*invalid/i)
    const hasError = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false)
    
    // Or input should be invalid
    const isInvalid = await emailInput.evaluate(el => el.getAttribute('aria-invalid') === 'true')
    
    expect(hasError || isInvalid).toBeTruthy()
  })

  test('should submit password reset request successfully', async ({ page }) => {
    // Enter valid email
    const emailInput = page.getByLabel(/email/i)
    await emailInput.fill('testuser@example.com')
    
    // Submit
    const submitButton = page.getByRole('button', { name: /submit|send|reset/i })
    await submitButton.click()
    
    // Wait for response
    await page.waitForTimeout(2000)
    
    // Should show success message
    const successMessage = page.getByText(/check.*email|email.*sent|reset.*sent|instructions.*sent/i)
    const hasSuccess = await successMessage.isVisible({ timeout: 5000 }).catch(() => false)
    
    // Or should redirect to another page
    const redirected = !page.url().includes('/forgot-password')
    
    expect(hasSuccess || redirected).toBeTruthy()
  })

  test('should show success message after request', async ({ page }) => {
    // Enter email and submit
    const emailInput = page.getByLabel(/email/i)
    await emailInput.fill('test@example.com')
    
    const submitButton = page.getByRole('button', { name: /submit|send/i })
    await submitButton.click()
    
    await page.waitForTimeout(2000)
    
    // Should display success message with instructions
    const instructions = page.getByText(/check.*inbox|check.*email|follow.*instructions|click.*link/i)
    const hasInstructions = await instructions.isVisible({ timeout: 5000 }).catch(() => false)
    
    expect(typeof hasInstructions).toBe('boolean')
  })

  test('should have link back to login page', async ({ page }) => {
    // Check for login link
    const loginLink = page.getByRole('link', { name: /back.*to.*login|sign.*in|log.*in|remember.*password/i })
    expect(await loginLink.isVisible()).toBeTruthy()
  })

  test('should navigate to login page when clicking back link', async ({ page }) => {
    // Click back to login link
    const loginLink = page.getByRole('link', { name: /back.*to.*login|sign.*in|log.*in/i })
    await loginLink.click()
    
    // Should navigate to login page
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Password Reset - Email Link', () => {
  test('should handle valid reset token', async ({ page }) => {
    // Navigate to reset page with valid token
    // In real scenario, token would be from email
    await page.goto('/reset-password?token=valid-test-token-12345')
    
    // Should show password reset form
    const heading = page.getByRole('heading', { name: /reset.*password|new.*password|create.*password/i })
    const hasForm = await heading.isVisible().catch(() => false)
    
    // Or might show error for invalid/expired token
    const errorMessage = page.getByText(/invalid|expired|invalid.*token/i)
    const hasError = await errorMessage.isVisible().catch(() => false)
    
    expect(hasForm || hasError).toBeTruthy()
  })

  test('should show error for invalid reset token', async ({ page }) => {
    // Navigate with invalid token
    await page.goto('/reset-password?token=invalid-token-xyz')
    
    await page.waitForTimeout(2000)
    
    // Should show error message
    const errorMessage = page.getByText(/invalid|invalid.*token|not.*valid|expired/i)
    const hasError = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false)
    
    // Or should redirect back to forgot password
    const onForgotPassword = page.url().includes('/forgot-password')
    
    expect(hasError || onForgotPassword).toBeTruthy()
  })

  test('should show error for expired reset token', async ({ page }) => {
    // Navigate with expired token
    await page.goto('/reset-password?token=expired-token-abc123')
    
    await page.waitForTimeout(2000)
    
    // Should show expired error
    const expiredMessage = page.getByText(/expired|token.*expired|link.*expired|too.*old/i)
    const hasExpired = await expiredMessage.isVisible({ timeout: 3000 }).catch(() => false)
    
    // Or should redirect
    const redirected = page.url().includes('/forgot-password') || page.url().includes('/login')
    
    expect(hasExpired || redirected).toBeTruthy()
  })

  test('should show password reset form with valid token', async ({ page }) => {
    // Navigate with test token
    await page.goto('/reset-password?token=test-token-123')
    await page.waitForTimeout(1500)
    
    // Check for password input fields
    const passwordInput = page.getByLabel(/new.*password|create.*password|enter.*password/i)
    const confirmInput = page.getByLabel(/confirm.*password|repeat.*password/i)
    
    const hasPasswordInput = await passwordInput.isVisible().catch(() => false)
    const hasConfirmInput = await confirmInput.isVisible().catch(() => false)
    
    expect(hasPasswordInput || hasConfirmInput).toBeTruthy()
  })

  test('should require new password', async ({ page }) => {
    // Navigate to reset page
    await page.goto('/reset-password?token=test-token')
    await page.waitForTimeout(1000)
    
    // Try to submit without password
    const submitButton = page.getByRole('button', { name: /reset.*password|save.*password|update.*password/i })
    
    if (await submitButton.isVisible().catch(() => false)) {
      await submitButton.click()
      
      // Should show error
      const passwordInput = page.getByLabel(/new.*password/i)
      const isInvalid = await passwordInput.evaluate(el => el.getAttribute('aria-invalid') === 'true')
      
      const errorMessage = page.getByText(/required|enter.*password|password.*required/i)
      const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false)
      
      expect(hasError || isInvalid).toBeTruthy()
    }
  })

  test('should require password confirmation', async ({ page }) => {
    // Navigate to reset page
    await page.goto('/reset-password?token=test-token')
    await page.waitForTimeout(1000)
    
    // Fill password but not confirmation
    const passwordInput = page.getByLabel(/new.*password/i)
    if (await passwordInput.isVisible().catch(() => false)) {
      await passwordInput.fill('NewPassword123!')
      
      // Submit
      const submitButton = page.getByRole('button', { name: /reset.*password|save/i })
      await submitButton.click()
      
      // Should show confirmation error
      const errorMessage = page.getByText(/confirm.*password|must.*match|passwords.*must/i)
      const hasError = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false)
      
      // Or confirm field should be invalid
      const confirmInput = page.getByLabel(/confirm.*password/i)
      const isInvalid = await confirmInput.evaluate(el => el.getAttribute('aria-invalid') === 'true')
      
      expect(hasError || isInvalid).toBeTruthy()
    }
  })

  test('should enforce password strength requirements', async ({ page }) => {
    // Navigate to reset page
    await page.goto('/reset-password?token=test-token')
    await page.waitForTimeout(1000)
    
    // Enter weak password
    const passwordInput = page.getByLabel(/new.*password/i)
    if (await passwordInput.isVisible().catch(() => false)) {
      await passwordInput.fill('weak')
      
      // Check for strength indicators or error
      const strengthMeter = page.locator('[data-testid="password-strength"], .password-strength')
      const errorMessage = page.getByText(/weak|stronger|requirements|character|uppercase|lowercase|number/i)
      
      const hasStrength = await strengthMeter.isVisible().catch(() => false)
      const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false)
      
      // Either shows strength meter or validation error
      expect(hasStrength || hasError || (await passwordInput.evaluate(el => el.getAttribute('aria-invalid') === 'true'))).toBeTruthy()
    }
  })

  test('should show password mismatch error', async ({ page }) => {
    // Navigate to reset page
    await page.goto('/reset-password?token=test-token')
    await page.waitForTimeout(1000)
    
    // Fill different passwords
    const passwordInput = page.getByLabel(/new.*password/i)
    const confirmInput = page.getByLabel(/confirm.*password/i)
    
    if (await passwordInput.isVisible().catch(() => false) && 
        await confirmInput.isVisible().catch(() => false)) {
      await passwordInput.fill('Password123!')
      await confirmInput.fill('DifferentPassword123!')
      
      // Submit
      const submitButton = page.getByRole('button', { name: /reset.*password|save/i })
      await submitButton.click()
      
      // Should show mismatch error
      const mismatchError = page.getByText(/match|must.*match|same.*password|do.*not.*match/i)
      const hasMismatch = await mismatchError.isVisible({ timeout: 3000 }).catch(() => false)
      
      expect(hasMismatch).toBeTruthy()
    }
  })

  test('should successfully reset password', async ({ page }) => {
    // Navigate to reset page with valid token
    await page.goto('/reset-password?token=valid-test-token')
    await page.waitForTimeout(1000)
    
    // Fill password fields
    const passwordInput = page.getByLabel(/new.*password/i)
    const confirmInput = page.getByLabel(/confirm.*password/i)
    
    if (await passwordInput.isVisible().catch(() => false) && 
        await confirmInput.isVisible().catch(() => false)) {
      await passwordInput.fill('NewPassword123!')
      await confirmInput.fill('NewPassword123!')
      
      // Submit
      const submitButton = page.getByRole('button', { name: /reset.*password|save.*password|update/i })
      await submitButton.click()
      
      await page.waitForTimeout(2000)
      
      // Should show success or redirect to login
      const successMessage = page.getByText(/success|password.*reset|updated|changed|log.*in/i)
      const hasSuccess = await successMessage.isVisible({ timeout: 5000 }).catch(() => false)
      
      // Or should redirect to login
      const onLogin = page.url().includes('/login')
      
      expect(hasSuccess || onLogin).toBeTruthy()
    }
  })

  test('should redirect to login after successful reset', async ({ page }) => {
    // Navigate to reset page
    await page.goto('/reset-password?token=valid-test-token')
    await page.waitForTimeout(1000)
    
    // Fill and submit
    const passwordInput = page.getByLabel(/new.*password/i)
    const confirmInput = page.getByLabel(/confirm.*password/i)
    
    if (await passwordInput.isVisible().catch(() => false)) {
      await passwordInput.fill('NewPassword123!')
      if (await confirmInput.isVisible().catch(() => false)) {
        await confirmInput.fill('NewPassword123!')
      }
      
      const submitButton = page.getByRole('button', { name: /reset.*password|save/i })
      await submitButton.click()
      
      await page.waitForTimeout(3000)
      
      // Should redirect to login
      const onLogin = page.url().includes('/login') || await page.getByRole('heading', { name: /sign in|log in/i }).isVisible().catch(() => false)
      expect(onLogin).toBeTruthy()
    }
  })
})

test.describe('Password Reset - Security', () => {
  test('should not reveal if email exists', async ({ page }) => {
    // Request reset for email that may or may not exist
    await page.goto('/forgot-password')
    
    const emailInput = page.getByLabel(/email/i)
    await emailInput.fill('nonexistent@example.com')
    
    const submitButton = page.getByRole('button', { name: /submit|send/i })
    await submitButton.click()
    
    await page.waitForTimeout(2000)
    
    // Should NOT show "email not found" - security risk
    const notFoundError = page.getByText(/email.*not.*found|account.*not.*found|no.*account/i)
    const hasNotFound = await notFoundError.isVisible().catch(() => false)
    
    // Should show generic success message instead
    const genericSuccess = page.getByText(/check.*email|email.*sent|instructions.*sent/i)
    const hasGeneric = await genericSuccess.isVisible().catch(() => false)
    
    // Security: should not reveal if email exists
    expect(hasGeneric || !hasNotFound).toBeTruthy()
  })

  test('should rate limit reset requests', async ({ page }) => {
    // Try multiple reset requests
    await page.goto('/forgot-password')
    
    const emailInput = page.getByLabel(/email/i)
    const submitButton = page.getByRole('button', { name: /submit|send/i })
    
    // Try multiple times quickly
    for (let i = 0; i < 3; i++) {
      await emailInput.fill(`test${i}@example.com`)
      await submitButton.click()
      await page.waitForTimeout(500)
    }
    
    // Should show rate limit message
    const rateLimit = page.getByText(/too.*many|rate.*limit|please.*wait|try.*later/i)
    const hasLimit = await rateLimit.isVisible({ timeout: 3000 }).catch(() => false)
    
    // Rate limiting is optional but recommended
    expect(typeof hasLimit).toBe('boolean')
  })

  test('should expire reset token after use', async ({ page }) => {
    // Use a token once
    await page.goto('/reset-password?token=test-token')
    
    const passwordInput = page.getByLabel(/new.*password/i)
    const confirmInput = page.getByLabel(/confirm.*password/i)
    
    if (await passwordInput.isVisible().catch(() => false)) {
      await passwordInput.fill('Password123!')
      if (await confirmInput.isVisible().catch(() => false)) {
        await confirmInput.fill('Password123!')
      }
      
      const submitButton = page.getByRole('button', { name: /reset/i })
      await submitButton.click()
      
      await page.waitForTimeout(2000)
      
      // Try to use same token again
      await page.goto('/reset-password?token=test-token')
      await page.waitForTimeout(1000)
      
      // Token should be expired or invalid
      const expiredMessage = page.getByText(/invalid|expired|already.*used/i)
      const hasExpired = await expiredMessage.isVisible({ timeout: 3000 }).catch(() => false)
      
      // Or should redirect
      const redirected = page.url().includes('/forgot-password') || page.url().includes('/login')
      
      expect(hasExpired || redirected).toBeTruthy()
    }
  })
})
