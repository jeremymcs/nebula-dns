# Phase 27: Control Plane Deployment - Research

**Researched:** 2026-02-13
**Domain:** Kubernetes deployment, Next.js runtime configuration, TLS automation
**Confidence:** HIGH

## Summary

Phase 27 deploys the control plane (NestJS API + Next.js UI/Admin UI) to DigitalOcean Kubernetes with production TLS and DNS configuration. The phase builds on existing infrastructure (DOKS, managed databases, cert-manager, external-dns) established in phases 24-26.

**Key challenges identified:**
1. **Next.js runtime environment variables**: NEXT_PUBLIC_ prefix bakes values at build time, incompatible with multi-environment Docker images
2. **Database connection routing**: API must use pooled connection (PgBouncer) for runtime but direct connection for migrations
3. **TLS certificate lifecycle**: wildcard certificates with DNS-01 challenge require proper timing between cert-manager and Ingress creation
4. **external-dns integration**: LoadBalancer IPs must be automatically synced to DigitalOcean DNS records

The existing Helm chart and k8s manifests provide a solid foundation but require updates for runtime configuration and production-grade resource management.

**Primary recommendation:** Use Next.js standalone output with server-side environment variable access (no NEXT_PUBLIC_), deploy API with separate migration Job using Helm hooks, configure Ingress with cert-manager annotations for automatic TLS, and use external-dns service annotations for DNS automation.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.1.3+ (admin-ui), 16.1.1 (ui) | Frontend framework with standalone output | Industry standard for React SSR, standalone mode enables runtime env vars |
| NestJS | 10.3.0 | Backend API framework | TypeScript-first Node.js framework with excellent DI and modularity |
| Helm | 3.x | Kubernetes package manager | De facto standard for K8s deployments, manages complex releases |
| cert-manager | 1.x | TLS certificate automation | CNCF project, standard for Let's Encrypt automation on K8s |
| external-dns | 0.14.0+ | DNS record automation | Kubernetes SIG project, syncs K8s services to DNS providers |
| ingress-nginx | Latest | HTTP/HTTPS ingress controller | Most widely used ingress controller, proven at scale |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| PgBouncer | Managed by DO | PostgreSQL connection pooling | All API runtime connections (not migrations) |
| TypeORM | 0.3.19 | Database ORM with migration support | Database schema management via migrations |
| HorizontalPodAutoscaler | autoscaling/v2 | Pod auto-scaling based on metrics | Production deployments with variable load |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ingress-nginx | Traefik, Contour | ingress-nginx has broader adoption and DO integration |
| cert-manager | Manual certificates | cert-manager automates renewal, essential for production |
| Helm | Kustomize only | Helm provides better templating and release management |
| external-dns | Manual DNS updates | external-dns eliminates toil, reduces human error |

**Installation:**
```bash
# cert-manager (already installed in Phase 24-03)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# ingress-nginx (DigitalOcean 1-Click App or Helm)
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --set controller.service.type=LoadBalancer

# external-dns
kubectl apply -f k8s/external-dns-deployment.yaml

# Deploy control plane with Helm
helm upgrade --install nebula-dns ./helm/safedns -n nebula-dns \
  --set api.image.tag=v1.0.0 \
  --set ui.image.tag=v1.0.0 \
  --set adminUi.image.tag=v1.0.0
```

## Architecture Patterns

### Recommended Project Structure
```
k8s/
├── base/
│   ├── api-deployment.yaml           # API Deployment + Service + HPA
│   ├── ui-deployment.yaml            # UI Deployment + Service
│   ├── admin-ui-deployment.yaml      # Admin UI Deployment + Service (NEW)
│   ├── ingress.yaml                  # Ingress with cert-manager annotations
│   ├── external-dns-deployment.yaml  # external-dns RBAC + Deployment (NEW)
│   └── secrets/                      # Secret templates (not committed)
├── overlays/
│   ├── staging/
│   └── production/                   # Production-specific configs
└── helm/
    └── safedns/
        ├── Chart.yaml
        ├── values.yaml               # Default values
        ├── values-production.yaml    # Production overrides (NEW)
        └── templates/
            ├── api-deployment.yaml
            ├── ui-deployment.yaml
            ├── admin-ui-deployment.yaml  (NEW)
            ├── ingress.yaml
            └── db-migration-job.yaml # Helm pre-upgrade hook
```

### Pattern 1: Next.js Runtime Environment Variables

**What:** Next.js standalone output with server-side environment variable access (avoiding NEXT_PUBLIC_ for runtime config)

**When to use:** Multi-environment Docker deployments where configuration differs per environment

**Why it works:**
- `NEXT_PUBLIC_` variables are inlined at build time, frozen into JavaScript bundles
- Server-side variables (no prefix) are read from `process.env` at runtime
- Standalone output creates minimal `server.js` that loads runtime configuration

**Critical limitation:** Client-side code cannot access non-NEXT_PUBLIC_ variables. For client-side config, use API endpoint to fetch runtime config.

**Example:**
```typescript
// ui/src/lib/api.ts
// ❌ WRONG: NEXT_PUBLIC_ baked at build time
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// ✅ CORRECT: Server-side only, runtime value
export function getApiUrl() {
  // This must be called server-side (getServerSideProps, API routes, Server Components)
  return process.env.API_URL || 'http://localhost:4010';
}

// For client-side access, expose via API route:
// ui/src/app/api/config/route.ts
export async function GET() {
  return Response.json({
    apiUrl: process.env.API_URL,
    // Don't expose secrets like JWT_SECRET
  });
}
```

**Sources:**
- [Next.js Environment Variables Guide](https://nextjs.org/docs/pages/guides/environment-variables) - Official documentation confirms NEXT_PUBLIC_ is build-time only
- [Next.js Standalone Output](https://nextjs.org/docs/pages/api-reference/config/next-config-js/output) - Standalone mode documentation

### Pattern 2: Kubernetes Database Migration Job with Helm Hooks

**What:** Separate Job for database migrations that runs before API deployment using Helm pre-upgrade hooks

**When to use:** TypeORM migrations that require direct database connection (bypassing PgBouncer)

**Why it works:**
- PgBouncer connection pooling is incompatible with TypeORM migrations (DDL + advisory locks)
- Helm hooks ensure migrations complete before API pods start
- Job uses `database-direct-url` secret key for non-pooled connection
- `backoffLimit: 3` and `activeDeadlineSeconds: 900` provide retry + timeout safety

**Example:**
```yaml
# helm/safedns/templates/db-migration-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "nebuladns.fullname" . }}-db-migration
  annotations:
    helm.sh/hook: pre-upgrade,pre-install
    helm.sh/hook-weight: "-5"
    helm.sh/hook-delete-policy: before-hook-creation
spec:
  backoffLimit: 3
  activeDeadlineSeconds: 900  # 15 minutes for SSL + managed PostgreSQL
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migration
          image: "{{ .Values.api.image.repository }}:{{ .Values.api.image.tag }}"
          command:
            - sh
            - -c
            - |
              echo "Running database migrations..."
              npm run migration:run
              echo "Migrations complete"
          env:
            - name: NODE_ENV
              value: production
            # CRITICAL: Use direct connection, not pooled
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: {{ include "nebuladns.fullname" . }}-secrets
                  key: database-direct-url
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

**Sources:**
- [NestJS TypeORM Migrations in Docker](https://peturgeorgievv.com/blog/nestjs-with-typeorm-and-docker-running-migrations-before-start)
- [TypeORM Migrations Guide](https://peturgeorgievv.com/blog/typeorm-migrations-explained-example-with-nestjs-and-postgresql)
- Project decision from Phase 25-01: Use database-direct-url for migrations

### Pattern 3: cert-manager with DNS-01 Challenge for Wildcard Certificates

**What:** ClusterIssuer configured with DigitalOcean DNS-01 solver to obtain wildcard TLS certificates from Let's Encrypt

**When to use:** Multi-subdomain deployments (app.domain.com, api.domain.com, admin.domain.com) where wildcard cert (*.domain.com) is more efficient than individual certs

**Why it works:**
- DNS-01 challenge proves domain ownership by creating TXT records in DNS
- Supports wildcard certificates (HTTP-01 does not)
- cert-manager automates certificate issuance and 60-day renewal
- DigitalOcean provider uses API token to create/delete TXT records

**Already configured** in Phase 24-03, just need to reference in Ingress.

**Example:**
```yaml
# k8s/base/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nebula-dns
  namespace: nebula-dns
  annotations:
    # Reference the ClusterIssuer
    cert-manager.io/cluster-issuer: letsencrypt-prod
    # Standard nginx ingress settings
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.nebuladns.io
        - api.nebuladns.io
        - admin.nebuladns.io
      secretName: nebula-dns-tls  # cert-manager creates this Secret
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

**Certificate lifecycle:**
1. Ingress created with `cert-manager.io/cluster-issuer` annotation
2. cert-manager detects Ingress, creates Certificate resource
3. Certificate triggers ACME challenge with Let's Encrypt
4. cert-manager uses DigitalOcean provider to create `_acme-challenge.nebuladns.io` TXT record
5. Let's Encrypt verifies TXT record, issues certificate
6. cert-manager stores cert in `nebula-dns-tls` Secret
7. Ingress controller mounts Secret for TLS termination
8. cert-manager auto-renews 30 days before expiration

**Sources:**
- [cert-manager DigitalOcean DNS-01 Provider](https://cert-manager.io/docs/configuration/acme/dns01/digitalocean/)
- [DigitalOcean Wildcard Certificates Guide](https://docs.digitalocean.com/products/kubernetes/getting-started/operational-readiness/configure-wildcard-certificates/)
- Project decision from Phase 24-03: DNS-01 challenge solver configured

### Pattern 4: external-dns for LoadBalancer DNS Automation

**What:** external-dns controller watches Kubernetes Service resources and automatically creates/updates DNS records in DigitalOcean

**When to use:** LoadBalancer Services that need DNS hostnames (e.g., DNS endpoints, ingress LoadBalancer)

**Why it works:**
- Eliminates manual DNS record management
- Syncs LoadBalancer external IP to DNS provider within 1 minute
- Deletes DNS records when Service is deleted
- Uses service annotation `external-dns.alpha.kubernetes.io/hostname` to specify DNS name

**Example:**
```yaml
# external-dns deployment (applies to all annotated Services)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: external-dns
  template:
    metadata:
      labels:
        app: external-dns
    spec:
      serviceAccountName: external-dns
      containers:
        - name: external-dns
          image: registry.k8s.io/external-dns/external-dns:v0.14.0
          args:
            - --source=service
            - --source=ingress
            - --domain-filter=nebuladns.io  # Only manage this domain
            - --provider=digitalocean
            - --policy=sync  # Create and delete records
            - --txt-owner-id=nebula-dns-k8s  # Unique identifier
            - --txt-prefix=_externaldns.  # TXT record prefix for ownership
          env:
            - name: DO_TOKEN
              valueFrom:
                secretKeyRef:
                  name: digitalocean-dns
                  key: access-token
---
# Service that gets DNS record
apiVersion: v1
kind: Service
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
  annotations:
    external-dns.alpha.kubernetes.io/hostname: app.nebuladns.io,api.nebuladns.io,admin.nebuladns.io
spec:
  type: LoadBalancer
  # ... service spec
```

**Workflow:**
1. LoadBalancer Service created with `external-dns.alpha.kubernetes.io/hostname` annotation
2. DigitalOcean cloud controller provisions LoadBalancer, assigns external IP
3. external-dns detects Service, reads annotation and external IP
4. external-dns creates A records in DigitalOcean DNS: `app.nebuladns.io -> 64.23.x.x`
5. external-dns creates TXT record for ownership: `_externaldns.app.nebuladns.io -> "heritage=external-dns,owner=nebula-dns-k8s"`

**Sources:**
- [external-dns DigitalOcean Tutorial](https://kubernetes-sigs.github.io/external-dns/v0.14.0/tutorials/digitalocean/)
- [DigitalOcean external-dns Guide](https://www.digitalocean.com/community/tutorials/how-to-automatically-manage-dns-records-from-digitalocean-kubernetes-using-externaldns)

### Pattern 5: HPA with Resource Requests/Limits

**What:** HorizontalPodAutoscaler configured with proper resource requests and limits for auto-scaling

**When to use:** All production deployments with variable load (API, policy-svc, dnsdist)

**Why it works:**
- HPA calculates CPU/memory utilization as percentage of requests (requests are mandatory)
- Proper limits prevent resource exhaustion and noisy neighbor issues
- Target utilization of 60-70% provides headroom for traffic spikes
- Memory requests = limits for predictable memory allocation
- CPU limits avoided or set to 110-140% of requests to prevent throttling

**Example:**
```yaml
# API Deployment with resources
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  template:
    spec:
      containers:
        - name: api
          resources:
            requests:
              cpu: 250m        # HPA calculates utilization from this
              memory: 256Mi    # HPA memory target from this
            limits:
              cpu: 1000m       # 400% burst headroom for startup/spikes
              memory: 1Gi      # Hard limit to prevent OOM
---
# HPA configuration
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70  # Scale up at 70% of 250m = 175m
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80  # Scale up at 80% of 256Mi
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60  # Wait 60s before scale-up
      policies:
        - type: Percent
          value: 50  # Add 50% more pods per cycle
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300  # Wait 5 minutes before scale-down
      policies:
        - type: Pods
          value: 1  # Remove 1 pod per cycle
          periodSeconds: 120
```

**Resource sizing guidance:**

| Service | Request CPU | Request Memory | Limit CPU | Limit Memory | HPA Target | Reasoning |
|---------|-------------|----------------|-----------|--------------|------------|-----------|
| API | 250m | 256Mi | 1000m | 1Gi | 70% | NestJS startup needs CPU burst |
| UI | 100m | 128Mi | 500m | 512Mi | N/A | Stateless, low resource |
| Admin UI | 100m | 128Mi | 500m | 512Mi | N/A | Low traffic, low resource |
| policy-svc | 100m | 64Mi | 500m | 256Mi | 60% | High throughput, low latency |

**Sources:**
- [Kubernetes Resource Management Guide](https://cast.ai/blog/kubernetes-resource-management-rightsizing-limits-requests/)
- [HPA Best Practices](https://www.plural.sh/blog/hpa-kubernetes-guide/)
- [Right-Sizing Resources in 2026](https://oneuptime.com/blog/post/2026-01-06-kubernetes-right-size-resources/view)

### Anti-Patterns to Avoid

- **Mixing build-time and runtime environment variables**: Don't use NEXT_PUBLIC_ for configuration that differs per environment (API URLs, feature flags). These are baked at build time and create environment-specific Docker images.

- **Running migrations from API container startup**: TypeORM migrations require direct PostgreSQL connection (not PgBouncer). Running migrations in API container startup delays pod readiness, causes race conditions in multi-replica deployments, and can fail due to connection pool limitations. Use Helm pre-upgrade Job instead.

- **HTTP-01 challenge for wildcard certificates**: HTTP-01 cannot issue wildcard certificates. Use DNS-01 challenge with cert-manager DigitalOcean provider.

- **Manual DNS record updates for LoadBalancer IPs**: LoadBalancer IPs can change during cluster operations. Use external-dns to automatically sync Service external IPs to DNS provider.

- **Missing resource requests with HPA**: HPA requires resource requests to calculate utilization percentage. Without requests, HPA cannot function.

- **Overly aggressive HPA scale-down**: Rapid scale-down causes connection disruption. Use `stabilizationWindowSeconds: 300` (5 minutes) to smooth scale-down behavior.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TLS certificate lifecycle | Custom cert renewal scripts | cert-manager | Handles ACME protocol, DNS-01 challenges, auto-renewal, multi-provider support. Custom scripts miss edge cases (rate limits, DNS propagation delays, cert chains). |
| DNS record synchronization | Scripts to update DNS on deploy | external-dns | Watches K8s resources, handles create/update/delete, implements ownership model to prevent conflicts. Manual sync creates stale records. |
| Runtime configuration injection | Custom init containers to write config | Kubernetes Secrets + env vars | Native K8s mechanism, works with all container runtimes, integrates with secret management tools. Custom solutions add complexity. |
| Database migration orchestration | Migration container in API pod | Helm pre-upgrade Job | Helm hooks guarantee ordering, Jobs provide retry logic, separate lifecycle from API pods. In-pod migrations cause startup delays and race conditions. |
| Load balancer provisioning | Terraform to create LBs separately | K8s LoadBalancer Service | Cloud controller provisions LB automatically, manages lifecycle, updates security groups. Separate provisioning creates drift. |

**Key insight:** Kubernetes-native solutions (cert-manager, external-dns, Jobs, Services) are battle-tested, handle edge cases, and integrate with the K8s lifecycle. Custom solutions introduce maintenance burden and subtle bugs (e.g., DNS propagation delays, certificate chain validation, migration race conditions).

## Common Pitfalls

### Pitfall 1: Next.js NEXT_PUBLIC_ Variables Frozen at Build Time

**What goes wrong:** Docker image built with `NEXT_PUBLIC_API_URL=http://staging-api` works in staging but when deployed to production, still connects to staging API.

**Why it happens:** Next.js inlines `NEXT_PUBLIC_*` variables into JavaScript bundles during `next build`. The value is frozen in the bundle, impossible to change at runtime without rebuilding.

**How to avoid:**
1. Remove `NEXT_PUBLIC_` prefix from runtime configuration (API URLs, feature flags)
2. Access server-side via `process.env` in Server Components, API routes, `getServerSideProps`
3. For client-side access, create API endpoint that exposes runtime config: `GET /api/config`
4. Only use `NEXT_PUBLIC_` for true constants that never change per environment (analytics IDs that are different per build)

**Warning signs:**
- Environment-specific values in `NEXT_PUBLIC_` variables
- Need to rebuild Docker image when config changes
- Different .env files per environment with NEXT_PUBLIC_ values

**Sources:**
- [Next.js Environment Variables - Runtime vs Build Time](https://nextjs.org/docs/pages/guides/environment-variables)
- [Next.js Runtime Configuration Discussion](https://github.com/vercel/next.js/discussions/44628)

### Pitfall 2: PgBouncer Connection Pooling Breaks Migrations

**What goes wrong:** TypeORM migrations hang, timeout, or fail with "prepared statement already exists" errors when connecting through PgBouncer.

**Why it happens:** PgBouncer operates in transaction mode (connection returned to pool after transaction). TypeORM migrations use:
1. DDL statements (CREATE TABLE) that operate outside transactions
2. Advisory locks for migration coordination across replicas
3. Prepared statements that expect persistent connections

PgBouncer's connection reuse breaks all three.

**How to avoid:**
1. Create separate Secret keys: `database-url` (pooled) and `database-direct-url` (non-pooled)
2. API runtime uses `database-url` for normal queries
3. Migration Job uses `database-direct-url` to bypass PgBouncer
4. Migration Job runs as Helm pre-upgrade hook, never in API container

**Warning signs:**
- Migration timeouts (>60s)
- "prepared statement ... already exists" errors
- Advisory lock acquisition failures
- Migrations work locally but fail in K8s

**Sources:**
- [DigitalOcean PgBouncer Connection Pools](https://www.digitalocean.com/community/tutorials/managed-databases-connection-pools-and-postgresql-benchmarking-using-pgbench)
- [Prisma PgBouncer Issues (similar ORM)](https://github.com/prisma/prisma/issues/1638)
- Project decision from Phase 25-01: Use database-direct-url for migrations

### Pitfall 3: Certificate Not Ready When Ingress Created

**What goes wrong:** Ingress created but serves self-signed certificate or shows "cert-manager.io/issuer: pending" for hours. Browser shows "Certificate invalid" despite correct annotations.

**Why it happens:** Certificate issuance takes 1-5 minutes (DNS propagation + ACME challenge). If clients connect during this window, they receive default self-signed cert. Also, if DNS records don't exist yet, DNS-01 challenge fails silently.

**How to avoid:**
1. Ensure DNS records exist BEFORE creating Ingress (external-dns creates them, wait 2-3 minutes)
2. Check Certificate resource status: `kubectl describe certificate nebula-dns-tls -n nebula-dns`
3. Monitor cert-manager logs: `kubectl logs -n cert-manager deploy/cert-manager`
4. Use staging issuer (`letsencrypt-staging`) for testing to avoid rate limits
5. Add readiness check in deployment script: wait for Certificate `status.conditions[?(@.type=="Ready")].status == "True"`

**Correct order:**
1. Install cert-manager + ClusterIssuer (Phase 24-03, already done)
2. Create Services with external-dns annotations
3. Wait for DNS records to propagate (2-3 minutes)
4. Create Ingress with cert-manager annotation
5. Wait for Certificate to become Ready (1-5 minutes)
6. Verify TLS with `curl -v https://app.nebuladns.io`

**Warning signs:**
- "webhook: failed calling webhook" errors in cert-manager logs
- Certificate stuck in "Pending" state
- DNS-01 challenge fails with "NXDOMAIN" or "SERVFAIL"
- TXT record `_acme-challenge.nebuladns.io` doesn't exist in DigitalOcean DNS

**Sources:**
- [cert-manager DNS-01 Validation](https://cert-manager.io/docs/tutorials/acme/dns-validation/)
- [DigitalOcean cert-manager Setup](https://docs.digitalocean.com/products/kubernetes/getting-started/operational-readiness/configure-wildcard-certificates/)

### Pitfall 4: external-dns Deletes DNS Records on Service Update

**What goes wrong:** Service updated (e.g., change port), external-dns deletes and recreates DNS records. During deletion window, DNS queries return NXDOMAIN, causing outages.

**Why it happens:** external-dns default policy is `sync`, which deletes records for Services that no longer exist. If external-dns controller restarts or Service annotation changes, it may delete and recreate records.

**How to avoid:**
1. Use `--policy=upsert-only` instead of `sync` to prevent deletions
2. Use low DNS TTL (300 seconds) so changes propagate quickly
3. Monitor external-dns logs during deployments: `kubectl logs -n kube-system deploy/external-dns`
4. Validate DNS before and after Service changes: `dig app.nebuladns.io +short`
5. Use `--txt-owner-id` to ensure only one external-dns instance manages records

**Warning signs:**
- DNS queries intermittently fail with NXDOMAIN
- TXT records `_externaldns.app.nebuladns.io` are deleted
- Multiple A records for same hostname (competing external-dns instances)

**Sources:**
- [external-dns DigitalOcean Tutorial](https://kubernetes-sigs.github.io/external-dns/v0.14.0/tutorials/digitalocean/)
- [external-dns Policies](https://github.com/kubernetes-sigs/external-dns)

### Pitfall 5: HPA Scales Too Aggressively or Not At All

**What goes wrong:**
- **Too aggressive**: HPA scales up to maxReplicas within minutes, then immediately scales down, causing pod churn
- **Not at all**: Load increases but HPA doesn't scale, pods OOMKilled or throttled

**Why it happens:**
- **Too aggressive**: Low `stabilizationWindowSeconds` or high `scaleUp.policies.value`
- **Not at all**: Missing resource requests, HPA cannot calculate utilization percentage

**How to avoid:**
1. **Always set resource requests**: HPA calculates utilization as `(current usage / request) * 100`
2. **Use conservative scale-up**: `stabilizationWindowSeconds: 60`, `policies.value: 50%` (add 50% more pods)
3. **Use slow scale-down**: `stabilizationWindowSeconds: 300` (5 minutes) to avoid pod churn
4. **Set appropriate targets**: 60-70% for CPU (allows burst), 80% for memory
5. **Monitor with `kubectl describe hpa`**: Check "Metrics" and "Events" sections

**Example of HPA not scaling:**
```bash
$ kubectl describe hpa api -n nebula-dns
...
Metrics:         <unknown>/70% (target)  # Missing resource requests!
Events:          unable to compute replica count: unable to get metric resource cpu
```

**Fix:** Add resource requests to Deployment spec.

**Warning signs:**
- HPA "Metrics" shows `<unknown>`
- Frequent scale-up/down events (< 5 minutes apart)
- Pods OOMKilled despite HPA configured
- CPU throttling despite low CPU utilization

**Sources:**
- [Kubernetes HPA Best Practices](https://scaleops.com/blog/kubernetes-hpa/)
- [HPA Setup Guide 2026](https://oneuptime.com/blog/post/2026-01-06-kubernetes-hpa-setup/view)

## Code Examples

Verified patterns from official sources:

### NestJS API Deployment with PgBouncer Connection

```yaml
# helm/safedns/templates/api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "nebuladns.api.fullname" . }}
  labels:
    {{- include "nebuladns.labels" . | nindent 4 }}
    app.kubernetes.io/component: api
spec:
  {{- if not .Values.api.autoscaling.enabled }}
  replicas: {{ .Values.api.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "nebuladns.selectorLabels" . | nindent 6 }}
      app.kubernetes.io/component: api
  template:
    metadata:
      labels:
        {{- include "nebuladns.selectorLabels" . | nindent 8 }}
        app.kubernetes.io/component: api
    spec:
      containers:
        - name: api
          image: "{{ .Values.api.image.repository }}:{{ .Values.api.image.tag }}"
          imagePullPolicy: {{ .Values.api.image.pullPolicy }}
          ports:
            - name: http
              containerPort: 4000
              protocol: TCP
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 5
            periodSeconds: 5
          resources:
            {{- toYaml .Values.api.resources | nindent 12 }}
          env:
            - name: NODE_ENV
              value: {{ .Values.api.env.NODE_ENV | quote }}
            - name: LOG_LEVEL
              value: {{ .Values.api.env.LOG_LEVEL | quote }}
            # CRITICAL: Use pooled connection for API runtime
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: {{ include "nebuladns.fullname" . }}-secrets
                  key: database-url  # PgBouncer pooled connection
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: {{ include "nebuladns.fullname" . }}-secrets
                  key: redis-url
            - name: CLICKHOUSE_URL
              valueFrom:
                secretKeyRef:
                  name: {{ include "nebuladns.fullname" . }}-secrets
                  key: clickhouse-url
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: {{ include "nebuladns.fullname" . }}-secrets
                  key: jwt-secret
            - name: ENCRYPTION_KEY
              valueFrom:
                secretKeyRef:
                  name: {{ include "nebuladns.fullname" . }}-secrets
                  key: encryption-key
```

### Next.js UI Deployment with Runtime Environment Variables

```yaml
# helm/safedns/templates/ui-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "nebuladns.ui.fullname" . }}
  labels:
    {{- include "nebuladns.labels" . | nindent 4 }}
    app.kubernetes.io/component: ui
spec:
  replicas: {{ .Values.ui.replicaCount }}
  selector:
    matchLabels:
      {{- include "nebuladns.selectorLabels" . | nindent 6 }}
      app.kubernetes.io/component: ui
  template:
    metadata:
      labels:
        {{- include "nebuladns.selectorLabels" . | nindent 8 }}
        app.kubernetes.io/component: ui
    spec:
      serviceAccountName: ui
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: ui
          image: "{{ .Values.ui.image.repository }}:{{ .Values.ui.image.tag }}"
          imagePullPolicy: {{ .Values.ui.image.pullPolicy }}
          ports:
            - name: http
              containerPort: 3000
              protocol: TCP
          env:
            - name: NODE_ENV
              value: "production"
            # Runtime environment variables (NO NEXT_PUBLIC_ prefix)
            # These are read server-side via process.env
            - name: API_URL
              value: "http://api.nebula-dns.svc.cluster.local:80"
            - name: APP_URL
              value: "https://app.nebuladns.io"
            - name: ADMIN_UI_URL
              value: "https://admin.nebuladns.io"
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /
              port: http
            initialDelaySeconds: 5
            periodSeconds: 5
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: false  # Next.js needs write access to .next
            capabilities:
              drop:
                - ALL
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    {{- include "nebuladns.selectorLabels" . | nindent 20 }}
                    app.kubernetes.io/component: ui
                topologyKey: kubernetes.io/hostname
```

### Ingress with cert-manager and Multiple Hosts

```yaml
# k8s/base/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nebula-dns
  namespace: nebula-dns
  annotations:
    # cert-manager will detect this and create Certificate resource
    cert-manager.io/cluster-issuer: letsencrypt-prod
    # nginx ingress settings
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    # CORS for API subdomain
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://app.nebuladns.io,https://admin.nebuladns.io"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.nebuladns.io
        - api.nebuladns.io
        - admin.nebuladns.io
      secretName: nebula-dns-tls  # cert-manager will create this Secret
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

### external-dns Deployment for DigitalOcean

```yaml
# k8s/base/external-dns-deployment.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: external-dns
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: external-dns
rules:
  - apiGroups: [""]
    resources: ["services", "endpoints", "pods"]
    verbs: ["get", "watch", "list"]
  - apiGroups: ["extensions", "networking.k8s.io"]
    resources: ["ingresses"]
    verbs: ["get", "watch", "list"]
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: external-dns-viewer
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: external-dns
subjects:
  - kind: ServiceAccount
    name: external-dns
    namespace: kube-system
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: external-dns
  strategy:
    type: Recreate  # Prevent duplicate external-dns instances
  template:
    metadata:
      labels:
        app: external-dns
    spec:
      serviceAccountName: external-dns
      containers:
        - name: external-dns
          image: registry.k8s.io/external-dns/external-dns:v0.14.0
          args:
            - --source=service
            - --source=ingress
            - --domain-filter=nebuladns.io  # Only manage nebuladns.io domain
            - --provider=digitalocean
            - --policy=sync  # Create, update, and delete DNS records
            - --txt-owner-id=nebula-dns-k8s  # Unique identifier for this cluster
            - --txt-prefix=_externaldns.  # TXT record prefix
            - --interval=1m  # Sync every minute
            - --log-level=info
          env:
            - name: DO_TOKEN
              valueFrom:
                secretKeyRef:
                  name: digitalocean-dns
                  key: access-token
          resources:
            requests:
              cpu: 10m
              memory: 32Mi
            limits:
              cpu: 50m
              memory: 64Mi
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual certificate renewal with cron | cert-manager with ACME | 2020+ | Eliminates certificate expiration incidents, automates DNS-01 challenges |
| NEXT_PUBLIC_ for all env vars | Server-side env vars only | 2023+ (Next.js 12+) | Enables runtime configuration, multi-environment Docker images |
| Migrations in API container startup | Helm pre-upgrade Job | 2021+ | Eliminates race conditions, separates migration lifecycle from API |
| Manual DNS updates on deploy | external-dns controller | 2019+ | Automates DNS sync, prevents stale records, handles LB IP changes |
| HTTP-01 challenge per subdomain | DNS-01 wildcard certificate | 2018+ | Single cert for all subdomains, works behind firewall, no HTTP exposure |

**Deprecated/outdated:**
- **publicRuntimeConfig/serverRuntimeConfig in next.config.js**: Deprecated in Next.js 10+, use environment variables directly
- **TypeORM synchronize: true**: Never use in production, causes data loss. Use migrations instead.
- **HTTP-01 ACME challenge for production**: Requires port 80 exposure, doesn't support wildcards. Use DNS-01 for enterprise deployments.
- **Manual LoadBalancer provisioning**: Cloud controllers automatically provision LBs from K8s Service resources. Separate provisioning creates drift.

## Open Questions

1. **Ingress controller already installed?**
   - What we know: Phase 24-26 documentation doesn't mention ingress-nginx installation
   - What's unclear: Whether DigitalOcean DOKS includes ingress-nginx by default or if it needs manual installation
   - Recommendation: Check cluster for existing ingress controller (`kubectl get all -n ingress-nginx`). If not present, install via Helm or DigitalOcean 1-Click App. Prefer 1-Click App for DigitalOcean integration.

2. **Admin UI deployment location**
   - What we know: Admin UI exists in `admin-ui/` directory with separate Next.js app
   - What's unclear: Whether admin UI should be deployed to same K8s cluster or separate infrastructure for security isolation
   - Recommendation: Deploy to same cluster with separate subdomain (`admin.nebuladns.io`). Use NetworkPolicy to restrict access if needed. Physical isolation not required for MVP.

3. **External Secrets Operator usage**
   - What we know: helm/safedns/values.yaml references external-secrets integration
   - What's unclear: Whether project uses External Secrets Operator or manually created K8s Secrets
   - Recommendation: Use manual K8s Secrets for MVP (simpler), consider External Secrets Operator for rotation and audit logging in future phase.

4. **DNS record TTL configuration**
   - What we know: external-dns creates DNS records with default TTL (300 seconds)
   - What's unclear: Whether lower TTL (60s) is preferred for faster failover or higher TTL (3600s) for lower DNS query volume
   - Recommendation: Use 300 seconds (5 minutes) as balanced default. Can be adjusted via `external-dns.alpha.kubernetes.io/ttl` annotation if needed.

5. **Next.js client-side config access pattern**
   - What we know: Non-NEXT_PUBLIC_ env vars are server-side only
   - What's unclear: Best pattern for exposing runtime config to client (API route vs Server Component prop passing)
   - Recommendation: Use API route (`/api/config`) for client-side config access. Caches well, easy to secure, works with both Pages and App Router.

## Sources

### Primary (HIGH confidence)
- [Next.js Environment Variables Documentation](https://nextjs.org/docs/pages/guides/environment-variables) - Official Next.js docs on runtime vs build-time variables
- [Next.js Standalone Output](https://nextjs.org/docs/pages/api-reference/config/next-config-js/output) - Standalone mode for Docker deployments
- [cert-manager DigitalOcean DNS-01 Provider](https://cert-manager.io/docs/configuration/acme/dns01/digitalocean/) - Official cert-manager DigitalOcean integration
- [cert-manager DNS-01 Validation](https://cert-manager.io/docs/tutorials/acme/dns-validation/) - DNS-01 challenge documentation
- [external-dns DigitalOcean Tutorial](https://kubernetes-sigs.github.io/external-dns/v0.14.0/tutorials/digitalocean/) - Official external-dns setup guide
- [DigitalOcean Kubernetes Documentation](https://docs.digitalocean.com/products/kubernetes/getting-started/operational-readiness/configure-wildcard-certificates/) - DigitalOcean-specific K8s guidance (updated January 7, 2026)

### Secondary (MEDIUM confidence)
- [NestJS TypeORM Migrations in Docker](https://peturgeorgievv.com/blog/nestjs-with-typeorm-and-docker-running-migrations-before-start) - Migration best practices
- [DigitalOcean PgBouncer Connection Pools](https://www.digitalocean.com/community/tutorials/managed-databases-connection-pools-and-postgresql-benchmarking-using-pgbench) - PgBouncer configuration
- [Kubernetes HPA Best Practices 2026](https://scaleops.com/blog/kubernetes-hpa/) - HPA configuration guide
- [Kubernetes Resource Management](https://cast.ai/blog/kubernetes-resource-management-rightsizing-limits-requests/) - Resource requests/limits sizing
- [Helm Environment Variables Best Practices](https://phoenixnap.com/kb/helm-environment-variables) - Helm templating patterns

### Tertiary (LOW confidence)
- [Next.js Runtime Environment Variables Discussion](https://github.com/vercel/next.js/discussions/44628) - Community discussion, no official resolution
- [DigitalOcean LoadBalancer Annotations](https://github.com/digitalocean/digitalocean-cloud-controller-manager/blob/master/docs/controllers/services/annotations.md) - GitHub documentation, not versioned

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components are industry-standard, well-documented
- Architecture patterns: HIGH - Patterns verified with official documentation and project codebase
- Next.js runtime config: MEDIUM - Official docs clear but implementation patterns vary
- Pitfalls: HIGH - Based on official documentation warnings and common production issues

**Research date:** 2026-02-13
**Valid until:** 30 days (stable technologies, slow-moving domain)

**Key decisions requiring user confirmation:**
1. Remove NEXT_PUBLIC_ prefix from API_URL, APP_URL, ADMIN_UI_URL (requires code refactoring)
2. Deploy admin UI to same cluster (vs separate infrastructure)
3. Use manual K8s Secrets (vs External Secrets Operator)
4. Install ingress-nginx via Helm (vs DigitalOcean 1-Click App)
