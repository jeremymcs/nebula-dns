# Runbook: Policy Service Crash Loop

// Nebula DNS - Policy Service Crash Loop Incident Response
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

**Severity:** Critical
**Services Affected:** DNS resolution (policy evaluation), query logging
**Related Alerts:** PolicyServiceDown, DNSAvailabilitySLOFastBurn, PolicyEvalLatencySLOFastBurn

## Quick Actions (DO THIS FIRST)

⏱️ **Target: 5 minutes to initial diagnosis**

- [ ] 1. Check pod status: `kubectl get pods -n nebula-dns -l app=policy-svc`
- [ ] 2. View recent logs: `kubectl logs -n nebula-dns -l app=policy-svc --tail=100`
- [ ] 3. Check previous pod logs: `kubectl logs -n nebula-dns -l app=policy-svc --previous`
- [ ] 4. Check Redis connectivity: `kubectl exec -n nebula-dns deploy/policy-svc -- redis-cli -u $REDIS_URL ping`
- [ ] 5. Verify ClickHouse connection: `kubectl logs -n nebula-dns -l app=policy-svc | grep "ClickHouse"`
- [ ] 6. Check for OOM kills: `kubectl describe pod -n nebula-dns -l app=policy-svc | grep -i "OOMKilled"`
- [ ] 7. If Redis down → See [redis-down.md](redis-down.md)
- [ ] 8. If OOM killed → Increase memory limits in values.yaml, redeploy
- [ ] 9. If startup timeout → Check initialDelaySeconds, may need increase for slow cache warm-up
- [ ] 10. If image pull error → Verify DOCR credentials and image tag exists

---

## Diagnostic Context

### Common Causes (by frequency)

1. **Redis connection failure** (60%) — Managed Valkey credentials rotated, TLS cert expired, connection timeout
2. **Out of Memory (OOM)** (25%) — Cache size exceeds pod memory limits during tenant onboarding, memory leak
3. **ClickHouse unavailable** (10%) — Cloud service maintenance, network partition, write timeout
4. **Image pull error** (5%) — DOCR credentials expired, image tag doesn't exist, registry unreachable

### How Policy Service Startup Works

```
1. Parse environment variables (REDIS_URL, CLICKHOUSE_URL, etc.)
   ↓
2. Connect to Redis → Initialize Redis client with TLS
   ↓
3. Load policy cache from Redis → May take 10-30s with many tenants
   ↓
4. Connect to ClickHouse → Initialize batch logger
   ↓
5. Start HTTP server → Listen on port 8080
   ↓
6. Readiness probe passes → Pod marked Ready, receives traffic
```

**Failure at any step causes crash loop:**
- Steps 1-2: Redis connection failure → Immediate crash
- Step 3: Cache load timeout → Crash after 30s
- Step 4: ClickHouse connection failure → Warning logged, continues (non-critical)
- Step 5: Port already in use → Crash (shouldn't happen)
- Step 6: Readiness probe fails → Pod stays NotReady, restarted after failureThreshold

### Warning Signs Before Crash

- `policy_cache_load_duration_seconds` > 30s in Grafana (slow cache warm-up)
- `redis_connection_errors_total` spikes
- `go_memstats_alloc_bytes` approaching pod memory limit
- Pod restart count increases: `kubectl get pods -n nebula-dns -l app=policy-svc`
- ClickHouse write errors accumulating (buffer growing)

### Related Alerts

- **PolicyServiceDown** → All Policy Service pods down for 1+ minute (critical, page immediately)
- **PolicyCacheLoadSlow** → Cache load duration >30s (warning, may precede crash)
- **DNSAvailabilitySLOFastBurn** → DNS failures due to Policy Service unavailability (critical)
- **PolicyEvalLatencySLOFastBurn** → Policy evaluation slow due to degraded service (critical)

### Resolution Procedures

#### Redis Connection Failure

**Symptoms:**
- Logs show "failed to connect to Redis" or "connection refused"
- Pod crashes immediately on startup
- Redis credentials or TLS errors in logs

**Steps:**
```bash
# 1. Verify Redis is reachable
kubectl exec -n nebula-dns deploy/api -- redis-cli -u $REDIS_URL ping
# Expected: PONG
# If fails, see redis-down.md runbook

# 2. Check Redis URL in secret
kubectl get secret api-secrets -n nebula-dns -o jsonpath='{.data.REDIS_URL}' | base64 -d
# Verify format: rediss://default:<password>@<host>:25061/0

# 3. Test Redis connection from a working pod (API)
kubectl exec -n nebula-dns deploy/api -- redis-cli -u $REDIS_URL INFO server

# 4. If API can connect but Policy Service can't, check Policy Service secret:
kubectl get secret policy-svc-secrets -n nebula-dns -o jsonpath='{.data.REDIS_URL}' | base64 -d
# Should match API secret

# 5. If secret mismatch, update Policy Service secret:
cd scripts
./update-secrets.sh
# Update REDIS_URL in policy-svc-secrets

# 6. Restart Policy Service:
kubectl rollout restart deployment/policy-svc -n nebula-dns
kubectl rollout status deployment/policy-svc -n nebula-dns --timeout=300s

# 7. Verify startup successful:
kubectl logs -n nebula-dns -l app=policy-svc --tail=50 | grep -i "server started\|listening"
```

#### Out of Memory (OOM)

**Symptoms:**
- `kubectl describe pod` shows "OOMKilled" status
- Pod memory usage at or near limit before crash
- Logs may be truncated (killed during log write)

**Steps:**
```bash
# 1. Confirm OOM kill
kubectl describe pod -n nebula-dns -l app=policy-svc | grep -A 5 "Last State"
# Look for: "Reason: OOMKilled"

# 2. Check memory usage before crash
kubectl top pods -n nebula-dns -l app=policy-svc
# Compare to memory limits in deployment

# 3. Check current memory limits
kubectl get deployment policy-svc -n nebula-dns -o jsonpath='{.spec.template.spec.containers[0].resources.limits.memory}'

# 4. Analyze memory allocation in metrics (if available):
kubectl exec -n nebula-dns deploy/policy-svc -- curl localhost:8080/metrics | grep go_memstats
# Look for: go_memstats_alloc_bytes, go_memstats_heap_alloc_bytes

# 5. IMMEDIATE FIX - Increase memory limits:
# Edit helm/safedns/values-production.yaml:
# policySvc:
#   resources:
#     limits:
#       memory: 512Mi → 1Gi

# 6. Deploy with increased memory:
helm upgrade nebula-dns ./helm/safedns -n nebula-dns -f helm/safedns/values-production.yaml --atomic --timeout 10m

# 7. Monitor memory after restart:
kubectl top pods -n nebula-dns -l app=policy-svc --watch

# 8. Investigate memory leak if memory grows unbounded:
# Check for goroutine leaks, unclosed connections, unbounded caches
kubectl exec -n nebula-dns deploy/policy-svc -- curl localhost:8080/debug/pprof/heap > heap.prof
# Analyze with: go tool pprof heap.prof
```

#### ClickHouse Unavailable

**Symptoms:**
- Logs show "failed to connect to ClickHouse" or "ClickHouse write failed"
- Pod starts but logs warnings about ClickHouse
- DNS queries work but not logged to ClickHouse

**Steps:**
```bash
# 1. Check ClickHouse Cloud status
# https://clickhouse.cloud/status

# 2. Test ClickHouse connectivity
kubectl exec -n nebula-dns deploy/policy-svc -- curl -v $CLICKHOUSE_URL/ping

# 3. Check ClickHouse credentials
kubectl get secret api-secrets -n nebula-dns -o jsonpath='{.data.CLICKHOUSE_PASSWORD}' | base64 -d

# 4. Verify ClickHouse URL format
kubectl get secret api-secrets -n nebula-dns -o jsonpath='{.data.CLICKHOUSE_URL}' | base64 -d
# Expected: https://<host>:8443

# 5. If credentials rotated, update secrets:
cd scripts
./update-secrets.sh
# Update CLICKHOUSE_* variables

# 6. NOTE: ClickHouse is non-critical dependency
# Policy Service should start even if ClickHouse unavailable
# Logs: "ClickHouse unavailable - analytics degraded" (warning, not error)

# 7. If Policy Service crashes on ClickHouse failure, this is a BUG
# Check code: policy-svc/internal/clickhouse/client.go
# Should handle connection errors gracefully, not panic
```

#### Image Pull Error

**Symptoms:**
- Pods in "ImagePullBackOff" or "ErrImagePull" state
- Events show "failed to pull image" errors
- DOCR credentials expired or image tag doesn't exist

**Steps:**
```bash
# 1. Check pod events
kubectl describe pod -n nebula-dns -l app=policy-svc | grep -A 10 Events
# Look for: "Failed to pull image", "authentication required"

# 2. Verify image tag exists in DOCR
doctl registry repository list-tags policy-svc
# Check if desired tag exists

# 3. Check current image in deployment
kubectl get deployment policy-svc -n nebula-dns -o jsonpath='{.spec.template.spec.containers[0].image}'

# 4. If tag doesn't exist, check CI/CD pipeline:
# GitHub Actions → .github/workflows/deploy.yml
# Verify policy-svc build job completed successfully

# 5. If image exists but pull fails, check DOCR credentials:
kubectl get secret docr-credentials -n nebula-dns
# If missing, create:
doctl registry kubernetes-manifest | kubectl apply -f -

# 6. If credentials expired, refresh:
doctl registry kubernetes-manifest | kubectl apply -f -
kubectl delete pod -n nebula-dns -l app=policy-svc
# New pods will use refreshed credentials

# 7. If manual intervention needed, pull and push image:
docker pull registry.digitalocean.com/nebuladns/policy-svc:<tag>
docker tag registry.digitalocean.com/nebuladns/policy-svc:<tag> registry.digitalocean.com/nebuladns/policy-svc:latest
docker push registry.digitalocean.com/nebuladns/policy-svc:latest
```

#### Startup Timeout / Slow Cache Warm-up

**Symptoms:**
- Pod starts but takes >60s to pass readiness probe
- Logs show "loading policy cache" for extended time
- Eventually marked Ready, but slow startup

**Steps:**
```bash
# 1. Check cache load duration in logs
kubectl logs -n nebula-dns -l app=policy-svc --tail=100 | grep "policy cache loaded"
# Should complete in <30s under normal conditions

# 2. Check number of tenants and policy keys
kubectl exec -n nebula-dns deploy/policy-svc -- redis-cli -u $REDIS_URL --scan --pattern "policy:*" | wc -l
# Large number of tenants (>100) can slow cache warm-up

# 3. Check Redis latency
kubectl exec -n nebula-dns deploy/policy-svc -- redis-cli -u $REDIS_URL --latency
# Should be <10ms for VPC-connected managed Valkey

# 4. If cache load consistently >30s, increase readiness probe initialDelaySeconds:
# helm/safedns/values-production.yaml
# policySvc:
#   readinessProbe:
#     initialDelaySeconds: 30 → 60

# 5. Deploy with updated probe timing:
helm upgrade nebula-dns ./helm/safedns -n nebula-dns -f helm/safedns/values-production.yaml --atomic

# 6. Consider optimizing cache structure if warm-up remains slow:
# policy-svc/internal/cache/cache.go
# Use batch MGET instead of individual GET calls
```

#### Liveness Probe Failure (Process Hang)

**Symptoms:**
- Pod running but failing liveness probe
- Kubernetes restarts pod automatically
- Logs show no errors, process appears stuck

**Steps:**
```bash
# 1. Check liveness probe configuration
kubectl get deployment policy-svc -n nebula-dns -o yaml | grep -A 10 livenessProbe

# 2. Test liveness endpoint manually
kubectl exec -n nebula-dns deploy/policy-svc -- curl -v localhost:8080/health/live

# 3. Check for goroutine deadlock (Go process hang)
kubectl exec -n nebula-dns deploy/policy-svc -- curl localhost:8080/debug/pprof/goroutine?debug=1
# Look for goroutines waiting on mutexes or channels

# 4. Check system metrics for resource contention
kubectl top pods -n nebula-dns -l app=policy-svc
# High CPU or memory can cause probe timeouts

# 5. Increase liveness probe timeout if necessary:
# helm/safedns/values-production.yaml
# policySvc:
#   livenessProbe:
#     timeoutSeconds: 3 → 5

# 6. If persistent hangs, collect pprof data for analysis:
kubectl exec -n nebula-dns deploy/policy-svc -- curl localhost:8080/debug/pprof/profile?seconds=30 > cpu.prof
# Analyze with: go tool pprof cpu.prof
```

### Post-Incident

After resolution, verify the following:

1. **All Policy Service pods healthy:**
   ```bash
   kubectl get pods -n nebula-dns -l app=policy-svc
   # All should be Running with 0 restarts
   ```

2. **Startup time acceptable:**
   ```bash
   kubectl logs -n nebula-dns -l app=policy-svc --tail=100 | grep "server started"
   # Time from pod creation to "server started" should be <30s
   ```

3. **Health endpoints responding:**
   ```bash
   kubectl exec -n nebula-dns deploy/policy-svc -- curl localhost:8080/health
   kubectl exec -n nebula-dns deploy/policy-svc -- curl localhost:8080/health/ready
   kubectl exec -n nebula-dns deploy/policy-svc -- curl localhost:8080/health/live
   ```

4. **Cache hit rate healthy:**
   ```bash
   # Check Grafana Policy Service dashboard
   # Cache hit rate should be >90% within 5 minutes
   kubectl exec -n nebula-dns deploy/policy-svc -- curl localhost:8080/metrics | grep policy_cache_hit_rate
   ```

5. **DNS queries working:**
   ```bash
   drill @<loadbalancer-ip> google.com
   # Should return successful response (NOERROR)
   ```

6. **Metrics recovering:**
   - Check Grafana DNS Overview dashboard
   - `probe_success{job="blackbox-dns"}` returning to 1.0 (100%)
   - `policy_evaluation_duration_seconds` p95 <50ms

7. **Document in incident report:**
   - Root cause (Redis failure, OOM, ClickHouse, image pull, startup timeout)
   - Impact on DNS availability and error budget consumed
   - Long-term fixes (increase memory, optimize cache loading, improve error handling)

### Cross-References

- [Redis Down](redis-down.md) — If crash caused by Redis unavailability (most common)
- [DNS Down](dns-down.md) — If Policy Service crash causes DNS resolution failures
- [Deployment Runbook](deployment.md) — How to deploy with updated resource limits or configuration
- [SLO Runbook](../slo-runbook.md) — Error budget impact and escalation procedures

---

**Runbook Version:** 1.0
**Last Updated:** 2026-02-21
**Owner:** DevOps/SRE Team
