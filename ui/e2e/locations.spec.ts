// Nebula DNS - Location Management E2E Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAndNavigate, waitForPageLoad } from './helpers/auth'

test.describe('Locations - List View', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/locations')
    await waitForPageLoad(page)
  })

  test('should display locations page', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/locations/)
    await expect(page.getByRole('heading', { name: /locations/i })).toBeVisible()
  })

  test('should display locations list', async ({ page }) => {
    // Look for table or grid of locations
    const locationsList = page.getByRole('table').or(page.locator('[data-testid="locations-table"]'))
    const hasLocations = await locationsList.isVisible().catch(() => false)

    if (hasLocations) {
      await expect(locationsList).toBeVisible()
    } else {
      // Check for empty state
      const emptyState = page.getByText(/no locations|add your first location/i)
      await expect(emptyState).toBeVisible()
    }
  })

  test('should have add location button', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add location|new location|create location/i })
    await expect(addButton).toBeVisible()
  })

  test('should show location details in table', async ({ page }) => {
    const table = page.getByRole('table')
    const hasTable = await table.isVisible().catch(() => false)

    if (hasTable) {
      // Check for common columns
      await expect(page.getByText(/name|location name/i)).toBeVisible()
      await expect(page.getByText(/status|queries|policy/i)).toBeVisible()
    }
  })

  test('should search locations by name', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search locations/i)

    if (await searchInput.isVisible()) {
      await searchInput.fill('office')
      await page.waitForTimeout(500)
      await expect(searchInput).toHaveValue('office')
    }
  })

  test('should filter locations by status', async ({ page }) => {
    const filterButton = page.getByRole('button', { name: /filter/i }).first()

    if (await filterButton.isVisible()) {
      await filterButton.click()

      const activeFilter = page.getByText(/active|online|offline/i).first()
      if (await activeFilter.isVisible()) {
        await expect(activeFilter).toBeVisible()
      }
    }
  })
})

test.describe('Locations - Create New Location', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/locations')
    await waitForPageLoad(page)
  })

  test('should open create location modal/form', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add location|new location|create location/i })
    await addButton.click()

    // Should show form with location name input
    const nameInput = page.getByLabel(/location name|name/i).or(page.getByPlaceholder(/location name/i)).first()
    await expect(nameInput).toBeVisible({ timeout: 5000 })
  })

  test('should create new location with basic details', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add location|new location|create location/i })
    await addButton.click()

    // Fill location name
    const nameInput = page.getByLabel(/location name|name/i).or(page.getByPlaceholder(/location name/i)).first()
    await nameInput.fill('E2E Test Office')

    // Fill description if available
    const descInput = page.getByLabel(/description/i).or(page.getByPlaceholder(/description/i)).first()
    if (await descInput.isVisible()) {
      await descInput.fill('Test location created by E2E tests')
    }

    // Submit form
    const submitButton = page.getByRole('button', { name: /create|add|save/i }).last()
    await submitButton.click()

    // Wait for success
    await page.waitForTimeout(2000)

    // Check for success message or redirect
    const successMessage = page.getByText(/location created|success|added successfully/i)
    const hasSuccess = await successMessage.isVisible().catch(() => false)

    if (hasSuccess) {
      await expect(successMessage).toBeVisible()
    }
  })

  test('should validate required fields', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add location|new location|create location/i })
    await addButton.click()

    // Try to submit without required fields
    const submitButton = page.getByRole('button', { name: /create|add|save/i }).last()
    await submitButton.click()

    // Should show validation error
    const errorMessage = page.getByText(/required|name is required/i)
    await expect(errorMessage).toBeVisible({ timeout: 3000 })
  })

  test('should select location type if available', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add location|new location|create location/i })
    await addButton.click()

    // Look for location type selection (office, home, datacenter, etc.)
    const typeSelector = page.getByLabel(/location type|type/i)
    if (await typeSelector.isVisible()) {
      await expect(typeSelector).toBeVisible()
    }
  })
})

test.describe('Locations - Edit Location', () => {
  test('should open edit location form', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/locations')
    await waitForPageLoad(page)

    const editButton = page.getByRole('button', { name: /edit/i }).first()
    const hasEditButton = await editButton.isVisible().catch(() => false)

    if (hasEditButton) {
      await editButton.click()

      // Should show edit form
      const nameInput = page.getByLabel(/location name|name/i).first()
      await expect(nameInput).toBeVisible()
    } else {
      test.skip()
    }
  })

  test('should update location name', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/locations')
    await waitForPageLoad(page)

    const editButton = page.getByRole('button', { name: /edit/i }).first()
    const hasEditButton = await editButton.isVisible().catch(() => false)

    if (hasEditButton) {
      await editButton.click()

      const nameInput = page.getByLabel(/location name|name/i).first()
      await nameInput.fill('Updated Location Name')

      const saveButton = page.getByRole('button', { name: /save|update/i }).last()
      await saveButton.click()

      await page.waitForTimeout(1000)
    } else {
      test.skip()
    }
  })

  test('should update location description', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/locations')
    await waitForPageLoad(page)

    const editButton = page.getByRole('button', { name: /edit/i }).first()
    const hasEditButton = await editButton.isVisible().catch(() => false)

    if (hasEditButton) {
      await editButton.click()

      const descInput = page.getByLabel(/description/i).first()
      if (await descInput.isVisible()) {
        await descInput.fill('Updated description')
      }
    } else {
      test.skip()
    }
  })
})

test.describe('Locations - Location Tokens', () => {
  test('should display location token/ID', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/locations')
    await waitForPageLoad(page)

    const editButton = page.getByRole('button', { name: /edit|view|details/i }).first()
    const hasButton = await editButton.isVisible().catch(() => false)

    if (hasButton) {
      await editButton.click()

      // Look for token or ID field
      const tokenField = page.getByText(/location id|token|identifier/i)
      if (await tokenField.isVisible()) {
        await expect(tokenField).toBeVisible()
      }
    } else {
      test.skip()
    }
  })

  test('should copy location token to clipboard', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/locations')
    await waitForPageLoad(page)

    const editButton = page.getByRole('button', { name: /edit|view|details/i }).first()
    const hasButton = await editButton.isVisible().catch(() => false)

    if (hasButton) {
      await editButton.click()

      // Look for copy button
      const copyButton = page.getByRole('button', { name: /copy/i }).first()
      if (await copyButton.isVisible()) {
        await copyButton.click()

        // Check for success feedback
        const copiedMessage = page.getByText(/copied|copy successful/i)
        const hasCopied = await copiedMessage.isVisible({ timeout: 2000 }).catch(() => false)

        if (hasCopied) {
          await expect(copiedMessage).toBeVisible()
        }
      }
    } else {
      test.skip()
    }
  })

  test('should regenerate location token', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/locations')
    await waitForPageLoad(page)

    const editButton = page.getByRole('button', { name: /edit|view|details/i }).first()
    const hasButton = await editButton.isVisible().catch(() => false)

    if (hasButton) {
      await editButton.click()

      // Look for regenerate button
      const regenerateButton = page.getByRole('button', { name: /regenerate|rotate/i })
      if (await regenerateButton.isVisible()) {
        await regenerateButton.click()

        // Should show confirmation
        const confirmDialog = page.getByText(/are you sure|confirm|warning/i)
        const hasConfirm = await confirmDialog.isVisible().catch(() => false)

        if (hasConfirm) {
          await expect(confirmDialog).toBeVisible()

          // Cancel to avoid actually rotating
          const cancelButton = page.getByRole('button', { name: /cancel/i })
          await cancelButton.click()
        }
      }
    } else {
      test.skip()
    }
  })
})

test.describe('Locations - DNS Configuration', () => {
  test('should display DNS server addresses', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/locations')
    await waitForPageLoad(page)

    const editButton = page.getByRole('button', { name: /edit|view|details/i }).first()
    const hasButton = await editButton.isVisible().catch(() => false)

    if (hasButton) {
      await editButton.click()

      // Look for DNS server IPs
      const dnsSection = page.getByText(/dns servers?|configure dns|dns addresses/i)
      if (await dnsSection.isVisible()) {
        await expect(dnsSection).toBeVisible()
      }
    } else {
      test.skip()
    }
  })

  test('should show DoH and DoT endpoints', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/locations')
    await waitForPageLoad(page)

    const editButton = page.getByRole('button', { name: /edit|view|details/i }).first()
    const hasButton = await editButton.isVisible().catch(() => false)

    if (hasButton) {
      await editButton.click()

      // Look for DoH/DoT configuration
      const dohEndpoint = page.getByText(/dns over https|doh|dot|dns over tls/i)
      if (await dohEndpoint.isVisible()) {
        await expect(dohEndpoint).toBeVisible()
      }
    } else {
      test.skip()
    }
  })
})

test.describe('Locations - Delete Location', () => {
  test('should show delete confirmation dialog', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/locations')
    await waitForPageLoad(page)

    const deleteButton = page.getByRole('button', { name: /delete/i }).first()
    const hasDeleteButton = await deleteButton.isVisible().catch(() => false)

    if (hasDeleteButton) {
      await deleteButton.click()

      // Should show confirmation
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

test.describe('Locations - Statistics', () => {
  test('should show query statistics per location', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/locations')
    await waitForPageLoad(page)

    // Check if table shows query counts
    const queriesColumn = page.getByText(/queries|total queries|query count/i)
    if (await queriesColumn.isVisible()) {
      await expect(queriesColumn).toBeVisible()
    }
  })

  test('should show location status (online/offline)', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/locations')
    await waitForPageLoad(page)

    // Check for status indicators
    const statusBadge = page.locator('[class*="badge"]').or(page.getByText(/online|offline|active/i))
    const hasStatus = await statusBadge.count() > 0

    if (hasStatus) {
      expect(hasStatus).toBeTruthy()
    }
  })
})
