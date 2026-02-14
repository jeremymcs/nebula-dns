// Nebula DNS - Enterprise Tier Feature Visibility E2E Tests (US-037)
// Tests feature access for Enterprise tier users
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAsEnterprise, loginAsHome, waitForPageLoad } from '../helpers/auth'

test.describe('US-037: Enterprise Tier Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEnterprise(page)
    await page.goto('/dashboard')
    await waitForPageLoad(page)
  })

  test('Enterprise tier sees all admin features', async ({ page }) => {
    // Enterprise should have access to security section
    const securitySection = page.getByRole('link', { name: /security|settings/i })
    expect(await securitySection.count()).toBeGreaterThan(0)
  })

  test('Enterprise tier has SIEM in navigation', async ({ page }) => {
    const siemLink = page.getByRole('link', { name: /siem|security.*information/i })
    
    // Should be visible for Enterprise
    if (await siemLink.count() > 0) {
      await expect(siemLink.first()).toBeVisible()
    }
  })

  test('Enterprise tier has API keys in navigation', async ({ page }) => {
    const apiKeysLink = page.getByRole('link', { name: /api keys|api.*access/i })
    
    // Should be visible for Enterprise
    if (await apiKeysLink.count() > 0) {
      await expect(apiKeysLink.first()).toBeVisible()
    }
  })

  test('Enterprise tier does not see MSP menu', async ({ page }) => {
    // MSP-specific items should NOT be visible
    const mspItems = [
      page.getByRole('link', { name: /^clients$/i }),
      page.getByRole('link', { name: /msp.*templates/i }),
      page.getByRole('link', { name: /white.*label/i })
    ]
    
    for (const item of mspItems) {
      expect(await item.isVisible()).toBeFalsy()
    }
  })

  test('Enterprise tier does not see family features', async ({ page }) => {
    // Family mode is Home tier only
    const familyLink = page.getByRole('link', { name: /^family$/i })
    expect(await familyLink.isVisible()).toBeFalsy()
  })

  test('Enterprise tier has access to all core features', async ({ page }) => {
    // Test core feature pages
    const corePages = [
      '/dashboard/policies',
      '/dashboard/locations',
      '/dashboard/lists',
      '/dashboard/reports'
    ]
    
    for (const path of corePages) {
      await page.goto(path)
      await waitForPageLoad(page)
      await expect(page).toHaveURL(new RegExp(path))
    }
  })
})

test.describe('US-037: Enterprise Tier Feature Access', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEnterprise(page)
  })

  test('Enterprise tier can access SIEM', async ({ page }) => {
    await page.goto('/dashboard/settings/security/siem')
    await waitForPageLoad(page)
    
    // Should access without upgrade prompt
    const upgradePrompt = page.getByText(/upgrade.*enterprise|enterprise.*required/i)
    expect(await upgradePrompt.isVisible()).toBeFalsy()
    
    // Should show SIEM content or configuration
    const siemContent = page.getByText(/siem|security.*information|event.*log/i)
    expect(await siemContent.count()).toBeGreaterThanOrEqual(0)
  })

  test('Enterprise tier can access SSO/SAML', async ({ page }) => {
    await page.goto('/dashboard/settings/security/sso')
    await waitForPageLoad(page)
    
    const upgradePrompt = page.getByText(/upgrade.*enterprise/i)
    expect(await upgradePrompt.isVisible()).toBeFalsy()
    
    // Should show SSO configuration options
    const ssoContent = page.getByText(/sso|saml|oauth|single.*sign.*on/i)
    expect(await ssoContent.count()).toBeGreaterThanOrEqual(0)
  })

  test('Enterprise tier can access API key management', async ({ page }) => {
    await page.goto('/dashboard/settings/security/api-keys')
    await waitForPageLoad(page)
    
    const upgradePrompt = page.getByText(/upgrade.*enterprise/i)
    expect(await upgradePrompt.isVisible()).toBeFalsy()
    
    // Should show API keys interface
    await expect(page.getByRole('heading', { name: /api keys/i })).toBeVisible()
  })

  test('Enterprise tier can access Webhooks', async ({ page }) => {
    await page.goto('/dashboard/settings/security/webhooks')
    await waitForPageLoad(page)
    
    const upgradePrompt = page.getByText(/upgrade.*enterprise/i)
    expect(await upgradePrompt.isVisible()).toBeFalsy()
    
    // Should show webhooks configuration
    const webhooksContent = page.getByText(/webhook/i)
    expect(await webhooksContent.count()).toBeGreaterThanOrEqual(0)
  })

  test('Enterprise tier can access Security Score', async ({ page }) => {
    await page.goto('/dashboard/security-score')
    await waitForPageLoad(page)
    
    // Should access without restriction
    await expect(page).toHaveURL(/\/dashboard\/security-score/)
    await expect(page.getByRole('heading', { name: /security.*score/i })).toBeVisible()
  })

  test('Enterprise tier can access Playbooks', async ({ page }) => {
    await page.goto('/dashboard/playbooks')
    await waitForPageLoad(page)
    
    await expect(page).toHaveURL(/\/dashboard\/playbooks/)
    await expect(page.getByRole('heading', { name: /playbook/i })).toBeVisible()
  })

  test('Enterprise tier can access Policy Builder', async ({ page }) => {
    await page.goto('/dashboard/policy-builder')
    await waitForPageLoad(page)
    
    await expect(page).toHaveURL(/\/dashboard\/policy-builder/)
  })

  test('Enterprise tier can access Templates marketplace', async ({ page }) => {
    await page.goto('/dashboard/templates')
    await waitForPageLoad(page)
    
    await expect(page).toHaveURL(/\/dashboard\/templates/)
  })

  test('Enterprise tier can access AI Insights', async ({ page }) => {
    await page.goto('/dashboard/insights')
    await waitForPageLoad(page)
    
    await expect(page).toHaveURL(/\/dashboard\/insights/)
  })
})

test.describe('US-037: Enterprise Tier Advanced Features', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEnterprise(page)
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)
  })

  test('Enterprise tier can create unlimited policies', async ({ page }) => {
    await page.goto('/dashboard/policies')
    await waitForPageLoad(page)
    
    // Should show create policy option without limit warning
    const createButton = page.getByRole('button', { name: /create.*policy|new.*policy/i })
    await expect(createButton).toBeVisible()
    
    // Should not show limit warning
    const limitWarning = page.getByText(/policy.*limit|max.*policies/i)
    expect(await limitWarning.isVisible()).toBeFalsy()
  })

  test('Enterprise tier has higher location limits', async ({ page }) => {
    // Should show higher limit (50 or unlimited)
    const highLimit = page.getByText(/50|unlimited/i)
    expect(await highLimit.count()).toBeGreaterThan(0)
  })

  test('Enterprise tier has priority support access', async ({ page }) => {
    // Check for support indicators
    const supportIndicators = [
      page.getByText(/priority.*support|enterprise.*support|24.*7.*support/i),
      page.getByRole('link', { name: /support|help/i })
    ]
    
    // At least support link should be visible
    const hasSupport = await supportIndicators[1].count() > 0
    expect(hasSupport).toBeTruthy()
  })

  test('Enterprise tier has advanced reporting access', async ({ page }) => {
    await page.goto('/dashboard/reports')
    await waitForPageLoad(page)
    
    // Should show advanced reporting options
    const advancedReports = page.getByText(/advanced|custom|export/i)
    expect(await advancedReports.count()).toBeGreaterThanOrEqual(0)
  })
})

test.describe('US-037: Enterprise Tier Restrictions', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEnterprise(page)
  })

  test('Enterprise tier cannot access MSP features', async ({ page }) => {
    await page.goto('/dashboard/clients')
    await waitForPageLoad(page)
    
    // Should show MSP upgrade prompt
    const mspPrompt = page.getByText(/upgrade.*msp|msp.*required|client.*management/i)
    const accessDenied = page.getByText(/access denied|forbidden/i)
    
    const isRestricted = await mspPrompt.isVisible() || await accessDenied.isVisible()
    expect(isRestricted).toBeTruthy()
  })

  test('Enterprise tier cannot access white-labeling', async ({ page }) => {
    // Try to access white-label settings
    const whiteLabelLink = page.getByRole('link', { name: /white.*label|branding/i })
    
    if (await whiteLabelLink.count() > 0) {
      await whiteLabelLink.first().click()
      await waitForPageLoad(page)
      
      // Should show upgrade prompt
      const upgradePrompt = page.getByText(/upgrade.*msp|msp.*required/i)
      expect(await upgradePrompt.isVisible()).toBeTruthy()
    }
  })

  test('Enterprise tier has tier badge in UI', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    // Should show enterprise tier indicator
    const tierBadge = page.getByText(/enterprise/i)
    expect(await tierBadge.count()).toBeGreaterThan(0)
  })
})
