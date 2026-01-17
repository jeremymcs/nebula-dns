# Nebula DNS - E2E Test Suite

Comprehensive Playwright E2E tests for the Nebula DNS UI.

## Test Files

### Core Functionality
- **`auth.spec.ts`** - Authentication flows (login, logout, password reset)
- **`navigation.spec.ts`** - Page navigation and routing
- **`dashboard.spec.ts`** - Main dashboard page, stats, charts, quick actions

### Feature Tests
- **`policies.spec.ts`** - Policy management (CRUD, versioning, rollback)
- **`locations.spec.ts`** - Location management (CRUD, tokens, DNS configuration)
- **`lists.spec.ts`** - Blocklist/allowlist management (CRUD, bulk import, entries)
- **`reports.spec.ts`** - Analytics and reporting (charts, exports, scheduled reports)
- **`settings.spec.ts`** - Settings pages (security, team, API keys, webhooks, SSO)

### Quality Tests
- **`responsive.spec.ts`** - Responsive design across mobile, tablet, and desktop viewports
- **`error-states.spec.ts`** - Error handling, empty states, loading states, validation

## Helpers

- **`helpers/auth.ts`** - Reusable authentication utilities
  - `login(page)` - Set up authentication token
  - `loginAndNavigate(page, path)` - Login and navigate to specific page
  - `logout(page)` - Clear authentication
  - `waitForPageLoad(page)` - Wait for network idle

## Running Tests

```bash
# Run all tests
npm run test:e2e

# Run in UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test dashboard.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox

# Run with debugging
npx playwright test --debug

# Generate test report
npx playwright show-report
```

## Test Structure

All tests follow a consistent pattern:

```typescript
test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: login and navigate
    await loginAndNavigate(page, '/dashboard/feature')
    await waitForPageLoad(page)
  })

  test('should perform action', async ({ page }) => {
    // Arrange, Act, Assert
    const element = page.getByRole('button', { name: /action/i })
    await element.click()
    await expect(page).toHaveURL(/expected/)
  })
})
```

## Test Philosophy

1. **Resilient Selectors**: Use semantic selectors (roles, labels, text) over brittle CSS selectors
2. **Graceful Degradation**: Tests check if elements exist before interacting
3. **Skip When Needed**: Tests skip gracefully if features aren't present
4. **Real User Flows**: Tests simulate actual user behavior
5. **Comprehensive Coverage**: Tests cover happy paths, edge cases, and error states

## Viewport Sizes

- **Mobile**: 375x667 (iPhone SE)
- **Tablet**: 768x1024 (iPad)
- **Desktop**: 1920x1080 (Full HD)

## CI/CD Integration

Tests run automatically in CI with:
- 2 retries on failure
- Screenshots on failure
- Trace on first retry
- HTML report generation

## Debugging Tips

```bash
# Run single test with debug mode
npx playwright test -g "should create new policy" --debug

# Record new tests
npx playwright codegen http://localhost:3000

# View traces
npx playwright show-trace trace.zip
```

## Coverage

The test suite covers:
- ✅ Authentication and authorization
- ✅ All major CRUD operations
- ✅ Form validation
- ✅ Navigation flows
- ✅ Data visualization (charts, tables)
- ✅ Export functionality (CSV, PDF)
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Error handling (404, API errors, validation)
- ✅ Empty states
- ✅ Loading states
- ✅ Permission controls
- ✅ Multi-step workflows

## Adding New Tests

1. Create new `.spec.ts` file in `/e2e` directory
2. Add copyright header
3. Import test utilities: `import { test, expect } from '@playwright/test'`
4. Import auth helpers: `import { loginAndNavigate, waitForPageLoad } from './helpers/auth'`
5. Follow existing test patterns
6. Run tests locally before committing

## Best Practices

- Use `test.describe()` to group related tests
- Use `test.beforeEach()` for common setup
- Prefer `getByRole()` and `getByLabel()` over `getByTestId()`
- Add timeout for async operations: `{ timeout: 5000 }`
- Use `.catch(() => false)` for optional elements
- Call `test.skip()` when features aren't available
- Keep tests independent (no shared state)
- Clean up after tests (delete created resources)

## Known Limitations

- Some tests require actual API data to be present
- Tests skip when features are not implemented
- Authentication uses mock tokens (not real login flow)
- Some tests are intentionally skipped to avoid data mutation

## Future Improvements

- [ ] Add visual regression tests
- [ ] Add accessibility tests (axe-core)
- [ ] Add performance tests (Lighthouse)
- [ ] Add API mocking for consistent test data
- [ ] Add test data factories
- [ ] Add cross-browser testing (Safari, Edge)
- [ ] Add mobile device testing (real devices)
