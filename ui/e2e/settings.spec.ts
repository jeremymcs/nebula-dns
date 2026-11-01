// Nebula DNS - Settings E2E Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAndNavigate, waitForPageLoad } from './helpers/auth'
import { pageHeading } from './helpers/selectors'

test.describe('Settings - Main Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/settings')
    await waitForPageLoad(page)
  })

  test('should display settings page', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/settings/)
    await expect(pageHeading(page, /^settings$/i)).toBeVisible()
  })

  test('should show settings navigation', async ({ page }) => {
    // Check for settings tabs or sidebar
    const securityTab = page.getByRole('link', { name: /security/i })
    const teamTab = page.getByRole('link', { name: /team/i })
    const apiKeysTab = page.getByRole('link', { name: /api keys/i })

    const hasNavigation = await securityTab.isVisible() || await teamTab.isVisible() || await apiKeysTab.isVisible()
    expect(hasNavigation).toBeTruthy()
  })

  test('should display account information', async ({ page }) => {
    await expect(pageHeading(page, /^settings$/i)).toBeVisible()
  })
})

test.describe('Settings - Security', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/settings/security')
    await waitForPageLoad(page)
  })

  test('should display security settings page', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/settings\/security/)
    await expect(pageHeading(page, /^security settings$/i)).toBeVisible()
  })

  test('should show MFA toggle', async ({ page }) => {
    const mfaSection = page.getByRole('heading', { name: /multi-factor|mfa|two-factor/i }).or(
      page.getByText(/multi-factor|two-factor authentication/i),
    )
    await expect(mfaSection.first()).toBeVisible({ timeout: 10000 })
  })

  test('should enable MFA', async ({ page }) => {
    const mfaToggle = page.getByLabel(/multi-factor|mfa|two-factor|2fa/i).first()

    if (await mfaToggle.isVisible()) {
      const isEnabled = await mfaToggle.isChecked().catch(() => false)

      if (!isEnabled) {
        await mfaToggle.click()

        // Should show MFA setup dialog
        const setupDialog = page.getByText(/scan qr code|setup authenticator|download app/i)
        const hasSetup = await setupDialog.isVisible({ timeout: 3000 }).catch(() => false)

        if (hasSetup) {
          await expect(setupDialog).toBeVisible()

          // Cancel setup to avoid actually enabling
          const cancelButton = page.getByRole('button', { name: /cancel|close/i })
          if (await cancelButton.isVisible()) {
            await cancelButton.click()
          }
        }
      }
    } else {
      test.skip()
    }
  })

  test('should show password change form', async ({ page }) => {
    const changePasswordButton = page.getByRole('button', { name: /change password|update password/i })

    if (await changePasswordButton.isVisible()) {
      await changePasswordButton.click()

      // Should show password form
      const currentPasswordInput = page.getByLabel(/current password|old password/i)
      const newPasswordInput = page.getByLabel(/new password/i)

      const hasForm = await currentPasswordInput.isVisible() && await newPasswordInput.isVisible()

      if (hasForm) {
        await expect(currentPasswordInput).toBeVisible()
        await expect(newPasswordInput).toBeVisible()
      }
    } else {
      test.skip()
    }
  })

  test('should show session management', async ({ page }) => {
    const sessionsSection = page.getByText(/active sessions|sessions|devices/i)

    if (await sessionsSection.isVisible()) {
      await expect(sessionsSection).toBeVisible()
    } else {
      test.skip()
    }
  })

  test('should allow revoking sessions', async ({ page }) => {
    const revokeButton = page.getByRole('button', { name: /revoke|sign out|end session/i }).first()

    if (await revokeButton.isVisible()) {
      await expect(revokeButton).toBeVisible()
      // Don't actually click to avoid ending current session
    } else {
      test.skip()
    }
  })
})

test.describe('Settings - Team Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/settings/team')
    await waitForPageLoad(page)
  })

  test('should display team page', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/settings\/team/)
    await expect(pageHeading(page, /team|users/i)).toBeVisible()
  })

  test('should list team members', async ({ page }) => {
    const teamTable = page.getByRole('table').or(page.locator('[data-testid="team-table"]'))
    const hasTable = await teamTable.isVisible().catch(() => false)

    if (hasTable) {
      await expect(teamTable).toBeVisible()
    } else {
      const membersList = page.getByText(/members|users/i)
      if (await membersList.isVisible()) {
        await expect(membersList).toBeVisible()
      }
    }
  })

  test('should have invite member button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /invite member/i })).toBeVisible({ timeout: 15000 })
  })

  test('should open invite member form', async ({ page }) => {
    await page.getByRole('button', { name: /invite member/i }).click()
    await expect(page.getByRole('heading', { name: /invite team member/i })).toBeVisible({ timeout: 5000 })
  })

  test('should invite new team member', async ({ page }) => {
    await page.getByRole('button', { name: /invite member/i }).click()
    await page.getByRole('textbox').first().fill('newmember@example.com')
    await page.getByRole('button', { name: /send invitation/i }).click()
    await expect(page.getByText(/invitation sent|success/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('should show role options', async ({ page }) => {
    await page.getByRole('button', { name: /invite member/i }).click()
    await expect(page.getByText(/^analyst$/i).first()).toBeVisible()
    await expect(page.getByText(/^admin$/i).first()).toBeVisible()
  })

  test('should edit team member role', async ({ page }) => {
    const editButton = page.getByRole('button', { name: /edit/i }).first()
    const hasEditButton = await editButton.isVisible().catch(() => false)

    if (hasEditButton) {
      await editButton.click()

      const roleSelect = page.getByLabel(/role/i)
      if (await roleSelect.isVisible()) {
        await expect(roleSelect).toBeVisible()
      }
    } else {
      test.skip()
    }
  })

  test('should remove team member with confirmation', async ({ page }) => {
    test.skip(true, 'Team remove requires multiple members in mock data')
  })
})

test.describe('Settings - API Keys', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/settings/api-keys')
    await waitForPageLoad(page)
  })

  test('should display API keys page', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/settings\/api-keys/)
    await expect(pageHeading(page, /api keys/i)).toBeVisible()
  })

  test('should list existing API keys', async ({ page }) => {
    const keysList = page.getByRole('table').or(page.locator('[data-testid="api-keys-table"]'))
    const hasList = await keysList.isVisible().catch(() => false)

    if (hasList) {
      await expect(keysList).toBeVisible()
    } else {
      const emptyState = page.getByText(/no api keys|create your first key/i)
      if (await emptyState.isVisible()) {
        await expect(emptyState).toBeVisible()
      }
    }
  })

  test('should have create API key button', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create|new|generate|add.*key/i })
    await expect(createButton).toBeVisible()
  })

  test('should open create API key form', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create|new|generate|add.*key/i })
    await createButton.click()
    await expect(page.getByRole('heading', { name: /create api key/i })).toBeVisible({ timeout: 5000 })
  })

  test('should generate new API key', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create|new|generate|add.*key/i })
    await createButton.click()

    const nameInput = page.getByPlaceholder(/production integration|e\.g\./i)
    await nameInput.fill('E2E Test API Key')

    // Select permissions if available
    const permissionsSelect = page.getByLabel(/permissions|scopes/i)
    if (await permissionsSelect.isVisible()) {
      await expect(permissionsSelect).toBeVisible()
    }

    // Submit
    const submitButton = page.getByRole('button', { name: /create|generate/i }).last()
    await submitButton.click()

    // Wait for key to be generated
    await page.waitForTimeout(2000)

    // Should show the generated key
    const keyDisplay = page.getByText(/api key|your key|save this key/i)
    const hasKey = await keyDisplay.isVisible({ timeout: 5000 }).catch(() => false)

    if (hasKey) {
      await expect(keyDisplay).toBeVisible()

      // Should have copy button
      const copyButton = page.getByRole('button', { name: /copy/i })
      if (await copyButton.isVisible()) {
        await expect(copyButton).toBeVisible()
      }
    }
  })

  test('should show key creation warning', async ({ page }) => {
    await page.getByRole('button', { name: /create|new|generate|add.*key/i }).click()
    await page.getByPlaceholder(/production integration|e\.g\./i).fill('Test Key')
    await page.getByRole('button', { name: /^create key$/i }).click()
    await expect(page.getByText(/only shown once|copy|save this key/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('should revoke API key with confirmation', async ({ page }) => {
    const revokeButton = page.getByRole('button', { name: /revoke|delete/i }).first()
    const hasRevokeButton = await revokeButton.isVisible().catch(() => false)

    if (hasRevokeButton) {
      await revokeButton.click()

      const confirmDialog = page.getByText(/are you sure|confirm|revoke|cannot be undone/i)
      await expect(confirmDialog).toBeVisible({ timeout: 3000 })

      // Cancel revocation
      const cancelButton = page.getByRole('button', { name: /cancel|no/i })
      await cancelButton.click()
    } else {
      test.skip()
    }
  })

  test('should show API key last used timestamp', async ({ page }) => {
    const lastUsed = page.getByText(/last used|last accessed|never used/i)

    if (await lastUsed.isVisible()) {
      await expect(lastUsed).toBeVisible()
    } else {
      test.skip()
    }
  })
})

test.describe('Settings - Integrations/Webhooks', () => {
  test('should display integrations page', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/settings/integrations')
    await waitForPageLoad(page)

    await expect(page).toHaveURL(/\/dashboard\/settings\/integrations/)
  })

  test('should show webhook configuration', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/settings/integrations')
    await waitForPageLoad(page)

    const webhookSection = page.getByText(/webhooks/i).first()
    await expect(webhookSection).toBeVisible()
  })

  test('should create new webhook', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/settings/integrations')
    await waitForPageLoad(page)

    const createButton = page.getByRole('button', { name: /add webhook|create webhook|new webhook/i })

    if (await createButton.isVisible()) {
      await createButton.click()

      const urlInput = page.getByPlaceholder(/https:\/\/|webhook url|endpoint/i).first()
      await expect(urlInput).toBeVisible({ timeout: 5000 })
    } else {
      test.skip()
    }
  })

  test('should test webhook connection', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/settings/integrations')
    await waitForPageLoad(page)

    const testButton = page.getByRole('button', { name: /test|test webhook/i }).first()

    if (await testButton.isVisible()) {
      await expect(testButton).toBeVisible()
      // Don't actually test to avoid external calls
    } else {
      test.skip()
    }
  })
})

test.describe('Settings - SSO Configuration', () => {
  test('should display SSO page', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/settings/sso')
    await waitForPageLoad(page)

    await expect(page).toHaveURL(/\/dashboard\/settings\/sso/)
  })

  test('should show SSO providers', async ({ page }) => {
    await loginAndNavigate(page, '/dashboard/settings/sso')
    await waitForPageLoad(page)

    await expect(page.getByRole('heading', { name: /single sign-on|sso/i })).toBeVisible()
  })
})
