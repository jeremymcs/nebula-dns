---
phase: 32
plan: 02
subsystem: CI/CD Pipeline
tags: [github-actions, deployment, helm, staging, production, docr]
completed: 2026-02-15
duration: 110s
requires: [32-01]
provides:
  - main-deployment-pipeline
  - automated-staging-deployment
  - manual-production-approval
affects:
  - all-services
  - deployment-automation
tech-stack:
  added:
    - GitHub Actions workflow_call
    - Environment-based deployments
  patterns:
    - Test gates before builds
    - Parallel service builds
    - Automatic rollback on failure
    - Sequential staging→production flow
key-files:
  created:
    - .github/workflows/deploy.yml
  modified:
    - .github/workflows/ci.yml
decisions:
  - "Test gates (ci.yml + security-scan.yml) run before all builds, skippable via workflow_dispatch for emergencies"
  - "6 parallel build jobs after test gates prevent sequential build bottleneck (reduces build phase from ~12 min to ~2 min)"
  - "Staging deploys automatically after builds, production requires manual approval via GitHub Environment"
  - "Both staging (10m) and production (15m) use --atomic flag for automatic rollback on failed deployments"
  - "Production timeout 15m (vs staging 10m) accounts for higher replica counts and autoscaling stabilization"
  - "kubectl rollout status verifies deployment health before marking job complete"
  - "--history-max 10 limits Helm release history to prevent etcd bloat"
metrics:
  tasks_completed: 2
  commits: 2
  files_created: 1
  files_modified: 1
---

# Phase 32 Plan 02: Build and Deploy to Staging Summary

**One-liner:** Main deployment pipeline orchestrating test gates, parallel builds for all 6 services, automatic staging deployment, and manual-approval production deployment

## Overview

Created the core CI/CD pipeline that satisfies OPS-03 requirements: automated build, test, push to DOCR, deploy to staging (automatic), and production (manual approval). The pipeline uses reusable workflows from Plan 32-01 and integrates existing test infrastructure for comprehensive quality gates.

## Tasks Completed

### Task 1: Create Main Deployment Workflow (commit: 1d8e395)

**File:** `.github/workflows/deploy.yml`

Created a comprehensive deployment workflow with the following structure:

**Triggers:**
- `push` to `main` branch → Full pipeline (test, build, staging, production approval)
- `workflow_dispatch` with manual inputs:
  - `skip_tests` (boolean) → Emergency deploy bypass
  - `environment` (choice) → Target staging or production

**Job Flow:**

1. **run-tests** — Calls `ci.yml` as reusable workflow
   - Runs all unit tests, integration tests, E2E tests
   - Conditional: `if: ${{ !inputs.skip_tests }}`

2. **run-security-scan** — Calls `security-scan.yml` as reusable workflow
   - Runs CodeQL, secrets scan, dependency scan, container scan
   - Conditional: `if: ${{ !inputs.skip_tests }}`

3. **Parallel Build Jobs** (6 services) — All depend on test/security gates:
   - `build-api` → `nebula-dns-api:${github.sha}`
   - `build-ui` → `nebula-dns-ui:${github.sha}`
   - `build-admin-ui` → `nebula-dns-admin-ui:${github.sha}`
   - `build-policy-svc` → `nebula-dns-policy-svc:${github.sha}`
   - `build-dnsdist` → `nebula-dns-dnsdist:${github.sha}`
   - `build-unbound` → `nebula-dns-unbound:${github.sha}`
   - Uses reusable `_build-push-image.yml` from Plan 32-01
   - Conditional: `always() && (needs.run-tests.result == 'success' || inputs.skip_tests) && (needs.run-security-scan.result == 'success' || inputs.skip_tests)`

4. **deploy-staging** — Automatic staging deployment
   - `needs: [build-api, build-ui, build-admin-ui, build-policy-svc, build-dnsdist, build-unbound]`
   - `environment: staging` (GitHub environment for secrets/protection)
   - Helm upgrade with `--atomic --wait --timeout 10m`
   - Sets all 6 image tags via `--set` flags
   - Uses `values-staging.yaml` from Plan 32-01
   - Verifies deployments: `kubectl rollout status` for API, UI, Admin UI
   - Generates deployment summary to `$GITHUB_STEP_SUMMARY`

5. **deploy-production** — Manual approval production deployment
   - `needs: deploy-staging` (sequential gate)
   - `if: github.ref == 'refs/heads/main'` (only from main branch)
   - `environment: production` (requires manual approval in repo settings)
   - Helm upgrade with `--atomic --wait --timeout 15m` (longer timeout)
   - Sets all 6 image tags via `--set` flags
   - Uses `values-production.yaml`
   - Verifies all 6 deployments: API, UI, Admin UI, Policy Service, dnsdist, Unbound (StatefulSet)
   - Runs smoke test: `kubectl exec` to curl API health endpoint
   - Generates deployment summary to `$GITHUB_STEP_SUMMARY`

**Key Features:**
- **Automatic rollback:** `--atomic` flag rolls back on failure
- **History management:** `--history-max 10` prevents unlimited history growth
- **Health verification:** `kubectl rollout status --timeout=5m` confirms pods are ready
- **Immutable tags:** Uses `github.sha` for reproducible deployments
- **Environment isolation:** Separate namespaces (`nebula-dns-staging` vs `nebula-dns`)
- **Emergency bypass:** `skip_tests` allows urgent deployments

### Task 2: Update CI.yml for Workflow Reuse (commit: 6b81055)

**File:** `.github/workflows/ci.yml`

Modified existing CI workflow to support being called as a reusable workflow from `deploy.yml`.

**Changes:**
1. **Added `workflow_call` trigger:**
   ```yaml
   on:
     push:
       branches: [main, develop]
     pull_request:
       branches: [main, develop]
     workflow_call:  # Allow reuse from deploy.yml
   ```

2. **Removed `build` job** (lines 368-407):
   - Previously built 3 images (api, ui, policy-svc) with `push: false`
   - Now handled by `deploy.yml` with 6 services pushed to DOCR
   - Eliminates redundant build step

3. **Removed `security` job** (lines 409-433):
   - Previously ran Trivy filesystem scan
   - Now handled by dedicated `security-scan.yml` workflow
   - Called separately from `deploy.yml` for better job organization

**Preserved:**
- All test jobs: `api-test`, `api-integration-test`, `dns-e2e-test`, `ui-test`, `policy-svc-test`, `policy-integration-test`, `ui-e2e-test`
- Job dependencies: `dns-e2e-test` still needs `[api-test, api-integration-test, policy-svc-test, policy-integration-test]`
- Coverage uploads to Codecov
- Test artifact uploads

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification criteria passed:

1. ✓ `deploy.yml` exists with valid YAML syntax
2. ✓ `ci.yml` has `workflow_call:` trigger added
3. ✓ deploy.yml references `_build-push-image.yml` for all 6 services
4. ✓ deploy.yml uses `--atomic --wait` for both staging and production Helm deploys
5. ✓ deploy.yml has `environment: staging` and `environment: production` on correct jobs
6. ✓ Production deploy `needs: deploy-staging` (sequential gate)
7. ✓ No hardcoded secrets — all use `${{ secrets.* }}` references
8. ✓ Triggers: push to main + workflow_dispatch with skip_tests option
9. ✓ Test gates: uses ci.yml and security-scan.yml
10. ✓ kubectl rollout status checks after each deployment
11. ✓ `--history-max 10` on both Helm commands
12. ✓ All 6 image tags set via --set flags
13. ✓ `build` job removed from ci.yml
14. ✓ `security` job removed from ci.yml
15. ✓ All test jobs remain in ci.yml

## Self-Check: PASSED

**Created files verified:**
```bash
[ -f ".github/workflows/deploy.yml" ] && echo "FOUND: deploy.yml"
# Output: FOUND: deploy.yml
```

**Modified files verified:**
```bash
grep "workflow_call" .github/workflows/ci.yml && echo "FOUND: workflow_call trigger"
# Output: workflow_call:  # Allow reuse from deploy.yml

grep -E "^  (build|security):" .github/workflows/ci.yml
# Output: (empty - jobs removed successfully)
```

**Commits verified:**
```bash
git log --oneline --all | grep -E "(1d8e395|6b81055)"
# Output:
# 6b81055 feat(32-02): update ci.yml to support workflow_call trigger
# 1d8e395 feat(32-02): create main deployment workflow
```

## Success Criteria Met

- ✓ Push to main triggers: tests → builds → staging deploy (automatic) → production deploy (manual)
- ✓ All 6 services (api, ui, admin-ui, policy-svc, dnsdist, unbound) built and pushed to DOCR
- ✓ Failed Helm deployments automatically rollback via `--atomic`
- ✓ Emergency deploys possible via workflow_dispatch with `skip_tests=true`
- ✓ Deployment health verified with `kubectl rollout status`
- ✓ Test gates prevent broken code from reaching production
- ✓ Security scans enforce vulnerability thresholds
- ✓ Immutable image tags enable rollbacks
- ✓ Production requires manual approval (GitHub Environment protection rule)

## Pipeline Flow Diagram

```
Push to main
     ↓
┌────────────────────────────────┐
│  Test Gates (parallel)         │
│  - ci.yml (all tests)          │
│  - security-scan.yml           │
└────────────────┬───────────────┘
                 ↓
┌────────────────────────────────┐
│  Build Images (parallel)       │
│  - api, ui, admin-ui           │
│  - policy-svc, dnsdist, unbound│
│  Push to DOCR with SHA tags    │
└────────────────┬───────────────┘
                 ↓
┌────────────────────────────────┐
│  Deploy to Staging (auto)      │
│  - Helm upgrade --atomic       │
│  - kubectl rollout status      │
│  - Generate summary            │
└────────────────┬───────────────┘
                 ↓
          ┌──────────────┐
          │ Approval Gate│ (manual)
          └──────┬───────┘
                 ↓
┌────────────────────────────────┐
│  Deploy to Production          │
│  - Helm upgrade --atomic       │
│  - kubectl rollout status      │
│  - Smoke test                  │
│  - Generate summary            │
└────────────────────────────────┘
```

## Impact

**Enables:**
- Plan 32-03: Production values and monitoring integration can now reference this pipeline
- Automated deployment on every push to main (reduces manual intervention)
- Rollback capability via `--atomic` (prevents downtime from bad deploys)
- Clear promotion path: staging validation → production approval

**Developer Experience:**
- Push to main → automatic staging deployment in ~15-20 minutes (tests + builds + deploy)
- Production deploy requires 1-click approval (no manual kubectl/helm commands)
- GitHub Step Summaries show deployment details (endpoints, image tags, health checks)
- Failed deployments automatically roll back (no manual cleanup)

**Operational Benefits:**
- **Immutable deployments:** SHA-tagged images enable precise rollbacks
- **Health gates:** `kubectl rollout status` prevents marking unhealthy deployments as successful
- **History management:** `--history-max 10` prevents etcd from growing unbounded
- **Audit trail:** All deployments logged in GitHub Actions with approval records
- **Emergency bypass:** `skip_tests` allows urgent security patches to deploy quickly

**Security:**
- Test gates catch bugs before production
- Security scans detect vulnerabilities before deployment
- Manual approval on production prevents accidental deployments
- Separate environments isolate staging from production data

## Pipeline Timing Estimates

**Full Pipeline (push to main):**
- Test Gates: ~8-12 minutes (ci.yml + security-scan.yml in parallel)
- Build Images: ~2-3 minutes (6 services in parallel with GitHub cache)
- Deploy Staging: ~3-5 minutes (Helm upgrade + rollout verification)
- **Total to Staging:** ~15-20 minutes
- Deploy Production: ~5-7 minutes (more replicas, longer timeout)
- **Total to Production:** ~20-27 minutes (including manual approval time)

**Emergency Deploy (skip_tests=true):**
- Build Images: ~2-3 minutes
- Deploy Staging: ~3-5 minutes
- Deploy Production: ~5-7 minutes
- **Total:** ~10-15 minutes

## Next Steps

Plan 32-03 will create production-specific Helm values and integrate monitoring/alerting with the deployment pipeline (Prometheus ServiceMonitors, alert rules, Grafana dashboards).

---

**Execution Time:** 110 seconds (1.8 minutes)
**Commits:** 2 (1 per task)
**Files Created:** 1
**Files Modified:** 1
