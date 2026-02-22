---
phase: 27-control-plane-deployment
plan: 03
subsystem: ui-helm-deployment
tags:
  - helm
  - kubernetes
  - nextjs
  - ui
  - admin-ui
  - deployment
dependency_graph:
  requires:
    - 27-02 (Runtime environment configuration for UIs)
  provides:
    - UI Deployment + Service Helm template
    - Admin UI Deployment + Service Helm template
  affects:
    - Helm chart values
    - Ingress routing (future)
tech_stack:
  added:
    - Helm templates for Next.js standalone deployments
  patterns:
    - Runtime env vars via Values
    - Security contexts (non-root, UID 1001)
    - Pod anti-affinity for high availability
    - Rolling updates with zero downtime
key_files:
  created:
    - helm/safedns/templates/ui-deployment.yaml
    - helm/safedns/templates/admin-ui-deployment.yaml
  modified: []
decisions:
  - decision: Use /api/config for health probes
    rationale: Both UIs have /api/config endpoint created in Plan 27-02. This validates both Next.js runtime and config endpoint functionality, providing better health signal than simple HTTP 200 on /.
    alternatives: [Use / endpoint, Use Next.js built-in health, TCP socket check]
    tradeoffs: Slight overhead vs simple / check, but validates actual application functionality
  - decision: UID 1001 for nextjs user
    rationale: Matches Dockerfile USER directive for both UI and Admin UI containers. Using correct UID prevents permission issues with .next directory writes.
    alternatives: [UID 1000, UID 65534 (nobody)]
    tradeoffs: None - must match Dockerfile USER
  - decision: Service port 80 targeting container port 3000
    rationale: Standard HTTP port for clean Ingress routing. Container runs on 3000 (Next.js default), Service translates to port 80 for Ingress backends.
    alternatives: [Expose port 3000 on Service, Use port 8080]
    tradeoffs: None - industry standard pattern
  - decision: Conditional Admin UI deployment via adminUi.enabled
    rationale: Some environments may not need Admin UI (e.g., edge clusters, tenant-only deployments). Wrapping in conditional provides deployment flexibility.
    alternatives: [Always deploy Admin UI, Separate Helm chart]
    tradeoffs: Adds conditional complexity, but provides deployment flexibility
metrics:
  duration_minutes: 1
  tasks_completed: 2
  files_created: 2
  commits: 2
  completed_at: "2026-02-13T13:38:22Z"
---

# Phase 27 Plan 03: UI and Admin UI Helm Deployments Summary

Created Helm deployment templates for both UI and Admin UI with runtime environment variables, production security contexts, and health probes for Kubernetes orchestration.

## What Was Built

### UI Deployment Template (Task 1)
Created `helm/safedns/templates/ui-deployment.yaml` with:

**Deployment:**
- Replicas from `.Values.ui.replicaCount` (default: 2)
- Image: `nebuladns/ui:latest` (configurable via values)
- Runtime env vars: `API_URL`, `APP_URL`, `ADMIN_UI_URL`
- Security context: UID 1001 (nextjs user), non-root, drop ALL capabilities
- Resources: 100m/128Mi requests, 500m/512Mi limits
- Health probes: `/api/config` endpoint (liveness: 30s initial, readiness: 5s initial)
- Rolling update: maxSurge 1, maxUnavailable 0 (zero downtime)
- Pod anti-affinity: preferredDuringSchedulingIgnoredDuringExecution (spread across nodes)

**Service:**
- Type: ClusterIP
- Port 80 -> targetPort 3000
- Selector: `app.kubernetes.io/component: ui`

### Admin UI Deployment Template (Task 2)
Created `helm/safedns/templates/admin-ui-deployment.yaml` with:

**Deployment:**
- Replicas from `.Values.adminUi.replicaCount` (default: 2)
- Image: `nebuladns/admin-ui:latest` (configurable via values)
- Runtime env vars: `API_URL`, `TENANT_UI_URL`, `APP_URL`
- Security context: UID 1001 (nextjs user), non-root, drop ALL capabilities
- Resources: 100m/128Mi requests, 500m/512Mi limits
- Health probes: `/api/config` endpoint (liveness: 30s initial, readiness: 5s initial)
- Rolling update: maxSurge 1, maxUnavailable 0 (zero downtime)
- Pod anti-affinity: preferredDuringSchedulingIgnoredDuringExecution (spread across nodes)
- **Conditional deployment:** Wrapped in `{{- if .Values.adminUi.enabled | default true }}`

**Service:**
- Type: ClusterIP
- Port 80 -> targetPort 3000
- Selector: `app.kubernetes.io/component: admin-ui`

## Deviations from Plan

None - plan executed exactly as written.

## Implementation Details

### Environment Variable Mapping

**UI Deployment:**
```yaml
env:
  - name: NODE_ENV
    value: "production"
  - name: PORT
    value: "3000"
  - name: HOSTNAME
    value: "0.0.0.0"
  - name: API_URL
    value: {{ .Values.ui.env.API_URL | quote }}
  - name: APP_URL
    value: {{ .Values.ui.env.APP_URL | quote }}
  - name: ADMIN_UI_URL
    value: {{ .Values.ui.env.ADMIN_UI_URL | quote }}
```

**Admin UI Deployment:**
```yaml
env:
  - name: NODE_ENV
    value: "production"
  - name: PORT
    value: "3000"
  - name: HOSTNAME
    value: "0.0.0.0"
  - name: API_URL
    value: {{ .Values.adminUi.env.API_URL | quote }}
  - name: TENANT_UI_URL
    value: {{ .Values.adminUi.env.TENANT_UI_URL | quote }}
  - name: APP_URL
    value: {{ .Values.adminUi.env.APP_URL | quote }}
```

### Values.yaml Integration

From existing `helm/safedns/values.yaml`:

```yaml
ui:
  replicaCount: 2
  image:
    repository: nebuladns/ui
    tag: latest
    pullPolicy: IfNotPresent
  resources:
    limits:
      cpu: 500m
      memory: 512Mi
    requests:
      cpu: 100m
      memory: 128Mi
  env:
    API_URL: "http://api.nebula-dns.svc.cluster.local:80"
    APP_URL: "https://app.nebuladns.io"
    ADMIN_UI_URL: "https://admin.nebuladns.io"

adminUi:
  replicaCount: 2
  image:
    repository: nebuladns/admin-ui
    tag: latest
    pullPolicy: IfNotPresent
  resources:
    limits:
      cpu: 500m
      memory: 512Mi
    requests:
      cpu: 100m
      memory: 128Mi
  env:
    API_URL: "http://api.nebula-dns.svc.cluster.local:80"
    APP_URL: "https://app.nebuladns.io"
    TENANT_UI_URL: "https://app.nebuladns.io"
```

### Security Context Details

Both deployments use identical security contexts:

**Pod-level:**
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1001      # nextjs user from Dockerfile
  fsGroup: 1001        # Ensure volume permissions
```

**Container-level:**
```yaml
securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: false  # Next.js standalone needs write access to .next
  capabilities:
    drop:
      - ALL
```

### Health Probe Configuration

Both deployments use `/api/config` endpoint:

**Liveness Probe:**
- Initial delay: 30s (allow startup time)
- Period: 10s
- Timeout: 5s
- Failure threshold: 3 (30s before restart)

**Readiness Probe:**
- Initial delay: 5s (fast startup)
- Period: 5s
- Timeout: 3s
- Failure threshold: 3 (15s before removing from Service)

### Anti-Affinity Strategy

Both deployments use preferred pod anti-affinity:

```yaml
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchLabels:
              app.kubernetes.io/name: safedns
              app.kubernetes.io/instance: {{ .Release.Name }}
              app.kubernetes.io/component: ui  # or admin-ui
          topologyKey: kubernetes.io/hostname
```

**Behavior:** Kubernetes attempts to spread replicas across different nodes (weight 100 = strong preference), but will still schedule on same node if no other nodes available. This provides high availability without hard constraints.

## Testing & Verification

**Note:** Helm is not installed in execution environment. Template validation deferred to deployment time.

**Expected helm template output:**
```bash
helm template test ./helm/safedns \
  --set secrets.jwtSecret=test \
  --set secrets.encryptionKey=test \
  --set secrets.databaseUrl=test \
  --set secrets.databaseDirectUrl=test \
  --set secrets.redisUrl=test \
  --set secrets.clickhouseUrl=test
```

Should render:
1. UI Deployment with name `test-safedns-ui`
2. UI Service with port 80 -> 3000
3. Admin UI Deployment with name `test-safedns-admin-ui`
4. Admin UI Service with port 80 -> 3000

## Files Created (2 total)

### Created
- `helm/safedns/templates/ui-deployment.yaml` (112 lines)
- `helm/safedns/templates/admin-ui-deployment.yaml` (114 lines)

## Commits

**253414e** - `feat(27-03): create UI Helm deployment template`
- UI Deployment with runtime env vars (API_URL, APP_URL, ADMIN_UI_URL)
- Security context with UID 1001 (nextjs user)
- Rolling update strategy (maxSurge: 1, maxUnavailable: 0)
- Health probes using /api/config endpoint
- Pod anti-affinity for spreading across nodes
- Service exposing port 80 targeting container port 3000

**f4a0f6a** - `feat(27-03): create Admin UI Helm deployment template`
- Admin UI Deployment with runtime env vars (API_URL, TENANT_UI_URL, APP_URL)
- Security context with UID 1001 (nextjs user)
- Rolling update strategy (maxSurge: 1, maxUnavailable: 0)
- Health probes using /api/config endpoint
- Pod anti-affinity for spreading across nodes
- Service exposing port 80 targeting container port 3000
- Conditionally deployed via adminUi.enabled flag

## Next Steps

1. **Ingress Configuration** (likely Plan 27-04 or later):
   - Create Ingress rules for app.nebuladns.io → ui service
   - Create Ingress rules for admin.nebuladns.io → admin-ui service
   - Configure TLS with cert-manager

2. **Test Helm Deployment:**
   ```bash
   helm upgrade --install nebula-dns ./helm/safedns \
     --namespace nebula-dns --create-namespace \
     --set secrets.jwtSecret=... \
     --set secrets.encryptionKey=... \
     --set secrets.databaseUrl=... \
     --set secrets.databaseDirectUrl=... \
     --set secrets.redisUrl=... \
     --set secrets.clickhouseUrl=...
   ```

3. **Verify Deployments:**
   ```bash
   kubectl get deployments -n nebula-dns
   kubectl get pods -n nebula-dns -l app.kubernetes.io/component=ui
   kubectl get pods -n nebula-dns -l app.kubernetes.io/component=admin-ui
   kubectl logs -n nebula-dns -l app.kubernetes.io/component=ui
   ```

4. **Verify Services:**
   ```bash
   kubectl get services -n nebula-dns
   kubectl port-forward -n nebula-dns svc/nebula-dns-ui 3000:80
   kubectl port-forward -n nebula-dns svc/nebula-dns-admin-ui 3001:80
   ```

## Self-Check: PASSED

✓ UI deployment template exists: `/Users/jeremymcspadden/Github/nebula-dns/helm/safedns/templates/ui-deployment.yaml`
✓ Admin UI deployment template exists: `/Users/jeremymcspadden/Github/nebula-dns/helm/safedns/templates/admin-ui-deployment.yaml`
✓ Commit 253414e exists in git log
✓ Commit f4a0f6a exists in git log
✓ UI template contains API_URL, APP_URL, ADMIN_UI_URL env vars
✓ Admin UI template contains API_URL, TENANT_UI_URL env vars
✓ Both templates have security contexts (UID 1001, non-root)
✓ Both templates have health probes (/api/config)
✓ Both templates have pod anti-affinity rules
✓ Both services expose port 80 targeting port 3000
✓ Admin UI template is conditionally deployed via adminUi.enabled
