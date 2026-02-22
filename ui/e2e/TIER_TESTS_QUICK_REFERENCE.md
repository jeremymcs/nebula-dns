# Tier System E2E Tests - Quick Reference

## Quick Start

```bash
cd ui

# Run all tier tests
npm run test:e2e -- tiers.spec.ts msp.spec.ts billing.spec.ts

# Run specific test file
npm run test:e2e -- tiers.spec.ts

# Run in interactive UI mode
npm run test:e2e:ui -- tiers.spec.ts

# Run specific test suite
npm run test:e2e -- tiers.spec.ts -g "Home Tier"
```

## Test Files

| File | Tests | Purpose |
|------|-------|---------|
| `tiers.spec.ts` | 47 | Core tier access control and navigation |
| `msp.spec.ts` | 42 | MSP client and template management |
| `billing.spec.ts` | 52 | Billing, usage, and upgrade prompts |
| **Total** | **141** | Complete tier system validation |

## Test Credentials

| Tier | Email | Login Function |
|------|-------|----------------|
| Home | home_user@test.com | `loginAsHome(page)` |
| Enterprise | enterprise_user@test.com | `loginAsEnterprise(page)` |
| MSP | msp_user@test.com | `loginAsMSP(page)` |

## Common Test Patterns

### Testing Feature Access
```typescript
test('should access [feature]', async ({ page }) => {
  await loginAsEnterprise(page)
  await page.goto('/dashboard/security-score')
  await waitForPageLoad()
  await expect(page).toHaveURL(/\/dashboard\/security-score/)
})
```

### Testing Feature Restrictions
```typescript
test('should NOT access [feature]', async ({ page }) => {
  await loginAsHome(page)
  await page.goto('/dashboard/clients')
  await waitForPageLoad()

  const upgradePrompt = page.getByText(/upgrade.*msp/i)
  expect(await upgradePrompt.isVisible()).toBeTruthy()
})
```

### Testing Navigation Visibility
```typescript
test('navigation should hide [feature]', async ({ page }) => {
  await loginAsHome(page)
  await page.goto('/dashboard')

  const siemLink = page.getByRole('link', { name: /^siem$/i })
  expect(await siemLink.isVisible()).toBeFalsy()
})
```

## Feature Access Matrix

### Home Tier ✅
- Dashboard, Policies, Locations, Lists, Reports
- Family Mode, Agents, Basic Settings
- **Limit**: 5 locations

### Home Tier ❌
- SIEM, SSO, API Keys, Webhooks
- Security Score, Playbooks, Templates
- MSP Clients, MSP Templates

### Enterprise Tier ✅
- All core features
- SIEM, SSO, API Keys, Webhooks
- Security Score, Playbooks, Policy Builder
- Templates, AI Insights
- **Limit**: 50 locations

### Enterprise Tier ❌
- Family Mode (Home-only)
- MSP Clients, MSP Templates

### MSP Tier ✅
- All Enterprise features
- Client Management
- MSP Templates
- Cross-Client Reporting
- **Limit**: Unlimited

### MSP Tier ❌
- Family Mode (Home-only)

## Debugging Failed Tests

### Test fails with timeout
```bash
# Increase timeout
npm run test:e2e -- tiers.spec.ts --timeout=60000
```

### Test fails intermittently
```bash
# Run with retries
npm run test:e2e -- tiers.spec.ts --retries=3
```

### See what's happening
```bash
# Run in headed mode
npm run test:e2e:headed -- tiers.spec.ts

# Or use UI mode
npm run test:e2e:ui -- tiers.spec.ts
```

### Debug specific test
```bash
# Run one test with debugging
npm run test:e2e -- tiers.spec.ts -g "should access SIEM" --debug
```

## When to Run These Tests

### Before Committing
- Run tests related to files you changed
- Example: If changing tier access logic, run `tiers.spec.ts`

### Before PR
- Run all tier tests
```bash
npm run test:e2e -- tiers.spec.ts msp.spec.ts billing.spec.ts
```

### In CI/CD
- All tests run automatically on PR
- Must pass before merge

## Adding New Tests

### 1. New Feature in Existing Tier
```typescript
// Add to appropriate tier section in tiers.spec.ts
test('should access new feature', async ({ page }) => {
  await loginAsEnterprise(page)
  await page.goto('/dashboard/new-feature')
  await waitForPageLoad()
  await expect(page.getByRole('heading', { name: /new feature/i })).toBeVisible()
})
```

### 2. New MSP Feature
```typescript
// Add to msp.spec.ts
test.describe('New MSP Feature', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMSP(page)
    await page.goto('/dashboard/msp/new-feature')
    await waitForPageLoad()
  })

  test('should display new feature', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/msp\/new-feature/)
  })
})
```

### 3. New Billing/Usage Feature
```typescript
// Add to billing.spec.ts
test('should show new usage metric', async ({ page }) => {
  await loginAsEnterprise(page)
  await page.goto('/dashboard/billing')
  await waitForPageLoad()

  const newMetric = page.getByText(/new metric/i)
  await expect(newMetric).toBeVisible()
})
```

## Tier Access Checklist

When implementing a new feature:

- [ ] Determine which tier(s) should access it
- [ ] Add positive test for allowed tier(s)
- [ ] Add negative test for restricted tier(s)
- [ ] Update navigation visibility test
- [ ] Add upgrade prompt test (if applicable)
- [ ] Update feature matrix in documentation

## Common Issues

### localStorage not set correctly
```typescript
// Make sure to use tier-specific login
await loginAsHome(page)  // ✅ Correct
await login(page)         // ❌ Wrong - defaults to enterprise
```

### Route doesn't match
```typescript
// Use flexible regex patterns
await expect(page).toHaveURL(/\/dashboard\/policies/)  // ✅ Good
await expect(page).toHaveURL('/dashboard/policies')    // ❌ Fragile
```

### Element not found
```typescript
// Use waitForPageLoad before assertions
await page.goto('/dashboard/policies')
await waitForPageLoad()  // ✅ Wait for page to fully load
await expect(page.getByRole('heading')).toBeVisible()
```

### Conditional features
```typescript
// Use conditional checks for features that may not exist
const optionalFeature = page.getByText(/optional/i)
if (await optionalFeature.count() > 0) {
  await expect(optionalFeature).toBeVisible()
}
```

## Test Output Interpretation

### ✓ Passing Test
```
✓ should access dashboard with Home tier (1.2s)
```
Feature works as expected

### ✘ Failing Test
```
✘ should NOT access SIEM page (2.1s)
  Expected upgrade prompt to be visible
```
Tier restriction not working - security issue!

### ⊘ Skipped Test
```
⊘ should access new feature (skipped)
```
Test intentionally skipped (e.g., feature not implemented)

## Performance Targets

- Unit test: < 100ms
- Integration test: < 1s
- E2E test: < 5s per test
- Full suite: < 5 minutes

## Coverage Goals

- Feature access: 100% of tier-gated features
- Navigation: 100% of tier-specific menu items
- Upgrade prompts: All restricted feature access points
- Billing: All usage metrics and limits

## Related Documentation

- Full Implementation Guide: `TIER_TESTS_IMPLEMENTATION.md`
- Feature Access Definitions: `ui/src/lib/tier-features.ts`
- Tenant Entity: `api/src/modules/tenants/entities/tenant.entity.ts`
- Auth Helper: `ui/e2e/helpers/auth.ts`

## Support

If tests are failing:
1. Check if UI is running on localhost:3000
2. Verify tier access control is implemented in UI
3. Check if route matches expected pattern
4. Review test output for specific assertion failures
5. Run in UI mode for visual debugging

## Quick Commands Reference

```bash
# List all tests
npx playwright test --list tiers.spec.ts

# Run single test
npx playwright test tiers.spec.ts:15

# Run in debug mode
npx playwright test --debug tiers.spec.ts

# Generate HTML report
npx playwright show-report

# Update snapshots (if using visual testing)
npx playwright test --update-snapshots

# Run with specific browser
npx playwright test --project=chromium

# Run in parallel with 3 workers
npx playwright test --workers=3
```

---

**Last Updated**: January 17, 2026
**Test Count**: 141 tests
**Coverage**: Home, Enterprise, MSP tiers
