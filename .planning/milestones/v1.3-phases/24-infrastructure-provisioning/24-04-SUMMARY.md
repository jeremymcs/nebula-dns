---
phase: 24-infrastructure-provisioning
plan: 04
subsystem: infrastructure
tags: [kubernetes, secrets, operations, credential-rotation, documentation]
dependency_graph:
  requires: [24-02-managed-databases, 24-03-clickhouse-operators]
  provides: [kubernetes-secrets, infrastructure-verification, credential-rotation-procedures]
  affects: [k8s-workload-deployment, operational-security]
tech_stack:
  added: []
  patterns: [bash-scripting, kubernetes-secrets-management, automated-verification, runbook-automation]
key_files:
  created:
    - infrastructure/kubernetes/secrets/create-secrets.sh
    - infrastructure/kubernetes/secrets/secret-template.yaml
    - infrastructure/scripts/verify-infrastructure.sh
    - infrastructure/scripts/rotate-credentials.sh
    - infrastructure/README.md
  modified: []
decisions:
  - decision: Auto-generate JWT secrets and encryption keys in create-secrets.sh
    rationale: Reduces manual error and ensures cryptographically secure random values
    alternatives: Manual generation documented in template
  - decision: Separate pooled and direct PostgreSQL URIs
    rationale: PgBouncer-pooled for application queries, direct for migrations (bypasses connection pooling)
    alternatives: Single URI (breaks migrations in transaction mode)
  - decision: Warn-level checks for database connectivity
    rationale: Requires VPC access or port-forwarding, may fail in CI/CD environments
    alternatives: Fail-level (too strict for initial verification)
  - decision: Interactive prompts for destructive credential rotations
    rationale: Prevents accidental JWT rotation (invalidates all sessions)
    alternatives: Always require --force flag
  - decision: Comprehensive README as single source of truth
    rationale: Documents entire provisioning workflow end-to-end (prerequisites to verification)
    alternatives: Multiple smaller docs (harder to navigate)
metrics:
  duration_minutes: 4.2
  tasks_completed: 2
  files_created: 5
  scripts_executable: 3
  verification_checks: 15
  rotation_procedures: 6
  completed_date: 2026-02-12
---

# Phase 24 Plan 04: Kubernetes Secrets and Operational Scripts Summary

**One-liner:** Kubernetes Secret creation from Terraform outputs with infrastructure verification and credential rotation runbook.

## What Was Built

Created operational toolkit bridging Terraform-provisioned infrastructure to Kubernetes workloads:

1. **Secret Creation Script** (`create-secrets.sh`):
   - Reads Terraform outputs (PostgreSQL, Valkey, ClickHouse connection URIs)
   - Generates `api-secrets` with database URLs, auto-generated JWT secrets (3 types), and encryption keys (3 types)
   - Generates `policy-svc-secrets` for Redis and ClickHouse connectivity
   - Generates `clickhouse-secrets` placeholder (update manually from ClickHouse Cloud)
   - Supports `--dry-run` mode for safe testing
   - Documents manual secrets (Stripe, SendGrid, Sentry) with example commands

2. **Secret Template** (`secret-template.yaml`):
   - Documents all required keys for every service (API, Policy Service, ClickHouse)
   - Shows connection string formats and value sources
   - Serves as reference for manual secret creation if Terraform unavailable

3. **Infrastructure Verification Script** (`verify-infrastructure.sh`):
   - Checks DOKS cluster connectivity and node health (3+ nodes ready)
   - Verifies Kubernetes version compatibility (1.30+)
   - Validates operator installations (cert-manager, external-dns)
   - Confirms Kubernetes Secrets existence (api-secrets, policy-svc-secrets, clickhouse-secrets)
   - Tests database connection string formats (warn-level for VPC-only resources)
   - Provides pass/fail/warn summary with exit codes

4. **Credential Rotation Runbook** (`rotate-credentials.sh`):
   - **JWT rotation:** Auto-generates new secrets, updates api-secrets, restarts API pods, warns of session invalidation
   - **Encryption key rotation:** Requires migration first, updates MFA/SSO/SIEM keys
   - **PostgreSQL rotation:** Documents manual steps via doctl and secret updates
   - **Valkey rotation:** Updates both api-secrets and policy-svc-secrets (shared by API and Policy Service)
   - **ClickHouse rotation:** Documents ClickHouse Cloud console procedure
   - **DigitalOcean token rotation:** Updates cert-manager and external-dns secrets
   - **all-app rotation:** Combines JWT and encryption key rotation
   - Each procedure documents impact, downtime, and verification commands

5. **Infrastructure README** (`README.md`):
   - Complete provisioning workflow (prerequisites → verification)
   - Tables documenting all provisioned resources and Kubernetes Secrets
   - Step-by-step instructions: API access setup, Terraform state bucket, infrastructure provisioning, kubectl configuration, operator installation, secret creation, verification
   - Credential rotation procedures and recommended schedules
   - Teardown warnings and data loss prevention
   - Troubleshooting guide (10 common issues with solutions)
   - Cost estimation ($386-536/month for DigitalOcean + ClickHouse Cloud)

## Key Integration Points

**create-secrets.sh integrates with:**
- Terraform outputs via `terraform output -raw` commands
- `openssl` for cryptographically secure random value generation
- `kubectl create secret` with pipe to `kubectl apply` (idempotent updates)

**verify-infrastructure.sh validates:**
- DOKS cluster health (15 checks covering nodes, operators, secrets, connectivity)
- Pass/fail/warn classification (fail for critical, warn for optional/VPC-only)

**rotate-credentials.sh coordinates:**
- Secret updates via `kubectl get secret | jq | kubectl apply` (atomic operations)
- Pod restarts via `kubectl rollout restart` with timeout verification
- Interactive prompts preventing accidental destructive operations

## Implementation Highlights

**Secret generation security:**
- JWT secrets: 48 bytes base64-encoded (384-bit entropy)
- Encryption keys: 32 bytes hex-encoded (256-bit entropy)
- OpenSSL rand ensures cryptographic quality

**Verification robustness:**
- Uses `--no-headers` and `grep -c` for reliable counts
- Supports multiple kubectl version output formats (legacy `--short`, modern `-o json`)
- Warn-level checks allow passing even if VPC connectivity unavailable

**Rotation safety:**
- Interactive confirmation for session-invalidating changes (JWT)
- Migration requirement checks for encryption keys (prevents data loss)
- Step-by-step procedures for manual rotations (databases, API tokens)

**Documentation completeness:**
- README covers entire workflow (zero to running cluster)
- Troubleshooting addresses 10 common failure scenarios
- Cost estimation provides budget planning data

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification commands passed:

```bash
# Files exist
ls -la infrastructure/kubernetes/secrets/create-secrets.sh
ls -la infrastructure/kubernetes/secrets/secret-template.yaml
ls -la infrastructure/scripts/verify-infrastructure.sh
ls -la infrastructure/scripts/rotate-credentials.sh
ls -la infrastructure/README.md

# Scripts executable
test -x infrastructure/kubernetes/secrets/create-secrets.sh && echo "executable"
test -x infrastructure/scripts/verify-infrastructure.sh && echo "executable"
test -x infrastructure/scripts/rotate-credentials.sh && echo "executable"

# create-secrets.sh reads Terraform outputs
grep "terraform output" infrastructure/kubernetes/secrets/create-secrets.sh
# Output: PG_URI=$(terraform output -raw postgres_connection_uri 2>/dev/null || echo "")
#         PG_DIRECT_URI=$(terraform output -raw postgres_direct_uri 2>/dev/null || echo "")
#         VALKEY_URI=$(terraform output -raw valkey_connection_uri 2>/dev/null || echo "")

# secret-template.yaml documents all three secrets
grep -E "(api-secrets|policy-svc-secrets|clickhouse-secrets)" infrastructure/kubernetes/secrets/secret-template.yaml | grep "name:"
# Output: name: api-secrets
#         name: policy-svc-secrets
#         name: clickhouse-secrets

# README covers provisioning workflow
grep "terraform apply" infrastructure/README.md
# Output: terraform apply (multiple occurrences)

# rotate-credentials.sh covers all credential types
grep "^rotate_" infrastructure/scripts/rotate-credentials.sh
# Output: rotate_jwt(), rotate_encryption(), rotate_postgres(), rotate_valkey(), rotate_clickhouse(), rotate_do_token()
```

## Testing

**Manual testing performed:**

1. **create-secrets.sh dry-run mode:**
   - Verified `--dry-run` prevents changes
   - Confirmed warning message when Terraform outputs unavailable

2. **Secret template validation:**
   - All keys documented match deployment requirements in `k8s/base/api-deployment.yaml`
   - Connection string formats validated against DigitalOcean and ClickHouse Cloud docs

3. **Verification script logic:**
   - Pass/fail/warn classification correct
   - Exit codes: 1 for failures, 0 for pass or pass-with-warnings

4. **Rotation script interactive prompts:**
   - Confirmation required for JWT and encryption rotations
   - Database/token rotations show procedural steps only (no auto-execution)

## What's Next

**Immediate next steps:**

1. Run infrastructure provisioning (24-05: Workload deployment plan)
2. Deploy Nebula DNS services to DOKS cluster
3. Run `create-secrets.sh` to generate Kubernetes Secrets from Terraform outputs
4. Run `verify-infrastructure.sh` to confirm all services healthy
5. Test end-to-end DNS query flow (client → dnsdist → policy-svc → unbound)

**Operational procedures enabled:**

- **Secret creation:** Automated from Terraform outputs (reduces manual errors)
- **Infrastructure verification:** 15 automated checks confirm deployment success
- **Credential rotation:** Documented procedures for all credential types with impact assessment
- **Troubleshooting:** 10 common issues documented with solutions

## Files Created

- `infrastructure/kubernetes/secrets/create-secrets.sh` (184 lines) - Secret creation from Terraform outputs
- `infrastructure/kubernetes/secrets/secret-template.yaml` (68 lines) - Secret documentation template
- `infrastructure/scripts/verify-infrastructure.sh` (103 lines) - Infrastructure health checks
- `infrastructure/scripts/rotate-credentials.sh` (205 lines) - Credential rotation runbook
- `infrastructure/README.md` (435 lines) - Complete provisioning documentation

## Self-Check

Verifying all claims from summary:

```bash
# Check all created files exist
[ -f "infrastructure/kubernetes/secrets/create-secrets.sh" ] && echo "FOUND: create-secrets.sh" || echo "MISSING: create-secrets.sh"
[ -f "infrastructure/kubernetes/secrets/secret-template.yaml" ] && echo "FOUND: secret-template.yaml" || echo "MISSING: secret-template.yaml"
[ -f "infrastructure/scripts/verify-infrastructure.sh" ] && echo "FOUND: verify-infrastructure.sh" || echo "MISSING: verify-infrastructure.sh"
[ -f "infrastructure/scripts/rotate-credentials.sh" ] && echo "FOUND: rotate-credentials.sh" || echo "MISSING: rotate-credentials.sh"
[ -f "infrastructure/README.md" ] && echo "FOUND: README.md" || echo "MISSING: README.md"
```

Result:
```
FOUND: create-secrets.sh
FOUND: secret-template.yaml
FOUND: verify-infrastructure.sh
FOUND: rotate-credentials.sh
FOUND: README.md
```

```bash
# Check commits exist
git log --oneline --all | grep -q "88b5924" && echo "FOUND: 88b5924 (Task 1)" || echo "MISSING: 88b5924"
git log --oneline --all | grep -q "944a87e" && echo "FOUND: 944a87e (Task 2)" || echo "MISSING: 944a87e"
```

Result:
```
FOUND: 88b5924 (Task 1)
FOUND: 944a87e (Task 2)
```

## Self-Check: PASSED

All files created, all commits exist, all verification commands successful.
