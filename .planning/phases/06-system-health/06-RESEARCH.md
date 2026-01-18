# Phase 6: System Health - Research

**Researched:** 2026-01-17
**Domain:** System monitoring, health checks, error aggregation
**Confidence:** HIGH

## Summary

Phase 6 implements system health monitoring for the admin dashboard, enabling ops team to view DNS service status, error rates, query volume, and connection status. The research investigated existing health check implementations, ClickHouse schema for error tracking, and patterns for monitoring dnsdist/unbound/policy-svc.

The codebase already has strong foundations:
- **Existing health module** (`api/src/modules/health/*`) with detailed checks for PostgreSQL, Redis, ClickHouse, and secrets
- **Policy Service health endpoints** (`/health`, `/ready`, `/live`) with Prometheus metrics
- **ClickHouse service** with connection status tracking (`getConnectionStatus()`)
- **Redis service** with `ping()` for connectivity checks
- **Prometheus metrics** in policy-svc for cache hits, evaluation duration, queue sizes

**Primary recommendation:** Extend the admin controller with a `/admin/system/health` endpoint that aggregates existing health checks plus adds external service probing (policy-svc, dnsdist, unbound). Query ClickHouse for error rates using the existing `query_logs` table filtered by action='block' with reason containing 'error'.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in codebase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nestjs/terminus | 10.x | Health checks | NestJS official, integrates with existing health module |
| @clickhouse/client | 0.2.x | ClickHouse queries | Already used in ClickHouseService |
| ioredis | 5.x | Redis connectivity | Already used in RedisService |
| axios | 1.x | HTTP client for external services | Already available, lightweight |

### Supporting (Available via existing services)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Prometheus metrics | - | Policy-svc exposes `/metrics` | For real-time service metrics |
| dnsdist webserver | - | Port 8083 exposes stats | For DNS layer health |

### No New Dependencies Needed
The existing codebase has all required infrastructure. New endpoints can leverage:
- `HealthService` for postgres/redis/clickhouse checks
- `ClickHouseService` for error rate queries
- `RedisService.getClient().ping()` for Redis
- HTTP requests to policy-svc/dnsdist for external service status

## Architecture Patterns

### Recommended Project Structure
```
api/src/modules/admin/
├── admin.controller.ts        # Add system health endpoints
├── admin.service.ts           # Add health aggregation methods
├── dto/
│   └── system-health.dto.ts   # NEW: Health response DTOs
└── (existing files)
```

### Pattern 1: Aggregate Health Check
**What:** Single endpoint that probes all services and returns unified status
**When to use:** Admin dashboard overview
**Example:**
```typescript
// Pattern from existing health.service.ts (line 70-102)
async getSystemHealth(): Promise<SystemHealthDto> {
  const [postgres, redis, clickhouse, policySvc, dnsdist, unbound] =
    await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
      this.checkClickhouse(),
      this.checkPolicySvc(),
      this.checkDnsdist(),
      this.checkUnbound(),
    ]);

  return {
    overallStatus: this.computeOverallStatus([...]),
    services: { postgres, redis, clickhouse, policySvc, dnsdist, unbound },
    timestamp: new Date().toISOString(),
  };
}
```

### Pattern 2: Error Rate Query from ClickHouse
**What:** Query recent errors grouped by time window
**When to use:** Error rate display for last hour/24 hours
**Example:**
```typescript
// Query pattern from ClickHouse (uses existing query_logs table)
async getErrorRates(period: '1h' | '24h'): Promise<ErrorRateDto> {
  const interval = period === '1h' ? '1 HOUR' : '24 HOUR';

  const result = await this.clickhouseClient.query({
    query: `
      SELECT
        count() as total_queries,
        countIf(reason LIKE '%error%' OR reason = 'policy_error') as error_count,
        toFloat64(countIf(reason LIKE '%error%')) / count() * 100 as error_rate
      FROM nebula_dns.query_logs
      WHERE timestamp >= now() - INTERVAL ${interval}
    `,
    format: 'JSONEachRow',
  });

  return result.json();
}
```

### Pattern 3: External Service Probe
**What:** HTTP health check to external services with timeout
**When to use:** Checking policy-svc, dnsdist, unbound status
**Example:**
```typescript
// Pattern for probing policy-svc (port 4080)
private async checkPolicySvc(): Promise<ServiceStatus> {
  const url = this.configService.get('POLICY_SVC_URL', 'http://policy-svc:8080');
  try {
    const start = Date.now();
    const response = await axios.get(`${url}/health`, { timeout: 5000 });
    return {
      status: response.data.status === 'healthy' ? 'healthy' : 'degraded',
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}
```

### Anti-Patterns to Avoid
- **Synchronous health checks:** Always use Promise.all() for parallel probing
- **Missing timeouts:** External service checks must have timeouts (5s max)
- **Exposing internal errors:** Sanitize error messages in responses
- **Hardcoded service URLs:** Use ConfigService for all URLs

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PostgreSQL health | Custom query | Existing `healthService.checkPostgres()` | Already tested, handles errors |
| Redis health | New ping logic | Existing `redisService.getClient().ping()` | Already available |
| ClickHouse health | New connection check | Existing `clickhouseService.getConnectionStatus()` | Has circuit breaker logic |
| Service timeouts | Manual Promise.race | axios timeout option | Built-in, reliable |
| Aggregate status | Complex logic | Simple "any unhealthy = unhealthy" | Clear, predictable |

**Key insight:** The existing HealthService (lines 62-207) already implements most health check patterns. Extend rather than replace.

## Common Pitfalls

### Pitfall 1: Blocking Health Checks
**What goes wrong:** Slow health checks block API responses
**Why it happens:** Synchronous probing of multiple services
**How to avoid:** Use `Promise.all()` with individual timeouts
**Warning signs:** Health endpoint > 1s response time

### Pitfall 2: Cascading Failures
**What goes wrong:** One service down causes health endpoint to fail
**Why it happens:** Missing try-catch around individual probes
**How to avoid:** Each probe wrapped in try-catch, returns status object
**Warning signs:** Health endpoint errors when any service is down

### Pitfall 3: DNS Service Unreachable from API
**What goes wrong:** API can't reach dnsdist/unbound for health checks
**Why it happens:** Network segmentation, different ports
**How to avoid:** Use Docker network service names, verify ports in docker-compose
**Warning signs:** Always shows "unhealthy" for DNS services

### Pitfall 4: Error Rate Query Timeout
**What goes wrong:** ClickHouse query for error rates times out
**Why it happens:** Scanning large table without proper time bounds
**How to avoid:** Always include `timestamp >= now() - INTERVAL` filter
**Warning signs:** Slow queries, timeouts on error rate endpoint

## Code Examples

Verified patterns from official sources:

### Existing HealthService Check Pattern
```typescript
// Source: api/src/modules/health/health.service.ts (lines 104-118)
private async checkPostgres(): Promise<DependencyStatus> {
  try {
    const start = Date.now();
    await this.dataSource.query('SELECT 1');
    return {
      status: 'healthy',
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

### Existing ClickHouse Connection Status
```typescript
// Source: api/src/modules/clickhouse/clickhouse.service.ts (lines 100-112)
getConnectionStatus(): {
  connected: boolean;
  lastAttempt: Date | null;
  consecutiveFailures: number;
  usingMockData: boolean;
} {
  return {
    connected: this.isConnected,
    lastAttempt: this.lastConnectionAttempt,
    consecutiveFailures: this.consecutiveFailures,
    usingMockData: !this.isConnected,
  };
}
```

### Policy Service Health Endpoint
```typescript
// Source: policy-svc/internal/handlers/handlers.go (lines 44-51)
func (h *Handlers) Health(w http.ResponseWriter, r *http.Request) {
  w.Header().Set("Content-Type", "application/json")
  json.NewEncoder(w).Encode(map[string]interface{}{
    "status":    "healthy",
    "timestamp": time.Now().UTC().Format(time.RFC3339),
  })
}
```

### Policy Service Metrics Endpoint
```typescript
// Source: policy-svc/internal/handlers/handlers.go (lines 213-227)
// Exposes Prometheus metrics including:
// - policy_evaluations_total (counter by decision, reason)
// - policy_evaluation_duration_seconds (histogram)
// - policy_cache_hits_total / policy_cache_misses_total
// - http_requests_total (counter by method, path, status)
// - policy_cache_size (gauge)
// - clickhouse_queue_size (gauge)
```

### ClickHouse Query Logs Schema
```sql
-- Source: scripts/init-clickhouse.sql (lines 12-32)
CREATE TABLE IF NOT EXISTS nebula_dns.query_logs (
    timestamp DateTime64(3),
    tenant_id UUID,
    location_id UUID,
    location_name String,
    domain String,
    query_type String,
    client_ip String,
    action Enum8('allow' = 1, 'block' = 2, 'rewrite' = 3),
    reason String,  -- Contains error info when applicable
    category Nullable(String),
    response_time_ms UInt32,
    cached UInt8,
    threat_type Nullable(String),
    policy_id Nullable(UUID)
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (tenant_id, timestamp)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Individual health endpoints | Aggregated health response | Already in codebase | Single API call for all status |
| Manual retry logic | Circuit breaker in ClickHouse client | Already in codebase | Automatic recovery |
| Polling for errors | Query logs with time-bounded queries | Standard practice | Efficient, scalable |

**Already implemented:**
- Circuit breaker for ClickHouse (auto-recovery after failures)
- Prometheus metrics on policy-svc
- Existing health checks for postgres/redis/clickhouse

## Service Endpoints Reference

### Policy Service (policy-svc:8080)
| Endpoint | Method | Purpose | Response |
|----------|--------|---------|----------|
| `/health` | GET | Basic health | `{ status: "healthy", timestamp }` |
| `/ready` | GET | K8s readiness | `{ ready: boolean, timestamp }` |
| `/live` | GET | K8s liveness | `{ alive: true, timestamp }` |
| `/metrics` | GET | Prometheus | Prometheus text format |

### dnsdist (dnsdist:8083)
| Endpoint | Method | Purpose | Notes |
|----------|--------|---------|-------|
| Webserver | GET | Stats/metrics | Enabled in dnsdist.conf line 56 |

### Unbound (unbound:53)
| Check | Method | Purpose | Notes |
|-------|--------|---------|-------|
| DNS query | UDP/TCP | Resolve test | `drill @127.0.0.1 google.com` |

**Note:** Unbound has remote-control disabled (unbound.conf lines 70-72). Health check must use DNS query, not API.

## Requirements Mapping

| Requirement | Implementation Approach | Confidence |
|-------------|------------------------|------------|
| SYS-01: DNS service status | HTTP probe policy-svc/health, DNS query unbound, HTTP probe dnsdist webserver | HIGH |
| SYS-02: Error rates | ClickHouse query on query_logs where reason contains 'error' | HIGH |
| SYS-03: Aggregate query volume | ClickHouse COUNT(*) across all tenant_ids | HIGH |
| SYS-04: ClickHouse/Redis status | Existing getConnectionStatus() and ping() | HIGH |

## Open Questions

1. **dnsdist metrics format**
   - What we know: Webserver enabled on port 8083
   - What's unclear: Exact endpoint path and response format
   - Recommendation: Test locally with `curl http://localhost:4083/` to determine format

2. **Recent errors log display**
   - What we know: query_logs table has reason field
   - What's unclear: What constitutes an "error" vs blocked content
   - Recommendation: Define error as `reason LIKE '%error%' OR reason = 'policy_error' OR rcode != 0`

## Sources

### Primary (HIGH confidence)
- `api/src/modules/health/health.service.ts` - Existing health check implementation
- `api/src/modules/clickhouse/clickhouse.service.ts` - ClickHouse connection and query patterns
- `api/src/modules/redis/redis.service.ts` - Redis connectivity patterns
- `policy-svc/internal/handlers/handlers.go` - Policy service health endpoints
- `policy-svc/internal/metrics/metrics.go` - Prometheus metrics definitions
- `scripts/init-clickhouse.sql` - ClickHouse schema definition
- `docker-compose.yml` - Service ports and configuration

### Secondary (MEDIUM confidence)
- `k8s/base/monitoring/prometheus-rules.yaml` - Alert thresholds and query patterns
- `config/dnsdist/dnsdist.conf` - dnsdist configuration including webserver
- `config/unbound/unbound.conf` - Unbound configuration (remote-control disabled)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in codebase
- Architecture: HIGH - Patterns copied from existing HealthService
- Pitfalls: HIGH - Based on existing error handling in codebase

**Research date:** 2026-01-17
**Valid until:** 60 days (stable infrastructure, unlikely to change)
