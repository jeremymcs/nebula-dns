# Phase 33: Operational Readiness - Research

**Researched:** 2026-02-21
**Domain:** Kubernetes Operational Excellence (Health Checks, Graceful Shutdown, Auto-scaling, Incident Response)
**Confidence:** HIGH

## Summary

Operational readiness transforms a deployed platform into a production-grade service through five critical pillars: health monitoring, graceful degradation, auto-scaling resilience, incident response capability, and disaster recovery verification. This research synthesizes Kubernetes best practices, SRE runbook patterns, and Go/NestJS graceful shutdown implementations.

The phase addresses OPS-01 (health probes), OPS-02 (graceful shutdown), OPS-04 (incident runbooks), OPS-08 (HPA), OPS-09 (backup verification), and OPS-10 (deployment/rollback runbooks). Existing infrastructure provides strong foundation: API has HTTP health endpoints with tiered dependency checking, Policy Service has health/ready/live endpoints in Go with SIGTERM handling, monitoring has Prometheus alerting rules and SLO tracking, and Helm charts already have HPA configured for API service.

**Primary recommendation:** Implement conservative health probes with tiered dependency checks (critical vs non-critical), exec-based DNS verification for Unbound/dnsdist, graceful shutdown with ClickHouse batch flushing, hybrid runbook format (quick-action checklist + detailed diagnostics), custom DNS query rate metrics for Policy Service HPA, and monthly backup restore verification with automated scripts.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Conservative probe thresholds**: 3 consecutive failures before pod restart, 10-second probe intervals
- **Tiered dependency checking**: Critical dependencies (PostgreSQL, Redis) checked in readiness; non-critical (ClickHouse) only logged as degraded
- **Dual health endpoints**: `/healthz` for K8s probes (simple 200/503), `/health` for internal debugging (detailed JSON with per-dependency status, latency, version — behind auth)
- **Flush ClickHouse logs before shutdown**: No log loss accepted — pending ClickHouse query log batches flushed before exit
- **SIGTERM connection draining**: Services handle SIGTERM with connection draining within configured timeout
- **Hybrid runbook format**: Quick-action checklist at top for incident response, detailed explanation with diagnostic context below
- **No formal escalation tiers**: Runbooks focus on technical resolution only
- **Runbooks cover**: DNS down, DB down, Redis down, policy-svc crash, cert expiration, production deployment, rollback
- **HPA configured for Policy Service**: Custom DNS query metrics (at minimum)

### Claude's Discretion
- Liveness probe implementation per service (exec-based DNS query probes vs process checks)
- Drain timeout duration per service (based on expected request durations)
- Policy Service shutdown behavior (stop accepting vs continue serving during drain)
- Shutdown ordering across services (defined order vs independent)
- Runbook storage location (repo docs/ vs wiki vs both)
- Deployment strategy for rollback runbook (rolling vs blue-green vs canary)
- Primary HPA scaling metric (DNS QPS, CPU, or combined)
- Min/max replica range for Policy Service
- Which other services (API, UI) get HPA
- Scale-down cooldown timing

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| OPS-01 | Liveness and readiness probes configured for all services (exec-based for DNS services) | Kubernetes probe best practices, exec-based DNS health checks with drill/dig commands, tiered dependency checking patterns |
| OPS-02 | Graceful shutdown with SIGTERM handling and connection draining for all services | Go graceful shutdown patterns with context.WithTimeout, NestJS lifecycle hooks, ClickHouse batch flush before exit, terminationGracePeriodSeconds tuning |
| OPS-04 | Incident runbooks created for DNS down, DB down, Redis down, policy-svc crash, cert expiration | SRE runbook format (quick-action checklist + detailed diagnostics), incident response decision trees, Google SRE best practices |
| OPS-08 | HPA configured with custom DNS query metrics for policy-svc auto-scaling | Prometheus Adapter for custom metrics, DNS QPS metric patterns, HPA stabilization behavior, scale-down cooldown policies |
| OPS-09 | Backup verification — PostgreSQL PITR and ClickHouse Cloud automated backups confirmed working | PITR restore testing procedures, pg_verifybackup validation, monthly backup restore drill scripts, ClickHouse backup verification patterns |
| OPS-10 | Production deployment and rollback runbook documented | Helm rollback procedures, kubectl rollout status verification, rolling update vs blue-green tradeoffs, deployment troubleshooting steps |
</phase_requirements>

## Standard Stack

### Core Components

| Library/Tool | Version | Purpose | Why Standard |
|--------------|---------|---------|--------------|
| Kubernetes Probes | K8s 1.30+ | Health checking (liveness, readiness, startup) | Native K8s capability, industry standard for pod health management |
| Prometheus Adapter | v0.11+ | Custom metrics for HPA | Official CNCF project for exposing Prometheus metrics to K8s HPA |
| pg_verifybackup | PostgreSQL 13+ | Backup integrity verification | Official PostgreSQL backup validation tool, part of core distribution |
| clickhouse-backup | v2.5+ | ClickHouse backup/restore | Altinity's industry-standard tool for ClickHouse backup operations |
| Helm | v3.14+ | Deployment management | De facto standard for Kubernetes package management with rollback support |

### Supporting Tools

| Tool | Purpose | When to Use |
|------|---------|-------------|
| drill (ldns) | DNS health check execution | Exec-based probes for Unbound/dnsdist liveness verification |
| kubectl rollout | Deployment verification | Post-deployment health confirmation and rollback execution |
| Prometheus Alert Manager | Incident alerting | Integration with runbooks via alert annotations |
| Grafana | SLO dashboards | Visual monitoring for operational health tracking |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Prometheus Adapter | KEDA (Kubernetes Event Driven Autoscaling) | KEDA better for event-driven workloads (queues, streams); Prometheus Adapter simpler for metric-based scaling |
| Helm rollback | Argo Rollouts | Argo provides advanced blue-green/canary strategies but adds complexity; Helm sufficient for rolling updates |
| Monthly restore testing | Automated daily restores | Daily testing provides faster MTTR detection but significantly increases infrastructure costs and operational overhead |

**Installation:**
```bash
# Prometheus Adapter (for custom metrics HPA)
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus-adapter prometheus-community/prometheus-adapter -n monitoring

# clickhouse-backup (for backup verification)
docker pull alexakulov/clickhouse-backup:latest

# drill (for DNS exec probes)
# Already included in Unbound container image via ldns package
```

## Architecture Patterns

### Recommended Project Structure

```
docs/
├── runbooks/                    # Incident response playbooks
│   ├── dns-down.md             # DNS resolution failure
│   ├── database-down.md        # PostgreSQL/ClickHouse failures
│   ├── redis-down.md           # Cache/pub-sub failures
│   ├── policy-svc-crash.md     # Policy service failures
│   ├── cert-expiration.md      # TLS certificate issues
│   ├── deployment.md           # Production deployment procedure
│   └── rollback.md             # Deployment rollback procedure
helm/safedns/templates/
├── api-deployment.yaml         # Enhanced with tiered health checks
├── policy-svc-deployment.yaml  # NEW: Go service with ClickHouse flush
├── unbound-statefulset.yaml    # Enhanced with exec-based DNS probes
├── dnsdist-deployment.yaml     # Enhanced with exec-based DNS probes
└── hpa-custom-metrics.yaml     # NEW: Custom DNS QPS metrics for HPA
scripts/
├── verify-backups.sh           # Monthly PITR and ClickHouse restore tests
└── deployment-preflight.sh     # Pre-deployment health checks
```

### Pattern 1: Tiered Health Check (Critical vs Non-Critical Dependencies)

**What:** Readiness probes check critical dependencies (PostgreSQL, Redis) for pod availability; non-critical dependencies (ClickHouse) log degraded status but don't fail probe.

**When to use:** Services with analytics/logging dependencies that shouldn't block traffic serving.

**Example:**
```typescript
// Source: Existing api/src/modules/health/health.service.ts (enhanced)
async checkReady(): Promise<{ ready: boolean; checks: Record<string, boolean> }> {
  const [postgres, redis, clickhouse] = await Promise.all([
    this.checkPostgres(),
    this.checkRedis(),
    this.checkClickhouse(),
  ]);

  // CRITICAL dependencies: Must be healthy for readiness
  const checks = {
    postgres: postgres.status === 'healthy',
    redis: redis.status === 'healthy',
  };

  // NON-CRITICAL: Log warning but don't fail probe
  if (clickhouse.status !== 'healthy') {
    this.logger.warn('ClickHouse degraded - analytics may be delayed', {
      error: clickhouse.error,
    });
  }

  const ready = checks.postgres && checks.redis;
  return { ready, checks };
}
```

**Kubernetes probe configuration:**
```yaml
# Source: Kubernetes best practices - tiered dependency checking
readinessProbe:
  httpGet:
    path: /health/ready
    port: http
  initialDelaySeconds: 5
  periodSeconds: 10          # User requirement: 10s intervals
  timeoutSeconds: 3
  failureThreshold: 3        # User requirement: 3 consecutive failures
```

### Pattern 2: Exec-Based DNS Health Check for DNS Services

**What:** Liveness probes use `drill` command to perform actual DNS resolution test instead of simple TCP socket check.

**When to use:** DNS services (Unbound, dnsdist) where process may be running but resolver broken.

**Example:**
```yaml
# Source: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
# Unbound liveness probe
livenessProbe:
  exec:
    command:
      - /bin/sh
      - -c
      - drill @127.0.0.1 google.com | grep -q "NOERROR"
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

# dnsdist liveness probe
livenessProbe:
  exec:
    command:
      - /bin/sh
      - -c
      - echo -e "showServers()\nquit\n" | nc 127.0.0.1 5199 | grep -q "All"
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

**Rationale:** TCP checks pass if port is open, but resolver may be unable to query upstream. Exec-based checks validate actual DNS functionality.

### Pattern 3: Go Graceful Shutdown with ClickHouse Batch Flush

**What:** SIGTERM handler stops accepting new requests, flushes pending ClickHouse batches, then shuts down with timeout.

**When to use:** Services with buffered writes to external systems (ClickHouse, message queues).

**Example:**
```go
// Source: https://oneuptime.com/blog/post/2026-01-07-go-graceful-shutdown-kubernetes/view
// Enhanced from policy-svc/cmd/main.go

func main() {
    // ... server setup ...

    // Create shutdown context
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    // Start ClickHouse batch logger
    chBatcher := clickhouse.NewBatchLogger(chClient, logger)
    go chBatcher.Start(ctx)

    // Wait for interrupt signal
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    logger.Info("Shutting down server...")

    // 1. Stop accepting new requests (30s timeout)
    shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer shutdownCancel()

    if err := srv.Shutdown(shutdownCtx); err != nil {
        logger.Error("Server forced to shutdown", zap.Error(err))
    }

    // 2. Flush pending ClickHouse batches (user requirement: no log loss)
    flushCtx, flushCancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer flushCancel()

    if err := chBatcher.Flush(flushCtx); err != nil {
        logger.Error("Failed to flush ClickHouse batches", zap.Error(err))
    } else {
        logger.Info("Successfully flushed all ClickHouse batches")
    }

    logger.Info("Server stopped gracefully")
}
```

**Kubernetes terminationGracePeriodSeconds:**
```yaml
# Source: https://oneuptime.com/blog/post/2026-02-09-termination-grace-period-clean-shutdowns/view
spec:
  terminationGracePeriodSeconds: 45  # 30s drain + 10s flush + 5s buffer
  containers:
    - name: policy-svc
      # ... container spec ...
```

### Pattern 4: Hybrid Runbook Format (Quick Action + Detailed Diagnostics)

**What:** Runbook starts with step-by-step action checklist for rapid response, followed by diagnostic context and explanation sections.

**When to use:** All incident runbooks where responders need immediate action guidance under pressure.

**Example:**
```markdown
# Runbook: Policy Service Crash Loop

## Quick Actions (DO THIS FIRST)
⏱️ **Target: 5 minutes to initial diagnosis**

- [ ] 1. Check current pod status: `kubectl get pods -n nebula-dns | grep policy-svc`
- [ ] 2. View recent logs: `kubectl logs -n nebula-dns -l app.kubernetes.io/component=policy-svc --tail=100`
- [ ] 3. Check Redis connectivity: `kubectl exec -n nebula-dns deploy/policy-svc -- redis-cli -u $REDIS_URL ping`
- [ ] 4. Verify ClickHouse connection: `kubectl logs -n nebula-dns -l app.kubernetes.io/component=policy-svc | grep "ClickHouse"`
- [ ] 5. If Redis down → See [Redis Down Runbook](redis-down.md)
- [ ] 6. If OOM killed → Increase memory limits in values.yaml, redeploy
- [ ] 7. If startup timeout → Check initialDelaySeconds, may need increase for slow cache warm-up

---

## Diagnostic Context

### Common Causes (by frequency)
1. **Redis connection failure** (60%): Managed Valkey credentials rotated, TLS cert expired
2. **Out of Memory** (25%): Cache size exceeds pod memory limits during tenant onboarding
3. **ClickHouse unavailable** (10%): Cloud service maintenance, network partition
4. **Image pull error** (5%): DOCR credentials expired, image tag doesn't exist

### How Policy Service Startup Works
1. Connects to Redis, initializes policy cache
2. Loads IP ranges from Redis (can be slow on first boot)
3. Connects to ClickHouse for query logging
4. Starts HTTP server and health endpoints
5. Begins accepting traffic after readiness probe passes

### Warning Signs Before Crash
- `policy_cache_load_duration_seconds` > 30s in Grafana
- `redis_connection_errors_total` spikes
- `go_memstats_alloc_bytes` approaching pod memory limit

### Related Alerts
- `PolicyServiceDown` (fires after 1m downtime)
- `PolicyCacheHitRateLow` (may precede crash if cache corrupted)
```

**Source:** https://www.nobl9.com/it-incident-management/runbook-example (runbook format), https://blog.incidenthub.cloud/The-No-Nonsense-Guide-to-Runbook-Best-Practices (quick action checklists)

### Pattern 5: HPA with Custom DNS Query Metrics

**What:** Horizontal Pod Autoscaler scales Policy Service based on DNS queries per second (QPS) exposed via Prometheus Adapter.

**When to use:** Services with custom business metrics that better predict scaling needs than CPU/memory.

**Example:**
```yaml
# Source: https://oneuptime.com/blog/post/2026-01-21-horizontal-pod-autoscaler-custom-metrics/view
# Prometheus Adapter ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-adapter
  namespace: monitoring
data:
  config.yaml: |
    rules:
      - seriesQuery: 'dns_queries_total{job="policy-svc"}'
        resources:
          overrides:
            namespace: {resource: "namespace"}
            pod: {resource: "pod"}
        name:
          matches: "^(.*)_total$"
          as: "dns_queries_per_second"
        metricsQuery: 'sum(rate(<<.Series>>{<<.LabelMatchers>>}[2m])) by (<<.GroupBy>>)'

---
# HPA using custom metric
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: policy-svc-hpa
  namespace: nebula-dns
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: policy-svc
  minReplicas: 3                    # User requirement: HPA for Policy Service
  maxReplicas: 20
  metrics:
    - type: Pods
      pods:
        metric:
          name: dns_queries_per_second
        target:
          type: AverageValue
          averageValue: "1000"      # Scale when >1000 QPS per pod
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300   # 5 min cooldown before scale-down
      policies:
        - type: Pods
          value: 1
          periodSeconds: 60              # Max 1 pod removal per minute
    scaleUp:
      stabilizationWindowSeconds: 60    # 1 min cooldown before scale-up
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60              # Max 50% increase per minute
```

### Anti-Patterns to Avoid

- **Liveness checks dependencies:** Liveness should only verify process health, not database connectivity. Dependency checks belong in readiness probes. ([Source](https://cloud.google.com/blog/products/containers-kubernetes/kubernetes-best-practices-setting-up-health-checks-with-readiness-and-liveness-probes))

- **Ignoring terminationGracePeriodSeconds:** Default 30s often insufficient for services with connection draining or batch flushing. Calculate: drain time + flush time + 5s buffer. ([Source](https://oneuptime.com/blog/post/2026-02-09-termination-grace-period-clean-shutdowns/view))

- **Aggressive scale-down without cooldown:** HPA flapping (scale up, scale down, repeat) wastes resources. Use `behavior.scaleDown.stabilizationWindowSeconds: 300` (5 min) to prevent oscillation. ([Source](https://oneuptime.com/blog/post/2026-01-21-horizontal-pod-autoscaler-custom-metrics/view))

- **Runbooks without decision trees:** Wall-of-text runbooks fail under pressure. Use checklists and "if X then Y" decision trees for clarity. ([Source](https://www.nobl9.com/it-incident-management/runbook-example))

- **Never testing backup restores:** Untested backups are not backups. Monthly restore drills to staging environment catch backup corruption before production incident. ([Source](https://oneuptime.com/blog/post/2026-01-25-point-in-time-recovery-postgresql/view))

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Custom metrics for HPA | Custom metrics server reading Prometheus | Prometheus Adapter | Official CNCF project, handles metrics API complexity, widely tested in production |
| Backup verification scripts | One-off manual restore tests | Automated monthly restore jobs (Kubernetes CronJob) | Consistency, documentation, no human error, audit trail |
| Incident knowledge base | Wiki pages without structure | Structured runbooks with YAML frontmatter (alert mapping, severity, services) | Machine-readable for alerting integration, enforces consistency |
| Graceful shutdown logic | Custom signal handling per service | Standard patterns (Go context.WithTimeout, NestJS lifecycle hooks) | Battle-tested, handles edge cases (nested timeouts, resource cleanup) |
| Health check implementations | Custom health endpoint logic per service | Standard patterns (/health simple, /health/ready dependencies, /health/live process) | Kubernetes expectations, monitoring tool integration, troubleshooting familiarity |

**Key insight:** Kubernetes operational patterns (health checks, graceful shutdown, HPA) have well-established best practices refined over years of production use. Custom implementations miss edge cases like probe timeout tuning, termination signal race conditions, and HPA flapping prevention. Follow community patterns unless compelling reason exists.

## Common Pitfalls

### Pitfall 1: Liveness Probe Checks Transient External Dependencies

**What goes wrong:** Pod restart loops when database has brief connectivity hiccup. Liveness probe fails → Kubernetes kills pod → New pod starts → Database still unreachable → Cycle repeats.

**Why it happens:** Conflating liveness (process health) with readiness (traffic-serving capability). Developers check database in liveness because "if DB is down, app doesn't work."

**How to avoid:**
- Liveness checks ONLY process health (HTTP 200 on simple endpoint, process responding)
- Readiness checks dependencies (PostgreSQL, Redis, etc.)
- Use appropriate `failureThreshold`: 3 for readiness (stop traffic quickly), 3-5 for liveness (avoid premature restarts)

**Warning signs:**
- Pods in CrashLoopBackOff during brief external service outages
- Pod age < 5 minutes during database maintenance windows
- Alert: "Pod restart rate increased" correlates with "Database latency spike"

**Source:** [Kubernetes best practices: setting up health checks with readiness and liveness probes](https://cloud.google.com/blog/products/containers-kubernetes/kubernetes-best-practices-setting-up-health-checks-with-readiness-and-liveness-probes)

### Pitfall 2: Insufficient terminationGracePeriodSeconds for Batch Flushing

**What goes wrong:** ClickHouse query logs lost during deployments. Pod receives SIGTERM, starts flushing 1000-record batch, Kubernetes sends SIGKILL at 30s before flush completes → Data loss.

**Why it happens:** Default 30s grace period designed for stateless HTTP services. Services with buffered writes need additional time for flush operations.

**How to avoid:**
- Measure actual flush time under load (use metrics: `clickhouse_batch_flush_duration_seconds`)
- Set `terminationGracePeriodSeconds = drain_time + flush_time + 5s_buffer`
- Example: 30s HTTP drain + 10s batch flush + 5s buffer = 45s grace period
- Implement flush timeout in application: if batch flush exceeds timeout, log error and exit (accept bounded data loss vs infinite hang)

**Warning signs:**
- ClickHouse query_logs have gaps during deployment windows
- Application logs show "context deadline exceeded" during shutdown
- Batch flush duration p99 approaches terminationGracePeriodSeconds

**Source:** [How to Configure terminationGracePeriodSeconds for Clean Pod Shutdowns](https://oneuptime.com/blog/post/2026-02-09-termination-grace-period-clean-shutdowns/view)

### Pitfall 3: HPA Scaling Flapping (Rapid Scale Up/Down Cycles)

**What goes wrong:** Policy Service scales from 3 → 10 pods at 14:00 (traffic spike), scales to 3 at 14:05 (spike ends), scales to 10 at 14:10 (spike resumes) → Wasteful pod churn, degraded performance during scale-up.

**Why it happens:** Default HPA behavior reacts immediately to metric changes. DNS traffic often has bursty patterns (office hours, batch jobs) causing oscillation without stabilization windows.

**How to avoid:**
- Configure `behavior.scaleDown.stabilizationWindowSeconds: 300` (5 min) to prevent premature scale-down
- Configure `behavior.scaleUp.stabilizationWindowSeconds: 60` (1 min) for responsive scale-up
- Use `scaleDown.policies` to limit removal rate: max 1 pod per minute prevents avalanche
- Choose scaling metric wisely: QPS better than CPU for DNS workloads (CPU spikes don't predict sustained load)

**Warning signs:**
- HPA events show frequent scale up/down within 5-minute windows
- Pod age distribution shows many pods <5 minutes old during steady-state traffic
- Performance degradation during scale-up (cache warm-up time)

**Source:** [How to Set Up Horizontal Pod Autoscaler (HPA) with Custom Metrics](https://oneuptime.com/blog/post/2026-01-21-horizontal-pod-autoscaler-custom-metrics/view)

### Pitfall 4: Runbooks Without Quick-Action Checklists

**What goes wrong:** On-call engineer receives alert at 2 AM, reads 5-page runbook, misses critical step, escalates to senior engineer 30 minutes later.

**Why it happens:** Incident response requires fast decision-making under stress. Narrative-format runbooks force reading comprehension during high-pressure situations.

**How to avoid:**
- Start every runbook with "Quick Actions" checklist (target: 5-10 steps, 5-minute completion)
- Use checkbox format for visual progress tracking
- Include decision trees: "If X, see runbook Y" rather than "X might mean Y or Z, consider..."
- Place detailed diagnostics AFTER quick actions (for post-incident learning, not active response)
- Test runbooks with engineers unfamiliar with service (validates clarity)

**Warning signs:**
- Mean Time to Recovery (MTTR) >30 min for well-documented incidents
- Escalations happen before runbook completion
- Post-mortems cite "unclear runbook steps" as contributing factor

**Source:** [Runbook Example: A Best Practices Guide](https://www.nobl9.com/it-incident-management/runbook-example), [The No-Nonsense Guide to Runbook Best Practices](https://blog.incidenthub.cloud/The-No-Nonsense-Guide-to-Runbook-Best-Practices)

### Pitfall 5: Backup Verification Theater (Never Testing Restores)

**What goes wrong:** Production PostgreSQL corruption detected, attempt PITR restore → Backup files corrupted, last verified backup 6 months old, business data loss.

**Why it happens:** Backup automation creates false confidence. "Backups are running" ≠ "Backups are valid and restorable." Corruption, configuration drift, and tooling bugs go undetected.

**How to avoid:**
- Schedule monthly automated restore tests to staging environment (Kubernetes CronJob)
- Use `pg_verifybackup` for PostgreSQL backup integrity validation
- Test ClickHouse restores by comparing row counts and sample data checksums
- Document restore procedures in runbook (restore is rarer operation, needs clear steps)
- Alert on backup verification failures with same urgency as production outages

**Warning signs:**
- No evidence of restore testing in last 30 days
- Backup size unchanged despite data growth (may indicate misconfiguration)
- Backup completion alerts exist, but no restoration validation alerts

**Source:** [How to Recover Data with Point-in-Time Recovery in PostgreSQL](https://oneuptime.com/blog/post/2026-01-25-point-in-time-recovery-postgresql/view), [ClickHouse backup: Top 6 options and a quick tutorial](https://www.instaclustr.com/education/clickhouse/clickhouse-backup-top-6-options-and-a-quick-tutorial/)

## Code Examples

Verified patterns from official sources and existing codebase:

### NestJS Health Check with Tiered Dependencies

```typescript
// Source: Existing api/src/modules/health/health.service.ts (to be enhanced)
// Pattern: https://docs.nestjs.com/fundamentals/lifecycle-events

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { HealthCheckService, HttpHealthIndicator, HealthCheck } from '@nestjs/terminus';

@Injectable()
export class HealthService implements OnModuleDestroy {
  // Existing checkReady() method already implements tiered checking
  // Enhancement: Add /healthz endpoint for K8s probes

  async checkSimple(): Promise<{ status: string; timestamp: string }> {
    // Simple liveness check - no dependency checks
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async checkDetailed(): Promise<DetailedHealthStatus> {
    // Existing implementation with tiered dependencies
    const [postgres, redis, clickhouse] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
      this.checkClickhouse(),
    ]);

    // Critical: Must be healthy
    const critical = postgres.status === 'healthy' && redis.status === 'healthy';

    // Non-critical: Log but don't fail
    if (clickhouse.status !== 'healthy') {
      this.logger.warn('ClickHouse degraded', { error: clickhouse.error });
    }

    return {
      status: critical ? 'healthy' : 'unhealthy',
      dependencies: { postgres, redis, clickhouse },
      // ... rest of response
    };
  }

  // Graceful shutdown handling
  async onModuleDestroy() {
    this.logger.log('API shutting down gracefully...');
    // Close connections, flush buffers
    await this.dataSource.destroy();
    await this.redisService.quit();
  }
}
```

### Go ClickHouse Batch Flusher with Graceful Shutdown

```go
// Source: Enhanced from policy-svc/cmd/main.go
// Pattern: https://www.rudderstack.com/blog/implementing-graceful-shutdown-in-go/

package clickhouse

import (
    "context"
    "sync"
    "time"
    "go.uber.org/zap"
)

type BatchLogger struct {
    client  *Client
    logger  *zap.Logger
    buffer  []QueryLog
    mu      sync.Mutex
    ticker  *time.Ticker
    batchSize int
    flushInterval time.Duration
}

func NewBatchLogger(client *Client, logger *zap.Logger) *BatchLogger {
    return &BatchLogger{
        client:        client,
        logger:        logger,
        buffer:        make([]QueryLog, 0, 1000),
        batchSize:     1000,
        flushInterval: 5 * time.Second,
    }
}

func (b *BatchLogger) Start(ctx context.Context) {
    b.ticker = time.NewTicker(b.flushInterval)
    defer b.ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            b.logger.Info("Batch logger stopping")
            return
        case <-b.ticker.C:
            if err := b.flush(ctx); err != nil {
                b.logger.Error("Failed to flush batch", zap.Error(err))
            }
        }
    }
}

func (b *BatchLogger) Add(log QueryLog) {
    b.mu.Lock()
    defer b.mu.Unlock()

    b.buffer = append(b.buffer, log)

    // Auto-flush when batch size reached
    if len(b.buffer) >= b.batchSize {
        go func() {
            ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
            defer cancel()
            if err := b.flush(ctx); err != nil {
                b.logger.Error("Auto-flush failed", zap.Error(err))
            }
        }()
    }
}

// Flush writes all pending logs to ClickHouse
// User requirement: No log loss during shutdown
func (b *BatchLogger) Flush(ctx context.Context) error {
    b.mu.Lock()
    defer b.mu.Unlock()
    return b.flush(ctx)
}

func (b *BatchLogger) flush(ctx context.Context) error {
    if len(b.buffer) == 0 {
        return nil
    }

    count := len(b.buffer)
    start := time.Now()

    if err := b.client.InsertBatch(ctx, b.buffer); err != nil {
        return err
    }

    b.logger.Info("Flushed ClickHouse batch",
        zap.Int("count", count),
        zap.Duration("duration", time.Since(start)),
    )

    b.buffer = b.buffer[:0] // Clear buffer
    return nil
}
```

### Helm Deployment with Enhanced Health Probes

```yaml
# Source: Kubernetes exec probe documentation
# Pattern: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/

apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: unbound
  namespace: nebula-dns
spec:
  serviceName: unbound
  replicas: 3
  template:
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: unbound
          image: nebuladns/unbound:latest
          ports:
            - containerPort: 53
              name: dns-udp
              protocol: UDP
            - containerPort: 53
              name: dns-tcp
              protocol: TCP
          # Liveness: Exec-based DNS resolution test
          livenessProbe:
            exec:
              command:
                - /bin/sh
                - -c
                - drill @127.0.0.1 google.com | grep -q "NOERROR"
            initialDelaySeconds: 30
            periodSeconds: 10          # User requirement
            timeoutSeconds: 5
            failureThreshold: 3        # User requirement
          # Readiness: TCP check (faster than DNS resolution)
          readinessProbe:
            tcpSocket:
              port: dns-tcp
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 2000m
              memory: 2Gi
```

### Kubernetes CronJob for Monthly Backup Verification

```yaml
# Source: PostgreSQL PITR best practices
# Pattern: https://oneuptime.com/blog/post/2026-01-25-point-in-time-recovery-postgresql/view

apiVersion: batch/v1
kind: CronJob
metadata:
  name: verify-postgresql-backup
  namespace: nebula-dns
spec:
  # Run first Sunday of every month at 3 AM UTC
  schedule: "0 3 1-7 * 0"
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: backup-verifier
              image: postgres:16
              command:
                - /bin/bash
                - -c
                - |
                  set -e
                  echo "Starting PostgreSQL backup verification..."

                  # 1. Download latest backup
                  pg_basebackup -h $POSTGRES_HOST -U $POSTGRES_USER -D /tmp/backup -Fp -Xs -P

                  # 2. Verify backup integrity
                  pg_verifybackup /tmp/backup

                  # 3. Test PITR restore to staging
                  # (Assumes staging PostgreSQL instance exists)
                  export PGPASSWORD=$STAGING_POSTGRES_PASSWORD
                  pg_restore -h $STAGING_POSTGRES_HOST -U $POSTGRES_USER -d staging_test /tmp/backup

                  # 4. Verify row counts match production
                  PROD_COUNT=$(psql -h $POSTGRES_HOST -U $POSTGRES_USER -d nebula -tAc "SELECT COUNT(*) FROM tenants")
                  STAGE_COUNT=$(psql -h $STAGING_POSTGRES_HOST -U $POSTGRES_USER -d staging_test -tAc "SELECT COUNT(*) FROM tenants")

                  if [ "$PROD_COUNT" != "$STAGE_COUNT" ]; then
                    echo "ERROR: Row count mismatch - backup may be corrupt"
                    exit 1
                  fi

                  echo "Backup verification successful - $PROD_COUNT tenants verified"
              env:
                - name: POSTGRES_HOST
                  valueFrom:
                    secretKeyRef:
                      name: api-secrets
                      key: postgres-host
                # ... other env vars from secrets
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single health endpoint | Tiered endpoints (/health, /health/ready, /health/live) | Kubernetes 1.16+ (2019) | Separate liveness (process) from readiness (dependencies), reducing restart loops |
| CPU/memory HPA only | Custom metrics via Prometheus Adapter | HPA v2 (K8s 1.23+, 2021) | Application-aware scaling (QPS, queue depth) vs proxy metrics (CPU) |
| Manual backup testing | Automated restore CronJobs | SRE best practices 2020+ | Consistent validation, no human error, audit trail |
| Text-based runbooks | Structured YAML with alert mapping | Incident management tools 2022+ | Machine-readable for alerting integration, enforces format consistency |
| preStop sleep workaround | Proper connection draining | Kubernetes 1.20+ (2020) | Clean shutdown without artificial delays, proper endpoint removal timing |

**Deprecated/outdated:**
- **HPA v1 (autoscaling/v1):** Replaced by v2 with multi-metric support and custom metrics. v1 only supports CPU-based scaling.
- **readinessGates without proper endpoints:** Kubernetes 1.14+ introduced readiness gates, but improper use (checking external dependencies in liveness) still common anti-pattern.
- **sleep-based preStop hooks:** `preStop: sleep 15` was workaround for endpoint propagation delays. Modern approach: proper SIGTERM handling with connection draining.

## Open Questions

1. **Policy Service HPA scaling metric: DNS QPS vs CPU?**
   - What we know: DNS QPS directly correlates with load (each query = policy evaluation). CPU usage can spike during cache warm-up (not sustained load indicator).
   - What's unclear: Production traffic patterns - are spikes sustained (need QPS) or brief (CPU sufficient)?
   - Recommendation: Start with combined approach - QPS primary metric (weight 70%), CPU secondary (weight 30%). Adjust after 2 weeks production data.

2. **Unbound cache persistence: Is 1Gi volume sufficient for production?**
   - What we know: Current StatefulSet uses 1Gi persistent volume (4x current 240MB cache config). Plan 26-02 decision.
   - What's unclear: Cache size at 10 tenants, 100K queries/day (production scale).
   - Recommendation: Monitor `unbound_cache_memory_bytes` metric. Alert when >700Mi (70% of 1Gi). Resize volumes if sustained >800Mi.

3. **Deployment strategy: Rolling update vs blue-green?**
   - What we know: Current Helm uses rolling updates (maxSurge: 1, maxUnavailable: 0). Blue-green requires 2x infrastructure.
   - What's unclear: User's risk tolerance for brief DNS latency spikes during rolling updates (cache warm-up time ~30s).
   - Recommendation: Stick with rolling updates for cost efficiency. If DNS SLO violations occur during deployments, revisit blue-green (use Argo Rollouts).

## Sources

### Primary (HIGH confidence)

**Kubernetes Official Documentation:**
- [Configure Liveness, Readiness and Startup Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) - Probe configuration, exec-based health checks
- [Liveness, Readiness, and Startup Probes Concepts](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/) - When to use each probe type

**2026 Best Practices (OneUpTime Blog):**
- [How to Implement Health Checks for Network Services in Kubernetes](https://oneuptime.com/blog/post/2026-01-08-kubernetes-network-health-checks/view) - TCP, HTTP, exec health checks for DNS services
- [How to Implement Graceful Shutdown in Go for Kubernetes](https://oneuptime.com/blog/post/2026-01-07-go-graceful-shutdown-kubernetes/view) - Go SIGTERM handling patterns
- [How to Configure terminationGracePeriodSeconds for Clean Pod Shutdowns](https://oneuptime.com/blog/post/2026-02-09-termination-grace-period-clean-shutdowns/view) - Grace period tuning
- [How to Set Up Horizontal Pod Autoscaler (HPA) with Custom Metrics](https://oneuptime.com/blog/post/2026-01-21-horizontal-pod-autoscaler-custom-metrics/view) - Prometheus Adapter setup
- [How to Recover Data with Point-in-Time Recovery in PostgreSQL](https://oneuptime.com/blog/post/2026-01-25-point-in-time-recovery-postgresql/view) - PITR testing procedures
- [How to Implement Blue-Green and Canary Deployments in Kubernetes](https://oneuptime.com/blog/post/2026-01-19-kubernetes-blue-green-canary-deployments/view) - Deployment strategy comparison

**Google SRE:**
- [Kubernetes best practices: setting up health checks with readiness and liveness probes](https://cloud.google.com/blog/products/containers-kubernetes/kubernetes-best-practices-setting-up-health-checks-with-readiness-and-liveness-probes) - Liveness vs readiness separation
- [Kubernetes best practices: terminating with grace](https://cloud.google.com/blog/products/containers-kubernetes/kubernetes-best-practices-terminating-with-grace) - Graceful shutdown patterns

**ClickHouse Backup:**
- [ClickHouse backup: Top 6 options and a quick tutorial](https://www.instaclustr.com/education/clickhouse/clickhouse-backup-top-6-options-and-a-quick-tutorial/) - Backup verification strategies
- [7 Ways to Master ClickHouse-Backup for Efficient Data Management](https://chistadata.com/clickhouse-backup-and-restore/) - Restore testing automation

**Incident Runbooks:**
- [Runbook Example: A Best Practices Guide (Nobl9)](https://www.nobl9.com/it-incident-management/runbook-example) - Hybrid format pattern
- [The No-Nonsense Guide to Runbook Best Practices](https://blog.incidenthub.cloud/The-No-Nonsense-Guide-to-Runbook-Best-Practices) - Quick-action checklists

### Secondary (MEDIUM confidence)

- [Kubernetes Health Checks and Probes: What You Need to Know (Better Stack)](https://betterstack.com/community/guides/monitoring/kubernetes-health-checks/) - Probe configuration examples
- [Implementing Graceful Shutdown in Go (RudderStack)](https://www.rudderstack.com/blog/implementing-graceful-shutdown-in-go/) - Context-based shutdown patterns
- [Kubernetes Deployment Strategies Explained (Medium)](https://manjunathreddykapu.medium.com/kubernetes-deployment-strategies-explained-rolling-recreate-and-blue-green-dba2b9ab8d1e) - Rolling vs blue-green tradeoffs

### Tertiary (LOW confidence - existing codebase)

- `/Users/jeremymcspadden/Github/nebula-dns/api/src/modules/health/health.service.ts` - Existing tiered health check implementation
- `/Users/jeremymcspadden/Github/nebula-dns/policy-svc/cmd/main.go` - Existing Go SIGTERM handling (needs enhancement)
- `/Users/jeremymcspadden/Github/nebula-dns/docs/slo-runbook.md` - Existing SLO definitions and error budget policy

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Kubernetes native features, official CNCF projects
- Architecture patterns: HIGH - Verified from official documentation and 2026 best practices
- Graceful shutdown: HIGH - Go and NestJS patterns from official framework docs
- HPA custom metrics: MEDIUM - Prometheus Adapter well-documented, but DNS QPS metric tuning requires production validation
- Backup verification: MEDIUM - PostgreSQL PITR well-documented, ClickHouse Cloud backup testing patterns less standardized
- Runbook format: HIGH - SRE industry standards with multiple authoritative sources

**Research date:** 2026-02-21
**Valid until:** 2026-05-21 (90 days - stable domain with infrequent breaking changes)
