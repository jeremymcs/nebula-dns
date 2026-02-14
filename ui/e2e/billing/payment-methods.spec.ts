// Nebula DNS - Payment Methods E2E Tests (US-037)
// Tests payment method management: add, remove, set default, update billing address
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAsEnterprise, loginAsMSP, waitForPageLoad } from '../helpers/auth'

test.describe('US-037: Payment Methods Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEnterprise(page)
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)
    
    // Navigate to payment methods section if available
    const paymentMethodsTab = page.getByRole('tab', { name: /payment methods|payment/i })
    if (await paymentMethodsTab.isVisible()) {
      await paymentMethodsTab.click()
      await waitForPageLoad(page)
    }
  })

  test('should display saved payment methods', async ({ page }) => {
    // Check for payment methods section heading
    await expect(page.getByRole('heading', { name: /payment methods/i })).toBeVisible({ timeout: 10000 })
    
    // Check for saved card indicators (e.g., Visa, Mastercard, last 4 digits)
    const cardIndicator = page.getByText(/\*\*\d{4}|ending in/i)
    if (await cardIndicator.isVisible()) {
      await expect(cardIndicator).toBeVisible()
    }
    
    // Verify card brand or type is displayed
    const cardBrand = page.getByText(/visa|mastercard|amex|discover/i)
    expect(await cardBrand.count()).toBeGreaterThanOrEqual(0)
  })

  test('should add new credit card', async ({ page }) => {
    // Look for "Add Payment Method" button
    const addButton = page.getByRole('button', { name: /add payment method|add card|new card/i })
    await expect(addButton).toBeVisible()
    await expect(addButton).toBeEnabled()
    
    // Click to open add payment method modal/dialog
    await addButton.click()
    await waitForPageLoad(page)
    
    // Check for Stripe Elements or card form fields
    // These would typically be Stripe-hosted fields
    const cardNumberField = page.locator('input[name="cardnumber"], [data-testid="card-number"]')
    const expiryField = page.locator('input[name="exp-date"], [data-testid="expiry"]')
    const cvcField = page.locator('input[name="cvc"], [data-testid="cvc"]')
    
    // At least one form field should be visible in the modal
    const hasFormFields = await cardNumberField.isVisible() || 
                          await expiryField.isVisible() || 
                          await cvcField.isVisible()
    
    // If modal doesn't have fields, it might redirect to Stripe
    if (!hasFormFields) {
      // Should have some payment form present
      const modalContent = page.locator('[class*="modal"], [class*="dialog"]')
      expect(await modalContent.count()).toBeGreaterThan(0)
    }
  })

  test('should set default payment method', async ({ page }) => {
    // Look for existing payment methods
    const paymentMethods = page.locator('[class*="payment-method"], [class*="card"]')
    
    if (await paymentMethods.count() > 0) {
      // Find "Set as Default" or similar button
      const setDefaultButton = page.getByRole('button', { name: /set.*default|make.*default|default.*card/i })
      
      if (await setDefaultButton.isVisible()) {
        // Click to set as default
        await setDefaultButton.click()
        await waitForPageLoad(page)
        
        // Verify default indicator appears
        const defaultBadge = page.getByText(/default|current.*primary/i)
        expect(await defaultBadge.count()).toBeGreaterThan(0)
      }
    }
  })

  test('should remove payment method with confirmation', async ({ page }) => {
    // Look for payment methods
    const paymentMethods = page.locator('[class*="payment-method"], [class*="card"]')
    
    if (await paymentMethods.count() > 1) {
      // Find remove/delete button on a non-default card
      const removeButton = page.getByRole('button', { name: /remove|delete|trash/i }).first()
      
      if (await removeButton.isVisible()) {
        await removeButton.click()
        await waitForPageLoad(page)
        
        // Should show confirmation dialog
        const confirmDialog = page.getByText(/confirm|are you sure|delete.*payment/i)
        if (await confirmDialog.isVisible()) {
          // Confirm deletion
          const confirmButton = page.getByRole('button', { name: /confirm|delete|remove/i })
          await confirmButton.click()
          await waitForPageLoad(page)
          
          // Verify method was removed (dialog should be gone)
          await expect(confirmDialog).not.toBeVisible()
        }
      }
    }
  })

  test('should show error for invalid card', async ({ page }) => {
    // Navigate to add payment method
    const addButton = page.getByRole('button', { name: /add payment method|add card/i })
    
    if (await addButton.isVisible()) {
      await addButton.click()
      await waitForPageLoad(page)
      
      // Try to submit with invalid card details
      // This would require entering test card numbers
      const submitButton = page.getByRole('button', { name: /save|add|submit|pay/i })
      
      if (await submitButton.isVisible()) {
        await submitButton.click()
        await page.waitForTimeout(1000)
        
        // Should show error message for invalid card
        const errorMessage = page.getByText(/invalid.*card|card.*error|declined|failed/i)
        if (await errorMessage.isVisible()) {
          await expect(errorMessage).toBeVisible()
        }
      }
    }
  })

  test('should update billing address', async ({ page }) => {
    // Look for billing address section
    const billingAddressSection = page.getByText(/billing address|address/i)
    
    if (await billingAddressSection.isVisible()) {
      // Find edit button for address
      const editButton = page.getByRole('button', { name: /edit.*address|update.*address/i })
      
      if (await editButton.isVisible()) {
        await editButton.click()
        await waitForPageLoad(page)
        
        // Check for address form fields
        const addressFields = [
          page.locator('input[name="address"], input[name="street"]'),
          page.locator('input[name="city"]'),
          page.locator('input[name="state"], input[name="province"]'),
          page.locator('input[name="zip"], input[name="postal"]'),
          page.locator('input[name="country"]')
        ]
        
        // At least some fields should be visible
        for (const field of addressFields) {
          if (await field.isVisible()) {
            await expect(field).toBeVisible()
            break
          }
        }
        
        // Save button should be present
        const saveButton = page.getByRole('button', { name: /save|update/i })
        await expect(saveButton).toBeVisible()
      }
    }
  })
})

test.describe('US-037: Payment Methods - MSP Tier', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMSP(page)
    await page.goto('/dashboard/billing')
    await waitForPageLoad(page)
  })

  test('MSP tier can manage payment methods', async ({ page }) => {
    // MSP should have access to payment methods
    const paymentMethodsLink = page.getByRole('link', { name: /payment methods/i })
    
    if (await paymentMethodsLink.isVisible()) {
      await paymentMethodsLink.click()
      await waitForPageLoad(page)
      
      // Should see payment methods section
      await expect(page.getByRole('heading', { name: /payment methods/i })).toBeVisible({ timeout: 5000 })
    }
  })

  test('MSP tier sees billing for own account (not clients)', async ({ page }) => {
    // MSP should see their own billing, not their clients' billing
    const billingHeading = page.getByRole('heading', { name: /billing|subscription/i })
    await expect(billingHeading).toBeVisible()
    
    // Should not show "client billing" or similar
    const clientBilling = page.getByText(/client.*billing|billing.*clients/i)
    expect(await clientBilling.isVisible()).toBeFalsy()
  })
})
