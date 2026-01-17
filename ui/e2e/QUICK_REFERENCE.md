# E2E Tests - Quick Reference Guide

## Run All Tests
```bash
npm run test:e2e
```

## Run Specific Test Files

### Feature Tests
```bash
# Dashboard tests
npx playwright test dashboard.spec.ts

# Policy management
npx playwright test policies.spec.ts

# Location management
npx playwright test locations.spec.ts

# List management
npx playwright test lists.spec.ts

# Reports and analytics
npx playwright test reports.spec.ts

# Settings and configuration
npx playwright test settings.spec.ts
```

### Quality Tests
```bash
# Authentication
npx playwright test auth.spec.ts

# Navigation
npx playwright test navigation.spec.ts

# Responsive design
npx playwright test responsive.spec.ts

# Error handling
npx playwright test error-states.spec.ts
```

## Run Specific Test Cases

```bash
# Run tests matching a pattern
npx playwright test -g "should create new policy"

# Run tests in a describe block
npx playwright test -g "Dashboard"

# Run multiple patterns
npx playwright test -g "create|delete"
```

## Run by Feature Area

```bash
# All CRUD operations
npx playwright test -g "create|edit|update|delete"

# All validation tests
npx playwright test -g "validate|validation|required"

# All export functionality
npx playwright test -g "export|download|CSV|PDF"

# All responsive tests
npx playwright test -g "mobile|tablet|desktop|responsive"

# All error states
npx playwright test -g "error|empty|loading|404"
```

## Run by Browser

```bash
# Chromium only
npx playwright test --project=chromium

# Firefox only
npx playwright test --project=firefox

# All browsers
npx playwright test
```

## Debug Mode

```bash
# Run with debug mode (pause execution)
npx playwright test --debug

# Debug specific test
npx playwright test -g "should create policy" --debug

# Run in headed mode (see browser)
npm run test:e2e:headed

# UI mode (interactive)
npm run test:e2e:ui
```

## Generate Reports

```bash
# Run tests and generate HTML report
npx playwright test

# View last test report
npx playwright show-report

# Generate trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

## Code Generation

```bash
# Record new test
npx playwright codegen http://localhost:3000

# Record from specific page
npx playwright codegen http://localhost:3000/dashboard/policies
```

## Common Test Scenarios

### Test New Feature
```bash
# 1. Write test in appropriate .spec.ts file
# 2. Run test to verify it fails (red)
# 3. Implement feature
# 4. Run test to verify it passes (green)
npx playwright test -g "your new test name"
```

### Test Before Deploy
```bash
# Run full suite with retries
CI=true npx playwright test

# Run critical path only
npx playwright test -g "login|dashboard|create policy"
```

### Test Responsive Design
```bash
# All responsive tests
npx playwright test responsive.spec.ts

# Mobile only
npx playwright test -g "Mobile"

# Tablet only
npx playwright test -g "Tablet"

# Desktop only
npx playwright test -g "Desktop"
```

### Test Error Handling
```bash
# All error tests
npx playwright test error-states.spec.ts

# API errors only
npx playwright test -g "API Errors"

# Empty states only
npx playwright test -g "Empty States"

# Loading states only
npx playwright test -g "Loading States"
```

## Troubleshooting

### Tests Failing?
```bash
# 1. Check if dev server is running
npm run dev

# 2. Run in headed mode to see what's happening
npx playwright test --headed

# 3. Run with debug mode
npx playwright test --debug

# 4. Check screenshots
# Located in: test-results/[test-name]/test-failed-1.png
```

### Slow Tests?
```bash
# Run fewer workers
npx playwright test --workers=1

# Run specific test only
npx playwright test -g "specific test name"

# Skip slow tests
npx playwright test --grep-invert "slow"
```

### Update Selectors?
```bash
# Use codegen to inspect elements
npx playwright codegen http://localhost:3000/dashboard

# Use inspector
npx playwright test --debug
```

## CI/CD Commands

```bash
# Run like CI would
CI=true npx playwright test

# Generate report for CI
npx playwright test --reporter=html,json

# Run with retries
npx playwright test --retries=2
```

## Useful Flags

```bash
# Run only failed tests from last run
npx playwright test --last-failed

# Update snapshots (if using visual regression)
npx playwright test --update-snapshots

# Run with specific timeout
npx playwright test --timeout=60000

# Run with grep (include)
npx playwright test --grep="create"

# Run with grep (exclude)
npx playwright test --grep-invert="skip"

# Run with max failures
npx playwright test --max-failures=5

# Run fully parallel
npx playwright test --fully-parallel

# Run with specific reporter
npx playwright test --reporter=list
npx playwright test --reporter=dot
npx playwright test --reporter=html
```

## Test File Shortcuts

| File | Tests | Focus Area |
|------|-------|------------|
| auth.spec.ts | 4 | Login, logout, session |
| navigation.spec.ts | 5 | Routing, page navigation |
| dashboard.spec.ts | 17 | Main dashboard, stats, charts |
| policies.spec.ts | 18 | Policy CRUD, versioning |
| locations.spec.ts | 21 | Location management, tokens |
| lists.spec.ts | 20 | Blocklist/allowlist management |
| reports.spec.ts | 27 | Analytics, exports, scheduled |
| settings.spec.ts | 31 | Security, team, API keys, webhooks |
| responsive.spec.ts | 30 | Mobile, tablet, desktop |
| error-states.spec.ts | 26 | Errors, empty states, loading |

## Total: 199 Tests

---

**Pro Tips**:
- Use `-g` flag for quick test filtering
- Use `--headed` to see what's happening
- Use `--debug` to step through tests
- Use UI mode for interactive debugging
- Check `test-results/` for screenshots and traces
- Update this guide as new tests are added
