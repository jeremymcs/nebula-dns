---
phase: 26-dns-stack-deployment
plan: 03
subsystem: dns-infrastructure
tags: [dnsdist, kubernetes, digitalocean, service-discovery, configmap]
dependency_graph:
  requires:
    - 26-02 (Unbound StatefulSet with ClusterIP service)
  provides:
    - dnsdist Deployment with DigitalOcean LoadBalancers
    - dnsdist ConfigMap with production configuration
    - End-to-end DNS query flow wiring
  affects:
    - DNS query routing (dnsdist -> policy-svc -> Unbound)
    - DigitalOcean LoadBalancer provisioning
    - external-dns automatic DNS record sync
tech_stack:
  added:
    - dnsdist-configmap.yaml (Kubernetes ConfigMap resource)
  patterns:
    - "DigitalOcean LoadBalancer annotations for TCP protocol"
    - "Kubernetes service discovery via .svc.cluster.local DNS"
    - "Prometheus metrics scraping annotations"
key_files:
  created:
    - k8s/base/dnsdist-configmap.yaml
  modified:
    - config/dnsdist/dnsdist.prod.conf
    - k8s/base/dnsdist-deployment.yaml
    - k8s/base/kustomization.yaml
decisions:
  - "Use full Kubernetes service DNS names (unbound.nebula-dns.svc.cluster.local) instead of short names to avoid relying on search domain configuration"
  - "Bind metrics webserver to 0.0.0.0:8083 instead of 127.0.0.1 to enable Prometheus scraping from outside the pod"
  - "Use DigitalOcean LoadBalancer size-unit 1 (smallest) for cost optimization while maintaining dual LoadBalancers for redundancy"
  - "Embed production config in ConfigMap instead of building into image for config changes without image rebuilds"
metrics:
  duration: "3 minutes"
  tasks_completed: 2
  files_modified: 4
  commits: 2
  completed_date: "2026-02-13"
---

# Phase 26 Plan 03: dnsdist Deployment with DigitalOcean LoadBalancers

**One-liner:** dnsdist deployed with DigitalOcean dual LoadBalancers, Kubernetes service discovery for Unbound/Policy Service backends, and ConfigMap-based production config.

## Tasks Completed

### Task 1: Update dnsdist production config for Kubernetes service discovery
**Commit:** b5dd467

Updated `config/dnsdist/dnsdist.prod.conf` with Kubernetes-specific configuration:
- Changed Unbound backend from `nebula-unbound:53` (Docker Compose) to `unbound.nebula-dns.svc.cluster.local:53` (Kubernetes ClusterIP)
- Changed Policy Service from `http://nebula-policy-svc:8080` to `http://policy-svc.nebula-dns.svc.cluster.local:80`
- Bound metrics webserver to `0.0.0.0:8083` (was `127.0.0.1:8083`) for Prometheus scraping accessibility
- Updated startup log message to "Kubernetes production" from "PRODUCTION mode"
- Updated copyright year from 2024 to 2026

**Rationale:** Docker Compose service names (`nebula-unbound`, `nebula-policy-svc`) don't resolve in Kubernetes. Must use Kubernetes service DNS format. Metrics endpoint must bind to all interfaces so Prometheus pods can scrape from pod IP.

### Task 2: Create dnsdist ConfigMap and update Deployment for DigitalOcean
**Commit:** 9d56213

**Part A: Created dnsdist ConfigMap** (`k8s/base/dnsdist-configmap.yaml`)
- ConfigMap name: `dnsdist-config` (matches Deployment volume reference)
- Data key: `dnsdist.conf` (matches Deployment subPath mount)
- Embedded full production config from Task 1 with Kubernetes service discovery
- Labels: `app: dnsdist`, `app.kubernetes.io/component: dns-frontend`

**Critical fix:** Deployment already referenced `configMap: name: dnsdist-config` but no ConfigMap resource existed. Without this, dnsdist pods fail to start with "ConfigMap not found" error.

**Part B: Updated dnsdist Deployment** (`k8s/base/dnsdist-deployment.yaml`)

**1. Replaced AWS annotations with DigitalOcean annotations (both services):**
- Removed: `aws-load-balancer-type: nlb`, `aws-load-balancer-cross-zone-load-balancing-enabled`
- Added: `do-loadbalancer-protocol: tcp`, `do-loadbalancer-size-unit: 1`, `do-loadbalancer-disable-lets-encrypt-dns-records: true`
- Preserved: `external-dns.alpha.kubernetes.io/hostname` for dns1.nebuladns.io and dns2.nebuladns.io

**2. Added Prometheus scraping annotations to pod template:**
```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "8083"
  prometheus.io/path: "/metrics"
```

**3. Updated POLICY_SVC_URL env var:**
- From: `http://policy-svc:80`
- To: `http://policy-svc.nebula-dns.svc.cluster.local:80`

**4. Added copyright headers to service definitions.**

**Part C: Added dnsdist ConfigMap to kustomization** (`k8s/base/kustomization.yaml`)
- Placed `dnsdist-configmap.yaml` before `dnsdist-deployment.yaml` in resources list
- Ensures ConfigMap created before Deployment that references it

## Deviations from Plan

None - plan executed exactly as written.

## End-to-End DNS Query Flow (Now Fully Wired)

```
Client DNS Query
  ↓
DigitalOcean LoadBalancer (dns1.nebuladns.io or dns2.nebuladns.io)
  ↓ TCP/853 (DoT) or TCP/443 (DoH)
dnsdist Pod (2-10 replicas via HPA)
  ↓ HTTP POST to policy-svc.nebula-dns.svc.cluster.local:80/evaluate
Policy Service Pod (evaluates tenant policy)
  ↓ Decision: ALLOW
dnsdist forwards to unbound.nebula-dns.svc.cluster.local:53
  ↓
Unbound ClusterIP Service (load balances across 3 pods)
  ↓
Unbound StatefulSet Pod (recursive resolution)
  ↓ Root DNS servers → authoritative servers
Response
  ↓ (reverse path)
Client receives answer
```

## DigitalOcean LoadBalancer Details

**Two LoadBalancers for redundancy:**
- `dnsdist-1` service → `dns1.nebuladns.io` (primary)
- `dnsdist-2` service → `dns2.nebuladns.io` (secondary)

**Annotations applied:**
- `do-loadbalancer-protocol: tcp` - TCP mode (DNS-over-TLS and DNS-over-HTTPS are both TCP-based)
- `do-loadbalancer-size-unit: 1` - Smallest LoadBalancer size (cost optimization)
- `do-loadbalancer-disable-lets-encrypt-dns-records: false` - Let external-dns manage DNS records
- `external-dns.alpha.kubernetes.io/hostname` - Triggers automatic DNS A record creation by external-dns controller

**Traffic flow:**
- LoadBalancer receives TCP/853 (DoT) or TCP/443 (DoH)
- `externalTrafficPolicy: Local` preserves source IP for policy enforcement
- Traffic routed to dnsdist pods on matching node

## Verification Evidence

All verification checks passed:

**ConfigMap:**
- ✅ File exists: `k8s/base/dnsdist-configmap.yaml`
- ✅ Kind: ConfigMap
- ✅ Name: `dnsdist-config`
- ✅ Data key: `dnsdist.conf`
- ✅ Contains Kubernetes service DNS: `unbound.nebula-dns.svc.cluster.local`
- ✅ Added to kustomization.yaml resources

**Deployment:**
- ✅ DigitalOcean annotations present (6 total, 3 per service)
- ✅ No AWS annotations remain (count: 0)
- ✅ Prometheus scraping annotations present
- ✅ Policy Service uses full Kubernetes DNS
- ✅ Both dnsdist-1 and dnsdist-2 services present
- ✅ external-dns annotations preserved (2 total)

**Production config:**
- ✅ Unbound backend: `unbound.nebula-dns.svc.cluster.local:53`
- ✅ Policy Service: `policy-svc.nebula-dns.svc.cluster.local:80`
- ✅ Metrics endpoint: `0.0.0.0:8083`
- ✅ Copyright year: 2026

## Dependency Resolution

**Satisfied by:**
- Plan 26-02: Unbound ClusterIP service (`unbound.nebula-dns.svc.cluster.local:53`) exists for dnsdist backend pool

**Enables:**
- Plan 26-04 (or subsequent): Deploy full DNS stack to DigitalOcean Kubernetes
- DNS query resolution flow end-to-end
- Dual LoadBalancer redundancy for production reliability

## Next Steps

**Immediate:**
- Plan 26-04 or beyond: Complete remaining DNS stack deployment tasks (if any), or proceed to Phase 27

**Future considerations:**
- Monitor DigitalOcean LoadBalancer costs (dual LoadBalancers, though smallest size)
- Configure external-dns controller to sync DNS records (dns1/dns2.nebuladns.io)
- Configure cert-manager to provision TLS certificates for DoT/DoH endpoints
- Set up Prometheus ServiceMonitor for dnsdist metrics scraping

## Self-Check: PASSED

**Created files verified:**
- ✅ `/Users/jeremymcspadden/Github/nebula-dns/k8s/base/dnsdist-configmap.yaml` exists

**Modified files verified:**
- ✅ `/Users/jeremymcspadden/Github/nebula-dns/config/dnsdist/dnsdist.prod.conf` contains Kubernetes service DNS
- ✅ `/Users/jeremymcspadden/Github/nebula-dns/k8s/base/dnsdist-deployment.yaml` contains DigitalOcean annotations
- ✅ `/Users/jeremymcspadden/Github/nebula-dns/k8s/base/kustomization.yaml` includes dnsdist-configmap.yaml

**Commits verified:**
- ✅ b5dd467: feat(26-03): update dnsdist production config for Kubernetes service discovery
- ✅ 9d56213: feat(26-03): create dnsdist ConfigMap and update Deployment for DigitalOcean

All artifacts present and correct. Plan execution complete.
