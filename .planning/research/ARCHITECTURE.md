# Architecture Research

**Domain:** DNS Security SaaS - Testing & DigitalOcean DOKS Deployment
**Researched:** 2026-02-11
**Confidence:** HIGH

## System Overview

### Current Three-Tier Architecture (Docker Compose)

```
┌─────────────────────────────────────────────────────────────────┐
│                         CONTROL PLANE                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐                   │
│  │ Next.js  │  │ Admin UI │  │   NestJS     │                   │
│  │   UI     │  │          │  │    API       │                   │
│  │ :4011    │  │  :4012   │  │   :4010      │                   │
│  └──────────┘  └──────────┘  └──────┬───────┘                   │
│                                     │                            │
├─────────────────────────────────────┼────────────────────────────┤
│                         DATA PLANE  │                            │
├─────────────────────────────────────┼────────────────────────────┤
│  ┌──────────────────────────────────┴─────────────────────┐     │
│  │                      dnsdist                            │     │
│  │   DoT (:4853) + DoH (:4443) + Metrics (:4083)          │     │
│  └──────────────────────┬──────────────────────────────────┘     │
│                         │                                        │
│  ┌──────────────────────▼──────────────────────────────────┐    │
│  │                 Policy Service (Go)                      │    │
│  │              :4080 - Policy Evaluation                   │    │
│  └──────┬────────────────────┬──────────────┬──────────────┘    │
│         │ ALLOW              │ BLOCK        │ REWRITE           │
│  ┌──────▼──────┐             │              │                   │
│  │   Unbound   │             │              │                   │
│  │   :5354     │             │              │                   │
│  └─────────────┘             │              │                   │
│                              │              │                   │
├──────────────────────────────┼──────────────┼───────────────────┤
│                       STORAGE│              │                   │
├──────────────────────────────┼──────────────┼───────────────────┤
│  ┌──────────┐  ┌─────────────▼──────────────▼───────────┐       │
│  │   PG     │  │               Redis                     │       │
│  │  :4432   │  │  :4379 - Policy Cache + Pub/Sub         │       │
│  └──────────┘  └─────────────────────────────────────────┘       │
│                                                                   │
│  ┌───────────────────────────────────────────────────────┐       │
│  │                   ClickHouse                          │       │
│  │  :4123 (HTTP) + :4900 (Native) - Query Logs          │       │
│  └───────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### Target DOKS Architecture with Managed Services

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DIGITALOCEAN KUBERNETES                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                         CONTROL PLANE                             │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────────┐  │  │
│  │  │  Next.js   │  │  Admin UI  │  │         NestJS API         │  │  │
│  │  │    UI      │  │            │  │    (2+ pods, HPA)          │  │  │
│  │  │ Deployment │  │ Deployment │  │                            │  │  │
│  │  └─────┬──────┘  └─────┬──────┘  └────────┬───────────────────┘  │  │
│  │        │                │                  │                      │  │
│  │        └────────────────┴──────────────────┘                      │  │
│  │                         │                                         │  │
│  │                    ┌────▼────┐                                    │  │
│  │                    │ Ingress │ (nginx-ingress)                    │  │
│  │                    │   LB    │ (DigitalOcean LB)                  │  │
│  │                    └─────────┘                                    │  │
│  │                                                                    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                          DATA PLANE                               │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │                  dnsdist (Deployment)                       │  │  │
│  │  │   2+ pods, PodAntiAffinity, HPA, externalTrafficPolicy     │  │  │
│  │  └─────┬──────────────────────────────────────────────────────┘  │  │
│  │        │                                                          │  │
│  │        │  ┌───────────────┐    ┌───────────────┐                 │  │
│  │        │  │ LoadBalancer  │    │ LoadBalancer  │                 │  │
│  │        │  │ dns1.*.io     │    │ dns2.*.io     │                 │  │
│  │        │  │ DoT+DoH       │    │ DoT+DoH       │                 │  │
│  │        │  └───────────────┘    └───────────────┘                 │  │
│  │        │                                                          │  │
│  │  ┌─────▼──────────────────────────────────────────────────────┐  │  │
│  │  │            Policy Service (Deployment)                      │  │  │
│  │  │     3+ pods, HPA, PodAntiAffinity                           │  │  │
│  │  └─────┬──────────────────────────────────────────────────────┘  │  │
│  │        │                                                          │  │
│  │  ┌─────▼──────────────────────────────────────────────────────┐  │  │
│  │  │            Unbound (StatefulSet)                            │  │  │
│  │  │     2+ pods, stable DNS, persistent cache                   │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                          │              │              │
                          │              │              │
┌─────────────────────────▼──────────────▼──────────────▼─────────────────┐
│                    MANAGED EXTERNAL SERVICES                            │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │   DO Managed     │  │  DO Managed      │  │   ClickHouse Cloud   │  │
│  │   PostgreSQL     │  │  Redis/Valkey    │  │                      │  │
│  │                  │  │                  │  │   (External SaaS)    │  │
│  │  - PgBouncer     │  │  - Replication   │  │   - TLS connection   │  │
│  │  - Auto backup   │  │  - AOF persist   │  │   - Query logging    │  │
│  │  - HA failover   │  │  - Connection    │  │   - Analytics        │  │
│  │                  │  │    pooling       │  │                      │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### Existing Components (Unchanged)

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| NestJS API | Multi-tenant REST API, policy CRUD, user management | Node.js, TypeORM, JWT auth |
| Next.js UI | Tenant admin interface | React, Next.js 13+, Tailwind CSS |
| Admin UI | Super-admin MSP management | React, Next.js 13+, Tailwind CSS |
| dnsdist | DoH/DoT termination, tenant identification, rate limiting | PowerDNS dnsdist, Lua scripts |
| Policy Service | O(1) policy evaluation, cache management | Go, Redis client, ClickHouse client |
| Unbound | Recursive DNS resolution, DNSSEC validation | Unbound DNS resolver |

### Modified Components for DOKS

| Component | Change | Reason |
|-----------|--------|--------|
| NestJS API | Connect to DO Managed PostgreSQL via PgBouncer | Built-in connection pooling, HA failover |
| Policy Service | Connect to DO Managed Redis | High availability, automatic failover |
| Policy Service | Connect to ClickHouse Cloud | Offload analytics storage, managed scaling |
| dnsdist | Deploy as Deployment with LoadBalancer service | DOKS native load balancing, anycast DNS |
| Unbound | Deploy as StatefulSet | Stable network identity, persistent cache |

### New Components for DOKS

| Component | Purpose | Implementation |
|-----------|---------|----------------|
| cert-manager | TLS certificate management | ACME DNS-01 challenge for wildcard certs |
| external-dns | Automated DNS record management | Syncs LoadBalancer IPs to DigitalOcean DNS |
| nginx-ingress | HTTPS ingress for UI/API | DOKS native ingress controller |
| Helm pre-install hooks | Database migrations, ClickHouse init | Job resources with hook weights |

## Data Plane Deployment Pattern (Critical)

### Unbound: StatefulSet Pattern

**Why StatefulSet instead of Deployment:**

Unbound requires stable network identity and persistent cache between restarts. StatefulSet provides:

1. **Stable DNS names:** `unbound-0.unbound.nebula-dns.svc.cluster.local`
2. **Persistent volumes:** Cache survives pod restarts
3. **Ordered deployment:** Predictable startup sequence
4. **Stable storage:** Each pod gets dedicated PVC

**Configuration:**
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: unbound
spec:
  serviceName: unbound  # Headless service required
  replicas: 2
  selector:
    matchLabels:
      app: unbound
  template:
    spec:
      containers:
      - name: unbound
        image: ghcr.io/nebuladns/unbound:latest
        volumeMounts:
        - name: cache
          mountPath: /var/lib/unbound
  volumeClaimTemplates:
  - metadata:
      name: cache
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 1Gi  # DNS cache storage
```

**Headless Service (Required):**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: unbound
spec:
  clusterIP: None  # Headless service
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

### dnsdist: Deployment with Load Balancer

**Why Deployment (not StatefulSet):**

dnsdist is stateless (tenant resolution via Redis, policy via Policy Service). Benefits:

1. **Horizontal scaling:** Add/remove pods freely
2. **Rolling updates:** Zero-downtime deployments
3. **HPA support:** Auto-scale based on CPU/connections
4. **Pod anti-affinity:** Spread across nodes for HA

**Configuration:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dnsdist
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0  # Zero-downtime
  template:
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app: dnsdist
            topologyKey: kubernetes.io/hostname  # Force different nodes
```

**Dual LoadBalancer Services for DNS Redundancy:**
```yaml
# dns1.nebuladns.io
apiVersion: v1
kind: Service
metadata:
  name: dnsdist-1
  annotations:
    external-dns.alpha.kubernetes.io/hostname: dns1.nebuladns.io
    service.beta.kubernetes.io/do-loadbalancer-protocol: "tcp"
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local  # Preserve client IP
  ports:
  - port: 853
    targetPort: 853
    protocol: TCP
    name: dot
  - port: 443
    targetPort: 443
    protocol: TCP
    name: doh
  selector:
    app: dnsdist
---
# dns2.nebuladns.io (secondary for redundancy)
apiVersion: v1
kind: Service
metadata:
  name: dnsdist-2
  annotations:
    external-dns.alpha.kubernetes.io/hostname: dns2.nebuladns.io
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  # ... same config as dns1
```

**Why Two LoadBalancers:**
- DNS best practice: Provide multiple resolvers (RFC 8499)
- DOKS creates separate external IPs for each LoadBalancer
- external-dns automatically creates A/AAAA records
- Clients can failover between dns1 and dns2

### Policy Service: Standard Deployment

**Stateless, horizontally scalable:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: policy-svc
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
  template:
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: policy-svc
              topologyKey: kubernetes.io/hostname
```

## Managed Service Integration

### DigitalOcean Managed PostgreSQL

**Connection String Format:**
```
postgresql://[username]:[password]@[host]:[port]/[database]?sslmode=require
```

**Connection Pooling via PgBouncer:**

DigitalOcean provides built-in PgBouncer with transaction mode. Create connection pool via UI/API:

```yaml
# DO managed pool configuration
Pool Name: api-pool
Database: nebula
Mode: transaction  # Use transaction mode for NestJS/TypeORM
Pool Size: 25  # Based on RAM (25 per 1GB)
User: nebula
```

**API Configuration:**
```yaml
env:
- name: DATABASE_URL
  valueFrom:
    secretKeyRef:
      name: api-secrets
      key: database-url  # Points to PgBouncer pool endpoint
- name: DATABASE_POOL_SIZE
  value: "20"  # Pool in app + PgBouncer pool
- name: DATABASE_SSL
  value: "true"  # Always SSL for managed DB
```

**Key Differences from Docker Compose:**
- **SSL required:** Add `sslmode=require` to connection string
- **Connection limits:** 25 connections per 1GB RAM (3 reserved for maintenance)
- **PgBouncer pooling:** Use transaction mode (not session mode)
- **Backup automated:** Point-in-time recovery (PITR) available

**Sources:**
- [How to Manage Connection Pools for PostgreSQL](https://docs.digitalocean.com/products/databases/postgresql/how-to/manage-connection-pools/)
- [Managed Databases Connection Pools and PostgreSQL Benchmarking](https://www.digitalocean.com/community/tutorials/managed-databases-connection-pools-and-postgresql-benchmarking-using-pgbench)

### DigitalOcean Managed Redis (Valkey)

**Important:** As of June 2025, DigitalOcean converted all Managed Redis clusters to Valkey (Redis-compatible fork).

**Connection String Format:**
```
redis://[password]@[host]:[port]
# or for TLS:
rediss://[password]@[host]:[port]?tls=true
```

**Configuration:**
```yaml
env:
- name: REDIS_URL
  valueFrom:
    secretKeyRef:
      name: api-secrets
      key: redis-url  # Valkey endpoint with TLS
- name: REDIS_TLS
  value: "true"  # TLS required for production
```

**Key Differences from Docker Compose:**
- **Valkey compatibility:** 100% Redis protocol compatible
- **Replication built-in:** Primary + 2 replicas for HA
- **AOF persistence:** Append-only file enabled by default
- **Connection pooling:** Built-in connection management
- **TLS recommended:** Use `rediss://` for encrypted connections

**Sources:**
- [Caching | DigitalOcean Documentation](https://docs.digitalocean.com/products/databases/redis/)
- [Managed Databases | DigitalOcean Documentation](https://docs.digitalocean.com/products/databases/)

### ClickHouse Cloud

**Why ClickHouse Cloud instead of in-cluster:**
- **Managed scaling:** Handles 100K-999K queries/day without manual tuning
- **Automated backups:** Built-in PITR
- **Separate billing:** Analytics storage isolated from compute costs
- **Vertical scaling:** Increase storage without K8s PVC resizing

**Connection Configuration:**
```yaml
env:
- name: CLICKHOUSE_URL
  value: "https://[region].clickhouse.cloud:8443"
- name: CLICKHOUSE_DATABASE
  value: "nebula_dns"
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
- name: CLICKHOUSE_TLS
  value: "true"
```

**Key Differences from Docker Compose:**
- **HTTPS endpoint:** Port 8443 instead of 8123
- **TLS required:** All connections encrypted
- **External endpoint:** Not in cluster network
- **Initialization:** Run ClickHouse init job once via Helm hook

**Sources:**
- [ClickHouse deployment models 2026](https://www.tinybird.co/blog/clickhouse-deployment-options)
- [How to Run ClickHouse in Docker and Kubernetes](https://oneuptime.com/blog/post/2026-01-21-clickhouse-docker-kubernetes/view)

## Test Suite Architecture

### Existing E2E Test Structure

```
tests/
├── e2e/
│   └── dns/                       # Full-stack DNS tests
│       ├── block-allow.e2e-spec.ts       # Blocklist/allowlist enforcement
│       ├── category-filter.e2e-spec.ts   # Category-based filtering
│       ├── clickhouse-logging.e2e-spec.ts # Query logging
│       ├── fail-open.e2e-spec.ts         # Fail-safe behavior
│       ├── policy-sync.e2e-spec.ts       # Redis pub/sub sync timing
│       ├── safe-search.e2e-spec.ts       # SafeSearch rewrites
│       └── tenant-isolation.e2e-spec.ts  # Multi-tenant isolation
api/
└── test/
    ├── setup.ts                   # Global test setup
    ├── app.e2e-spec.ts           # API health checks
    ├── auth.e2e-spec.ts          # Authentication flows
    ├── policy.e2e-spec.ts        # Policy CRUD operations
    ├── api-contracts.e2e-spec.ts # Contract testing
    └── [feature].e2e-spec.ts     # Feature-specific tests
```

### Test Environment Requirements

**For Full-Stack DNS Tests:**
- Running dnsdist instance (DoH endpoint)
- Running Policy Service instance
- Redis connection (for policy cache)
- ClickHouse connection (for query logging)
- Test tenant credentials (location tokens)

**Current Test Pattern (from policy-sync.e2e-spec.ts):**
```typescript
describe('DNS Policy Sync E2E Tests', () => {
  let dnsClient: DnsClient;
  let policySvc: PolicyServiceClient;
  let apiClient: TestApiClient;

  beforeAll(async () => {
    dnsClient = createTestDnsClient(process.env.TEST_DNS_TOKEN);
    policySvc = new PolicyServiceClient(TEST_ENVIRONMENT.policySvcUrl);
    apiClient = new TestApiClient(TEST_ENVIRONMENT.apiUrl);
  });

  it('should reflect policy changes within sync timeout', async () => {
    // 1. Create blocklist via API
    // 2. Add domain to blocklist
    // 3. Attach to policy
    // 4. Wait for Redis pub/sub sync
    // 5. Verify domain is blocked via DNS query
  });
});
```

### Test Integration with DOKS

**Kubernetes-Native Testing Approach:**

Based on current 2026 best practices, use ephemeral test environments within the cluster:

1. **Contract Testing** (service-to-service)
   - Run in CI/CD pipeline
   - Mock external dependencies
   - Validate API contracts between services

2. **Integration Testing** (component-level)
   - Deploy test namespace in DOKS
   - Use real managed PostgreSQL/Redis
   - Use test ClickHouse database
   - Run against deployed services

3. **E2E Testing** (full-stack)
   - Deploy ephemeral environment per PR
   - Full service mesh (dnsdist + policy-svc + unbound)
   - Real DNS queries via DoH
   - Validate across service boundaries

**Test Namespace Pattern:**
```yaml
# Created per test run or PR
apiVersion: v1
kind: Namespace
metadata:
  name: nebula-dns-test-pr-123
  labels:
    environment: test
    pr: "123"
    ttl: "2h"  # Auto-cleanup after 2 hours
```

**Test Job Pattern:**
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: e2e-dns-tests
  namespace: nebula-dns-test-pr-123
spec:
  template:
    spec:
      containers:
      - name: test-runner
        image: ghcr.io/nebuladns/e2e-tests:latest
        env:
        - name: TEST_DNS_ENDPOINT
          value: "dnsdist.nebula-dns-test-pr-123.svc.cluster.local"
        - name: TEST_API_ENDPOINT
          value: "api.nebula-dns-test-pr-123.svc.cluster.local"
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: test-redis-config
              key: url
      restartPolicy: Never
```

**Sources:**
- [Microservices Testing: Strategies, Tools & Best Practices](https://testkube.io/blog/cloud-native-microservices-testing-strategies)
- [How to Simplify Kubernetes Integration Testing](https://www.gravitee.io/blog/kubernetes-application-testing)
- [Best Microservices Testing Tools for Kubernetes in 2025](https://www.signadot.com/articles/best-microservices-testing-solution-for-kubernetes-in-2025)

## Data Flow Changes: Docker Compose → DOKS

### PostgreSQL Connection Flow

**Docker Compose:**
```
API → postgres:5432 (container)
      - Direct connection
      - No SSL
      - Connection pool in app only
```

**DOKS:**
```
API → DO Managed PostgreSQL
      ├─ PgBouncer Pool (transaction mode)
      │  └─ 25 connections per 1GB RAM
      └─ Primary + Standby (auto-failover)
      - SSL required
      - Dual-layer pooling (app + PgBouncer)
```

### Redis Connection Flow

**Docker Compose:**
```
API/Policy Service → redis:6379 (container)
                     - Direct connection
                     - No replication
                     - AOF persistence
```

**DOKS:**
```
API/Policy Service → DO Managed Valkey
                     ├─ Primary node (writes)
                     ├─ Replica 1 (reads)
                     └─ Replica 2 (reads)
                     - TLS encrypted
                     - Auto-failover
                     - Read replicas for scaling
```

### ClickHouse Connection Flow

**Docker Compose:**
```
Policy Service → clickhouse:8123 (container)
                 - HTTP endpoint
                 - No SSL
                 - Local storage
```

**DOKS:**
```
Policy Service → ClickHouse Cloud
                 - HTTPS endpoint :8443
                 - TLS required
                 - External SaaS
                 - Managed scaling
```

### DNS Query Flow

**Docker Compose:**
```
Client → dnsdist:4853/4443
         └─ Single container
         └─ policy-svc:4080
            └─ unbound:5354
```

**DOKS:**
```
Client → dns1.nebuladns.io (DOKS LoadBalancer)
         └─ dnsdist pod 1 or pod 2 (load balanced)
            └─ policy-svc:80 (K8s Service → 3+ pods)
               └─ unbound-0.unbound:53 or unbound-1.unbound:53 (StatefulSet)
```

## Ingress and TLS Architecture

### Ingress Configuration

**nginx-ingress Controller:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nebula-dns-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - app.nebuladns.io
    - api.nebuladns.io
    - admin.nebuladns.io
    secretName: nebula-dns-tls  # cert-manager managed
  rules:
  - host: app.nebuladns.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ui
            port:
              number: 80
  - host: api.nebuladns.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api
            port:
              number: 80
  - host: admin.nebuladns.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: admin-ui
            port:
              number: 80
```

**cert-manager ClusterIssuer:**
```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@nebuladns.io
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - dns01:
        digitalocean:
          tokenSecretRef:
            name: digitalocean-dns
            key: access-token
```

**Why DNS-01 Challenge:**
- Supports wildcard certificates (`*.nebuladns.io`)
- Works with LoadBalancer services (not just Ingress)
- Required for DoT/DoH endpoints (dns1, dns2)

**Sources:**
- [How to Configure Digital Ocean Kubernetes with cert-manager and external-dns](https://polarlabs.ca/stories/digital-ocean-kubernetes-cert-manager-external-dns)
- [DOKS Operational Readiness: Configure Wildcard Certificates](https://docs.digitalocean.com/products/kubernetes/getting-started/operational-readiness/configure-wildcard-certificates/)
- [DigitalOcean - cert-manager Documentation](https://cert-manager.io/docs/configuration/acme/dns01/digitalocean/)

### external-dns Configuration

**Automatically sync LoadBalancer IPs to DigitalOcean DNS:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns
spec:
  template:
    spec:
      containers:
      - name: external-dns
        image: registry.k8s.io/external-dns/external-dns:v0.14.0
        args:
        - --source=service
        - --source=ingress
        - --provider=digitalocean
        - --domain-filter=nebuladns.io  # Limit to our domain
        - --txt-owner-id=nebula-dns-doks
        env:
        - name: DO_TOKEN
          valueFrom:
            secretKeyRef:
              name: digitalocean-dns
              key: access-token
```

**Result:**
- `dnsdist-1` LoadBalancer → Creates A record for `dns1.nebuladns.io`
- `dnsdist-2` LoadBalancer → Creates A record for `dns2.nebuladns.io`
- nginx-ingress LoadBalancer → Creates A records for `app`, `api`, `admin`

## Build Order for Deployment Phases

### Phase 1: Managed Service Provisioning

**Order matters:** Provision managed services before DOKS cluster to get connection strings.

1. **Provision DO Managed PostgreSQL**
   - Size: 2GB RAM (50 connections available)
   - Nodes: Primary + Standby (auto-failover)
   - Create PgBouncer connection pool: `api-pool` (transaction mode, 25 connections)
   - Get connection string: `postgresql://user:pass@host:25061/nebula?sslmode=require`

2. **Provision DO Managed Redis (Valkey)**
   - Size: 2GB RAM
   - Nodes: Primary + 2 replicas
   - Enable AOF persistence
   - Get connection string: `rediss://default:pass@host:25061`

3. **Provision ClickHouse Cloud**
   - Region: Same as DOKS (latency optimization)
   - Tier: Production (auto-scaling)
   - Create database: `nebula_dns`
   - Get connection details: `https://region.clickhouse.cloud:8443`

4. **Create DigitalOcean API Token**
   - For external-dns and cert-manager
   - Scopes: DNS read/write

### Phase 2: DOKS Cluster Setup

1. **Create DOKS Cluster**
   - Kubernetes version: 1.29+ (current stable)
   - Node pool: 3 nodes, 4GB RAM each (for control plane + data plane)
   - Region: Same as managed databases

2. **Install Core Infrastructure**
   ```bash
   # Install nginx-ingress controller
   kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml

   # Install cert-manager
   kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

   # Install external-dns
   kubectl apply -f k8s/base/external-dns/
   ```

3. **Create Secrets**
   ```bash
   # DigitalOcean API token for external-dns and cert-manager
   kubectl create secret generic digitalocean-dns \
     -n nebula-dns \
     --from-literal=access-token=$DO_API_TOKEN

   # Managed PostgreSQL connection
   kubectl create secret generic api-secrets \
     -n nebula-dns \
     --from-literal=database-url=$PG_CONNECTION_STRING \
     --from-literal=redis-url=$REDIS_CONNECTION_STRING

   # ClickHouse Cloud connection
   kubectl create secret generic policy-svc-secrets \
     -n nebula-dns \
     --from-literal=clickhouse-url=$CH_URL \
     --from-literal=clickhouse-user=$CH_USER \
     --from-literal=clickhouse-password=$CH_PASSWORD
   ```

### Phase 3: Database Initialization

**Order:** ClickHouse first (independent), then PostgreSQL migrations (API depends on schema).

1. **Initialize ClickHouse Schema**
   ```bash
   # Helm install with ClickHouse init hook
   helm install nebula-dns ./helm/safedns \
     --namespace nebula-dns \
     --create-namespace \
     --set clickhouse.enabled=true \
     --set migrations.enabled=false  # Skip PG migrations first
     --wait
   ```

   This runs the ClickHouse init job (hook weight -10) which creates:
   - `nebula_dns.query_logs` table
   - `nebula_dns.hourly_stats` materialized view
   - Required indexes

2. **Run PostgreSQL Migrations**
   ```bash
   # Re-run Helm with migrations enabled
   helm upgrade nebula-dns ./helm/safedns \
     --namespace nebula-dns \
     --set migrations.enabled=true \
     --wait
   ```

   This runs the PostgreSQL migration job (hook weight -5) which:
   - Connects to DO Managed PostgreSQL via PgBouncer
   - Runs TypeORM migrations
   - Creates all tables, indexes, constraints

### Phase 4: Core Services Deployment

**Order:** Data plane dependencies first (policy-svc needs Redis), then data plane, then control plane.

1. **Deploy Policy Service**
   ```bash
   kubectl apply -f k8s/base/policy-svc-deployment.yaml
   ```
   - Connects to DO Managed Redis for policy cache
   - Connects to ClickHouse Cloud for query logging
   - Health check: `/health` endpoint

2. **Deploy Unbound (StatefulSet)**
   ```bash
   kubectl apply -f k8s/base/unbound-statefulset.yaml
   ```
   - Creates persistent volume claims for DNS cache
   - Starts unbound-0, then unbound-1 (ordered)
   - Headless service for stable DNS

3. **Deploy dnsdist**
   ```bash
   kubectl apply -f k8s/base/dnsdist-deployment.yaml
   ```
   - Creates deployment with 2 replicas
   - Creates LoadBalancer services for dns1 and dns2
   - external-dns creates DNS records automatically
   - Connects to policy-svc:80 internally

4. **Deploy API**
   ```bash
   kubectl apply -f k8s/base/api-deployment.yaml
   ```
   - Connects to DO Managed PostgreSQL via PgBouncer
   - Connects to DO Managed Redis for sessions/cache
   - Publishes policy updates to Redis pub/sub

5. **Deploy UI and Admin UI**
   ```bash
   kubectl apply -f k8s/base/ui-deployment.yaml
   kubectl apply -f k8s/base/admin-ui-deployment.yaml
   ```
   - Static Next.js builds
   - Connect to API via internal service

### Phase 5: Ingress and DNS

1. **Deploy Ingress**
   ```bash
   kubectl apply -f k8s/base/ingress.yaml
   ```
   - cert-manager automatically requests certificates
   - external-dns creates DNS records for ingress hosts

2. **Verify DNS Propagation**
   ```bash
   # Check LoadBalancer IPs
   kubectl get svc -n nebula-dns dnsdist-1 dnsdist-2

   # Check DNS records (wait for external-dns)
   dig dns1.nebuladns.io
   dig dns2.nebuladns.io
   dig app.nebuladns.io
   ```

3. **Verify TLS Certificates**
   ```bash
   # Check cert-manager certificates
   kubectl get certificate -n nebula-dns

   # Should show Ready: True
   ```

### Phase 6: Test Suite Deployment

**Order:** Deploy test namespace, run contract tests, run integration tests, run E2E tests.

1. **Create Test Namespace**
   ```bash
   kubectl create namespace nebula-dns-test
   ```

2. **Deploy Test Fixtures**
   ```bash
   # Test tenant, location, policies
   kubectl apply -f tests/fixtures/test-tenant.yaml
   ```

3. **Run Contract Tests**
   ```bash
   # API contract tests (unit-level)
   kubectl apply -f tests/jobs/contract-tests-job.yaml
   ```

4. **Run Integration Tests**
   ```bash
   # API integration tests against real PostgreSQL/Redis
   kubectl apply -f tests/jobs/api-integration-tests-job.yaml
   ```

5. **Run E2E DNS Tests**
   ```bash
   # Full-stack DNS tests via DoH
   kubectl apply -f tests/jobs/e2e-dns-tests-job.yaml
   ```

6. **Collect Test Results**
   ```bash
   kubectl logs -n nebula-dns-test job/e2e-dns-tests
   ```

## Anti-Patterns

### Anti-Pattern 1: Running ClickHouse In-Cluster at This Scale

**What people do:** Deploy ClickHouse as StatefulSet in DOKS to avoid external dependency.

**Why it's wrong:**
- ClickHouse requires significant storage (query logs grow fast)
- PVC resizing in Kubernetes requires downtime
- Backup management becomes manual
- Scaling storage vertically is complex with StatefulSets
- Missing out on managed features (PITR, auto-scaling, monitoring)

**Do this instead:**
- Use ClickHouse Cloud for analytics workloads
- Keeps compute and analytics storage separate
- Easier to scale independently
- Managed backups and disaster recovery

### Anti-Pattern 2: Using Deployment for Unbound

**What people do:** Deploy Unbound as a Deployment (like dnsdist).

**Why it's wrong:**
- Unbound cache is lost on every pod restart
- No stable network identity for DNS resolution
- Persistent volumes can't be attached (ReadWriteOnce + Deployment = fail)
- Cache cold-start after every scale-up

**Do this instead:**
- Use StatefulSet with volumeClaimTemplates
- Each pod gets dedicated persistent cache
- Stable DNS names for consistent routing
- Cache survives restarts

### Anti-Pattern 3: Single LoadBalancer for DNS

**What people do:** Create single LoadBalancer service for dnsdist.

**Why it's wrong:**
- DNS best practice requires multiple resolvers (RFC 8499)
- Single point of failure if LoadBalancer has issues
- Can't easily distribute traffic geographically
- Client failover becomes manual

**Do this instead:**
- Create two LoadBalancer services (dns1, dns2)
- Use external-dns to create separate DNS records
- Clients configure both resolvers
- Automatic failover via client DNS resolution

### Anti-Pattern 4: Direct Database Connections Without PgBouncer

**What people do:** Connect directly to PostgreSQL primary endpoint.

**Why it's wrong:**
- DO Managed PostgreSQL has connection limits (25 per 1GB RAM)
- Each API pod holds connections even when idle
- Can't scale API pods beyond connection limit
- Connection overhead on database

**Do this instead:**
- Use DO Managed PgBouncer connection pool
- Configure transaction mode (compatible with TypeORM)
- API pods share pooled connections
- Can scale API pods independently of database connections

### Anti-Pattern 5: Test Environments Outside Cluster

**What people do:** Run E2E tests from CI runners against DOKS cluster.

**Why it's wrong:**
- Network latency not representative of production
- Can't test pod-to-pod communication patterns
- Missing DNS resolution differences (cluster DNS vs external)
- Network policies not tested
- Can't test Service mesh behavior

**Do this instead:**
- Deploy ephemeral test namespaces in DOKS
- Run test Jobs inside cluster
- Tests use same network paths as production
- Can validate network policies, DNS, service discovery
- Clean up test namespaces after completion (TTL)

## Integration Points

### New Integration Points (DOKS-Specific)

| Integration | Pattern | Notes |
|-------------|---------|-------|
| cert-manager → DigitalOcean DNS | DNS-01 ACME challenge | Requires DO API token with DNS write access |
| external-dns → DigitalOcean DNS | LoadBalancer IP sync | Watches LoadBalancer services, creates A records |
| nginx-ingress → cert-manager | TLS certificate automation | Ingress annotation triggers cert request |
| API → DO Managed PostgreSQL | PgBouncer connection pool | Use transaction mode, SSL required |
| Policy Service → DO Managed Redis | TLS connection | Use `rediss://` scheme for encrypted connections |
| Policy Service → ClickHouse Cloud | HTTPS connection | Port 8443, TLS required |

### Modified Integration Points

| Integration | Docker Compose | DOKS |
|-------------|----------------|------|
| API → PostgreSQL | Direct :5432, no SSL | Via PgBouncer :25061, SSL required |
| API → Redis | Direct :6379, no auth | TLS :25061, password auth required |
| Policy Service → ClickHouse | HTTP :8123 | HTTPS :8443, external endpoint |
| dnsdist → Policy Service | Container name :4080 | K8s Service :80 (ClusterIP) |
| dnsdist → Unbound | Container name :5354 | StatefulSet headless service :53 |

### Internal Service Communication

| From | To | Protocol | Notes |
|------|----|----|-------|
| dnsdist | policy-svc | HTTP | Internal ClusterIP service, load balanced across pods |
| dnsdist | unbound | DNS (UDP/TCP) | Headless service, stable pod DNS names |
| policy-svc | redis | Redis protocol | External managed service, TLS encrypted |
| policy-svc | clickhouse | HTTPS | External managed service, TLS encrypted |
| api | postgresql | PostgreSQL | External managed service, PgBouncer pooled, SSL encrypted |
| api | redis | Redis protocol | External managed service, TLS encrypted |

## Sources

**DigitalOcean DOKS and Managed Databases:**
- [How to Manage Connection Pools for PostgreSQL Database Clusters](https://docs.digitalocean.com/products/databases/postgresql/how-to/manage-connection-pools/)
- [Managed Databases Connection Pools and PostgreSQL Benchmarking Using pgbench](https://www.digitalocean.com/community/tutorials/managed-databases-connection-pools-and-postgresql-benchmarking-using-pgbench)
- [Caching | DigitalOcean Documentation](https://docs.digitalocean.com/products/databases/redis/)
- [How to Configure Advanced Load Balancer Settings in Kubernetes Clusters](https://docs.digitalocean.com/products/kubernetes/how-to/configure-load-balancers/)

**ClickHouse Cloud:**
- [ClickHouse deployment models 2026: managed vs self-hosted](https://www.tinybird.co/blog/clickhouse-deployment-options)
- [How to Run ClickHouse in Docker and Kubernetes](https://oneuptime.com/blog/post/2026-01-21-clickhouse-docker-kubernetes/view)
- [Running ClickHouse in High Availability Mode on Kubernetes](https://medium.com/@vaibhavverma016/running-clickhouse-in-high-availability-mode-on-kubernetes-using-clickhouse-keeper-e65af05bf980)

**Kubernetes DNS and Load Balancing:**
- [Using unbound for private DNS resolution in kubernetes](https://medium.com/@betz.mark/using-unbound-for-private-dns-resolution-in-kubernetes-d9c5985885ec)
- [Kubernetes StatefulSet: The Ultimate Guide (2024)](https://www.plural.sh/blog/kubernetes-statefulset-guide/)
- [How to Configure Kubernetes StatefulSets](https://oneuptime.com/blog/post/2026-02-02-kubernetes-statefulsets-guide/view)

**Cert-Manager and External-DNS:**
- [How to configure Digital Ocean Kubernetes with cert-manager and external-dns](https://polarlabs.ca/stories/digital-ocean-kubernetes-cert-manager-external-dns)
- [DOKS Operational Readiness, Part 3: Configure Wildcard Certificates](https://docs.digitalocean.com/products/kubernetes/getting-started/operational-readiness/configure-wildcard-certificates/)
- [DigitalOcean - cert-manager Documentation](https://cert-manager.io/docs/configuration/acme/dns01/digitalocean/)

**Kubernetes Testing:**
- [Microservices Testing: Strategies, Tools & Best Practices](https://testkube.io/blog/cloud-native-microservices-testing-strategies)
- [Best Microservices Testing Tools for Kubernetes in 2025](https://www.signadot.com/articles/best-microservices-testing-solution-for-kubernetes-in-2025)
- [How to Simplify Kubernetes Integration Testing for Reliable Deployments](https://www.gravitee.io/blog/kubernetes-application-testing)

---
*Architecture research for: Nebula DNS DOKS Deployment & Testing*
*Researched: 2026-02-11*
*Confidence: HIGH*
