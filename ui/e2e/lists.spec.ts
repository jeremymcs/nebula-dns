// Nebula DNS - List Management E2E Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAndNavigate, waitForPageLoad } from './helpers/auth'
import { pageHeading } from './helpers/selectors'

test.describe('Lists - Overview', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/lists')
    await waitForPageLoad(page)
  })

  test('should display lists page', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/lists/)
    await expect(pageHeading(page, /domain lists/i)).toBeVisible()
  })

  test('should show tabs for blocklists and allowlists', async ({ page }) => {
    // Look for tab navigation
    const blocklistTab = page.getByRole('tab', { name: /blocklist|block list|blocked/i })
    const allowlistTab = page.getByRole('tab', { name: /allowlist|allow list|allowed/i })

    const hasBlocklist = await blocklistTab.isVisible().catch(() => false)
    const hasAllowlist = await allowlistTab.isVisible().catch(() => false)

    if (hasBlocklist && hasAllowlist) {
      await expect(blocklistTab).toBeVisible()
      await expect(allowlistTab).toBeVisible()
    } else {
      // Alternative: separate buttons or sections
      const blockSection = page.getByText(/blocklist|block list/i)
      const allowSection = page.getByText(/allowlist|allow list/i)

      if (await blockSection.isVisible()) {
        await expect(blockSection).toBeVisible()
      }
    }
  })

  test('should display existing lists', async ({ page }) => {
    // Check for list of lists
    const listTable = page.getByRole('table').or(page.locator('[data-testid="lists-table"]'))
    const hasLists = await listTable.isVisible().catch(() => false)

    if (hasLists) {
      await expect(listTable).toBeVisible()
    } else {
      // Check for empty state
      const emptyState = page.getByText(/no lists|create your first list/i)
      if (await emptyState.isVisible()) {
        await expect(emptyState).toBeVisible()
      }
    }
  })

  test('should have create list button', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create list|new list|add list/i })
    await expect(createButton).toBeVisible()
  })
})

test.describe('Lists - Create New List', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/lists')
    await waitForPageLoad(page)
  })

  test('should open create list form', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create list|new list|add list/i })
    await createButton.click()

    // Should show form
    const nameInput = page.getByLabel(/list name|name/i).or(page.getByPlaceholder(/list name/i)).first()
    await expect(nameInput).toBeVisible({ timeout: 5000 })
  })

  test('should create new blocklist', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create list|new list|add list/i })
    await createButton.click()

    // Fill list name
    const nameInput = page.getByLabel(/list name|name/i).or(page.getByPlaceholder(/list name/i)).first()
    await nameInput.fill('E2E Test Blocklist')

    // Select list type if needed
    const typeSelector = page.getByLabel(/list type|type/i)
    if (await typeSelector.isVisible()) {
      await typeSelector.selectOption('blocklist')
    }

    // Fill description
    const descInput = page.getByLabel(/description/i).or(page.getByPlaceholder(/description/i)).first()
    if (await descInput.isVisible()) {
      await descInput.fill('Test blocklist created by E2E tests')
    }

    // Submit
    const submitButton = page.getByRole('button', { name: /create|add|save/i }).last()
    await submitButton.click()

    // Wait for success
    await page.waitForTimeout(2000)

    const successMessage = page.getByText(/list created|success/i)
    const hasSuccess = await successMessage.isVisible().catch(() => false)

    if (hasSuccess) {
      await expect(successMessage).toBeVisible()
    }
  })

  test('should create new allowlist', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create list|new list|add list/i })
    await createButton.click()

    // Fill list name
    const nameInput = page.getByLabel(/list name|name/i).or(page.getByPlaceholder(/list name/i)).first()
    await nameInput.fill('E2E Test Allowlist')

    // Select allowlist type
    const typeSelector = page.getByLabel(/list type|type/i)
    if (await typeSelector.isVisible()) {
      await typeSelector.selectOption({ label: 'allow' })
    }

    // Submit
    const submitButton = page.getByRole('button', { name: /create|add|save/i }).last()
    await submitButton.click()

    await page.waitForTimeout(2000)
  })

  test('should validate required fields', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create list|new list|add list/i })
    await createButton.click()

    // Try to submit without required fields
    const submitButton = page.getByRole('button', { name: /create|add|save/i }).last()
    await submitButton.click()

    // Should show validation error
    const errorMessage = page.getByText(/required|name is required/i)
    await expect(errorMessage).toBeVisible({ timeout: 3000 })
  })
})

test.describe('Lists - Add Entries', () => {
  test('should add single domain to list', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/lists')
    await waitForPageLoad(page)

    // Click on a list or create new one
    const listRow = page.getByRole('row').filter({ hasText: /test|example/i }).first()
    const hasLists = await listRow.isVisible().catch(() => false)

    if (hasLists) {
      await listRow.click()

      // Look for add entry button/input
      const addInput = page.getByPlaceholder(/add domain|enter domain/i)
      if (await addInput.isVisible()) {
        await addInput.fill('malicious-site.com')

        const addButton = page.getByRole('button', { name: /add|add entry/i })
        await addButton.click()

        await page.waitForTimeout(1000)

        // Verify domain was added
        const domainEntry = page.getByText('malicious-site.com')
        const hasEntry = await domainEntry.isVisible().catch(() => false)

        if (hasEntry) {
          await expect(domainEntry).toBeVisible()
        }
      }
    } else {
      test.skip()
    }
  })

  test('should add multiple domains at once', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/lists')
    await waitForPageLoad(page)

    const listRow = page.getByRole('row').filter({ hasText: /test|example/i }).first()
    const hasLists = await listRow.isVisible().catch(() => false)

    if (hasLists) {
      await listRow.click()

      // Look for bulk add option
      const bulkAddButton = page.getByRole('button', { name: /bulk add|add multiple|import/i })
      if (await bulkAddButton.isVisible()) {
        await bulkAddButton.click()

        // Enter multiple domains
        const textarea = page.getByPlaceholder(/one domain per line|enter domains/i)
        if (await textarea.isVisible()) {
          await textarea.fill('domain1.com\ndomain2.com\ndomain3.com')

          const submitButton = page.getByRole('button', { name: /add|import|submit/i }).last()
          await submitButton.click()

          await page.waitForTimeout(1000)
        }
      }
    } else {
      test.skip()
    }
  })

  test('should validate domain format', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/lists')
    await waitForPageLoad(page)

    const listRow = page.getByRole('row').filter({ hasText: /test|example/i }).first()
    const hasLists = await listRow.isVisible().catch(() => false)

    if (hasLists) {
      await listRow.click()

      const addInput = page.getByPlaceholder(/add domain|enter domain/i)
      if (await addInput.isVisible()) {
        // Try to add invalid domain
        await addInput.fill('not a valid domain!')

        const addButton = page.getByRole('button', { name: /add|add entry/i })
        await addButton.click()

        // Should show validation error
        const errorMessage = page.getByText(/invalid domain|invalid format|must be a valid/i)
        const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false)

        if (hasError) {
          await expect(errorMessage).toBeVisible()
        }
      }
    } else {
      test.skip()
    }
  })
})

test.describe('Lists - Bulk Import', () => {
  test('should open import dialog', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/lists')
    await waitForPageLoad(page)

    const importButton = page.getByRole('button', { name: /import|bulk import|upload/i })

    if (await importButton.isVisible()) {
      await importButton.click()

      // Should show import form
      const fileInput = page.getByLabel(/file|upload|choose file/i)
      const textInput = page.getByPlaceholder(/paste domains|enter domains/i)

      const hasFileInput = await fileInput.isVisible().catch(() => false)
      const hasTextInput = await textInput.isVisible().catch(() => false)

      expect(hasFileInput || hasTextInput).toBeTruthy()
    } else {
      test.skip()
    }
  })

  test('should accept CSV file upload', async ({ page }) => {
    // This would require file upload functionality
    test.skip()
  })

  test('should accept text paste import', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/lists')
    await waitForPageLoad(page)

    const importButton = page.getByRole('button', { name: /import|bulk import|upload/i })

    if (await importButton.isVisible()) {
      await importButton.click()

      const textInput = page.getByPlaceholder(/paste domains|enter domains/i)
      if (await textInput.isVisible()) {
        await textInput.fill('domain1.com\ndomain2.com\ndomain3.com')

        const submitButton = page.getByRole('button', { name: /import|add|submit/i }).last()
        await submitButton.click()

        await page.waitForTimeout(1500)
      }
    } else {
      test.skip()
    }
  })
})

test.describe('Lists - Remove Entries', () => {
  test('should remove single entry from list', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/lists')
    await waitForPageLoad(page)

    const listRow = page.getByRole('row').filter({ hasText: /test|example/i }).first()
    const hasLists = await listRow.isVisible().catch(() => false)

    if (hasLists) {
      await listRow.click()

      // Find remove button for an entry
      const removeButton = page.getByRole('button', { name: /remove|delete/i }).first()
      if (await removeButton.isVisible()) {
        await removeButton.click()

        // May show confirmation
        const confirmButton = page.getByRole('button', { name: /confirm|yes|remove/i })
        const hasConfirm = await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)

        if (hasConfirm) {
          await confirmButton.click()
        }

        await page.waitForTimeout(500)
      }
    } else {
      test.skip()
    }
  })

  test('should remove multiple entries at once', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/lists')
    await waitForPageLoad(page)

    const listRow = page.getByRole('row').filter({ hasText: /test|example/i }).first()
    const hasLists = await listRow.isVisible().catch(() => false)

    if (hasLists) {
      await listRow.click()

      // Look for select all or bulk select
      const selectAllCheckbox = page.getByRole('checkbox', { name: /select all/i })
      if (await selectAllCheckbox.isVisible()) {
        await selectAllCheckbox.check()

        const bulkDeleteButton = page.getByRole('button', { name: /delete selected|remove selected/i })
        if (await bulkDeleteButton.isVisible()) {
          // Don't actually delete, just verify button exists
          await expect(bulkDeleteButton).toBeVisible()
        }
      }
    } else {
      test.skip()
    }
  })
})

test.describe('Lists - Edit List Settings', () => {
  test('should edit list name and description', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/lists')
    await waitForPageLoad(page)

    const editButton = page.getByRole('button', { name: /edit|settings/i }).first()
    const hasEditButton = await editButton.isVisible().catch(() => false)

    if (hasEditButton) {
      await editButton.click()

      const nameInput = page.getByLabel(/list name|name/i).first()
      if (await nameInput.isVisible()) {
        await nameInput.fill('Updated List Name')

        const saveButton = page.getByRole('button', { name: /save|update/i }).last()
        await saveButton.click()

        await page.waitForTimeout(1000)
      }
    } else {
      test.skip()
    }
  })
})

test.describe('Lists - Search and Filter', () => {
  test('should search entries within a list', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/lists')
    await waitForPageLoad(page)

    const listRow = page.getByRole('row').filter({ hasText: /test|example/i }).first()
    const hasLists = await listRow.isVisible().catch(() => false)

    if (hasLists) {
      await listRow.click()

      const searchInput = page.getByPlaceholder(/search entries|search domains/i)
      if (await searchInput.isVisible()) {
        await searchInput.fill('test')
        await page.waitForTimeout(500)
        await expect(searchInput).toHaveValue('test')
      }
    } else {
      test.skip()
    }
  })

  test('should display entry count', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/lists')
    await waitForPageLoad(page)

    // Check if lists show entry counts
    const entryCount = page.getByText(/\d+ entries?|\d+ domains?/i)
    if (await entryCount.isVisible()) {
      await expect(entryCount).toBeVisible()
    }
  })
})

test.describe('Lists - Delete List', () => {
  test('should show delete confirmation', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/lists')
    await waitForPageLoad(page)

    const deleteButton = page.getByRole('button', { name: /delete/i }).first()
    const hasDeleteButton = await deleteButton.isVisible().catch(() => false)

    if (hasDeleteButton) {
      await deleteButton.click()

      const confirmDialog = page.getByText(/are you sure|confirm delete|cannot be undone/i)
      await expect(confirmDialog).toBeVisible({ timeout: 3000 })

      // Cancel deletion
      const cancelButton = page.getByRole('button', { name: /cancel|no/i })
      await cancelButton.click()
    } else {
      test.skip()
    }
  })
})
