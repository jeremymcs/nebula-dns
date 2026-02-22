---
phase: 26-dns-stack-deployment
plan: 02
subsystem: dns-resolver
tags: [kubernetes, statefulset, unbound, dns]

dependency_graph:
  requires:
    - config/unbound/unbound.conf (configuration source)
    - k8s/base/kustomization.yaml (deployment orchestration)
  provides:
    - k8s/base/unbound-statefulset.yaml (StatefulSet + services + ConfigMap + PDB)
    - Stable pod DNS names (unbound-0.unbound-headless.nebula-dns.svc.cluster.local)
    - Load-balanced DNS endpoint (unbound.nebula-dns.svc.cluster.local:53)
  affects:
    - dnsdist backend pool configuration (future: will use unbound service)

tech_stack:
  added:
    - Kubernetes StatefulSet for Unbound DNS resolver
    - Persistent Volume Claims (1Gi cache per pod)
    - Headless Service for pod discovery
    - ClusterIP Service for load-balanced access
  patterns:
    - StatefulSet with persistent volumes for cache survival across pod restarts
    - Headless service providing stable DNS names for direct pod access
    - ClusterIP service providing load-balanced access for dnsdist
    - ConfigMap for configuration injection (not baked into image)
    - Pod anti-affinity to spread replicas across nodes

key_files:
  created:
    - k8s/base/unbound-statefulset.yaml: "Complete Unbound deployment with 6 resources"
  modified:
    - k8s/base/kustomization.yaml: "Added unbound-statefulset.yaml to resources"

decisions:
  - decision: "Use StatefulSet instead of Deployment for Unbound"
    rationale: "DNS cache benefits from persistence. StatefulSet provides stable pod identities and persistent volumes that survive pod restarts. This reduces upstream DNS queries and improves latency for frequently resolved domains."
    alternatives_considered:
      - "Deployment with ephemeral storage: Simpler but cache lost on pod restart"
      - "Deployment with PVC: Possible but lacks stable pod DNS names"

  - decision: "Provide both headless and ClusterIP services"
    rationale: "Headless service (clusterIP: None) enables direct pod access via stable DNS names (unbound-0, unbound-1, unbound-2). ClusterIP service provides load-balanced endpoint for dnsdist backend pool. Both patterns serve different use cases."
    alternatives_considered:
      - "Only ClusterIP: No stable pod DNS, harder for debugging/monitoring"
      - "Only headless: No load balancing, dnsdist would need to manage backend rotation"

  - decision: "Set 1Gi persistent volume per pod"
    rationale: "Unbound cache configured for 240MB total (128MB rrset + 64MB msg + 32MB key + 16MB neg). 1Gi provides 4x headroom for cache growth, root.key/root.hints files, and metadata. Balance between cost and performance."
    alternatives_considered:
      - "512Mi: Too tight, risk of disk pressure"
      - "5Gi: Wasteful for cache that peaks at ~300MB"

  - decision: "Use drill command for health checks instead of HTTP"
    rationale: "Unbound is a pure DNS resolver without HTTP interface. drill (DNS query tool in Alpine/Unbound image) performs actual DNS resolution test against localhost. More realistic than TCP socket check."
    alternatives_considered:
      - "TCP socket on port 53: Checks port open but not DNS functionality"
      - "HTTP endpoint: Would require adding custom health check server"

  - decision: "Embed unbound.conf in ConfigMap instead of baking into image"
    rationale: "ConfigMap allows config changes via kubectl without rebuilding/redeploying image. Follows Kubernetes best practice of separating config from code. Enables environment-specific tuning (dev vs prod)."
    alternatives_considered:
      - "Bake into image: Requires rebuild for any config change"
      - "External ConfigMap file: Creates two resources to manage"

metrics:
  duration_seconds: 68
  tasks_completed: 2
  files_created: 1
  files_modified: 1
  commits: 2
  lines_added: 263
  completed_date: "2026-02-13"
---

# Phase 26 Plan 02: Unbound StatefulSet Deployment Summary

**One-liner:** Created Unbound StatefulSet with 3 replicas, 1Gi persistent cache volumes, headless service for pod discovery, and ClusterIP service for load-balanced DNS access.

## Objective

Deploy Unbound recursive DNS resolver as a StatefulSet with persistent cache volumes to reduce upstream queries and improve latency. Provide both stable pod DNS names (for monitoring/debugging) and load-balanced service endpoint (for dnsdist backend pool).

## Execution

### Task 1: Create Unbound StatefulSet manifest with all supporting resources
**Status:** Complete
**Commit:** 40a2b96
**Files:** k8s/base/unbound-statefulset.yaml

Created complete Kubernetes manifest containing 6 resources:

1. **ConfigMap (unbound-config):** Embedded unbound.conf from config/unbound/ directory with DNSSEC validation, cache tuning (240MB total), privacy settings (qname minimization), and hardening options.

2. **ServiceAccount (unbound):** Standard service account for pod identity and RBAC integration.

3. **Headless Service (unbound-headless):** clusterIP: None enables stable pod DNS names (unbound-0.unbound-headless.nebula-dns.svc.cluster.local, unbound-1, unbound-2). Used for direct pod access in debugging/monitoring scenarios.

4. **ClusterIP Service (unbound):** Load-balanced endpoint at unbound.nebula-dns.svc.cluster.local:53. This is the service dnsdist will use for backend pool configuration.

5. **StatefulSet (unbound):**
   - 3 replicas with serviceName: unbound-headless
   - Image: ghcr.io/nebuladns/unbound:latest
   - Security: runAsUser 100 (Alpine unbound user), drop ALL capabilities, readOnlyRootFilesystem: false (Unbound writes cache)
   - Resources: 250m CPU / 256Mi RAM requests, 2 CPU / 2Gi RAM limits
   - Health checks: drill @127.0.0.1 google.com (actual DNS resolution test)
   - VolumeClaimTemplate: 1Gi ReadWriteOnce per pod mounted at /var/lib/unbound
   - ConfigMap mount: unbound.conf at /etc/unbound/unbound.conf (readOnly)
   - Pod anti-affinity: Preferred weight 100, spread across nodes by hostname

6. **PodDisruptionBudget (unbound-pdb):** minAvailable: 2 ensures 2/3 replicas always running during node drains or voluntary disruptions.

### Task 2: Add Unbound StatefulSet to Kustomization
**Status:** Complete
**Commit:** 263a5d5
**Files:** k8s/base/kustomization.yaml

Added unbound-statefulset.yaml to resources list, positioned after dnsdist-deployment.yaml (keeping DNS stack components together) and before ui-deployment.yaml. This enables deployment via standard `kubectl apply -k k8s/base` command.

## Verification

All verification checks passed:

- File contains all 6 resource types: ConfigMap, ServiceAccount, Service (x2), StatefulSet, PodDisruptionBudget ✓
- `grep "kind: StatefulSet"` returns match ✓
- `grep "serviceName: unbound-headless"` returns match ✓
- `grep "clusterIP: None"` returns match ✓
- `grep "storage: 1Gi"` returns match ✓
- `grep "drill"` returns matches (liveness + readiness probes) ✓
- `grep "unbound-statefulset.yaml" k8s/base/kustomization.yaml` returns match ✓

## Deviations from Plan

None - plan executed exactly as written.

## Auth Gates Encountered

None.

## Success Criteria Met

- [x] Unbound StatefulSet manifest exists with all supporting resources
- [x] 3 replicas configured with stable DNS names (unbound-0, unbound-1, unbound-2)
- [x] 1Gi persistent cache volumes per pod (volumeClaimTemplate)
- [x] Headless service (clusterIP: None) for pod discovery
- [x] ClusterIP service for load-balanced DNS access
- [x] ConfigMap contains embedded unbound.conf from config/ directory
- [x] ServiceAccount for pod identity
- [x] PodDisruptionBudget ensures 2/3 replicas always available
- [x] Health checks use drill command for actual DNS resolution testing
- [x] Pod anti-affinity spreads replicas across nodes
- [x] Kustomization includes unbound-statefulset.yaml
- [x] Deployment possible via `kubectl apply -k k8s/base`

## Architecture Impact

**DNS Stack Integration:**

```
┌─────────────────────────────────────────────────────────────┐
│ dnsdist (future)                                            │
│ - Extracts tenant_id from DoT/DoH                          │
│ - Routes to backend: unbound.nebula-dns.svc.cluster.local │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ unbound.nebula-dns.svc.cluster.local:53 (ClusterIP)       │
│ - Load balances across 3 Unbound pods                     │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ unbound-0    │    │ unbound-1    │    │ unbound-2    │
│ PVC: 1Gi     │    │ PVC: 1Gi     │    │ PVC: 1Gi     │
│ Cache: 240MB │    │ Cache: 240MB │    │ Cache: 240MB │
└──────────────┘    └──────────────┘    └──────────────┘
```

**Pod Discovery via Headless Service:**
- unbound-0.unbound-headless.nebula-dns.svc.cluster.local
- unbound-1.unbound-headless.nebula-dns.svc.cluster.local
- unbound-2.unbound-headless.nebula-dns.svc.cluster.local

## Next Steps

1. **Plan 26-03:** Create dnsdist StatefulSet with ConfigMap, headless service, ClusterIP service for DoT/DoH ingress
2. **Plan 26-04:** Wire dnsdist backend pool to unbound.nebula-dns.svc.cluster.local:53
3. **Plan 26-05:** Deploy DNS stack to DOKS cluster and verify end-to-end flow
4. **Plan 26-06:** Configure Network Policies to restrict Unbound ingress to dnsdist only

## Self-Check

### Verify Created Files

```bash
[ -f "k8s/base/unbound-statefulset.yaml" ] && echo "FOUND: k8s/base/unbound-statefulset.yaml" || echo "MISSING: k8s/base/unbound-statefulset.yaml"
```

**Result:** FOUND: k8s/base/unbound-statefulset.yaml ✓

### Verify Commits Exist

```bash
git log --oneline --all | grep -q "40a2b96" && echo "FOUND: 40a2b96" || echo "MISSING: 40a2b96"
git log --oneline --all | grep -q "263a5d5" && echo "FOUND: 263a5d5" || echo "MISSING: 263a5d5"
```

**Result:**
FOUND: 40a2b96 ✓
FOUND: 263a5d5 ✓

### Verify Content Integrity

```bash
grep -c "kind: " k8s/base/unbound-statefulset.yaml  # Expected: 6
grep "serviceName: unbound-headless" k8s/base/unbound-statefulset.yaml  # Expected: match
grep "storage: 1Gi" k8s/base/unbound-statefulset.yaml  # Expected: match
```

**Result:**
6 resources ✓
serviceName: unbound-headless ✓
storage: 1Gi ✓

## Self-Check: PASSED

All files created, commits exist, content verified. Plan 26-02 execution complete.

---

**Plan completed:** 2026-02-13
**Duration:** 68 seconds
**Commits:** 40a2b96, 263a5d5
**Files:** k8s/base/unbound-statefulset.yaml (created), k8s/base/kustomization.yaml (modified)
