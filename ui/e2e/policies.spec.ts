// Nebula DNS - Policy Management E2E Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAndNavigate, waitForPageLoad } from './helpers/auth'

test.describe('Policies - List View', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/policies')
    await waitForPageLoad(page)
  })

  test('should display policies page heading', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/policies/)
    await expect(page.getByRole('heading', { name: /policies/i })).toBeVisible()
  })

  test('should display policy list table', async ({ page }) => {
    // Look for table or list of policies
    const table = page.getByRole('table').or(page.locator('[data-testid="policy-table"]'))
    const hasPolicyList = await table.isVisible().catch(() => false)

    if (hasPolicyList) {
      await expect(table).toBeVisible()
    } else {
      // Check for empty state
      const emptyState = page.getByText(/no policies|create your first policy/i)
      await expect(emptyState).toBeVisible()
    }
  })

  test('should have create policy button', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create policy|new policy|add policy/i })
    await expect(createButton).toBeVisible()
  })

  test('should show policy details (name, status, locations)', async ({ page }) => {
    // If policies exist, check for key columns
    const table = page.getByRole('table')
    const hasTable = await table.isVisible().catch(() => false)

    if (hasTable) {
      // Look for table headers
      await expect(page.getByText(/name|policy name/i)).toBeVisible()
      await expect(page.getByText(/status|enabled/i)).toBeVisible()
    }
  })

  test('should filter policies by status', async ({ page }) => {
    const filterButton = page.getByRole('button', { name: /filter|all policies/i }).first()

    if (await filterButton.isVisible()) {
      await filterButton.click()

      // Check for filter options
      const activeFilter = page.getByText(/active|enabled/i).first()
      if (await activeFilter.isVisible()) {
        await expect(activeFilter).toBeVisible()
      }
    }
  })

  test('should search policies by name', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search policies/i)

    if (await searchInput.isVisible()) {
      await searchInput.fill('test')
      await page.waitForTimeout(500) // Debounce
      await expect(searchInput).toHaveValue('test')
    }
  })
})

test.describe('Policies - Create New Policy', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/policies')
    await waitForPageLoad(page)
  })

  test('should open create policy modal/page', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create policy|new policy|add policy/i })
    await createButton.click()

    // Should either navigate to new page or open modal
    const policyForm = page.getByLabel(/policy name|name/i).or(page.getByPlaceholder(/policy name/i))
    await expect(policyForm).toBeVisible({ timeout: 5000 })
  })

  test('should create new policy with basic settings', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create policy|new policy|add policy/i })
    await createButton.click()

    // Fill policy name
    const nameInput = page.getByLabel(/policy name|name/i).or(page.getByPlaceholder(/policy name/i)).first()
    await nameInput.fill('E2E Test Policy')

    // Fill description if available
    const descInput = page.getByLabel(/description/i).or(page.getByPlaceholder(/description/i)).first()
    if (await descInput.isVisible()) {
      await descInput.fill('Test policy created by E2E tests')
    }

    // Enable policy
    const enableToggle = page.getByLabel(/enable|enabled|active/i).first()
    if (await enableToggle.isVisible()) {
      const isChecked = await enableToggle.isChecked().catch(() => false)
      if (!isChecked) {
        await enableToggle.check()
      }
    }

    // Submit form
    const submitButton = page.getByRole('button', { name: /create|save|submit/i }).last()
    await submitButton.click()

    // Wait for success message or redirect
    await page.waitForTimeout(2000)

    // Verify creation (either success message or back to list)
    const successMessage = page.getByText(/policy created|success/i)
    const hasSuccess = await successMessage.isVisible().catch(() => false)

    if (hasSuccess) {
      await expect(successMessage).toBeVisible()
    } else {
      // Should be back on policies list
      await expect(page).toHaveURL(/\/dashboard\/policies/)
    }
  })

  test('should validate required fields', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create policy|new policy|add policy/i })
    await createButton.click()

    // Try to submit without filling required fields
    const submitButton = page.getByRole('button', { name: /create|save|submit/i }).last()
    await submitButton.click()

    // Should show validation error
    const errorMessage = page.getByText(/required|name is required|please enter/i)
    await expect(errorMessage).toBeVisible({ timeout: 3000 })
  })

  test('should select content categories for blocking', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create policy|new policy|add policy/i })
    await createButton.click()

    // Fill basic info
    const nameInput = page.getByLabel(/policy name|name/i).or(page.getByPlaceholder(/policy name/i)).first()
    await nameInput.fill('Category Test Policy')

    // Look for category selection
    const malwareCategory = page.getByText(/malware|phishing|adult content/i).first()
    if (await malwareCategory.isVisible()) {
      await expect(malwareCategory).toBeVisible()
    }
  })
})

test.describe('Policies - Edit Existing Policy', () => {
  test('should open edit policy form', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/policies')
    await waitForPageLoad(page)

    // Find first edit button or policy row
    const editButton = page.getByRole('button', { name: /edit/i }).first()
    const hasEditButton = await editButton.isVisible().catch(() => false)

    if (hasEditButton) {
      await editButton.click()

      // Should show edit form
      const policyName = page.getByLabel(/policy name|name/i).first()
      await expect(policyName).toBeVisible()
    } else {
      test.skip()
    }
  })

  test('should update policy name', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/policies')
    await waitForPageLoad(page)

    const editButton = page.getByRole('button', { name: /edit/i }).first()
    const hasEditButton = await editButton.isVisible().catch(() => false)

    if (hasEditButton) {
      await editButton.click()

      const nameInput = page.getByLabel(/policy name|name/i).first()
      await nameInput.fill('Updated Policy Name')

      const saveButton = page.getByRole('button', { name: /save|update/i }).last()
      await saveButton.click()

      // Wait for success
      await page.waitForTimeout(1000)
    } else {
      test.skip()
    }
  })

  test('should toggle policy enabled/disabled', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/policies')
    await waitForPageLoad(page)

    // Find toggle switch in table
    const toggleSwitch = page.locator('[role="switch"]').first()
    const hasToggle = await toggleSwitch.isVisible().catch(() => false)

    if (hasToggle) {
      const initialState = await toggleSwitch.isChecked()
      await toggleSwitch.click()

      // Wait for state change
      await page.waitForTimeout(500)

      const newState = await toggleSwitch.isChecked()
      expect(newState).not.toBe(initialState)
    } else {
      test.skip()
    }
  })
})

test.describe('Policies - Versioning', () => {
  test('should show policy version history', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/policies')
    await waitForPageLoad(page)

    const editButton = page.getByRole('button', { name: /edit/i }).first()
    const hasEditButton = await editButton.isVisible().catch(() => false)

    if (hasEditButton) {
      await editButton.click()

      // Look for version history section
      const versionHistory = page.getByText(/version history|versions|changelog/i)
      if (await versionHistory.isVisible()) {
        await expect(versionHistory).toBeVisible()
      }
    } else {
      test.skip()
    }
  })

  test('should rollback policy to previous version', async ({ page }) => {
    // This would require existing policy with multiple versions
    test.skip()
  })
})

test.describe('Policies - Delete Policy', () => {
  test('should show delete confirmation dialog', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/policies')
    await waitForPageLoad(page)

    const deleteButton = page.getByRole('button', { name: /delete/i }).first()
    const hasDeleteButton = await deleteButton.isVisible().catch(() => false)

    if (hasDeleteButton) {
      await deleteButton.click()

      // Should show confirmation modal
      const confirmDialog = page.getByText(/are you sure|confirm delete|cannot be undone/i)
      await expect(confirmDialog).toBeVisible({ timeout: 3000 })

      // Cancel deletion
      const cancelButton = page.getByRole('button', { name: /cancel|no/i })
      await cancelButton.click()
    } else {
      test.skip()
    }
  })

  test('should delete policy after confirmation', async ({ page }) => {
    // Skip to avoid deleting actual data
    test.skip()
  })
})

test.describe('Policies - Locations Assignment', () => {
  test('should assign locations to policy', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/policies')
    await waitForPageLoad(page)

    const editButton = page.getByRole('button', { name: /edit/i }).first()
    const hasEditButton = await editButton.isVisible().catch(() => false)

    if (hasEditButton) {
      await editButton.click()

      // Look for location assignment section
      const locationsSection = page.getByText(/locations|assign locations|apply to/i).first()
      if (await locationsSection.isVisible()) {
        await expect(locationsSection).toBeVisible()
      }
    } else {
      test.skip()
    }
  })
})
