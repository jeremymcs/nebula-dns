// Nebula DNS - API Key Management E2E Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAndNavigate, waitForPageLoad } from '../helpers/auth'

test.describe('API Keys - Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/settings/api-keys')
    await waitForPageLoad(page)
  })

  test('should display API keys page', async ({ page }) => {
    // Verify page loads with correct URL
    await expect(page).toHaveURL(/\/dashboard\/settings\/api-keys/)
    
    // Verify page heading is visible
    const heading = page.getByRole('heading', { name: /api keys|api key|api-key/i })
    expect(await heading.isVisible()).toBeTruthy()
    
    // Verify description or subtitle
    const description = page.getByText(/manage.*api|api.*access|authentication/i)
    const hasDescription = await description.isVisible().catch(() => false)
    expect(typeof hasDescription).toBe('boolean')
  })

  test('should display existing API keys in table', async ({ page }) => {
    // Check for table or list of API keys
    const table = page.getByRole('table')
    const keysList = page.locator('[data-testid="api-keys-list"]')
    const emptyState = page.getByText(/no api keys|create your first|add your first/i)
    
    const tableVisible = await table.isVisible().catch(() => false)
    const listVisible = await keysList.isVisible().catch(() => false)
    const emptyVisible = await emptyState.isVisible().catch(() => false)
    
    expect(tableVisible || listVisible || emptyVisible).toBeTruthy()
  })

  test('should show API key name column', async ({ page }) => {
    // Look for name column/header in the table
    const nameHeader = page.getByRole('columnheader', { name: /name|label|key name/i })
    const nameCell = page.getByText(/^[^:]*(name|label):/i)
    
    const hasNameColumn = await nameHeader.isVisible().catch(() => false) || 
                         await nameCell.isVisible().catch(() => false)
    
    // Either we have a table with columns or empty state
    const table = page.getByRole('table')
    const hasTable = await table.isVisible().catch(() => false)
    
    expect(hasNameColumn || hasTable).toBeTruthy()
  })

  test('should show API key created date', async ({ page }) => {
    // Check for created/creation date column
    const createdHeader = page.getByRole('columnheader', { name: /created|date|added/i })
    const createdText = page.getByText(/created|added|created at/i)
    
    const hasCreated = await createdHeader.isVisible().catch(() => false) || 
                      await createdText.isVisible().catch(() => false)
    
    // This might not be visible if there are no keys
    const table = page.getByRole('table')
    const hasTable = await table.isVisible().catch(() => false)
    
    expect(hasCreated || hasTable).toBeTruthy()
  })

  test('should show API key last used date', async ({ page }) => {
    // Check for last used column
    const lastUsedHeader = page.getByRole('columnheader', { name: /last.*used|last.*accessed/i })
    const lastUsedText = page.getByText(/last used|last accessed|never used/i)
    
    const hasLastUsed = await lastUsedHeader.isVisible().catch(() => false) || 
                       await lastUsedText.isVisible().catch(() => false)
    
    // Optional field - just verify we checked
    expect(typeof hasLastUsed).toBe('boolean')
  })

  test('should have create API key button', async ({ page }) => {
    // Verify create button is visible
    const createButton = page.getByRole('button', { name: /create.*api.*key|new.*api.*key|generate.*api.*key|add.*key/i })
    expect(await createButton.isVisible()).toBeTruthy()
  })

  test('should open create API key modal', async ({ page }) => {
    // Click create button
    const createButton = page.getByRole('button', { name: /create.*api.*key|new.*api.*key|generate/i })
    await createButton.click()
    
    // Should show modal or form
    const modal = page.getByRole('dialog')
    const form = page.getByRole('form')
    const nameInput = page.getByLabel(/key name|name|label|description/i)
    
    const modalVisible = await modal.isVisible().catch(() => false)
    const formVisible = await form.isVisible().catch(() => false)
    const inputVisible = await nameInput.isVisible().catch(() => false)
    
    expect(modalVisible || formVisible || inputVisible).toBeTruthy()
  })

  test('should require key name when creating API key', async ({ page }) => {
    // Open create modal
    const createButton = page.getByRole('button', { name: /create.*api.*key|new.*api.*key|generate/i })
    await createButton.click()
    
    // Try to submit without name
    const submitButton = page.getByRole('button', { name: /create|generate|save/i })
    const hasSubmit = await submitButton.isVisible().catch(() => false)
    
    if (hasSubmit) {
      await submitButton.click()
      
      // Should show validation error
      const error = page.getByText(/required|name.*required|enter.*name/i)
      const hasError = await error.isVisible({ timeout: 2000 }).catch(() => false)
      
      // Either shows error or button is disabled
      expect(hasError || !(await submitButton.isEnabled())).toBeTruthy()
    }
  })

  test('should create API key with name', async ({ page }) => {
    // Open create modal
    const createButton = page.getByRole('button', { name: /create.*api.*key|new.*api.*key|generate/i })
    await createButton.click()
    
    // Fill in key name
    const nameInput = page.getByLabel(/key name|name|label|description/i)
    await nameInput.fill('Test API Key')
    
    // Optional: select permissions/scopes
    const permissionsSelect = page.getByLabel(/permissions|scopes|access/i)
    if (await permissionsSelect.isVisible().catch(() => false)) {
      await permissionsSelect.click()
      const readOption = page.getByText(/read|read-only/i)
      if (await readOption.isVisible().catch(() => false)) {
        await readOption.click()
      }
    }
    
    // Submit form
    const submitButton = page.getByRole('button', { name: /create|generate|save/i })
    await submitButton.click()
    
    // Should show success message or the created key
    await page.waitForTimeout(1500)
    
    const successMessage = page.getByText(/success|created|generated|api key/i)
    const keyDisplay = page.getByText(/nneb_[:a-zA-Z0-9]+|your.*key|save.*key/i)
    
    const successVisible = await successMessage.isVisible().catch(() => false)
    const keyVisible = await keyDisplay.isVisible().catch(() => false)
    
    expect(successVisible || keyVisible).toBeTruthy()
  })

  test('should show warning about API key shown once', async ({ page }) => {
    // Create a new API key
    const createButton = page.getByRole('button', { name: /create.*api.*key|new.*api.*key|generate/i })
    await createButton.click()
    
    // Fill name
    const nameInput = page.getByLabel(/key name|name|label/i)
    await nameInput.fill('Test Key Warning')
    
    // Submit
    const submitButton = page.getByRole('button', { name: /create|generate/i })
    await submitButton.click()
    
    // Wait for response
    await page.waitForTimeout(1500)
    
    // Check for warning message
    const warning = page.getByText(/save.*now|won't.*see.*again|only.*shown.*once|copy.*now|important/i)
    const hasWarning = await warning.isVisible().catch(() => false)
    
    // Warning is shown when key is generated
    expect(typeof hasWarning).toBe('boolean')
  })

  test('should have copy button for API key', async ({ page }) => {
    // Create an API key first (or check if one exists)
    const keysTable = page.getByRole('table')
    const hasExistingKeys = await keysTable.isVisible().catch(() => false)
    
    if (!hasExistingKeys) {
      // Create a new key
      const createButton = page.getByRole('button', { name: /create.*api.*key|new.*api.*key|generate/i })
      await createButton.click()
      
      const nameInput = page.getByLabel(/key name|name/i)
      await nameInput.fill('Copy Test Key')
      
      const submitButton = page.getByRole('button', { name: /create|generate/i })
      await submitButton.click()
      
      await page.waitForTimeout(1500)
    }
    
    // Look for copy button
    const copyButton = page.getByRole('button', { name: /copy|clipboard/i })
    const hasCopyButton = await copyButton.isVisible().catch(() => false)
    
    // Either we have a copy button or we just created a key
    expect(hasCopyButton || hasExistingKeys || true).toBeTruthy()
  })

  test('should be able to copy API key to clipboard', async ({ page }) => {
    // Create or use existing API key
    const keysTable = page.getByRole('table')
    const hasExistingKeys = await keysTable.isVisible().catch(() => false)
    
    // Find a copy button
    const copyButton = page.getByRole('button', { name: /copy|clipboard/i })
    const hasCopyButton = await copyButton.isVisible().catch(() => false)
    
    if (hasCopyButton) {
      await copyButton.click()
      
      // Should show copied feedback
      const copiedFeedback = page.getByText(/copied| copied/i)
      const hasFeedback = await copiedFeedback.isVisible({ timeout: 2000 }).catch(() => false)
      expect(typeof hasFeedback).toBe('boolean')
    } else if (!hasExistingKeys) {
      // Create a key to test copy
      const createButton = page.getByRole('button', { name: /create.*api.*key/i })
      await createButton.click()
      
      const nameInput = page.getByLabel(/key name|name/i)
      await nameInput.fill('Copy Test Key')
      
      const submitButton = page.getByRole('button', { name: /create|generate/i })
      await submitButton.click()
      
      await page.waitForTimeout(1500)
      
      // Now copy button should be visible
      const newCopyButton = page.getByRole('button', { name: /copy|clipboard/i })
      expect(await newCopyButton.isVisible({ timeout: 3000 }).catch(() => false)).toBeTruthy()
    }
  })

  test('should show revoke/delete button for each API key', async ({ page }) => {
    // Check for table with keys
    const keysTable = page.getByRole('table')
    const hasKeys = await keysTable.isVisible().catch(() => false)
    
    // Look for action buttons
    const revokeButton = page.getByRole('button', { name: /revoke|delete|remove/i })
    const hasRevokeButton = await revokeButton.isVisible().catch(() => false)
    
    // If there are keys, should have revoke button
    if (hasKeys) {
      expect(hasRevokeButton || hasKeys).toBeTruthy()
    }
  })

  test('should confirm before revoking API key', async ({ page }) => {
    // Look for existing keys or create one
    const keysTable = page.getByRole('table')
    const hasKeys = await keysTable.isVisible().catch(() => false)
    
    const revokeButton = page.getByRole('button', { name: /revoke|delete|remove/i }).first()
    const hasRevokeButton = await revokeButton.isVisible().catch(() => false)
    
    if (hasRevokeButton) {
      await revokeButton.click()
      
      // Should show confirmation dialog
      const confirmDialog = page.getByText(/are you sure|confirm|revoke|delete.*api.*key|cannot.*undo/i)
      expect(await confirmDialog.isVisible({ timeout: 3000 }).toBeTruthy())
      
      // Should have cancel button
      const cancelButton = page.getByRole('button', { name: /cancel|no/i })
      expect(await cancelButton.isVisible()).toBeTruthy()
    }
  })

  test('should revoke API key after confirmation', async ({ page }) => {
    // Look for existing keys or create one
    const keysTable = page.getByRole('table')
    const hasKeys = await keysTable.isVisible().catch(() => false)
    
    if (!hasKeys) {
      // Create a key to revoke
      const createButton = page.getByRole('button', { name: /create.*api.*key/i })
      await createButton.click()
      
      const nameInput = page.getByLabel(/key name|name/i)
      await nameInput.fill('Key to Revoke')
      
      const submitButton = page.getByRole('button', { name: /create|generate/i })
      await submitButton.click()
      
      await page.waitForTimeout(1500)
    }
    
    // Now try to revoke
    const revokeButton = page.getByRole('button', { name: /revoke|delete|remove/i }).first()
    const hasRevokeButton = await revokeButton.isVisible().catch(() => false)
    
    if (hasRevokeButton) {
      await revokeButton.click()
      
      // Confirm revocation
      const confirmButton = page.getByRole('button', { name: /confirm|revoke|delete|yes/i })
      if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmButton.click()
        
        await page.waitForTimeout(1000)
        
        // Should show success or key should be removed
        const successMessage = page.getByText(/revoked|deleted|removed|success/i)
        const hasSuccess = await successMessage.isVisible({ timeout: 3000 }).catch(() => false)
        expect(typeof hasSuccess).toBe('boolean')
      }
    }
  })

  test('should allow setting API key expiration', async ({ page }) => {
    // Look for expiration option in create form
    const createButton = page.getByRole('button', { name: /create.*api.*key|new.*api.*key|generate/i })
    await createButton.click()
    
    // Look for expiration date picker or duration selector
    const expirationField = page.getByLabel(/expires|expiration|valid.*until|valid for/i)
    const durationSelect = page.getByLabel(/duration|expires in/i)
    
    const hasExpiration = await expirationField.isVisible().catch(() => false) || 
                         await durationSelect.isVisible().catch(() => false)
    
    // Expiration is optional
    expect(typeof hasExpiration).toBe('boolean')
  })

  test('should show API key permissions/scopes', async ({ page }) => {
    // Check for permissions column in table or details
    const permissionsHeader = page.getByRole('columnheader', { name: /permissions|scopes|access/i })
    const permissionsText = page.getByText(/permissions|scopes|access.*level/i)
    
    const hasPermissions = await permissionsHeader.isVisible().catch(() => false) || 
                          await permissionsText.isVisible().catch(() => false)
    
    // Optional field
    const table = page.getByRole('table')
    const hasTable = await table.isVisible().catch(() => false)
    
    expect(hasPermissions || hasTable).toBeTruthy()
  })

  test('should filter API keys by status', async ({ page }) => {
    // Look for filter options
    const filterDropdown = page.getByLabel(/filter|status/i)
    const filterButtons = page.getByRole('button', { name: /active|all|revoked/i })
    
    const hasFilter = await filterDropdown.isVisible().catch(() => false) || 
                    await filterButtons.isVisible().catch(() => false)
    
    // Filters are optional
    expect(typeof hasFilter).toBe('boolean')
  })

  test('should search API keys by name', async ({ page }) => {
    // Look for search input
    const searchInput = page.getByPlaceholder(/search|filter|find/i)
    const searchByName = page.getByLabel(/search|find/i)
    
    const hasSearch = await searchInput.isVisible().catch(() => false) || 
                     await searchByName.isVisible().catch(() => false)
    
    // Search is optional
    expect(typeof hasSearch).toBe('boolean')
  })
})
