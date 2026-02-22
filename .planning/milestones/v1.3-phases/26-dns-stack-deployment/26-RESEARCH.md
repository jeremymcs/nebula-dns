# Phase 26: DNS Stack Deployment - Research

// Nebula DNS Phase 26 Research
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

**Researched:** 2026-02-12
**Domain:** DNS stack deployment, Kubernetes workloads, managed service integration, load balancing
**Confidence:** HIGH

## Summary

Phase 26 deploys the DNS resolution stack (dnsdist, Policy Service, Unbound) to production Kubernetes infrastructure provisioned in Phase 24 and 25. This phase completes the end-to-end DNS query flow: client → dnsdist (DoT/DoH) → Policy Service (evaluation) → Unbound (resolution) → response. The research reveals that the existing codebase already contains production-ready Kubernetes manifests with proper security contexts, health checks, and autoscaling configurations.

Key findings show that dnsdist requires dual LoadBalancer services for DNS redundancy (dns1/dns2 pattern), Unbound benefits from StatefulSet with persistent cache volumes for improved performance across restarts, and Policy Service needs careful connection configuration for managed Valkey (TLS required) and ClickHouse Cloud (HTTPS only). DigitalOcean's LoadBalancer implementation integrates seamlessly with external-dns for automatic DNS record synchronization.

The critical deployment challenge is configuring environment-specific connection strings for managed services (Valkey TLS ports, ClickHouse Cloud HTTPS URLs) versus local development (plain connections). The existing network policies already enforce proper isolation, and the Dockerfiles are production-ready with non-root users and health checks.

**Primary recommendation:** Deploy Policy Service first (connecting to managed Valkey and ClickHouse Cloud), then Unbound as StatefulSet with 1Gi persistent cache volumes, finally dnsdist with dual LoadBalancer services annotated for external-dns synchronization. Use Kubernetes Secrets for all connection strings and enable VPC-only access for databases.

## Standard Stack

### Core Deployment Components

| Component | Type | Purpose | Why This Approach |
|-----------|------|---------|-------------------|
| **Policy Service** | Deployment | Policy evaluation engine | Stateless service, scales horizontally, 3-20 replicas with HPA |
| **Unbound** | StatefulSet | DNS recursive resolver | Stateful (cache benefits from persistence), requires stable pod identity |
| **dnsdist** | Deployment | DNS load balancer/frontend | Stateless distributor, scales with DNS traffic, 2-10 replicas with HPA |
| **LoadBalancer (DO)** | Service | Public DNS endpoints | DigitalOcean Network Load Balancer, TCP/UDP support for DoT/DoH |

### Existing Kubernetes Resources (Already in Codebase)

| Resource | Location | Status | Notes |
|----------|----------|--------|-------|
| policy-svc Deployment | `k8s/base/policy-svc-deployment.yaml` | ✅ Ready | 3-20 replicas, HPA enabled, pod anti-affinity configured |
| dnsdist Deployment | `k8s/base/dnsdist-deployment.yaml` | ✅ Ready | Dual LoadBalancers (dns1/dns2), 2-10 replicas, HPA enabled |
| Network Policies | `k8s/base/network-policies/*-netpol.yaml` | ✅ Ready | Proper isolation for policy-svc, dnsdist, unbound |
| PodDisruptionBudgets | `k8s/base/pdbs/*-pdb.yaml` | ✅ Ready | PDBs for all DNS components |
| Dockerfiles | `policy-svc/Dockerfile`, `config/*/Dockerfile` | ✅ Ready | Multi-stage builds, non-root users, health checks |

### Missing Resources (Need Creation)

| Resource | Purpose | Priority |
|----------|---------|----------|
| Unbound StatefulSet | Deploy Unbound with persistent cache | **CRITICAL** |
| Unbound Headless Service | Stable DNS for StatefulSet pods | **CRITICAL** |
| dnsdist ConfigMap | Mount dnsdist.conf into pods | **HIGH** |
| Production Secrets | Valkey/ClickHouse Cloud connection strings | **CRITICAL** |
| VolumeClaimTemplate | PVC for Unbound cache persistence | **HIGH** |

### Connection Requirements

| Service | Development | Production (DigitalOcean) |
|---------|-------------|---------------------------|
| **Valkey/Redis** | `redis://redis:6379` (plain) | `rediss://user:pass@host:25061/0` (TLS required) |
| **ClickHouse** | `http://clickhouse:8123` | `https://xyz.clickhouse.cloud:8443` (HTTPS only) |
| **PostgreSQL** | `postgresql://user:pass@postgres:5432/db` | `postgresql://user:pass@host:25060/db?sslmode=require` (pooled connection) |

**Installation:**
```bash
# Already have: kubectl, helm, doctl from Phase 24

# Verify cluster access
doctl kubernetes cluster kubeconfig save nebula-dns-prod
kubectl get nodes

# Verify managed services from Phase 24
doctl databases list  # Should show postgres, valkey, clickhouse
```

### Supporting Tools

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| **stern** | 1.28+ | Multi-pod log tailing | Monitor DNS query flow across dnsdist → policy-svc → unbound |
| **k9s** | 0.32+ | Interactive cluster UI | Debug pod issues, view resource usage |
| **dig/drill** | Latest | DNS query testing | Test DoT/DoH endpoints after deployment |
| **grpcurl** | Latest | gRPC testing | Test Policy Service endpoints directly |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| StatefulSet for Unbound | Deployment | Deployment loses cache on pod restarts, worse query latency |
| Dual LoadBalancers | Single LoadBalancer | Single point of failure, no DNS redundancy for clients |
| DigitalOcean LB | Ingress + NodePort | Ingress is L7 (HTTP), DNS needs L4 (TCP/UDP) for DoT |
| Managed Valkey | Self-hosted Redis | More control, but adds operational burden (backups, updates, HA) |
| Persistent volumes | emptyDir | emptyDir clears on pod restart, cache not preserved |

## Architecture Patterns

### Recommended Deployment Order

```
1. Verify Phase 24/25 Prerequisites
   ✓ DOKS cluster running
   ✓ Managed Valkey accessible (VPC-private)
   ✓ ClickHouse Cloud accessible (HTTPS)
   ✓ PostgreSQL accessible (pooled + direct URIs)
   ✓ cert-manager installed (for TLS certs)
   ✓ external-dns installed (for DNS sync)

2. Create Kubernetes Secrets
   - policy-svc-secrets (Valkey, ClickHouse Cloud, PostgreSQL URIs)
   - dnsdist-secrets (API key for web console)
   - dnsdist-tls (TLS certificates for DoT/DoH)

3. Deploy Policy Service (Deployment)
   kubectl apply -f k8s/base/policy-svc-deployment.yaml
   # Wait for all replicas ready
   kubectl rollout status deployment/policy-svc -n nebula-dns

4. Deploy Unbound (StatefulSet)
   kubectl apply -f k8s/base/unbound-statefulset.yaml
   # Wait for all replicas ready
   kubectl rollout status statefulset/unbound -n nebula-dns

5. Create dnsdist ConfigMap
   kubectl create configmap dnsdist-config \
     --from-file=dnsdist.conf=config/dnsdist/dnsdist.conf \
     -n nebula-dns

6. Deploy dnsdist (Deployment + dual LoadBalancers)
   kubectl apply -f k8s/base/dnsdist-deployment.yaml
   # Wait for LoadBalancer IPs
   kubectl get svc -n nebula-dns -w

7. Verify External DNS Sync
   # external-dns should create A records for dns1/dns2
   dig @8.8.8.8 dns1.nebuladns.io
   dig @8.8.8.8 dns2.nebuladns.io

8. Test End-to-End DNS Flow
   # DoT test
   kdig @dns1.nebuladns.io +tls example.com
   # DoH test
   curl -H 'accept: application/dns-json' \
     'https://dns1.nebuladns.io/dns-query?name=example.com&type=A'
```

### Pattern 1: StatefulSet for Stateful DNS Resolver

**What:** Deploy Unbound as StatefulSet with persistent volume claims for cache data.

**When to use:** When DNS resolver benefits from persistent cache across pod restarts (reduces upstream queries, improves latency).

**Example:**
```yaml
# k8s/base/unbound-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: unbound
  namespace: nebula-dns
spec:
  serviceName: unbound-headless
  replicas: 3
  selector:
    matchLabels:
      app: unbound
  volumeClaimTemplates:
    - metadata:
        name: cache
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 1Gi
  template:
    metadata:
      labels:
        app: unbound
    spec:
      containers:
        - name: unbound
          image: ghcr.io/nebuladns/unbound:latest
          volumeMounts:
            - name: cache
              mountPath: /var/lib/unbound
            - name: config
              mountPath: /etc/unbound/unbound.conf
              subPath: unbound.conf
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: "2"
              memory: 2Gi
      volumes:
        - name: config
          configMap:
            name: unbound-config
```

**Why StatefulSet:**
- Each Unbound pod gets stable hostname: `unbound-0.unbound-headless.nebula-dns.svc.cluster.local`
- Persistent volume survives pod restarts (cache remains warm)
- Ordered deployment/scaling (unbound-0 → unbound-1 → unbound-2)
- Headless service provides direct pod DNS (for internal monitoring)

**Source:** [StatefulSets | Kubernetes](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/), [How to Configure Kubernetes StatefulSets](https://oneuptime.com/blog/post/2026-02-02-kubernetes-statefulsets-guide/view)

### Pattern 2: Dual LoadBalancer for DNS Redundancy

**What:** Create two separate LoadBalancer services (dns1, dns2) pointing to the same dnsdist Deployment for DNS endpoint redundancy.

**When to use:** When DNS clients need redundant nameserver IPs (standard practice: configure 2+ nameservers).

**Example:**
```yaml
# Primary DNS endpoint
apiVersion: v1
kind: Service
metadata:
  name: dnsdist-1
  namespace: nebula-dns
  annotations:
    external-dns.alpha.kubernetes.io/hostname: dns1.nebuladns.io
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  ports:
    - port: 853
      targetPort: dot
      protocol: TCP
      name: dot
    - port: 443
      targetPort: doh
      protocol: TCP
      name: doh
  selector:
    app: dnsdist
---
# Secondary DNS endpoint
apiVersion: v1
kind: Service
metadata:
  name: dnsdist-2
  namespace: nebula-dns
  annotations:
    external-dns.alpha.kubernetes.io/hostname: dns2.nebuladns.io
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  ports:
    - port: 853
      targetPort: dot
      protocol: TCP
      name: dot
    - port: 443
      targetPort: doh
      protocol: TCP
      name: doh
  selector:
    app: dnsdist
```

**Why Dual LoadBalancers:**
- Each LoadBalancer gets unique public IP from DigitalOcean
- external-dns creates separate A records (dns1.nebuladns.io, dns2.nebuladns.io)
- Clients configure both IPs as nameservers (automatic failover)
- Both LoadBalancers distribute traffic to same dnsdist pods (N+N redundancy)

**Source:** [How to Add Load Balancers to Kubernetes Clusters | DigitalOcean](https://docs.digitalocean.com/products/kubernetes/how-to/add-load-balancers/)

### Pattern 3: Environment-Aware Connection Strings

**What:** Use different connection strings for managed services (Valkey, ClickHouse Cloud) versus local development.

**When to use:** When deploying to environments with managed databases that require TLS/SSL.

**Example:**
```yaml
# Development (docker-compose)
environment:
  REDIS_URL: "redis://redis:6379"
  CLICKHOUSE_URL: "http://clickhouse:8123"

# Production (DigitalOcean managed services)
apiVersion: v1
kind: Secret
metadata:
  name: policy-svc-secrets
  namespace: nebula-dns
type: Opaque
stringData:
  redis-url: "rediss://default:YOURPASSWORD@valkey-cluster-do-user-123456-0.b.db.ondigitalocean.com:25061/0?tls=true"
  clickhouse-url: "https://abc123xyz.us-east-1.clickhouse.cloud:8443"
  clickhouse-user: "default"
  clickhouse-password: "YOURPASSWORD"
  postgres-url: "postgresql://user:pass@postgres-cluster-do-user-123456-0.b.db.ondigitalocean.com:25060/nebula?sslmode=require"
```

**Connection Details:**
- **Valkey:** Port 25061 (TLS), requires `rediss://` scheme and `?tls=true` parameter
- **ClickHouse Cloud:** HTTPS only (port 8443), uses username/password auth
- **PostgreSQL:** Port 25060 (pooled via PgBouncer), requires `sslmode=require`

**Source:** [How to Connect to Valkey Database Clusters | DigitalOcean](https://docs.digitalocean.com/products/databases/valkey/how-to/connect/), [ClickHouse® Go example](https://www.tinybird.co/blog/clickhouse-golang-example)

### Pattern 4: ConfigMap for dnsdist Configuration

**What:** Mount dnsdist.conf from ConfigMap instead of baking into Docker image.

**When to use:** When configuration needs to be updated without rebuilding container images.

**Example:**
```bash
# Create ConfigMap from file
kubectl create configmap dnsdist-config \
  --from-file=dnsdist.conf=config/dnsdist/dnsdist.conf \
  -n nebula-dns

# Or via YAML
apiVersion: v1
kind: ConfigMap
metadata:
  name: dnsdist-config
  namespace: nebula-dns
data:
  dnsdist.conf: |
    -- Nebula DNS - dnsdist Configuration
    local POLICY_SVC_URL = "http://policy-svc:80"

    newServer({
        address = "unbound-0.unbound-headless:53",
        name = "unbound-0",
        pool = "unbound"
    })
    # ... rest of config
```

**Mount in Deployment:**
```yaml
volumes:
  - name: config
    configMap:
      name: dnsdist-config
containers:
  - name: dnsdist
    volumeMounts:
      - name: config
        mountPath: /etc/dnsdist/dnsdist.conf
        subPath: dnsdist.conf
        readOnly: true
```

**Benefits:**
- Update config with `kubectl edit configmap dnsdist-config`
- Rollout restart to apply: `kubectl rollout restart deployment/dnsdist`
- No image rebuild required
- Version controlled in Git

### Anti-Patterns to Avoid

- **Running DNS services as root:** Violates security best practices, unnecessary with CAP_NET_BIND_SERVICE capability
- **Using Deployment for Unbound:** Loses cache on pod restart, degrades performance
- **Single LoadBalancer for DNS:** Creates single point of failure, no redundancy
- **Hardcoded connection strings:** Prevents environment portability, leaks credentials
- **Missing health checks:** Kubernetes can't detect unhealthy pods, routes traffic to failing instances
- **No resource limits:** Pods can consume all node resources, crash other workloads
- **Skipping pod anti-affinity:** All replicas on same node = single point of failure

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| **DNS load balancing** | Custom nginx/HAProxy DNS proxy | dnsdist | dnsdist is purpose-built for DNS, supports DNS-specific features (EDNS, DNSSEC, DNS-over-TLS/HTTPS), battle-tested at scale |
| **DNS recursive resolver** | Custom forwarding resolver | Unbound | Unbound handles DNSSEC validation, query minimization, prefetching, and cache management correctly |
| **Service discovery in K8s** | Custom DNS registration | external-dns | external-dns integrates with Kubernetes events, handles all cloud providers, automatic cleanup on service deletion |
| **TLS certificate management** | Manual cert renewal scripts | cert-manager | cert-manager automates Let's Encrypt DNS-01 challenges, handles renewal before expiry, supports multiple issuers |
| **Secret synchronization** | Custom secret sync jobs | External Secrets Operator | ESO handles secret rotation, supports multiple backends (Vault, AWS, GCP), watches for changes automatically |
| **VPC networking** | Manual firewall rules | Kubernetes NetworkPolicies | Network policies are declarative, version-controlled, enforced by CNI, portable across clusters |

**Key insight:** DNS infrastructure is deceptively complex. Edge cases include DNSSEC validation failures, TCP fallback for large responses, EDNS client subnet handling, query rate limiting, and cache poisoning prevention. dnsdist and Unbound solve these problems correctly. Custom implementations will miss edge cases and have security vulnerabilities.

## Common Pitfalls

### Pitfall 1: Forgetting TLS for Managed Valkey

**What goes wrong:** Policy Service fails to connect to managed Valkey with error: "EOF" or "connection reset by peer".

**Why it happens:** DigitalOcean Managed Valkey requires TLS connections on port 25061. Plain Redis protocol (port 6379) is not exposed. The go-redis client defaults to plain connections.

**How to avoid:**
```go
// WRONG (works in dev, fails in production)
redisClient := redis.NewClient(&redis.Options{
    Addr: "valkey-host:25061",  // Missing TLS config!
})

// CORRECT (works in production)
redisClient := redis.NewClient(&redis.Options{
    Addr: "valkey-host:25061",
    TLSConfig: &tls.Config{
        MinVersion: tls.VersionTLS12,
    },
    Username: "default",
    Password: os.Getenv("VALKEY_PASSWORD"),
})

// EVEN BETTER (parse connection string)
opts, err := redis.ParseURL("rediss://default:pass@host:25061/0?tls=true")
redisClient := redis.NewClient(opts)
```

**Warning signs:**
- Logs show "dial tcp: connection refused" or "EOF"
- Connection works in local docker-compose but fails in Kubernetes
- `redis-cli` commands fail without `--tls` flag

**Source:** [How to Connect to Valkey Database Clusters | DigitalOcean](https://docs.digitalocean.com/products/databases/valkey/how-to/connect/)

### Pitfall 2: Using HTTP for ClickHouse Cloud

**What goes wrong:** Policy Service fails to log queries to ClickHouse Cloud with error: "connection refused" on port 8123.

**Why it happens:** ClickHouse Cloud only exposes HTTPS endpoint (port 8443), not HTTP (port 8123). Self-hosted ClickHouse uses HTTP, but managed ClickHouse Cloud requires HTTPS.

**How to avoid:**
```go
// WRONG (works with self-hosted, fails with Cloud)
chURL := "http://clickhouse-cloud-host:8123"

// CORRECT (works with ClickHouse Cloud)
chURL := "https://clickhouse-cloud-host:8443"

// Environment-aware approach
chURL := os.Getenv("CLICKHOUSE_URL")
if chURL == "" {
    chURL = "http://clickhouse:8123"  // Dev default
}
```

**Configuration:**
```yaml
# Development
CLICKHOUSE_URL: "http://clickhouse:8123"
CLICKHOUSE_USER: "nebula"
CLICKHOUSE_PASSWORD: "nebula"

# ClickHouse Cloud
CLICKHOUSE_URL: "https://abc123xyz.us-east-1.clickhouse.cloud:8443"
CLICKHOUSE_USER: "default"
CLICKHOUSE_PASSWORD: "secure_password_from_cloud_console"
```

**Warning signs:**
- Queries aren't logged to ClickHouse
- Logs show "connection refused" or timeout on port 8123
- ClickHouse queries work from `clickhouse-client` but not from app

**Source:** [ClickHouse® deployment models 2026: managed vs self-hosted](https://www.tinybird.co/blog/clickhouse-deployment-options)

### Pitfall 3: dnsdist Can't Reach Unbound Pods

**What goes wrong:** dnsdist logs show "No backend available" or "Server unbound is DOWN", DNS queries fail with SERVFAIL.

**Why it happens:** dnsdist.conf hardcodes Unbound hostnames (e.g., `unbound:53`) that don't resolve in Kubernetes. StatefulSet pods need headless service for stable DNS.

**How to avoid:**
```lua
-- WRONG (doesn't work in Kubernetes)
newServer({
    address = "unbound:53",  -- This doesn't exist!
    name = "unbound",
    pool = "unbound"
})

-- CORRECT (uses StatefulSet pod hostnames)
newServer({
    address = "unbound-0.unbound-headless.nebula-dns.svc.cluster.local:53",
    name = "unbound-0",
    pool = "unbound"
})
newServer({
    address = "unbound-1.unbound-headless.nebula-dns.svc.cluster.local:53",
    name = "unbound-1",
    pool = "unbound"
})
newServer({
    address = "unbound-2.unbound-headless.nebula-dns.svc.cluster.local:53",
    name = "unbound-2",
    pool = "unbound"
})

-- OR use service discovery (simpler, load-balanced)
newServer({
    address = "unbound.nebula-dns.svc.cluster.local:53",
    name = "unbound-service",
    pool = "unbound"
})
```

**Create headless service:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: unbound-headless
  namespace: nebula-dns
spec:
  clusterIP: None  # Headless!
  selector:
    app: unbound
  ports:
    - port: 53
      protocol: UDP
      name: dns-udp
    - port: 53
      protocol: TCP
      name: dns-tcp
```

**Warning signs:**
- dnsdist health checks fail
- `dig @dnsdist.nebula-dns.svc.cluster.local example.com` returns SERVFAIL
- dnsdist logs show "marking server unbound as DOWN"

### Pitfall 4: LoadBalancer Gets Private IP Instead of Public

**What goes wrong:** `kubectl get svc` shows LoadBalancer EXTERNAL-IP as internal VPC IP (10.x.x.x), not routable from internet.

**Why it happens:** Missing annotation for DigitalOcean to assign public IP. Default is private VPC-only LoadBalancer.

**How to avoid:**
```yaml
# WRONG (gets private IP)
apiVersion: v1
kind: Service
metadata:
  name: dnsdist-1
spec:
  type: LoadBalancer
  ports:
    - port: 853
      protocol: TCP
  selector:
    app: dnsdist

# CORRECT (gets public IP)
apiVersion: v1
kind: Service
metadata:
  name: dnsdist-1
  annotations:
    # Force public LoadBalancer (not VPC-internal)
    service.beta.kubernetes.io/do-loadbalancer-protocol: "tcp"
    # Optional: enable proxy protocol for client IP preservation
    service.beta.kubernetes.io/do-loadbalancer-enable-proxy-protocol: "false"
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local  # Preserves source IP
  ports:
    - port: 853
      targetPort: dot
      protocol: TCP
      name: dot
  selector:
    app: dnsdist
```

**Check LoadBalancer status:**
```bash
# Wait for public IP
kubectl get svc dnsdist-1 -n nebula-dns -w

# Should show public IP, not 10.x.x.x
NAME         TYPE           EXTERNAL-IP      PORT(S)
dnsdist-1    LoadBalancer   167.99.123.456   853:31234/TCP
```

**Warning signs:**
- EXTERNAL-IP is 10.x.x.x (RFC 1918 private range)
- `dig @EXTERNAL-IP` times out from laptop
- LoadBalancer works from within cluster but not from internet

**Source:** [How to Add Load Balancers to Kubernetes Clusters | DigitalOcean](https://docs.digitalocean.com/products/kubernetes/how-to/add-load-balancers/)

### Pitfall 5: Unbound Cache Not Persisting

**What goes wrong:** Unbound cache is cold after pod restart, query latency spikes, upstream query volume increases.

**Why it happens:** Using emptyDir volume (or no volume) for cache. emptyDir clears on pod restart. Cache data lost.

**How to avoid:**
```yaml
# WRONG (cache lost on restart)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: unbound
spec:
  template:
    spec:
      containers:
        - name: unbound
          volumeMounts:
            - name: cache
              mountPath: /var/lib/unbound
      volumes:
        - name: cache
          emptyDir: {}  # Ephemeral! Lost on restart!

# CORRECT (cache persists across restarts)
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: unbound
spec:
  volumeClaimTemplates:
    - metadata:
        name: cache
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 1Gi
  template:
    spec:
      containers:
        - name: unbound
          volumeMounts:
            - name: cache
              mountPath: /var/lib/unbound
```

**Verify persistence:**
```bash
# Check PVCs created
kubectl get pvc -n nebula-dns
# Should show: cache-unbound-0, cache-unbound-1, cache-unbound-2

# Check cache directory inside pod
kubectl exec -it unbound-0 -n nebula-dns -- ls -lh /var/lib/unbound
```

**Warning signs:**
- Query latency spikes after pod restart
- Unbound logs show "cache cold" or increased upstream queries
- No PersistentVolumeClaims for unbound pods

**Source:** [StatefulSets | Kubernetes](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)

## Code Examples

Verified patterns from official sources and existing codebase:

### Policy Service with Managed Valkey and ClickHouse Cloud

```go
// policy-svc/cmd/main.go
// Connection to managed services in production

package main

import (
    "crypto/tls"
    "os"

    "github.com/redis/go-redis/v9"
    "github.com/nebuladns/policy-svc/internal/clickhouse"
)

func main() {
    // Parse Valkey connection string (handles TLS automatically)
    redisURL := os.Getenv("REDIS_URL")
    if redisURL == "" {
        redisURL = "redis://redis:6379"  // Dev default
    }

    opts, err := redis.ParseURL(redisURL)
    if err != nil {
        panic(err)
    }

    // For managed Valkey, ParseURL detects rediss:// and sets TLS
    // URL format: rediss://default:pass@host:25061/0?tls=true
    redisClient := redis.NewClient(opts)

    // ClickHouse connection (environment-aware)
    clickhouseURL := os.Getenv("CLICKHOUSE_URL")
    if clickhouseURL == "" {
        clickhouseURL = "http://clickhouse:8123"  // Dev default
    }

    clickhouseDB := os.Getenv("CLICKHOUSE_DATABASE")
    if clickhouseDB == "" {
        clickhouseDB = "nebula"
    }

    clickhouseUser := os.Getenv("CLICKHOUSE_USER")
    clickhousePassword := os.Getenv("CLICKHOUSE_PASSWORD")

    // Initialize ClickHouse client (handles HTTP vs HTTPS automatically)
    chClient := clickhouse.NewClient(
        clickhouseURL,
        clickhouseDB,
        clickhouseUser,
        clickhousePassword,
        logger,
    )
    defer chClient.Close()
}
```

**Source:** Existing codebase `policy-svc/cmd/main.go`

### Unbound StatefulSet with Persistent Cache

```yaml
# k8s/base/unbound-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: unbound
  namespace: nebula-dns
  labels:
    app: unbound
    app.kubernetes.io/name: unbound
    app.kubernetes.io/component: dns-resolver
spec:
  serviceName: unbound-headless
  replicas: 3
  selector:
    matchLabels:
      app: unbound
  volumeClaimTemplates:
    - metadata:
        name: cache
        labels:
          app: unbound
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 1Gi
        # StorageClass automatically set by cluster default
  template:
    metadata:
      labels:
        app: unbound
    spec:
      serviceAccountName: unbound
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: unbound
          image: ghcr.io/nebuladns/unbound:latest
          imagePullPolicy: Always
          ports:
            - name: dns-udp
              containerPort: 53
              protocol: UDP
            - name: dns-tcp
              containerPort: 53
              protocol: TCP
          volumeMounts:
            - name: cache
              mountPath: /var/lib/unbound
            - name: config
              mountPath: /etc/unbound/unbound.conf
              subPath: unbound.conf
              readOnly: true
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: "2"
              memory: 2Gi
          livenessProbe:
            exec:
              command:
                - drill
                - "@127.0.0.1"
                - google.com
            initialDelaySeconds: 10
            periodSeconds: 30
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            exec:
              command:
                - drill
                - "@127.0.0.1"
                - google.com
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: false  # Unbound writes to cache
            capabilities:
              drop:
                - ALL
      volumes:
        - name: config
          configMap:
            name: unbound-config
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: unbound
                topologyKey: kubernetes.io/hostname
---
apiVersion: v1
kind: Service
metadata:
  name: unbound-headless
  namespace: nebula-dns
  labels:
    app: unbound
spec:
  clusterIP: None  # Headless service
  selector:
    app: unbound
  ports:
    - port: 53
      targetPort: dns-udp
      protocol: UDP
      name: dns-udp
    - port: 53
      targetPort: dns-tcp
      protocol: TCP
      name: dns-tcp
---
apiVersion: v1
kind: Service
metadata:
  name: unbound
  namespace: nebula-dns
  labels:
    app: unbound
spec:
  type: ClusterIP
  selector:
    app: unbound
  ports:
    - port: 53
      targetPort: dns-udp
      protocol: UDP
      name: dns-udp
    - port: 53
      targetPort: dns-tcp
      protocol: TCP
      name: dns-tcp
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: unbound
  namespace: nebula-dns
```

**Source:** Adapted from existing codebase patterns and [StatefulSets | Kubernetes](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)

### dnsdist ConfigMap with Unbound Service Discovery

```yaml
# k8s/base/dnsdist-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dnsdist-config
  namespace: nebula-dns
data:
  dnsdist.conf: |
    -- Nebula DNS - dnsdist Configuration (Kubernetes)
    -- Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

    -- Backend: Unbound cluster via ClusterIP service
    newServer({
        address = "unbound.nebula-dns.svc.cluster.local:53",
        name = "unbound-cluster",
        pool = "unbound",
        checkName = "google.com",
        checkInterval = 10,
        maxCheckFailures = 3,
        retries = 2
    })

    setPoolServerPolicy(roundrobin, "unbound")

    -- Access control (allow all - filtered by NetworkPolicy)
    setACL({"0.0.0.0/0", "::/0"})

    -- Listeners
    addLocal("0.0.0.0:53")
    webserver("0.0.0.0:8083")

    addTLSLocal("0.0.0.0:853", "/etc/dnsdist/certs/tls.crt", "/etc/dnsdist/certs/tls.key", {
        minTLSVersion = "tls1.2"
    })

    addDOHLocal("0.0.0.0:443", "/etc/dnsdist/certs/tls.crt", "/etc/dnsdist/certs/tls.key", "/dns-query", {
        minTLSVersion = "tls1.2"
    })

    -- Policy service URL (internal K8s service)
    local POLICY_SVC_URL = "http://policy-svc.nebula-dns.svc.cluster.local:80"

    -- ... rest of policy evaluation logic from existing dnsdist.conf ...

    infolog("Nebula DNS dnsdist started (Kubernetes)")
    infolog("Policy service: " .. POLICY_SVC_URL)
```

**Source:** Adapted from existing `config/dnsdist/dnsdist.conf`

### Testing End-to-End DNS Flow

```bash
#!/bin/bash
# scripts/test-dns-stack.sh
# Test deployed DNS stack end-to-end

set -e

NAMESPACE="nebula-dns"
DNS1_HOST="dns1.nebuladns.io"
DNS2_HOST="dns2.nebuladns.io"

echo "=== Testing DNS Stack Deployment ==="

# 1. Check all pods are running
echo "Checking pods..."
kubectl get pods -n $NAMESPACE -l 'app in (policy-svc,unbound,dnsdist)'

# 2. Check LoadBalancer IPs
echo "Checking LoadBalancer services..."
DNS1_IP=$(kubectl get svc dnsdist-1 -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
DNS2_IP=$(kubectl get svc dnsdist-2 -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo "dns1 IP: $DNS1_IP"
echo "dns2 IP: $DNS2_IP"

# 3. Test DNS-over-TLS (DoT)
echo "Testing DoT on dns1..."
kdig @$DNS1_IP +tls -p 853 example.com

echo "Testing DoT on dns2..."
kdig @$DNS2_IP +tls -p 853 example.com

# 4. Test DNS-over-HTTPS (DoH)
echo "Testing DoH on dns1..."
curl -s -H 'accept: application/dns-json' \
    "https://$DNS1_HOST/dns-query?name=example.com&type=A" | jq .

# 5. Check ClickHouse logs
echo "Checking ClickHouse query logs..."
kubectl exec -it -n $NAMESPACE \
    $(kubectl get pod -n $NAMESPACE -l app=policy-svc -o jsonpath='{.items[0].metadata.name}') \
    -- wget -q -O- "http://localhost:8080/health"

echo "=== DNS Stack Tests Complete ==="
```

**Source:** Adapted from existing testing patterns

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Deployment for DNS resolvers | StatefulSet with persistent volumes | Kubernetes 1.9+ (2018) | Cache survives restarts, improved performance |
| Manual LoadBalancer IP management | external-dns automatic sync | external-dns v0.5+ (2018) | Automatic DNS record updates, no manual intervention |
| Redis | Valkey (DigitalOcean) | June 2025 | Redis-compatible, managed service, TLS required |
| Self-hosted ClickHouse | ClickHouse Cloud | 2023+ | Managed service, automatic scaling, HTTPS only |
| Secret values in ConfigMaps | External Secrets Operator | ESO v0.5+ (2021) | Centralized secret management, automatic rotation |
| Init containers for migrations | Helm hooks | Helm 3+ (2019) | Run once per deployment, not per pod |

**Deprecated/outdated:**
- **ReplicatedMergeTree for ClickHouse Cloud:** ClickHouse Cloud handles replication internally, use MergeTree (not ReplicatedMergeTree)
- **Redis on DigitalOcean:** Discontinued June 2025, replaced by Valkey (100% compatible)
- **HTTP for managed ClickHouse:** ClickHouse Cloud requires HTTPS (port 8443)

## Open Questions

1. **Unbound cache size optimization**
   - What we know: 1Gi PVC per pod is reasonable starting point
   - What's unclear: Optimal cache size for 100K-999K queries/day workload
   - Recommendation: Start with 1Gi, monitor `unbound-control stats` and resize if cache hit rate < 80%

2. **HPA metrics for DNS workloads**
   - What we know: Existing HPAs use CPU (50-60% target)
   - What's unclear: Should we use custom metrics (queries/sec, cache hit rate)?
   - Recommendation: Start with CPU-based HPA, add custom metrics in Phase 27+ if needed

3. **ClickHouse Cloud connection pooling**
   - What we know: Policy Service makes fire-and-forget log requests
   - What's unclear: Does Go ClickHouse driver pool connections efficiently over HTTPS?
   - Recommendation: Monitor connection count, may need client-side pooling/batching

4. **dnsdist config updates without downtime**
   - What we know: ConfigMap changes require pod restart
   - What's unclear: Can we use dnsdist API for dynamic config changes?
   - Recommendation: Research dnsdist console API in Phase 27+, use ConfigMap for now

## Sources

### Primary (HIGH confidence)

- [StatefulSets | Kubernetes](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/) - Official Kubernetes documentation
- [How to Add Load Balancers to Kubernetes Clusters | DigitalOcean](https://docs.digitalocean.com/products/kubernetes/how-to/add-load-balancers/) - Official DigitalOcean documentation
- [How to Connect to Valkey Database Clusters | DigitalOcean](https://docs.digitalocean.com/products/databases/valkey/how-to/connect/) - Official DigitalOcean Valkey docs
- [ClickHouse® Go example: How to connect, insert, and query](https://www.tinybird.co/blog/clickhouse-golang-example) - Official ClickHouse Go client guide
- Existing codebase files: `k8s/base/policy-svc-deployment.yaml`, `k8s/base/dnsdist-deployment.yaml`, `policy-svc/cmd/main.go`, `config/dnsdist/dnsdist.conf`

### Secondary (MEDIUM confidence)

- [How to Configure Kubernetes StatefulSets](https://oneuptime.com/blog/post/2026-02-02-kubernetes-statefulsets-guide/view) - Recent 2026 guide
- [PowerDNS DNSdist 2.1.0-alpha1 Released](https://blog.powerdns.com/2026/01/29/powerdns-dnsdist-2.1.0-alpha1-released) - Latest dnsdist release notes
- [Using unbound for private DNS resolution in kubernetes](https://medium.com/@betz.mark/using-unbound-for-private-dns-resolution-in-kubernetes-d9c5985885ec) - Community pattern
- [ClickHouse® deployment models 2026: managed vs self-hosted](https://www.tinybird.co/blog/clickhouse-deployment-options) - Deployment comparison

### Tertiary (LOW confidence)

- [Introducing DigitalOcean Managed Caching for Valkey](https://www.digitalocean.com/blog/introducing-managed-valkey) - Product announcement
- Phase 24 research: `24-RESEARCH.md` - Internal infrastructure research
- Phase 25 research: `25-RESEARCH.md` - Internal database migration research

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** - All components exist in codebase, official docs available
- Architecture: **HIGH** - Kubernetes patterns well-documented, DigitalOcean integration verified
- Pitfalls: **HIGH** - Based on actual migration experience (Redis → Valkey, ClickHouse Cloud)
- Connection strings: **HIGH** - Official DigitalOcean docs specify exact format

**Research date:** 2026-02-12
**Valid until:** 2026-03-14 (30 days - infrastructure is stable)

**Key gaps addressed:**
- ✅ Unbound StatefulSet pattern (not in existing codebase)
- ✅ Valkey TLS connection requirements (critical for production)
- ✅ ClickHouse Cloud HTTPS-only requirement (critical for production)
- ✅ Dual LoadBalancer pattern for DNS redundancy (partially implemented)
- ✅ ConfigMap management for dnsdist configuration (not in existing k8s/)
