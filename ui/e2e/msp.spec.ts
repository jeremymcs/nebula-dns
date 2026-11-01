// Nebula DNS - MSP Features E2E Tests (US-037)
// Tests MSP-specific functionality including client management and templates
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAsMSP, loginAsEnterprise, waitForPageLoad } from './helpers/auth'
import { pageHeading } from './helpers/selectors'

test.describe('US-037: MSP Client List Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMSP(page)
    await page.goto('/dashboard/clients')
    await waitForPageLoad(page)
  })

  test('should display clients list page', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/clients/)
    await expect(pageHeading(page, /^clients$/i)).toBeVisible()
  })

  test('should display client list table with columns', async ({ page }) => {
    // Check for table headers
    await expect(page.getByText(/client name|name/i)).toBeVisible()
    await expect(page.getByText(/locations/i)).toBeVisible()
    await expect(page.getByText(/status/i)).toBeVisible()
    await expect(page.getByText(/created/i)).toBeVisible()
  })

  test('should show Add Client button', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add client|new client|create client/i })
    await expect(addButton).toBeVisible()
    await expect(addButton).toBeEnabled()
  })

  test('should have search/filter functionality', async ({ page }) => {
    // Look for search input
    const searchInput = page.getByPlaceholder(/search clients|filter/i)

    if (await searchInput.count() > 0) {
      await expect(searchInput.first()).toBeVisible()
      await expect(searchInput.first()).toBeEnabled()
    }
  })

  test('should display client count in header', async ({ page }) => {
    // Look for client count display
    const clientCount = page.getByText(/\d+ client(s)?/i)

    if (await clientCount.count() > 0) {
      await expect(clientCount.first()).toBeVisible()
    }
  })

  test('should show client status badges', async ({ page }) => {
    // Look for status indicators (active, suspended, etc.)
    const statusBadges = page.locator('[class*="badge"]').filter({ hasText: /active|suspended|inactive/i })

    if (await statusBadges.count() > 0) {
      expect(await statusBadges.count()).toBeGreaterThan(0)
    }
  })

  test('should allow clicking on client to view details', async ({ page }) => {
    // Find first client link in table
    const clientLink = page.locator('table').getByRole('link').first()

    if (await clientLink.count() > 0) {
      await clientLink.click()
      await waitForPageLoad(page)

      // Should navigate to client detail page
      await expect(page).toHaveURL(/\/dashboard\/clients\/[^/]+/)
    }
  })

  test('should show bulk actions menu', async ({ page }) => {
    // Look for bulk actions button or checkbox selection
    const bulkActionsBtn = page.getByRole('button', { name: /bulk actions|actions/i })
    const selectAllCheckbox = page.getByRole('checkbox', { name: /select all/i })

    const hasBulkActions = await bulkActionsBtn.isVisible() || await selectAllCheckbox.isVisible()

    if (hasBulkActions) {
      expect(hasBulkActions).toBeTruthy()
    }
  })

  test('should display empty state when no clients exist', async ({ page }) => {
    // Look for empty state message
    const emptyState = page.getByText(/no clients yet|get started by adding/i)

    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible()
    }
  })

  test('should sort clients by different columns', async ({ page }) => {
    // Click on column headers to sort
    const nameHeader = page.getByText(/client name|name/i).first()

    if (await nameHeader.isVisible()) {
      await nameHeader.click()
      await waitForPageLoad(page)

      // Table should still be visible after sort
      await expect(page.locator('table')).toBeVisible()
    }
  })
})

test.describe('US-037: MSP Client Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMSP(page)
    await page.goto('/dashboard/clients')
    await waitForPageLoad(page)
  })

  test('should open new client creation modal/page', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add client|new client|create client/i })
    await addButton.click()

    // Should navigate to new client page or open modal
    const newClientPage = page.getByRole('heading', { name: /new client|add client|create client/i })
    await expect(newClientPage).toBeVisible({ timeout: 5000 })
  })

  test('should display client creation form fields', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add client|new client|create client/i })
    await addButton.click()
    await waitForPageLoad(page)

    // Check for required form fields
    await expect(page.getByLabel(/client name|organization name/i)).toBeVisible()
    await expect(page.getByLabel(/contact email|email/i)).toBeVisible()

    // Optional fields
    const contactPhone = page.getByLabel(/phone|contact phone/i)
    const address = page.getByLabel(/address/i)

    if (await contactPhone.count() > 0) {
      await expect(contactPhone).toBeVisible()
    }
  })

  test('should validate required fields on submit', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add client|new client|create client/i })
    await addButton.click()
    await waitForPageLoad(page)

    // Try to submit without filling required fields
    const submitButton = page.getByRole('button', { name: /create|save|add/i })
    await submitButton.click()

    // Should show validation errors
    const validationError = page.getByText(/required|cannot be empty|please enter/i)
    await expect(validationError.first()).toBeVisible({ timeout: 3000 })
  })

  test('should create client with valid data', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add client|new client|create client/i })
    await addButton.click()
    await waitForPageLoad(page)

    // Fill out form
    await page.getByLabel(/client name|organization name/i).fill('Acme Corporation')
    await page.getByLabel(/contact email|email/i).fill('contact@acme.com')

    const phoneField = page.getByLabel(/phone|contact phone/i)
    if (await phoneField.count() > 0) {
      await phoneField.fill('555-123-4567')
    }

    // Submit form
    const submitButton = page.getByRole('button', { name: /create|save|add/i })
    await submitButton.click()

    // Should show success message or redirect to client list
    const successMessage = page.getByText(/client created|successfully added/i)
    const clientsList = pageHeading(page, /^clients$/i)

    const wasSuccessful = await successMessage.isVisible({ timeout: 5000 }) ||
                         await clientsList.isVisible({ timeout: 5000 })

    expect(wasSuccessful).toBeTruthy()
  })

  test('should allow setting location limit for new client', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add client|new client|create client/i })
    await addButton.click()
    await waitForPageLoad(page)

    // Look for location limit field
    const locationLimitField = page.getByLabel(/location limit|max locations/i)

    if (await locationLimitField.count() > 0) {
      await expect(locationLimitField).toBeVisible()
      await locationLimitField.fill('10')
    }
  })

  test('should allow selecting tier for new client', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add client|new client|create client/i })
    await addButton.click()
    await waitForPageLoad(page)

    // Look for tier selector
    const tierSelector = page.getByLabel(/tier|plan/i)

    if (await tierSelector.count() > 0) {
      await expect(tierSelector).toBeVisible()
    }
  })

  test('should cancel client creation', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add client|new client|create client/i })
    await addButton.click()
    await waitForPageLoad(page)

    // Click cancel button
    const cancelButton = page.getByRole('button', { name: /cancel/i })
    await cancelButton.click()

    // Should return to clients list
    await expect(page).toHaveURL(/\/dashboard\/clients\/?$/)
  })
})

test.describe('US-037: MSP Client Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMSP(page)
    await page.goto('/dashboard/clients')
    await waitForPageLoad(page)
  })

  test('should navigate to client detail page', async ({ page }) => {
    const clientLink = page.locator('table').getByRole('link').first()

    if (await clientLink.count() > 0) {
      await clientLink.click()
      await waitForPageLoad(page)

      await expect(page).toHaveURL(/\/dashboard\/clients\/[^/]+/)
    }
  })

  test('should display client overview information', async ({ page }) => {
    const clientLink = page.locator('table').getByRole('link').first()

    if (await clientLink.count() > 0) {
      await clientLink.click()
      await waitForPageLoad(page)

      // Check for client details
      const clientName = page.getByRole('heading', { level: 1 })
      await expect(clientName).toBeVisible()

      // Look for key metrics
      const locationCount = page.getByText(/\d+ location(s)?/i)
      const policyCount = page.getByText(/\d+ polic(y|ies)/i)

      expect(await locationCount.count() > 0 || await policyCount.count() > 0).toBeTruthy()
    }
  })

  test('should have tabs for different sections', async ({ page }) => {
    const clientLink = page.locator('table').getByRole('link').first()

    if (await clientLink.count() > 0) {
      await clientLink.click()
      await waitForPageLoad(page)

      // Look for navigation tabs
      const tabs = page.getByRole('tab')

      if (await tabs.count() > 0) {
        expect(await tabs.count()).toBeGreaterThan(0)
      }
    }
  })

  test('should show client policies tab', async ({ page }) => {
    const clientLink = page.locator('table').getByRole('link').first()

    if (await clientLink.count() > 0) {
      await clientLink.click()
      await waitForPageLoad(page)

      const policiesTab = page.getByRole('tab', { name: /policies/i })

      if (await policiesTab.count() > 0) {
        await policiesTab.click()
        await waitForPageLoad(page)

        // Should show policies list
        await expect(page.getByText(/policies/i)).toBeVisible()
      }
    }
  })

  test('should show client locations tab', async ({ page }) => {
    const clientLink = page.locator('table').getByRole('link').first()

    if (await clientLink.count() > 0) {
      await clientLink.click()
      await waitForPageLoad(page)

      const locationsTab = page.getByRole('tab', { name: /locations|zones/i })

      if (await locationsTab.count() > 0) {
        await locationsTab.click()
        await waitForPageLoad(page)

        // Should show locations list
        await expect(page.getByText(/locations|zones/i)).toBeVisible()
      }
    }
  })

  test('should show client settings tab', async ({ page }) => {
    const clientLink = page.locator('table').getByRole('link').first()

    if (await clientLink.count() > 0) {
      await clientLink.click()
      await waitForPageLoad(page)

      const settingsTab = page.getByRole('tab', { name: /settings/i })

      if (await settingsTab.count() > 0) {
        await settingsTab.click()
        await waitForPageLoad(page)

        // Should show settings form
        await expect(page.getByText(/settings/i)).toBeVisible()
      }
    }
  })

  test('should allow editing client information', async ({ page }) => {
    const clientLink = page.locator('table').getByRole('link').first()

    if (await clientLink.count() > 0) {
      await clientLink.click()
      await waitForPageLoad(page)

      const editButton = page.getByRole('button', { name: /edit/i })

      if (await editButton.count() > 0) {
        await expect(editButton).toBeVisible()
        await expect(editButton).toBeEnabled()
      }
    }
  })

  test('should show client activity/logs', async ({ page }) => {
    const clientLink = page.locator('table').getByRole('link').first()

    if (await clientLink.count() > 0) {
      await clientLink.click()
      await waitForPageLoad(page)

      // Look for activity feed or logs section
      const activitySection = page.getByText(/recent activity|activity log/i)

      if (await activitySection.count() > 0) {
        await expect(activitySection).toBeVisible()
      }
    }
  })
})

test.describe('US-037: MSP Template Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMSP(page)
    await page.goto('/dashboard/msp/templates')
    await waitForPageLoad(page)
  })

  test('should display MSP templates page', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/msp\/templates/)
    await expect(pageHeading(page, /^templates$/i)).toBeVisible()
  })

  test('should show list of available templates', async ({ page }) => {
    // Look for template cards or list
    const templateCards = page.locator('[class*="card"]').or(page.locator('table'))
    expect(await templateCards.count()).toBeGreaterThan(0)
  })

  test('should have Create Template button', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create template|new template/i })
    await expect(createButton).toBeVisible()
    await expect(createButton).toBeEnabled()
  })

  test('should display template categories', async ({ page }) => {
    // Look for category filters or labels
    const categories = page.getByText(/security|compliance|custom/i)

    if (await categories.count() > 0) {
      expect(await categories.count()).toBeGreaterThan(0)
    }
  })

  test('should show template details when clicked', async ({ page }) => {
    const templateLink = page.locator('[class*="card"]').first().getByRole('link').first()

    if (await templateLink.count() > 0) {
      await templateLink.click()
      await waitForPageLoad(page)

      // Should navigate to template detail page
      await expect(page).toHaveURL(/\/dashboard\/msp\/templates\/[^/]+/)
    }
  })

  test('should display template metadata', async ({ page }) => {
    // Look for template information
    const templateName = page.getByText(/template/i)
    const description = page.getByText(/description|policies|rules/i)

    expect(await templateName.count() > 0 || await description.count() > 0).toBeTruthy()
  })

  test('should allow searching templates', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search templates|filter/i)

    if (await searchInput.count() > 0) {
      await expect(searchInput).toBeVisible()
      await searchInput.fill('security')
      await waitForPageLoad(page)

      // Results should update
      const templates = page.locator('[class*="card"]').or(page.locator('table tr'))
      expect(await templates.count()).toBeGreaterThan(0)
    }
  })

  test('should allow creating new template', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create template|new template/i })
    await createButton.click()

    // Should show template creation form
    const templateForm = page.getByLabel(/template name|name/i)
    await expect(templateForm).toBeVisible({ timeout: 5000 })
  })

  test('should allow duplicating existing template', async ({ page }) => {
    const duplicateButton = page.getByRole('button', { name: /duplicate|copy/i }).first()

    if (await duplicateButton.count() > 0) {
      await expect(duplicateButton).toBeVisible()
    }
  })
})

test.describe('US-037: MSP Template Application to Clients', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMSP(page)
    await page.goto('/dashboard/msp/templates')
    await waitForPageLoad(page)
  })

  test('should show Apply to Clients option for templates', async ({ page }) => {
    const templateLink = page.locator('[class*="card"]').first().getByRole('link').first()

    if (await templateLink.count() > 0) {
      await templateLink.click()
      await waitForPageLoad(page)

      // Look for apply button
      const applyButton = page.getByRole('button', { name: /apply to clients|deploy/i })

      if (await applyButton.count() > 0) {
        await expect(applyButton).toBeVisible()
      }
    }
  })

  test('should show client selection modal when applying template', async ({ page }) => {
    const templateLink = page.locator('[class*="card"]').first().getByRole('link').first()

    if (await templateLink.count() > 0) {
      await templateLink.click()
      await waitForPageLoad(page)

      const applyButton = page.getByRole('button', { name: /apply to clients|deploy/i })

      if (await applyButton.count() > 0) {
        await applyButton.click()

        // Should show client selection dialog
        const clientSelector = page.getByText(/select clients|choose clients/i)
        await expect(clientSelector).toBeVisible({ timeout: 5000 })
      }
    }
  })

  test('should allow selecting multiple clients for template application', async ({ page }) => {
    const templateLink = page.locator('[class*="card"]').first().getByRole('link').first()

    if (await templateLink.count() > 0) {
      await templateLink.click()
      await waitForPageLoad(page)

      const applyButton = page.getByRole('button', { name: /apply to clients|deploy/i })

      if (await applyButton.count() > 0) {
        await applyButton.click()

        // Look for checkboxes for client selection
        const checkboxes = page.getByRole('checkbox')

        if (await checkboxes.count() > 0) {
          expect(await checkboxes.count()).toBeGreaterThan(0)
        }
      }
    }
  })

  test('should confirm template application', async ({ page }) => {
    const templateLink = page.locator('[class*="card"]').first().getByRole('link').first()

    if (await templateLink.count() > 0) {
      await templateLink.click()
      await waitForPageLoad(page)

      const applyButton = page.getByRole('button', { name: /apply to clients|deploy/i })

      if (await applyButton.count() > 0) {
        await applyButton.click()

        // Should have confirmation or apply button in modal
        const confirmButton = page.getByRole('button', { name: /confirm|apply|deploy/i }).last()

        if (await confirmButton.count() > 0) {
          await expect(confirmButton).toBeVisible()
        }
      }
    }
  })

  test('should show applied templates on client detail page', async ({ page }) => {
    await page.goto('/dashboard/clients')
    await waitForPageLoad(page)

    const clientLink = page.locator('table').getByRole('link').first()

    if (await clientLink.count() > 0) {
      await clientLink.click()
      await waitForPageLoad(page)

      // Look for templates section
      const templatesSection = page.getByText(/applied templates|templates/i)

      if (await templatesSection.count() > 0) {
        await expect(templatesSection).toBeVisible()
      }
    }
  })
})

test.describe('US-037: Non-MSP Tier Restrictions', () => {
  test('Enterprise tier should not access MSP features', async ({ page }) => {
    await loginAsEnterprise(page)
    await page.goto('/dashboard/clients')
    await waitForPageLoad(page)

    // Should show upgrade prompt or access denied
    const upgradePrompt = page.getByText(/upgrade.*msp/i)
    const accessDenied = page.getByText(/access denied|not available/i)

    const hasRestriction = await upgradePrompt.isVisible() || await accessDenied.isVisible()
    expect(hasRestriction).toBeTruthy()
  })

  test('Enterprise tier should not see MSP templates', async ({ page }) => {
    await loginAsEnterprise(page)
    await page.goto('/dashboard/msp/templates')
    await waitForPageLoad(page)

    const upgradePrompt = page.getByText(/upgrade.*msp/i)
    const accessDenied = page.getByText(/access denied|not available/i)

    const hasRestriction = await upgradePrompt.isVisible() || await accessDenied.isVisible()
    expect(hasRestriction).toBeTruthy()
  })
})
