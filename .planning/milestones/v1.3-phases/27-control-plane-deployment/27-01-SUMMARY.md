---
phase: 27-control-plane-deployment
plan: 01
subsystem: infrastructure
tags: [helm, kubernetes, api, deployment, security, production]
dependency_graph:
  requires: [26-03]
  provides: [api-deployment-template, secrets-template]
  affects: [27-02, 27-03]
tech_stack:
  added: []
  patterns: [helm-templating, kubernetes-security-contexts, hpa-stabilization, pod-anti-affinity]
key_files:
  created: []
  modified:
    - helm/safedns/templates/api-deployment.yaml
    - helm/safedns/templates/secrets.yaml
    - helm/safedns/templates/_helpers.tpl
    - helm/safedns/values.yaml
decisions:
  - title: Use api-secrets consistent naming
    rationale: Migration job references .Values.api.secrets.name defaulting to api-secrets, not the dynamic nebuladns-fullname pattern. Secrets template now matches this reference.
  - title: Add HPA stabilization behavior
    rationale: Prevents pod churn during traffic spikes. 60s scaleUp and 300s scaleDown windows provide stable autoscaling without overreacting to momentary load changes.
  - title: ReadOnlyRootFilesystem with emptyDir volumes
    rationale: Security best practice. API needs writable /tmp and /app/.npm for npm cache, provided via emptyDir volumes while maintaining read-only root filesystem.
metrics:
  duration: 139s
  completed: 2026-02-13T13:29:38Z
  tasks_completed: 2
  files_modified: 4
  commits: 2
---

# Phase 27 Plan 01: API Helm Deployment Template Summary

**Production-ready API Deployment with complete environment variables, security hardening, and HPA stabilization**

## What Was Built

Upgraded the Helm API deployment template from minimal (DATABASE_URL, REDIS_URL, JWT_SECRET) to production-complete with all required environment variables, Kubernetes security contexts, pod anti-affinity, HPA stabilization behavior, and updated secrets template with database-direct-url for migrations.

### Task 1: API Deployment Template - Complete ✓ (Commit b2e84a4)

**Environment Variables Added:**
- `PORT=3000` - Explicit port configuration
- `CLICKHOUSE_URL` - From secret clickhouse-url
- `CLICKHOUSE_DATABASE` - From values.clickhouse.database
- `CLICKHOUSE_USER` - From secret (optional)
- `CLICKHOUSE_PASSWORD` - From secret (optional)
- `ENCRYPTION_KEY` - From secret encryption-key
- `FRONTEND_URL` - From values.api.env.FRONTEND_URL (default: https://app.nebuladns.io)
- `STRIPE_SECRET_KEY` - From secret (optional)
- `STRIPE_WEBHOOK_SECRET` - From secret (optional)
- `SENDGRID_API_KEY` - From secret (optional)
- `SENTRY_DSN` - From secret (optional)

**Security Hardening:**
- Pod security context: runAsNonRoot: true, runAsUser: 1000, fsGroup: 1000
- Container security context: readOnlyRootFilesystem: true, allowPrivilegeEscalation: false, drop ALL capabilities
- EmptyDir volumes: /tmp and /app/.npm for read-only root filesystem support

**Production Features:**
- Rolling update strategy: maxSurge: 1, maxUnavailable: 0 (zero-downtime deployments)
- Pod anti-affinity: preferred weight 100 (spread pods across nodes)
- HPA stabilization behavior: scaleUp 60s window, scaleDown 300s window (prevents pod churn)
- Memory metric: 80% average utilization threshold
- Prometheus annotations: scrape enabled on port 3000 /metrics
- Updated probes: added timeoutSeconds and failureThreshold for reliability

**Bug Fixes:**
- Fixed helper references from `nebuladns.*` to `safedns.*` throughout (consistency with existing _helpers.tpl)
- Updated containerPort from 4000 to 3000 to match PORT env var
- Added `safedns.admin-ui.fullname` helper to _helpers.tpl

### Task 2: Secrets Template and Values - Complete ✓ (Commit 60df763)

**Secrets Template (secrets.yaml):**
- Rewrote to use consistent `api-secrets` name matching migration job reference (not dynamic nebuladns-fullname)
- Added database-direct-url key for migrations (bypasses PgBouncer transaction mode)
- Added ClickHouse credentials: clickhouse-url, clickhouse-user (optional), clickhouse-password (optional)
- Added stripe-webhook-secret and sendgrid-api-key to complete external service secrets
- Conditional rendering for optional secrets (only include if value provided)

**Values.yaml Updates:**
- **secrets section:** Added databaseUrl, databaseDirectUrl, redisUrl, clickhouseUrl, clickhouseUser, clickhousePassword, stripeWebhookSecret, sendgridApiKey (all empty defaults)
- **api.env:** Added FRONTEND_URL: "https://app.nebuladns.io"
- **api.autoscaling:** Added targetMemoryUtilizationPercentage: 80, behavior.scaleUp.stabilizationWindowSeconds: 60, behavior.scaleDown.stabilizationWindowSeconds: 300
- **ui.env section:** Added API_URL, APP_URL, ADMIN_UI_URL for frontend environment
- **adminUi section:** Added complete admin UI service config (2 replicas, 500m/512Mi limits, 100m/128Mi requests, ClusterIP service on port 3000, env vars for API_URL, APP_URL, TENANT_UI_URL)
- **ingress:** Added admin.nebuladns.io host and TLS entry for admin UI

## Deviations from Plan

None - plan executed exactly as written.

## Key Decisions

1. **Use api-secrets consistent naming:** Migration job in db-migration-job.yaml references `.Values.api.secrets.name | default "api-secrets"`, not the dynamic `{{ include "nebuladns.fullname" . }}-secrets` pattern. Updated secrets.yaml to match this reference, avoiding name mismatch between API and migration job.

2. **Add HPA stabilization behavior:** Prevents pod churn during traffic spikes. 60s scaleUp window allows cluster to confirm sustained load before adding pods. 300s scaleDown window prevents premature pod removal after brief traffic drops. Reduces unnecessary pod churn and provides stable autoscaling.

3. **ReadOnlyRootFilesystem with emptyDir volumes:** Security best practice to prevent container filesystem modifications. API needs writable /tmp for temporary files and /app/.npm for npm cache. Provided via emptyDir volumes mounted in container while maintaining read-only root filesystem for all other paths.

4. **Fix helper naming from nebuladns to safedns:** Existing _helpers.tpl uses `safedns.*` naming convention. API deployment incorrectly used `nebuladns.*` helpers which would fail template rendering. Fixed all references to use `safedns.api.fullname`, `safedns.fullname`, `safedns.labels`, `safedns.selectorLabels` for consistency.

## Verification Results

✓ All required environment variables present in API Deployment template
✓ Secrets template includes database-direct-url key (used by migration job)
✓ Values.yaml has adminUi section with complete configuration
✓ Values.yaml has expanded secrets section with all required keys
✓ HPA has memory metric and stabilization behavior to prevent pod churn
✓ Pod and container security contexts applied
✓ Pod anti-affinity configured for high availability
✓ Rolling update strategy configured for zero-downtime deployments
✓ Prometheus annotations added for metrics scraping

**Manual Verification (Helm not installed in environment):**
- Grep confirmed presence of: clickhouse-url, encryption-key, CLICKHOUSE_URL, ENCRYPTION_KEY, FRONTEND_URL, stabilizationWindowSeconds, readOnlyRootFilesystem
- Grep confirmed secrets template has: database-direct-url, clickhouse-user, stripe-webhook-secret, sendgrid-api-key
- Grep confirmed values.yaml has: databaseDirectUrl, clickhouseUser, stripeWebhookSecret, sendgridApiKey, adminUi, targetMemoryUtilizationPercentage, admin.nebuladns.io

## Files Modified

| File | Lines Changed | Purpose |
|------|---------------|---------|
| helm/safedns/templates/api-deployment.yaml | +137/-15 | Added all production env vars, security contexts, HPA stabilization, pod anti-affinity, rolling update strategy, Prometheus annotations |
| helm/safedns/templates/secrets.yaml | Complete rewrite | Consistent api-secrets naming, added database-direct-url and all missing secret keys |
| helm/safedns/templates/_helpers.tpl | +6 | Added safedns.admin-ui.fullname helper |
| helm/safedns/values.yaml | +74/-6 | Added adminUi section, ui.env section, expanded secrets section, FRONTEND_URL, HPA behavior, admin.nebuladns.io ingress |

## Self-Check: PASSED

**Created files exist:**
- N/A (no new files created)

**Modified files exist:**
- ✓ helm/safedns/templates/api-deployment.yaml
- ✓ helm/safedns/templates/secrets.yaml
- ✓ helm/safedns/templates/_helpers.tpl
- ✓ helm/safedns/values.yaml

**Commits exist:**
- ✓ b2e84a4: feat(27-01): add production env vars and security hardening to API deployment
- ✓ 60df763: feat(27-01): update secrets template and values with all required keys

**Key patterns verified:**
- ✓ API Deployment uses safedns.* helpers (not nebuladns.*)
- ✓ Secrets template uses api-secrets name matching migration job reference
- ✓ All env vars reference api-secrets with proper secret keys
- ✓ HPA includes both CPU and memory metrics with stabilization behavior

## Next Steps

**Immediate (Plan 27-02):** Create UI and Admin UI Helm deployment templates with similar production hardening, environment variables, and security contexts.

**Subsequent (Plan 27-03):** Create Policy Service and dnsdist Helm templates to complete control plane deployment.

## Performance Metrics

- Duration: 139 seconds (2m 19s)
- Tasks completed: 2/2 (100%)
- Files modified: 4
- Commits: 2
- Lines added: ~217
- Lines removed: ~21
