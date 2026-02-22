---
phase: 26-dns-stack-deployment
plan: 01
subsystem: dns-policy-engine
tags: [managed-services, tls, configuration, kubernetes]
dependency_graph:
  requires:
    - phase: 24
      plan: 02
      reason: "Managed Valkey and ClickHouse Cloud provisioning"
    - phase: 24
      plan: 04
      reason: "policy-svc-secrets with connection credentials"
  provides:
    - artifact: "TLS-aware Redis connection"
      consumed_by: ["Policy Service runtime"]
    - artifact: "Complete ClickHouse Cloud env vars"
      consumed_by: ["Policy Service Kubernetes deployment"]
  affects:
    - component: "Policy Service"
      impact: "Can now connect to managed Valkey (TLS) and ClickHouse Cloud (HTTPS)"
tech_stack:
  added:
    - "redis.ParseURL for TLS connection support"
  patterns:
    - "Environment-aware connection strings (dev vs prod)"
    - "TLS 1.2+ enforcement for managed services"
    - "Kubernetes Secret-based credential injection"
key_files:
  created: []
  modified:
    - path: "policy-svc/cmd/main.go"
      role: "TLS-aware Redis connection and ClickHouse client initialization"
      contains: ["redis.ParseURL", "tls.VersionTLS12", "opts.TLSConfig"]
    - path: "k8s/base/policy-svc-deployment.yaml"
      role: "Complete environment variable mapping from Kubernetes Secrets"
      contains: ["CLICKHOUSE_DATABASE", "CLICKHOUSE_USER", "CLICKHOUSE_PASSWORD"]
decisions:
  - context: "Managed Valkey requires TLS connections (rediss://)"
    choice: "Use redis.ParseURL instead of plain Addr"
    rationale: "ParseURL automatically enables TLS for rediss:// URLs while maintaining backward compatibility with redis:// for dev"
    alternatives_considered:
      - option: "Manually configure TLS via redis.Options.TLSConfig"
        rejected: "More complex, less maintainable, error-prone"
      - option: "Separate dev/prod code paths"
        rejected: "Code duplication, deployment complexity"
  - context: "K8s manifest missing ClickHouse credentials env vars"
    choice: "Add CLICKHOUSE_DATABASE, CLICKHOUSE_USER, CLICKHOUSE_PASSWORD from policy-svc-secrets"
    rationale: "Code already reads these env vars (lines 67-73 in main.go), but K8s manifest wasn't mapping them"
    alternatives_considered: []
metrics:
  duration_minutes: 1
  tasks_completed: 1
  files_modified: 2
  commits: 1
  completed_date: "2026-02-13"
---

# Phase 26 Plan 01: Managed Service Connections Summary

**One-liner:** Policy Service now supports TLS connections to managed Valkey (rediss://...25061) and complete ClickHouse Cloud authentication via environment variables.

## What Was Built

Updated Policy Service to handle production managed services while maintaining local development compatibility:

1. **TLS-aware Redis connection:** Replaced `redis.NewClient(&redis.Options{Addr: redisURL})` with `redis.ParseURL(redisURL)` to support both:
   - Development: `redis://redis:6379` (plain TCP)
   - Production: `rediss://managed-valkey.example.com:25061` (TLS)

2. **TLS 1.2+ enforcement:** Added explicit `opts.TLSConfig.MinVersion = tls.VersionTLS12` for managed Valkey security requirements

3. **Complete ClickHouse Cloud env vars:** Added missing environment variable mappings in K8s deployment:
   - `CLICKHOUSE_DATABASE` (from `clickhouse-database` secret key)
   - `CLICKHOUSE_USER` (from `clickhouse-user` secret key)
   - `CLICKHOUSE_PASSWORD` (from `clickhouse-password` secret key)

## Implementation Details

### Go Code Changes (`policy-svc/cmd/main.go`)

```go
// Before (plain TCP only):
redisClient := redis.NewClient(&redis.Options{
    Addr: redisURL,
})

// After (TLS-aware):
opts, err := redis.ParseURL(redisURL)
if err != nil {
    sugar.Fatalw("Failed to parse Redis URL", "error", err, "url", redisURL)
}

// Ensure TLS 1.2+ for managed Valkey (rediss:// URLs)
if opts.TLSConfig != nil {
    opts.TLSConfig.MinVersion = tls.VersionTLS12
}

redisClient := redis.NewClient(opts)
```

**Benefits:**
- Automatic TLS enablement via `rediss://` scheme
- Backward compatible with `redis://` for local dev
- Explicit TLS version enforcement for security
- Single code path for all environments

### K8s Deployment Changes (`k8s/base/policy-svc-deployment.yaml`)

Added three missing env vars (after existing `CLICKHOUSE_URL`):

```yaml
- name: CLICKHOUSE_DATABASE
  valueFrom:
    secretKeyRef:
      name: policy-svc-secrets
      key: clickhouse-database
- name: CLICKHOUSE_USER
  valueFrom:
    secretKeyRef:
      name: policy-svc-secrets
      key: clickhouse-user
- name: CLICKHOUSE_PASSWORD
  valueFrom:
    secretKeyRef:
      name: policy-svc-secrets
      key: clickhouse-password
```

**Why needed:** The Go code (lines 67-73) already reads these env vars, but the K8s manifest wasn't mapping them from the Secret.

## Deviations from Plan

None - plan executed exactly as written.

## Testing & Verification

All verification steps passed:

- ✅ `cd policy-svc && go build ./cmd/main.go` compiles without errors
- ✅ `go vet ./...` passes with no issues
- ✅ `grep "redis.ParseURL" policy-svc/cmd/main.go` returns match
- ✅ `grep "tls.VersionTLS12" policy-svc/cmd/main.go` returns match
- ✅ `grep "CLICKHOUSE_USER" k8s/base/policy-svc-deployment.yaml` returns match
- ✅ `grep "CLICKHOUSE_PASSWORD" k8s/base/policy-svc-deployment.yaml` returns match
- ✅ `grep "CLICKHOUSE_DATABASE" k8s/base/policy-svc-deployment.yaml` returns match
- ✅ `grep "clickhouse-database" k8s/base/policy-svc-deployment.yaml` returns match (secret key ref)

## Environment Support Matrix

| Component | Development | Production |
|-----------|-------------|------------|
| Redis URL | `redis://redis:6379` | `rediss://valkey.do.db:25061` |
| Redis Transport | Plain TCP | TLS 1.2+ |
| ClickHouse URL | `http://clickhouse:8123` | `https://abc123.clickhouse.cloud:8443` |
| ClickHouse Auth | Optional (default user) | Required (username/password) |

**Code changes:** None needed - environment variables control behavior

## Commits

| Commit | Message | Files |
|--------|---------|-------|
| f59383c | feat(26-01): add TLS support for Valkey and complete ClickHouse env vars | policy-svc/cmd/main.go, k8s/base/policy-svc-deployment.yaml |

## Next Steps

Phase 26 Plan 02 will handle:
- API service database migrations to managed PostgreSQL
- API service connection string updates for Valkey TLS
- API service K8s deployment env vars for ClickHouse Cloud

## Self-Check: PASSED

**Created files verification:** N/A (no new files created)

**Modified files verification:**
```bash
[ -f "policy-svc/cmd/main.go" ] && echo "FOUND: policy-svc/cmd/main.go" || echo "MISSING"
# FOUND: policy-svc/cmd/main.go

[ -f "k8s/base/policy-svc-deployment.yaml" ] && echo "FOUND: k8s/base/policy-svc-deployment.yaml" || echo "MISSING"
# FOUND: k8s/base/policy-svc-deployment.yaml
```

**Commits verification:**
```bash
git log --oneline --all | grep -q "f59383c" && echo "FOUND: f59383c" || echo "MISSING"
# FOUND: f59383c
```

All artifacts verified successfully.
