# Plan 28-05 Summary: k6 Load Test Configuration

**Completed:** 2026-02-14

## Changes Made

### API Load Test (`scripts/load-testing/api-load-test.js`)
- Updated BASE_URL default: `http://localhost:4010` (was 4000)
- Updated TEST_EMAIL default: `test@example.com`
- Updated TEST_PASSWORD default: `password`
- Added `ext.loadimpact.name` for test naming
- Added support for `--env-file` usage

### DNS Load Test (`scripts/load-testing/dns-load-test.js`)
- Updated DOH_URL default: `https://localhost:4443/dns-query` (was 443)
- Added configurable DNS_SERVER: `__ENV.DNS_SERVER || 'localhost'`
- Added configurable DNS_PORT: `__ENV.DNS_PORT || '4853'`
- Added configurable TEST_DOMAIN: `__ENV.TEST_DOMAIN || 'example.com'`

### Environment File
- Created `scripts/load-testing/k6-staging.env` with staging endpoints

### CI Workflow
- Created `.github/workflows/load-test.yml`:
  - Schedule: Every Monday at 2 AM UTC
  - Manual trigger with scenario (smoke/load/stress) and target (staging/local)
  - API and DNS load tests run in parallel
  - Results uploaded as artifacts for 30 days
  - k6 version pinned to v0.54.0
  - Uses `continue-on-error: true` (informational only)

## Verification
- YAML is valid with schedule and workflow_dispatch triggers
- api-load-test.js contains `__ENV.API_URL`
- dns-load-test.js contains `__ENV.DOH_URL`
- k6-staging.env exists with staging endpoints
- Both jobs upload results as artifacts
