---
phase: 27-control-plane-deployment
plan: 04
subsystem: ingress-dns-automation
tags:
  - ingress
  - external-dns
  - cert-manager
  - tls
  - helm
  - kubernetes
  - production
dependency_graph:
  requires:
    - 27-01 (API Helm deployment)
    - 27-03 (UI and Admin UI Helm deployments)
  provides:
    - Helm Ingress template with TLS
    - external-dns for DNS automation
    - Admin UI Kustomize deployment
    - Production values file
  affects:
    - Future deployments (ingress routing configured)
tech_stack:
  added:
    - external-dns v0.14.0 for DigitalOcean
  patterns:
    - Helm Ingress templates with dynamic routing
    - cert-manager TLS automation
    - DNS record automation via external-dns
    - upsert-only DNS policy for safety
key_files:
  created:
    - helm/safedns/templates/ingress.yaml
    - k8s/base/external-dns-deployment.yaml
    - k8s/base/admin-ui-deployment.yaml
    - helm/safedns/values-production.yaml
  modified:
    - k8s/base/ingress.yaml
    - k8s/base/cert-manager/certificates.yaml
    - k8s/base/kustomization.yaml
decisions:
  - decision: Use upsert-only policy for external-dns
    rationale: Safer than sync policy - never deletes existing DNS records. Prevents accidental record deletion during deployments or configuration changes.
    alternatives: [sync policy (deletes unmanaged records), manual DNS management]
    tradeoffs: Requires manual cleanup of stale records, but prevents catastrophic DNS failures
  - decision: CORS allow origin for app and admin UI
    rationale: API needs to accept requests from both the tenant UI (app.nebuladns.io) and admin UI (admin.nebuladns.io). CORS configuration enables cross-origin requests.
    alternatives: [Allow all origins with *, Separate API endpoints per UI]
    tradeoffs: Explicit origin list is more secure than wildcard
  - decision: Replace deprecated kubernetes.io/ingress.class annotation
    rationale: Kubernetes 1.18+ uses spec.ingressClassName field instead of annotation. Using deprecated annotation causes warnings and may break in future Kubernetes versions.
    alternatives: [Keep deprecated annotation for compatibility]
    tradeoffs: None - ingressClassName is the standard approach
  - decision: Pre-provisioned secrets in production (secrets.create=false)
    rationale: Production secrets created by Phase 24-04 scripts with proper encryption and key management. Helm-generated secrets are for development/testing only.
    alternatives: [Helm-managed secrets, external-secrets operator]
    tradeoffs: Requires manual secret creation step, but provides better security controls
  - decision: Helm service names use release-chart pattern
    rationale: API_URL in values-production.yaml uses nebula-dns-safedns-api pattern (release name + chart name + component). This matches Helm's default naming convention from _helpers.tpl.
    alternatives: [Override with fullnameOverride, Use short service names]
    tradeoffs: Verbose but predictable naming, requires release name awareness
metrics:
  duration_seconds: 125
  tasks_completed: 2
  files_created: 4
  files_modified: 3
  commits: 2
  completed_at: "2026-02-13T13:43:12Z"
---

# Phase 27 Plan 04: Ingress, DNS Automation, and Production Configuration Summary

**Complete HTTPS routing with automatic TLS certificates and DNS record management for all control plane services**

## What Was Built

### Task 1: Ingress Templates and external-dns (Commit 5d7ad11)

**Helm Ingress Template (`helm/safedns/templates/ingress.yaml`):**
- Dynamic routing for API, UI, and Admin UI services
- cert-manager integration with letsencrypt-prod ClusterIssuer
- TLS configuration for all three subdomains (app, api, admin)
- CORS annotations for API subdomain (allows app and admin origins)
- Rate limiting: 100 connections, 50 requests/sec
- Conditional rendering via `.Values.ingress.enabled`
- Service name resolution via helper functions (safedns.api.fullname, etc.)

**external-dns Deployment (`k8s/base/external-dns-deployment.yaml`):**
- ServiceAccount + ClusterRole + ClusterRoleBinding for RBAC
- Deployment with single replica (Recreate strategy to prevent duplicates)
- Watches Ingress and Service resources for DNS record creation
- DigitalOcean DNS provider integration
- **upsert-only policy** (safer than sync - never deletes records)
- TXT record ownership tracking (_externaldns. prefix)
- Domain filter: nebuladns.io
- Security context: non-root (UID 65534), read-only root filesystem
- Requires `digitalocean-dns` Secret with access-token key

**Kustomize Ingress Update (`k8s/base/ingress.yaml`):**
- Added admin.nebuladns.io to TLS hosts
- Added admin.nebuladns.io routing rule to admin-ui service
- Replaced deprecated `kubernetes.io/ingress.class: nginx` annotation
- Now uses `spec.ingressClassName: nginx` (Kubernetes 1.18+ standard)
- Added CORS annotations for API subdomain
- Added copyright header

### Task 2: Admin UI Deployment and Production Values (Commit 4ff81ff)

**Admin UI Kustomize Deployment (`k8s/base/admin-ui-deployment.yaml`):**
- Deployment: 2 replicas, rolling update (maxSurge 1, maxUnavailable 0)
- Image: ghcr.io/nebuladns/admin-ui:latest
- Security context: UID 1001 (nextjs user), non-root, drop ALL capabilities
- Environment variables: API_URL, TENANT_UI_URL (cluster-local API, public tenant UI)
- Resources: 100m/128Mi requests, 500m/512Mi limits
- Health probes: /api/config endpoint (liveness 30s, readiness 5s)
- Pod anti-affinity: spread across nodes (weight 100)
- Service: ClusterIP on port 80 targeting port 3000

**Certificate Updates (`k8s/base/cert-manager/certificates.yaml`):**
- Web certificate: Changed from app/api.example.com to app/api/admin.nebuladns.io
- DNS resolver certificate: Changed from dns/doh/dot.example.com to dns1/dns2/dot.nebuladns.io
- Updated commonName fields to match primary domain
- Added copyright header

**Kustomization Updates (`k8s/base/kustomization.yaml`):**
- Added admin-ui-deployment.yaml to resources
- Added external-dns-deployment.yaml to resources
- Uncommented cert-manager/ directory (needed for production TLS)

**Production Values File (`helm/safedns/values-production.yaml`):**

API Configuration:
- Image: registry.digitalocean.com/nebula-dns/api
- 2 replicas minimum, autoscaling enabled (2-10 replicas)
- NODE_ENV: production, LOG_LEVEL: info

UI Configuration:
- Image: registry.digitalocean.com/nebula-dns/ui
- 2 replicas
- API_URL: http://nebula-dns-safedns-api.nebula-dns.svc.cluster.local:80

Admin UI Configuration:
- Image: registry.digitalocean.com/nebula-dns/admin-ui
- 2 replicas, enabled by default
- API_URL: cluster-local service name

Ingress Configuration:
- Three hosts: app, api, admin.nebuladns.io
- TLS secret: nebula-dns-tls (covers all three subdomains)

Managed Services Configuration:
- PostgreSQL: disabled (using managed DO PostgreSQL)
- Redis: disabled (using managed DO Valkey)
- ClickHouse: disabled (using ClickHouse Cloud with HTTPS)
- **Secrets: create=false** (pre-provisioned by Phase 24-04 scripts)

Migrations:
- Enabled with 900s timeout (15 minutes for production SSL latency)

## Deviations from Plan

None - plan executed exactly as written.

## Implementation Details

### Helm Ingress Template Logic

The template uses dynamic service name resolution:

```yaml
backend:
  service:
    {{- if eq .service "api" }}
    name: {{ include "safedns.api.fullname" $ }}
    {{- else if eq .service "ui" }}
    name: {{ include "safedns.ui.fullname" $ }}
    {{- else if eq .service "admin-ui" }}
    name: {{ include "safedns.admin-ui.fullname" $ }}
    {{- end }}
    port:
      name: http
```

For release name `nebula-dns`, this generates:
- API: nebula-dns-safedns-api
- UI: nebula-dns-safedns-ui
- Admin UI: nebula-dns-safedns-admin-ui

The production values file must use these full service names for API_URL configuration.

### external-dns Architecture

**Flow:**
1. external-dns watches Ingress resources in cluster
2. Detects hosts: app/api/admin.nebuladns.io
3. Creates A records in DigitalOcean DNS pointing to Ingress LoadBalancer IP
4. Creates TXT records for ownership tracking
5. Syncs every 1 minute

**upsert-only Policy Behavior:**
- CREATE: Yes - creates new records
- UPDATE: Yes - updates existing records managed by this instance
- DELETE: No - never deletes records (even if Ingress removed)

This prevents accidental DNS outages during deployments. Stale records must be manually cleaned up via DigitalOcean UI.

### Certificate Automation

**Web Certificate (nebula-dns-web-tls):**
- Covers: app.nebuladns.io, api.nebuladns.io, admin.nebuladns.io
- Algorithm: ECDSA 256-bit (smaller, faster than RSA)
- Issuer: letsencrypt-prod (90-day validity)
- Auto-renewal: 30 days before expiry

**DNS Resolver Certificate (dnsdist-tls):**
- Covers: dns1.nebuladns.io, dns2.nebuladns.io, dot.nebuladns.io
- Used for DoT (DNS over TLS) and DoH (DNS over HTTPS)
- Same ECDSA 256-bit algorithm
- Renew 30 days before expiry (renewBefore: 720h)

### Production Deployment Workflow

1. **Pre-requisites** (Phase 24-04):
   ```bash
   cd scripts/k8s
   ./create-secrets.sh production
   ```

2. **Deploy with Helm:**
   ```bash
   helm upgrade --install nebula-dns ./helm/safedns \
     -f helm/safedns/values-production.yaml \
     -n nebula-dns --create-namespace --wait
   ```

3. **Verify Ingress:**
   ```bash
   kubectl get ingress -n nebula-dns
   kubectl describe ingress nebula-dns-safedns -n nebula-dns
   ```

4. **Verify DNS Records:**
   ```bash
   kubectl logs -n kube-system -l app=external-dns
   dig app.nebuladns.io
   dig api.nebuladns.io
   dig admin.nebuladns.io
   ```

5. **Verify Certificates:**
   ```bash
   kubectl get certificates -n nebula-dns
   kubectl describe certificate nebula-dns-web-tls -n nebula-dns
   ```

6. **Test HTTPS Access:**
   ```bash
   curl -v https://app.nebuladns.io
   curl -v https://api.nebuladns.io/health
   curl -v https://admin.nebuladns.io
   ```

### CORS Configuration

The API subdomain allows cross-origin requests from both UIs:

```yaml
nginx.ingress.kubernetes.io/enable-cors: "true"
nginx.ingress.kubernetes.io/cors-allow-origin: "https://app.nebuladns.io,https://admin.nebuladns.io"
nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, PATCH, DELETE, OPTIONS"
nginx.ingress.kubernetes.io/cors-allow-headers: "Authorization, Content-Type, X-Requested-With"
```

This enables:
- Tenant UI (app.nebuladns.io) to call API (api.nebuladns.io)
- Admin UI (admin.nebuladns.io) to call API (api.nebuladns.io)
- JWT token authentication in Authorization header
- Content-Type: application/json for API requests

## Testing & Verification

**Ingress Template Rendering:**
Since Helm is not installed in the execution environment, template validation deferred to deployment time. Expected command:

```bash
helm template nebula-dns ./helm/safedns \
  --set secrets.jwtSecret=test \
  --set secrets.encryptionKey=test \
  --set secrets.databaseUrl=test \
  --set secrets.databaseDirectUrl=test \
  --set secrets.redisUrl=test \
  --set secrets.clickhouseUrl=test
```

Should render Ingress with:
- 3 rules (app, api, admin hosts)
- TLS config with nebula-dns-tls secret
- cert-manager.io/cluster-issuer annotation

**Production Values Rendering:**
```bash
helm template nebula-dns ./helm/safedns \
  -f helm/safedns/values-production.yaml
```

May show warnings about missing secrets (expected since secrets.create: false), but should render successfully.

**File Verification (Completed):**
- ✓ admin.nebuladns.io present in k8s/base/ingress.yaml
- ✓ admin.nebuladns.io present in k8s/base/cert-manager/certificates.yaml
- ✓ upsert-only policy in external-dns-deployment.yaml
- ✓ ingressClassName: nginx in k8s/base/ingress.yaml (deprecated annotation removed)
- ✓ admin-ui-deployment.yaml in kustomization.yaml resources
- ✓ external-dns-deployment.yaml in kustomization.yaml resources
- ✓ cert-manager/ uncommented in kustomization.yaml
- ✓ dns1/dns2.nebuladns.io in DNS resolver certificate

## Files Created (4 total)

### Created
- `helm/safedns/templates/ingress.yaml` (63 lines) - Helm Ingress template
- `k8s/base/external-dns-deployment.yaml` (99 lines) - external-dns for DigitalOcean
- `k8s/base/admin-ui-deployment.yaml` (108 lines) - Admin UI Kustomize deployment
- `helm/safedns/values-production.yaml` (107 lines) - Production Helm values

### Modified
- `k8s/base/ingress.yaml` (+20/-3 lines) - Added admin subdomain, replaced deprecated annotation, added CORS
- `k8s/base/cert-manager/certificates.yaml` (+7/-6 lines) - Updated to nebuladns.io domains
- `k8s/base/kustomization.yaml` (+3/-2 lines) - Added admin-ui, external-dns, uncommented cert-manager

## Commits

**5d7ad11** - `feat(27-04): create Ingress templates and external-dns deployment`
- Helm Ingress template with dynamic host/TLS configuration
- Routes traffic to API, UI, and Admin UI services
- cert-manager TLS automation with letsencrypt-prod
- CORS annotations for API subdomain
- external-dns deployment for DigitalOcean DNS automation
- upsert-only policy for safe DNS record management
- Kustomize ingress updated with admin.nebuladns.io
- Replaced deprecated kubernetes.io/ingress.class with ingressClassName

**4ff81ff** - `feat(27-04): create Admin UI deployment and production values`
- Kustomize Admin UI deployment with 2 replicas
- Security context with UID 1001 (nextjs user)
- Pod anti-affinity for spreading across nodes
- Health probes using /api/config endpoint
- Updated certificates from example.com to nebuladns.io domains
- Added admin.nebuladns.io to web certificate
- Updated DNS resolver certificates (dns1, dns2, dot.nebuladns.io)
- Added Admin UI and external-dns to Kustomization
- Uncommented cert-manager/ in Kustomization for production
- Production values file for DOKS deployment
- Configured managed databases (PostgreSQL, Valkey, ClickHouse Cloud)
- Pre-provisioned secrets (secrets.create: false)

## Next Steps

**Immediate (Next Plan or Phase):**

1. **Deploy Policy Service and dnsdist via Helm** (if not already in separate plan):
   - Create Helm templates for policy-svc and dnsdist
   - Configure dnsdist LoadBalancer services for DNS endpoints
   - Link to DNS resolver certificates

2. **Test Full Deployment:**
   ```bash
   # Apply Kustomize base (if using standalone Kustomize)
   kubectl apply -k k8s/base

   # OR deploy via Helm
   helm upgrade --install nebula-dns ./helm/safedns \
     -f helm/safedns/values-production.yaml \
     -n nebula-dns --create-namespace
   ```

3. **Configure DigitalOcean DNS Secret:**
   ```bash
   kubectl create secret generic digitalocean-dns \
     --from-literal=access-token=YOUR_DO_TOKEN \
     -n kube-system
   ```

4. **Monitor external-dns Logs:**
   ```bash
   kubectl logs -n kube-system -l app=external-dns -f
   ```

5. **Verify DNS Propagation:**
   ```bash
   watch -n 5 'dig app.nebuladns.io && dig api.nebuladns.io && dig admin.nebuladns.io'
   ```

6. **Test HTTPS Endpoints:**
   ```bash
   curl -I https://app.nebuladns.io
   curl -I https://api.nebuladns.io/health
   curl -I https://admin.nebuladns.io
   ```

**Future Enhancements:**

1. **Add Monitoring Dashboards:**
   - Ingress request rates
   - TLS certificate expiry tracking
   - external-dns sync success/failure metrics

2. **Add DNS Health Checks:**
   - Automated smoke tests for all subdomains
   - Certificate validation checks
   - HTTPS redirect verification

3. **Consider DNS Failover:**
   - Multi-region Ingress controllers
   - GeoDNS routing via DigitalOcean
   - Health-based DNS record updates

## Self-Check: PASSED

**Created files exist:**
- ✓ helm/safedns/templates/ingress.yaml
- ✓ k8s/base/external-dns-deployment.yaml
- ✓ k8s/base/admin-ui-deployment.yaml
- ✓ helm/safedns/values-production.yaml

**Modified files exist:**
- ✓ k8s/base/ingress.yaml
- ✓ k8s/base/cert-manager/certificates.yaml
- ✓ k8s/base/kustomization.yaml

**Commits exist:**
- ✓ 5d7ad11: Ingress templates and external-dns deployment
- ✓ 4ff81ff: Admin UI deployment and production values

**Key patterns verified:**
- ✓ Helm Ingress template references admin-ui service (2 occurrences)
- ✓ Kustomize ingress includes admin.nebuladns.io subdomain
- ✓ external-dns uses upsert-only policy (1 occurrence)
- ✓ Deprecated ingress.class annotation replaced with ingressClassName
- ✓ Certificates updated to nebuladns.io domains (8 domain references)
- ✓ Production values includes all three subdomains (11 references)
- ✓ Admin UI added to Kustomization
- ✓ external-dns added to Kustomization
- ✓ cert-manager/ uncommented in Kustomization

## Performance Metrics

- Duration: 125 seconds (2m 5s)
- Tasks completed: 2/2 (100%)
- Files created: 4
- Files modified: 3
- Commits: 2
- Lines added: ~377
- Lines removed: ~11
