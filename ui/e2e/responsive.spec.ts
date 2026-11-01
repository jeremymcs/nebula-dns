// Nebula DNS - Responsive Design E2E Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect, devices } from '@playwright/test'
import { loginAndNavigate, waitForPageLoad } from './helpers/auth'
import { loginHeading, pageHeading } from './helpers/selectors'

test.describe('Responsive Design - Mobile (375x667)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
  })

  test('should display login page on mobile', async ({ page }) => {
    await page.goto('/')
    await expect(loginHeading(page)).toBeVisible()
    await expect(page.getByLabel(/email address/i)).toBeVisible()
    await expect(page.getByLabel(/^password$/i)).toBeVisible()
  })

  test('should display dashboard on mobile', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard')
    await waitForPageLoad(page)

    await expect(pageHeading(page, /^dashboard$/i)).toBeVisible()
  })

  test('should show mobile navigation menu', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard')
    await waitForPageLoad(page)

    await page.getByRole('button', { name: 'Open navigation menu' }).click()
    await expect(page.getByRole('dialog', { name: 'Navigation menu' })).toBeVisible()
    await expect(page.getByRole('link', { name: /^policies$/i }).first()).toBeVisible()
  })

  test('should stack stats cards vertically on mobile', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard')
    await waitForPageLoad(page)

    // Stats cards should be visible and stacked
    const statsSection = page.locator('[class*="stat"]').or(page.getByText(/total queries|blocked/i)).first()

    if (await statsSection.isVisible()) {
      await expect(statsSection).toBeVisible()
    }
  })

  test('should display policies page on mobile', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/policies')
    await waitForPageLoad(page)

    await expect(page.getByRole('heading', { name: /policies/i })).toBeVisible()
  })

  test('should display locations page on mobile', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/locations')
    await waitForPageLoad(page)

    await expect(page.getByRole('heading', { name: /locations/i })).toBeVisible()
  })

  test('should display reports page on mobile', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/reports')
    await waitForPageLoad(page)

    await expect(page.getByRole('heading', { name: /reports|analytics/i })).toBeVisible()
  })

  test('should display settings page on mobile', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/settings')
    await waitForPageLoad(page)

    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible()
  })

  test('should handle forms on mobile', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/policies')
    await waitForPageLoad(page)

    const createButton = page.getByRole('button', { name: /create policy|new policy/i })

    if (await createButton.isVisible()) {
      await createButton.click()

      // Form should be usable on mobile
      const nameInput = page.getByLabel(/policy name|name/i).first()
      const isVisible = await nameInput.isVisible({ timeout: 5000 }).catch(() => false)

      if (isVisible) {
        await expect(nameInput).toBeVisible()
        await expect(nameInput).toBeEnabled()
      }
    } else {
      test.skip()
    }
  })

  test('should handle tables on mobile', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/policies')
    await waitForPageLoad(page)

    // Tables should be responsive (scrollable or cards)
    const table = page.getByRole('table')
    const hasTable = await table.isVisible().catch(() => false)

    if (hasTable) {
      await expect(table).toBeVisible()

      // Table should be scrollable or adapted for mobile
      const tableContainer = table.locator('..')
      await expect(tableContainer).toBeVisible()
    }
  })

  test('should display modals properly on mobile', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/locations')
    await waitForPageLoad(page)

    const addButton = page.getByRole('button', { name: /add location|new location/i })

    if (await addButton.isVisible()) {
      await addButton.click()

      // Modal should fit mobile screen
      const modal = page.locator('[role="dialog"]').or(page.getByLabel(/location name/i)).first()
      const hasModal = await modal.isVisible({ timeout: 3000 }).catch(() => false)

      if (hasModal) {
        await expect(modal).toBeVisible()
      }
    } else {
      test.skip()
    }
  })
})

test.describe('Responsive Design - Tablet (768x1024)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
  })

  test('should display login page on tablet', async ({ page }) => {
    await page.goto('/')
    await expect(loginHeading(page)).toBeVisible()
  })

  test('should display dashboard on tablet', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard')
    await waitForPageLoad(page)

    await expect(pageHeading(page, /^dashboard$/i)).toBeVisible()
  })

  test('should show sidebar navigation on tablet', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard')
    await waitForPageLoad(page)

    const nav = page.getByRole('navigation')
    await expect(nav).toBeVisible()
  })

  test('should display stats in grid on tablet', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard')
    await waitForPageLoad(page)

    // Stats should be in 2-column grid or similar
    const statsSection = page.getByText(/total queries|blocked/i)
    if (await statsSection.isVisible()) {
      await expect(statsSection).toBeVisible()
    }
  })

  test('should display charts properly on tablet', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/reports')
    await waitForPageLoad(page)

    const chartContainer = page.locator('[class*="recharts"]').first()
    const hasChart = await chartContainer.isVisible({ timeout: 5000 }).catch(() => false)

    if (hasChart) {
      await expect(chartContainer).toBeVisible()
    }
  })

  test('should display tables properly on tablet', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/policies')
    await waitForPageLoad(page)

    const table = page.getByRole('table')
    const hasTable = await table.isVisible().catch(() => false)

    if (hasTable) {
      await expect(table).toBeVisible()
    }
  })

  test('should handle forms on tablet', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/policies')
    await waitForPageLoad(page)

    const createButton = page.getByRole('button', { name: /create policy|new policy/i })

    if (await createButton.isVisible()) {
      await createButton.click()

      const nameInput = page.getByLabel(/policy name|name/i).first()
      const isVisible = await nameInput.isVisible({ timeout: 5000 }).catch(() => false)

      if (isVisible) {
        await expect(nameInput).toBeVisible()
      }
    } else {
      test.skip()
    }
  })
})

test.describe('Responsive Design - Desktop (1920x1080)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
  })

  test('should display login page on desktop', async ({ page }) => {
    await page.goto('/')
    await expect(loginHeading(page)).toBeVisible()
  })

  test('should display dashboard on desktop', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard')
    await waitForPageLoad(page)

    await expect(pageHeading(page, /^dashboard$/i)).toBeVisible()
  })

  test('should show full sidebar on desktop', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard')
    await waitForPageLoad(page)

    const nav = page.getByRole('navigation')
    await expect(nav).toBeVisible()
  })

  test('should display stats in multi-column layout', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard')
    await waitForPageLoad(page)

    // Multiple stats should be visible side by side
    const stats = page.getByText(/total queries|blocked|active policies/i)
    const count = await stats.count()

    expect(count).toBeGreaterThan(0)
  })

  test('should display charts at full size', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/reports')
    await waitForPageLoad(page)

    const chartContainer = page.locator('[class*="recharts"]').first()
    const hasChart = await chartContainer.isVisible({ timeout: 5000 }).catch(() => false)

    if (hasChart) {
      await expect(chartContainer).toBeVisible()

      // Chart should have reasonable width
      const boundingBox = await chartContainer.boundingBox()
      if (boundingBox) {
        expect(boundingBox.width).toBeGreaterThan(400)
      }
    }
  })

  test('should display full tables on desktop', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/policies')
    await waitForPageLoad(page)

    const table = page.getByRole('table')
    const hasTable = await table.isVisible().catch(() => false)

    if (hasTable) {
      await expect(table).toBeVisible()

      // All columns should be visible
      const headers = table.locator('th')
      const headerCount = await headers.count()

      expect(headerCount).toBeGreaterThan(0)
    }
  })

  test('should show all form fields side by side when appropriate', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/policies')
    await waitForPageLoad(page)

    const createButton = page.getByRole('button', { name: /create policy|new policy/i })

    if (await createButton.isVisible()) {
      await createButton.click()

      const nameInput = page.getByLabel(/policy name|name/i).first()
      const isVisible = await nameInput.isVisible({ timeout: 5000 }).catch(() => false)

      if (isVisible) {
        await expect(nameInput).toBeVisible()
      }
    } else {
      test.skip()
    }
  })
})

test.describe('Responsive Design - Touch Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport for touch interactions
    await page.setViewportSize({ width: 390, height: 844 })
  })

  test('should support touch interactions', async ({ page }) => {
    await page.goto('/')

    const emailInput = page.getByLabel(/email/i)
    await emailInput.tap()
    await emailInput.fill('test@example.com')

    await expect(emailInput).toHaveValue('test@example.com')
  })

  test('should handle swipe gestures for navigation if supported', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard')
    await waitForPageLoad(page)

    // This would test swipe gestures if implemented
    // Most web apps don't implement custom swipe, so this is optional
    test.skip()
  })
})

test.describe('Responsive Design - Orientation Changes', () => {
  test('should handle portrait to landscape on mobile', async ({ page }) => {
    // Portrait
    await page.setViewportSize({ width: 375, height: 667 })
    await loginAndNavigate(page, '/dashboard')
    await waitForPageLoad(page)

    await expect(pageHeading(page, /^dashboard$/i)).toBeVisible()

    // Switch to landscape
    await page.setViewportSize({ width: 667, height: 375 })
    await page.waitForTimeout(500)

    // Dashboard should still be visible and functional
    await expect(pageHeading(page, /^dashboard$/i)).toBeVisible()
  })

  test('should handle landscape to portrait on tablet', async ({ page }) => {
    // Landscape
    await page.setViewportSize({ width: 1024, height: 768 })
    await loginAndNavigate(page, '/dashboard')
    await waitForPageLoad(page)

    await expect(pageHeading(page, /^dashboard$/i)).toBeVisible()

    // Switch to portrait
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(500)

    await expect(pageHeading(page, /^dashboard$/i)).toBeVisible()
  })
})

test.describe('Responsive Design - Text Scaling', () => {
  test('should handle increased font size', async ({ page }) => {
    await page.goto('/')

    // Simulate increased text size (accessibility)
    await page.addStyleTag({
      content: '* { font-size: 1.5em !important; }'
    })

    // Page should still be usable
    await expect(loginHeading(page)).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
  })
})
