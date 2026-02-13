---
phase: 24
plan: 03
subsystem: infrastructure
tags: [terraform, clickhouse-cloud, cert-manager, external-dns, kubernetes-operators, dns-01]
dependencies:
  requires: [24-01]
  provides: [clickhouse-terraform-module, operator-helm-configs]
  affects: [infrastructure-provisioning]
tech_stack:
  added: [clickhouse-terraform-provider, cert-manager-helm, external-dns-helm]
  patterns: [dns-01-challenges, wildcard-certificates, managed-analytics]
key_files:
  created:
    - infrastructure/terraform/modules/clickhouse-cloud/main.tf
    - infrastructure/terraform/modules/clickhouse-cloud/variables.tf
    - infrastructure/terraform/modules/clickhouse-cloud/outputs.tf
    - infrastructure/kubernetes/operators/cert-manager-values.yaml
    - infrastructure/kubernetes/operators/external-dns-values.yaml
    - infrastructure/kubernetes/operators/install-operators.sh
  modified:
    - infrastructure/terraform/environments/production/main.tf
    - infrastructure/terraform/environments/production/variables.tf
    - infrastructure/terraform/environments/production/outputs.tf
    - infrastructure/terraform/environments/production/terraform.tfvars.example
    - infrastructure/terraform/shared/versions.tf
    - k8s/base/cert-manager/cluster-issuer.yaml
decisions:
  - what: Use official ClickHouse Terraform provider
    why: Managed solution reduces operational overhead vs self-hosted
    alternatives: [self-hosted-clickhouse, manual-api-provisioning]
  - what: DNS-01 challenge solver with DigitalOcean
    why: Enables wildcard certificates for *.nebuladns.io
    alternatives: [http-01-solver]
  - what: Development tier with 24-48GB auto-scaling
    why: Cost-effective for 100K-999K queries/day, scales to zero when idle
    alternatives: [production-tier, fixed-capacity]
metrics:
  duration_minutes: 8
  tasks_completed: 3
  files_created: 6
  files_modified: 6
  commits: 2
  loc_added: ~600
completed: 2026-02-12
---

# Phase 24 Plan 03: ClickHouse Cloud and Kubernetes Operators Summary

ClickHouse Cloud Terraform module with official provider, cert-manager and external-dns Helm configurations with DNS-01 challenges for wildcard certificates.

## What Was Built

### ClickHouse Cloud Terraform Module
Created a reusable Terraform module using the official ClickHouse provider (`ClickHouse/clickhouse` v0.2) for provisioning managed analytics infrastructure:

- **Development tier configuration**: 24-48GB auto-scaling with 5-minute idle timeout
- **Permissive IP access initially**: 0.0.0.0/0 (will be restricted to DOKS egress IPs after cluster provisioning)
- **Sensitive outputs**: Service endpoints and IAM role
- **Provider integration**: Added ClickHouse provider to production environment with org ID and token credentials

### Kubernetes Operators Configuration
Created Helm values and installation automation for cert-manager and external-dns:

**cert-manager Helm values:**
- CRD installation enabled (`installCRDs: true`)
- Resource limits for controller, webhook, and cainjector
- Prometheus ServiceMonitor enabled
- Leader election namespace configured

**external-dns Helm values:**
- DigitalOcean provider with `nebuladns.io` domain filter
- Sync policy enabled (create, update, delete)
- TXT ownership tracking (`txtOwnerId: nebula-dns-prod`)
- Watches Service and Ingress resources
- JSON logging with info level

**Install script (`install-operators.sh`):**
- Prerequisites validation (kubectl, helm, DO_TOKEN)
- Helm repo management (jetstack, external-dns)
- Secret creation in cert-manager and kube-system namespaces
- Dry-run support for testing
- Wait conditions for readiness verification
- ClusterIssuer application

### Updated ClusterIssuer
Replaced HTTP-01 solver with DNS-01 DigitalOcean solver:
- **Email**: Changed from `admin@example.com` to `jeremy@fluxlabs.net`
- **Solver type**: DNS-01 with DigitalOcean provider
- **Wildcard support**: Enables `*.nebuladns.io` certificates
- **Secret reference**: `digitalocean-dns` in cert-manager namespace
- Both staging and production issuers configured

## Implementation Details

### Task 1: ClickHouse Cloud Terraform Module
**Commit:** 9c42331

Created modular Terraform infrastructure for ClickHouse Cloud:

**Module structure:**
```
infrastructure/terraform/modules/clickhouse-cloud/
├── main.tf       # clickhouse_service resource
├── variables.tf  # service_name, tier, scaling config
└── outputs.tf    # service_id, endpoints (sensitive)
```

**Production integration:**
- Added `provider "clickhouse"` with org ID and token credentials
- Added `module "clickhouse"` invocation with `nebula-dns-production` service name
- Variables: `clickhouse_org_id`, `clickhouse_token_key`, `clickhouse_token_secret` (all sensitive)
- Outputs: `clickhouse_service_id`, `clickhouse_endpoints` (sensitive)
- Updated `terraform.tfvars.example` with placeholder credentials

**Key configuration:**
```hcl
resource "clickhouse_service" "analytics" {
  name           = var.service_name
  cloud_provider = var.cloud_provider  # default: aws
  region         = var.region          # default: us-east-1
  tier           = var.tier            # default: development

  ip_access = [{
    source      = "0.0.0.0/0"
    description = "Allow all (restrict after DOKS egress IP is known)"
  }]

  min_total_memory_gb  = var.min_total_memory_gb  # default: 24
  max_total_memory_gb  = var.max_total_memory_gb  # default: 48
  idle_scaling         = var.idle_scaling         # default: true
  idle_timeout_minutes = var.idle_timeout_minutes # default: 5
}
```

### Task 2: Kubernetes Operators Configuration
**Commit:** d8d4971

Created Helm values and automation for Kubernetes operators:

**cert-manager configuration:**
- Version: v1.14.0 (Helm chart)
- Namespace: cert-manager (auto-created)
- CRDs installed automatically
- Resource limits prevent resource exhaustion:
  - Controller: 50m CPU / 64Mi memory (requests), 200m / 256Mi (limits)
  - Webhook: 25m / 32Mi (requests), 100m / 128Mi (limits)
  - CAInjector: 25m / 64Mi (requests), 100m / 256Mi (limits)

**external-dns configuration:**
- Provider: DigitalOcean
- Domain filter: `nebuladns.io`
- Policy: sync (create, update, delete records)
- Ownership: TXT records with `_externaldns.` prefix and `nebula-dns-prod` owner ID
- Sources: Service and Ingress resources
- Resource limits: 25m CPU / 64Mi memory (requests), 100m / 128Mi (limits)

**Install script features:**
- Validates prerequisites: `kubectl`, `helm`, `DO_TOKEN` env var
- Adds Helm repos: jetstack (cert-manager), external-dns
- Creates secrets:
  - `digitalocean-credentials` in kube-system (for external-dns)
  - `digitalocean-dns` in cert-manager (for DNS-01 solver)
- Waits for cert-manager webhook readiness (120s timeout)
- Applies ClusterIssuer from `k8s/base/cert-manager/cluster-issuer.yaml`
- Supports `--dry-run` flag for testing

**ClusterIssuer changes:**
- Solver: HTTP-01 → DNS-01 with DigitalOcean
- Email: `admin@example.com` → `jeremy@fluxlabs.net`
- Capability: Standard certs → Wildcard certificates (`*.nebuladns.io`)
- Secret: `digitalocean-dns` in cert-manager namespace

### Task 3: Human Verification Checkpoint
**Status:** Approved

User approved configuration without detailed review. All files are ready for provisioning:
- ClickHouse Cloud module ready for `terraform apply` (requires account and API credentials)
- Operator configs ready for `install-operators.sh` execution (requires running DOKS cluster)
- ClusterIssuer ready for certificate issuance after cert-manager installation

## Deviations from Plan

None. Plan executed exactly as written.

## Key Decisions

### ClickHouse Cloud Provider Selection
**Decision:** Use official ClickHouse Terraform provider (`ClickHouse/clickhouse`)
**Why:** Managed solution with auto-scaling reduces operational overhead compared to self-hosted ClickHouse
**Impact:** Requires ClickHouse Cloud account and API credentials, but eliminates database operations burden

### DNS-01 Challenge Solver
**Decision:** Use DNS-01 with DigitalOcean instead of HTTP-01
**Why:** DNS-01 enables wildcard certificates (`*.nebuladns.io`), while HTTP-01 only supports individual domains
**Impact:** Requires DigitalOcean DNS management, but provides more flexible certificate options

### Development Tier with Auto-Scaling
**Decision:** Start with ClickHouse Cloud development tier (24-48GB) and 5-minute idle timeout
**Why:** Cost-effective for initial 100K-999K queries/day, scales to zero when idle to minimize costs
**Impact:** Can upgrade to production tier as traffic grows, but may have cold-start latency after idle periods

## Files Modified

### Created (6 files)
1. `infrastructure/terraform/modules/clickhouse-cloud/main.tf` - ClickHouse service resource
2. `infrastructure/terraform/modules/clickhouse-cloud/variables.tf` - Module variables
3. `infrastructure/terraform/modules/clickhouse-cloud/outputs.tf` - Service outputs
4. `infrastructure/kubernetes/operators/cert-manager-values.yaml` - Helm values
5. `infrastructure/kubernetes/operators/external-dns-values.yaml` - Helm values
6. `infrastructure/kubernetes/operators/install-operators.sh` - Installation automation (executable)

### Modified (6 files)
1. `infrastructure/terraform/environments/production/main.tf` - Added ClickHouse provider and module
2. `infrastructure/terraform/environments/production/variables.tf` - Added ClickHouse credentials
3. `infrastructure/terraform/environments/production/outputs.tf` - Added ClickHouse outputs
4. `infrastructure/terraform/environments/production/terraform.tfvars.example` - Added ClickHouse placeholders
5. `infrastructure/terraform/shared/versions.tf` - Added ClickHouse provider to required_providers
6. `k8s/base/cert-manager/cluster-issuer.yaml` - Changed to DNS-01 solver

## Verification Checklist

- [x] ClickHouse module uses official provider (`ClickHouse/clickhouse` v0.2)
- [x] Development tier configured with 24-48GB auto-scaling
- [x] Idle scaling enabled with 5-minute timeout
- [x] cert-manager values enable CRD installation
- [x] cert-manager resource limits configured for all components
- [x] external-dns uses DigitalOcean provider
- [x] Domain filter set to `nebuladns.io`
- [x] Sync policy enabled with TXT ownership tracking
- [x] Install script validates prerequisites (kubectl, helm, DO_TOKEN)
- [x] Install script supports `--dry-run` mode
- [x] ClusterIssuer uses DNS-01 with DigitalOcean solver
- [x] Email changed to `jeremy@fluxlabs.net`
- [x] Both staging and production issuers configured
- [x] All files include copyright headers

## Next Steps

### Immediate (Phase 24-04)
1. Create ClickHouse Cloud account at https://clickhouse.cloud/
2. Generate API credentials (Settings → API Keys → Create Key with admin permissions)
3. Export credentials: `CLICKHOUSE_ORG_ID`, `CLICKHOUSE_TOKEN_KEY`, `CLICKHOUSE_TOKEN_SECRET`
4. Run `terraform apply` to provision ClickHouse Cloud service
5. Save service endpoints for NestJS API configuration

### After DOKS Cluster Creation (Phase 27)
1. Configure kubectl to access DOKS cluster
2. Export `DO_TOKEN` for external-dns and cert-manager
3. Run `./install-operators.sh` to install cert-manager and external-dns
4. Verify cert-manager: `kubectl get pods -n cert-manager`
5. Verify external-dns: `kubectl get pods -n kube-system -l app.kubernetes.io/name=external-dns`
6. Verify ClusterIssuers: `kubectl get clusterissuers`
7. Test certificate issuance with staging issuer first

### Security Hardening (Post-MVP)
1. Restrict ClickHouse IP access to DOKS egress IPs (currently 0.0.0.0/0)
2. Rotate ClickHouse API credentials regularly
3. Review cert-manager certificate renewal logs
4. Monitor external-dns DNS record creation/updates

## Performance Metrics

- **Duration:** 8 minutes
- **Tasks completed:** 3/3 (100%)
- **Files created:** 6
- **Files modified:** 6
- **Commits:** 2
- **Lines of code added:** ~600

## Self-Check: PASSED

All claimed artifacts verified:

**Created files:**
- FOUND: infrastructure/terraform/modules/clickhouse-cloud/main.tf
- FOUND: infrastructure/terraform/modules/clickhouse-cloud/variables.tf
- FOUND: infrastructure/terraform/modules/clickhouse-cloud/outputs.tf
- FOUND: infrastructure/kubernetes/operators/cert-manager-values.yaml
- FOUND: infrastructure/kubernetes/operators/external-dns-values.yaml
- FOUND: infrastructure/kubernetes/operators/install-operators.sh (executable)

**Modified files:**
- FOUND: infrastructure/terraform/environments/production/main.tf (ClickHouse provider and module)
- FOUND: infrastructure/terraform/environments/production/variables.tf (ClickHouse credentials)
- FOUND: infrastructure/terraform/environments/production/outputs.tf (ClickHouse outputs)
- FOUND: infrastructure/terraform/environments/production/terraform.tfvars.example (ClickHouse placeholders)
- FOUND: infrastructure/terraform/shared/versions.tf (ClickHouse provider)
- FOUND: k8s/base/cert-manager/cluster-issuer.yaml (DNS-01 solver)

**Commits verified:**
- FOUND: 9c42331 (ClickHouse Cloud Terraform module)
- FOUND: d8d4971 (cert-manager and external-dns operators)
