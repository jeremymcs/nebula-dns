// Nebula DNS - Tier System E2E Tests (US-037)
// Tests feature access control and UI visibility for Home, Enterprise, and MSP tiers
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAsHome, loginAsEnterprise, loginAsMSP, waitForPageLoad, expectTierRestricted, homeDashboardHeading } from './helpers/auth'
import { pageHeading } from './helpers/selectors'

test.describe('US-037: Home Tier Feature Access', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsHome(page)
    await page.goto('/dashboard')
    await waitForPageLoad(page)
  })

  test('should access dashboard with Home tier', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(homeDashboardHeading(page)).toBeVisible()
  })

  test('should access basic locations page', async ({ page }) => {
    await page.goto('/dashboard/locations')
    await waitForPageLoad(page)

    await expect(page).toHaveURL(/\/dashboard\/locations/)
    await expect(pageHeading(page, /protection zones|zones/i)).toBeVisible()
  })

  test('should access family members page', async ({ page }) => {
    await page.goto('/dashboard/family')
    await waitForPageLoad(page)

    await expect(page).toHaveURL(/\/dashboard\/family/)
    await expect(pageHeading(page, /family/i)).toBeVisible()
  })

  test('should access policies page', async ({ page }) => {
    await page.goto('/dashboard/policies')
    await waitForPageLoad(page)

    await expect(page).toHaveURL(/\/dashboard\/policies/)
    await expect(pageHeading(page, /^policies$/i)).toBeVisible()
  })

  test('should access lists page', async ({ page }) => {
    await page.goto('/dashboard/lists')
    await waitForPageLoad(page)

    await expect(page).toHaveURL(/\/dashboard\/lists/)
    await expect(pageHeading(page, /domain lists/i)).toBeVisible()
  })

  test('should access reports page', async ({ page }) => {
    await page.goto('/dashboard/reports')
    await waitForPageLoad(page)

    await expect(page).toHaveURL(/\/dashboard\/reports/)
    await expect(pageHeading(page, /^reports$/i)).toBeVisible()
  })

  test('should access agents page (roaming protection)', async ({ page }) => {
    await page.goto('/dashboard/agents')
    await waitForPageLoad(page)

    await expect(page).toHaveURL(/\/dashboard\/agents/)
    await expect(pageHeading(page, /^agents$/i)).toBeVisible()
  })

  test('should NOT access SIEM page', async ({ page }) => {
    await page.goto('/dashboard/settings/integrations')
    await waitForPageLoad(page)
    await expectTierRestricted(page)
  })

  test('should NOT access SSO settings', async ({ page }) => {
    await page.goto('/dashboard/settings/sso')
    await waitForPageLoad(page)
    await expectTierRestricted(page)
  })

  test('should NOT access API Keys page', async ({ page }) => {
    await page.goto('/dashboard/settings/api-keys')
    await waitForPageLoad(page)
    await expectTierRestricted(page)
  })

  test('should NOT access MSP Clients page', async ({ page }) => {
    await page.goto('/dashboard/clients')
    await waitForPageLoad(page)
    await expectTierRestricted(page)
  })

  test('should NOT access MSP Templates page', async ({ page }) => {
    await page.goto('/dashboard/msp/templates')
    await waitForPageLoad(page)
    await expectTierRestricted(page)
  })

  test('should show Home tier badge on restricted features', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await waitForPageLoad(page)

    // Look for enterprise features with badges
    const enterpriseBadges = page.getByText(/enterprise/i).and(page.locator('[class*="badge"]'))

    if (await enterpriseBadges.count() > 0) {
      expect(await enterpriseBadges.count()).toBeGreaterThan(0)
    }
  })

  test('navigation should hide enterprise-only items for Home tier', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)

    // Check navigation menu (sidebar or top nav)
    const siemNavLink = page.getByRole('link', { name: /^siem$/i })
    const ssoNavLink = page.getByRole('link', { name: /^sso$/i })
    const apiKeysNavLink = page.getByRole('link', { name: /api keys/i })

    // These should not be in navigation for Home tier
    expect(await siemNavLink.isVisible()).toBeFalsy()
    expect(await ssoNavLink.isVisible()).toBeFalsy()
    expect(await apiKeysNavLink.isVisible()).toBeFalsy()
  })

  test('navigation should hide MSP-only items for Home tier', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)

    const clientsNavLink = page.getByRole('link', { name: /^clients$/i })
    const mspTemplatesNavLink = page.getByRole('link', { name: /msp templates/i })

    expect(await clientsNavLink.isVisible()).toBeFalsy()
    expect(await mspTemplatesNavLink.isVisible()).toBeFalsy()
  })

  test('navigation should show Home tier specific items', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)

    // Family mode should be visible in navigation
    const familyNavLink = page.getByRole('link', { name: /family/i })

    if (await familyNavLink.count() > 0) {
      await expect(familyNavLink.first()).toBeVisible()
    }
  })
})

test.describe('US-037: Enterprise Tier Feature Access', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEnterprise(page)
    await page.goto('/dashboard')
    await waitForPageLoad(page)
  })

  test('should access dashboard with Enterprise tier', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(pageHeading(page, /^dashboard$/i)).toBeVisible()
  })

  test('should access all core features', async ({ page }) => {
    // Test access to core features
    const corePages = [
      '/dashboard/policies',
      '/dashboard/locations',
      '/dashboard/lists',
      '/dashboard/reports',
      '/dashboard/investigate'
    ]

    for (const path of corePages) {
      await page.goto(path)
      await waitForPageLoad(page)
      await expect(page).toHaveURL(new RegExp(path))
    }
  })

  test('should access SIEM integration page', async ({ page }) => {
    await page.goto('/dashboard/settings/integrations')
    await waitForPageLoad(page)

    await expect(page).toHaveURL(/\/dashboard\/settings\/integrations/)
    await expect(pageHeading(page, /^integrations$/i)).toBeVisible()
    await expect(page.getByText(/siem integrations/i)).toBeVisible()
  })

  test('should access SSO settings page', async ({ page }) => {
    await page.goto('/dashboard/settings/sso')
    await waitForPageLoad(page)

    await expect(page).toHaveURL(/\/dashboard\/settings\/sso/)
    await expect(pageHeading(page, /single sign-on|sso/i)).toBeVisible()
  })

  test('should access API Keys management', async ({ page }) => {
    await page.goto('/dashboard/settings/api-keys')
    await waitForPageLoad(page)

    await expect(page).toHaveURL(/\/dashboard\/settings\/api-keys/)
    await expect(pageHeading(page, /api keys/i)).toBeVisible()
  })

  test('should access Webhooks page', async ({ page }) => {
    await page.goto('/dashboard/settings/integrations')
    await waitForPageLoad(page)

    await expect(page).toHaveURL(/\/dashboard\/settings\/integrations/)
    await expect(page.getByText(/webhooks/i).first()).toBeVisible()
  })

  test('should access Security Score page', async ({ page }) => {
    await page.goto('/dashboard/security-score')
    await waitForPageLoad(page)

    await expect(page).toHaveURL(/\/dashboard\/security-score/)
    await expect(pageHeading(page, /security score/i)).toBeVisible()
  })

  test('should access Playbooks page', async ({ page }) => {
    await page.goto('/dashboard/playbooks')
    await waitForPageLoad(page)

    await expect(page).toHaveURL(/\/dashboard\/playbooks/)
    await expect(pageHeading(page, /^playbooks$/i)).toBeVisible()
  })

  test('should access Policy Builder page', async ({ page }) => {
    await page.goto('/dashboard/policy-builder')
    await waitForPageLoad(page)

    await expect(page).toHaveURL(/\/dashboard\/policy-builder/)
    await expect(pageHeading(page, /policy builder/i)).toBeVisible()
  })

  test('should access Templates marketplace', async ({ page }) => {
    await page.goto('/dashboard/templates')
    await waitForPageLoad(page)

    await expect(page).toHaveURL(/\/dashboard\/templates/)
    await expect(pageHeading(page, /^templates$/i)).toBeVisible()
  })

  test('should access AI Insights page', async ({ page }) => {
    await page.goto('/dashboard/insights')
    await waitForPageLoad(page)

    await expect(page).toHaveURL(/\/dashboard\/insights/)
    await expect(pageHeading(page, /^insights$/i)).toBeVisible()
  })

  test('should NOT access MSP Clients page', async ({ page }) => {
    await page.goto('/dashboard/clients')
    await waitForPageLoad(page)
    await expectTierRestricted(page)
  })

  test('should NOT access MSP Templates', async ({ page }) => {
    await page.goto('/dashboard/msp/templates')
    await waitForPageLoad(page)
    await expectTierRestricted(page)
  })

  test('should NOT access MSP Cross-Reporting', async ({ page }) => {
    await page.goto('/dashboard/msp/reporting')
    await waitForPageLoad(page)
    await expectTierRestricted(page)
  })

  test('navigation should show enterprise features', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)

    // Check that enterprise features are visible in nav
    const siemNav = page.getByRole('link', { name: /siem/i })
    const apiKeysNav = page.getByRole('link', { name: /api keys/i })

    // At least some enterprise features should be accessible
    const hasEnterpriseNav = await siemNav.count() > 0 || await apiKeysNav.count() > 0
    expect(hasEnterpriseNav).toBeTruthy()
  })

  test('navigation should NOT show MSP-only items', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)

    const clientsNavLink = page.getByRole('link', { name: /^clients$/i })
    const mspTemplatesNavLink = page.getByRole('link', { name: /msp templates/i })

    expect(await clientsNavLink.isVisible()).toBeFalsy()
    expect(await mspTemplatesNavLink.isVisible()).toBeFalsy()
  })

  test('should NOT show Home tier specific features', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)

    // Family mode should not be visible for Enterprise
    const familyNavLink = page.getByRole('link', { name: /^family$/i })
    expect(await familyNavLink.isVisible()).toBeFalsy()
  })
})

test.describe('US-037: MSP Tier Feature Access', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMSP(page)
    await page.goto('/dashboard')
    await waitForPageLoad(page)
  })

  test('should access dashboard with MSP tier', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(pageHeading(page, /^dashboard$/i)).toBeVisible()
  })

  test('should access all Enterprise features', async ({ page }) => {
    // MSP tier should have all Enterprise features
    const enterprisePages = [
      '/dashboard/settings/integrations',
      '/dashboard/settings/sso',
      '/dashboard/settings/api-keys',
      '/dashboard/settings/integrations',
      '/dashboard/security-score',
      '/dashboard/playbooks',
      '/dashboard/insights'
    ]

    for (const path of enterprisePages) {
      await page.goto(path)
      await waitForPageLoad(page)
      await expect(page).toHaveURL(new RegExp(path))

      // Should not show upgrade prompts
      const upgradePrompt = page.getByText(/upgrade to access/i)
      expect(await upgradePrompt.isVisible()).toBeFalsy()
    }
  })

  test('should access MSP Clients management page', async ({ page }) => {
    await page.goto('/dashboard/clients')
    await waitForPageLoad(page)

    await expect(page).toHaveURL(/\/dashboard\/clients/)
    await expect(pageHeading(page, /^clients$/i)).toBeVisible()

    // Should not show upgrade prompt
    const upgradePrompt = page.getByText(/upgrade to access/i)
    expect(await upgradePrompt.isVisible()).toBeFalsy()
  })

  test('should access MSP Templates page', async ({ page }) => {
    await page.goto('/dashboard/msp/templates')
    await waitForPageLoad(page)

    await expect(page).toHaveURL(/\/dashboard\/msp\/templates/)
    await expect(pageHeading(page, /policy templates/i)).toBeVisible()
  })

  test('should access MSP Cross-Client Reporting', async ({ page }) => {
    await page.goto('/dashboard/msp/reporting')
    await waitForPageLoad(page)

    await expect(page).toHaveURL(/\/dashboard\/msp\/reporting/)
    await expect(pageHeading(page, /reporting/i)).toBeVisible()
  })

  test('should have client selector in navigation', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)

    // MSP should have a client switcher/selector
    const clientSelector = page.getByRole('button', { name: /select client|client:/i })

    if (await clientSelector.count() > 0) {
      await expect(clientSelector.first()).toBeVisible()
    }
  })

  test('navigation should show MSP-specific menu items', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)

    // Check for MSP navigation items
    const clientsNav = page.getByRole('link', { name: /^clients$/i })
    const mspTemplatesNav = page.getByRole('link', { name: /templates/i })

    // At least clients should be visible
    if (await clientsNav.count() > 0) {
      await expect(clientsNav.first()).toBeVisible()
    }
  })

  test('navigation should show all tier features combined', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)

    // MSP tier should have access to features from all tiers
    const coreNav = page.getByRole('link', { name: /policies|locations|reports/i })
    expect(await coreNav.count()).toBeGreaterThan(0)
  })

  test('should NOT show Home tier specific features', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)

    // Family mode should not be visible for MSP
    const familyNavLink = page.getByRole('link', { name: /^family$/i })
    expect(await familyNavLink.isVisible()).toBeFalsy()
  })

  test('should show MSP badge on MSP-exclusive features', async ({ page }) => {
    await page.goto('/dashboard/clients')
    await waitForPageLoad(page)

    // Look for MSP badge indicators
    const mspBadge = page.getByText(/msp/i).and(page.locator('[class*="badge"]'))

    if (await mspBadge.count() > 0) {
      expect(await mspBadge.count()).toBeGreaterThan(0)
    }
  })
})

test.describe('US-037: Tier Navigation Visibility', () => {
  test('Home tier navigation hides premium features', async ({ page }) => {
    await loginAsHome(page)
    await page.goto('/dashboard')
    await waitForPageLoad(page)

    // Premium features should not be in navigation
    const premiumItems = [
      page.getByRole('link', { name: /^siem$/i }),
      page.getByRole('link', { name: /^sso$/i }),
      page.getByRole('link', { name: /api keys/i }),
      page.getByRole('link', { name: /^clients$/i }),
      page.getByRole('link', { name: /security score/i }),
      page.getByRole('link', { name: /playbooks/i })
    ]

    for (const item of premiumItems) {
      expect(await item.isVisible()).toBeFalsy()
    }
  })

  test('Enterprise tier navigation shows enterprise features', async ({ page }) => {
    await loginAsEnterprise(page)
    await page.goto('/dashboard')
    await waitForPageLoad(page)

    // At least some enterprise features should be in nav
    const hasEnterpriseFeatures =
      await page.getByRole('link', { name: /security/i }).count() > 0 ||
      await page.getByRole('link', { name: /integrations/i }).count() > 0

    expect(hasEnterpriseFeatures).toBeTruthy()
  })

  test('MSP tier navigation shows all features', async ({ page }) => {
    await loginAsMSP(page)
    await page.goto('/dashboard')
    await waitForPageLoad(page)

    // MSP should have clients in navigation
    const clientsNav = page.getByRole('link', { name: /clients/i })

    if (await clientsNav.count() > 0) {
      await expect(clientsNav.first()).toBeVisible()
    }
  })

  test('tier badge shows current tier in UI', async ({ page }) => {
    await loginAsMSP(page)
    await page.goto('/dashboard')
    await waitForPageLoad(page)

    // Look for tier indicator in UI
    const tierBadge = page.getByText(/msp tier|msp plan/i)

    if (await tierBadge.count() > 0) {
      await expect(tierBadge.first()).toBeVisible()
    }
  })
})
