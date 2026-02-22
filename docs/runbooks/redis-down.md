# Runbook: Redis/Valkey Cache Failure

// Nebula DNS - Redis/Valkey Cache Failure Incident Response
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

**Severity:** Critical
**Services Affected:** Policy Service, API (session cache), policy cache invalidation
**Related Alerts:** RedisConnectionPoolExhaustion, PolicyCacheHitRateLow, PolicyServiceDown

## Quick Actions (DO THIS FIRST)

⏱️ **Target: 5 minutes to initial diagnosis**

- [ ] 1. Check DigitalOcean Managed Valkey dashboard: https://cloud.digitalocean.com/databases
- [ ] 2. Test Redis connectivity: `kubectl exec -n nebula-dns deploy/policy-svc -- redis-cli -u $REDIS_URL ping`
- [ ] 3. Check policy-svc logs: `kubectl logs -n nebula-dns deploy/policy-svc --tail=50 | grep -i redis`
- [ ] 4. Check API logs: `kubectl logs -n nebula-dns deploy/api --tail=50 | grep -i redis`
- [ ] 5. Verify TLS certificate: `kubectl exec -n nebula-dns deploy/policy-svc -- openssl s_client -connect <redis-host>:25061 -servername <redis-host>`
- [ ] 6. Check Valkey metrics in DigitalOcean dashboard: CPU, memory, connections
- [ ] 7. If Valkey maintenance → Wait for completion (typically 5-15 minutes)
- [ ] 8. If TLS cert expired → Check cert-manager or contact DigitalOcean support
- [ ] 9. If memory limit hit → Check eviction policy, consider scaling Valkey vertically
- [ ] 10. If credential rotation → Update Kubernetes secrets from DigitalOcean console

---

## Diagnostic Context

### Common Causes (by frequency)

1. **Managed Valkey maintenance** (35%) — DigitalOcean automatic maintenance, failover to standby node, brief downtime
2. **TLS certificate expiration** (25%) — DigitalOcean managed TLS cert renewal failed, manual intervention required
3. **Memory limit hit** (20%) — Valkey maxmemory exceeded, evicting policy cache keys, degraded performance
4. **Credential rotation** (20%) — Redis password changed in DO console but not updated in Kubernetes secrets

### How Redis/Valkey Works in Nebula DNS

```
Policy Service ─────┬──> Redis/Valkey (TLS) ──> Policy Cache (Hash keys)
                    │                           Pub/Sub (policy_updates channel)
                    │
API ────────────────┘──> Redis/Valkey (TLS) ──> Session cache
                                                 Rate limit buckets
```

**Critical Functions:**
- **Policy cache:** Stores compiled tenant policies for O(1) DNS policy evaluation
- **Pub/sub:** Broadcasts policy changes to all Policy Service pods for cache invalidation
- **Session cache:** API user sessions (JWT tokens not stored, but session metadata)
- **Rate limiting:** API rate limit buckets per tenant/location

**Impact of Redis Failure:**
- **Policy Service:** Falls back to database queries (slower, ~100ms vs ~5ms), cache hit rate drops to 0%
- **API:** Session cache misses (users may need to re-authenticate), rate limiting may not work
- **Policy updates:** New policy changes not propagated to Policy Service pods until Redis recovers

### Warning Signs

- `redis_up` metric drops to 0 (Redis unreachable)
- `policy_cache_hit_rate` drops below 90% (cache eviction or invalidation)
- `redis_connection_errors_total` increases
- Policy evaluation latency increases from ~5ms to ~100ms (database fallback)
- API logs show "Redis connection timeout" errors

### Related Alerts

- **RedisConnectionPoolExhaustion** → >80% of Redis max_clients in use (warning, scale consumers)
- **PolicyCacheHitRateLow** → Cache hit rate <90% (may precede crash if eviction storm)
- **PolicyServiceDown** → Policy Service crash loop due to Redis connection failure (critical)
- **RedisMemoryHigh** → Valkey memory usage >80% of maxmemory (warning, keys being evicted)

### Resolution Procedures

#### Managed Valkey Maintenance

**Symptoms:**
- DigitalOcean dashboard shows "Maintenance in progress"
- Brief connection errors during failover (~15s)
- Automatic recovery after maintenance completes

**Steps:**
```bash
# 1. Check maintenance status in DigitalOcean console
# https://cloud.digitalocean.com/databases

# 2. Monitor Policy Service logs during maintenance
kubectl logs -n nebula-dns deploy/policy-svc --tail=100 -f | grep -i redis

# 3. Verify connection restored after maintenance
kubectl exec -n nebula-dns deploy/policy-svc -- redis-cli -u $REDIS_URL ping
# Expected: PONG

# 4. Check cache hit rate recovery in Grafana
# Policy Service dashboard → Cache Hit Rate panel
# Should return to >90% within 5 minutes as cache warms up

# 5. If failover occurred, verify standby was promoted:
# DigitalOcean console will show new primary node

# 6. No further action required unless maintenance exceeds 15 minutes
```

#### TLS Certificate Expiration

**Symptoms:**
- Connection errors: "SSL certificate problem: certificate has expired"
- All Redis operations fail with TLS handshake errors
- DigitalOcean console shows cert expiration warning

**Steps:**
```bash
# 1. Verify TLS certificate status
kubectl exec -n nebula-dns deploy/policy-svc -- openssl s_client -connect <redis-host>:25061 -servername <redis-host> </dev/null 2>&1 | grep -A 2 "Verify return code"

# 2. Check certificate expiration date
kubectl exec -n nebula-dns deploy/policy-svc -- openssl s_client -connect <redis-host>:25061 -servername <redis-host> </dev/null 2>&1 | openssl x509 -noout -dates

# 3. If cert expired, DigitalOcean should auto-renew
# Check for renewal in progress in DO console
# https://cloud.digitalocean.com/databases → Select Valkey cluster → Settings tab

# 4. If renewal stuck, contact DigitalOcean support
# Support ticket: "Managed Valkey TLS certificate expired, need manual renewal"

# 5. As temporary workaround, disable TLS verification (NOT RECOMMENDED for production):
# Edit api-secrets and policy-svc-secrets:
# REDIS_URL: rediss://user:pass@host:25061/0?tls.rejectUnauthorized=false
# This bypasses cert validation but maintains encryption

# 6. After cert renewed, remove workaround and restart pods:
kubectl rollout restart deployment/policy-svc -n nebula-dns
kubectl rollout restart deployment/api -n nebula-dns

# 7. Verify TLS working:
kubectl exec -n nebula-dns deploy/policy-svc -- redis-cli -u $REDIS_URL --tls ping
# Expected: PONG
```

#### Memory Limit Hit (Eviction)

**Symptoms:**
- Valkey memory usage at or near maxmemory limit
- Cache hit rate drops as keys evicted
- DigitalOcean dashboard shows "Memory usage: 95%+"
- Policy Service logs show cache misses increasing

**Steps:**
```bash
# 1. Check current memory usage
kubectl exec -n nebula-dns deploy/policy-svc -- redis-cli -u $REDIS_URL INFO memory
# Look for: used_memory, maxmemory, evicted_keys

# 2. Check eviction policy
kubectl exec -n nebula-dns deploy/policy-svc -- redis-cli -u $REDIS_URL CONFIG GET maxmemory-policy
# Expected: allkeys-lru or volatile-lru

# 3. Identify large keys consuming memory
kubectl exec -n nebula-dns deploy/policy-svc -- redis-cli -u $REDIS_URL --bigkeys
# Shows largest keys by type (hash, string, list, etc.)

# 4. If policy cache keys are being evicted, scale Valkey vertically:
# DigitalOcean console → Databases → Valkey cluster → Resize
# Current: db-s-1vcpu-1gb (1GB RAM)
# Recommended: db-s-1vcpu-2gb (2GB RAM)

# 5. Monitor memory after scaling:
kubectl exec -n nebula-dns deploy/policy-svc -- redis-cli -u $REDIS_URL INFO memory | grep used_memory_human

# 6. If memory still high, analyze key counts per tenant:
kubectl exec -n nebula-dns deploy/policy-svc -- redis-cli -u $REDIS_URL --scan --pattern "policy:*" | wc -l
# Each tenant should have 1 policy cache key

# 7. Check for memory leaks in Policy Service:
kubectl top pods -n nebula-dns -l app=policy-svc
# If memory growing unbounded, restart pods:
kubectl rollout restart deployment/policy-svc -n nebula-dns
```

#### Credential Rotation

**Symptoms:**
- Authentication errors: "WRONGPASS invalid username-password pair"
- All Redis operations fail with auth errors
- Works in DigitalOcean console but not from pods

**Steps:**
```bash
# 1. Verify current Redis password in DigitalOcean console
# https://cloud.digitalocean.com/databases → Connection Details

# 2. Check current Kubernetes secret
kubectl get secret api-secrets -n nebula-dns -o jsonpath='{.data.REDIS_URL}' | base64 -d
# Extract password from rediss://default:<password>@host:25061/0

# 3. If password mismatch, update secrets:
cd scripts
./update-secrets.sh
# Follow prompts to update REDIS_URL with new password

# 4. Restart Policy Service and API pods:
kubectl rollout restart deployment/policy-svc -n nebula-dns
kubectl rollout restart deployment/api -n nebula-dns
kubectl rollout status deployment/policy-svc -n nebula-dns --timeout=300s

# 5. Verify connection works:
kubectl exec -n nebula-dns deploy/policy-svc -- redis-cli -u $REDIS_URL ping
# Expected: PONG

# 6. Check cache hit rate returns to normal:
# Grafana → Policy Service dashboard → Cache Hit Rate
# Should return to >90% within 5 minutes
```

#### Network Partition / Connectivity Issues

**Symptoms:**
- Connection timeouts (not authentication failures)
- "Connection refused" or "Network unreachable" errors
- Intermittent connectivity

**Steps:**
```bash
# 1. Test network connectivity from Policy Service pod
kubectl exec -n nebula-dns deploy/policy-svc -- ping -c 3 <redis-hostname>
kubectl exec -n nebula-dns deploy/policy-svc -- nc -zv <redis-hostname> 25061

# 2. Check DigitalOcean VPC firewall rules
doctl compute firewall list
doctl compute firewall get <firewall-id>
# Verify rule allowing DOKS cluster to reach Valkey on port 25061

# 3. Check if Valkey is in correct VPC:
# DigitalOcean console → Databases → Valkey → Networking tab
# Should be: Private network (VPC) enabled, same VPC as DOKS cluster

# 4. Check DNS resolution for Redis hostname:
kubectl exec -n nebula-dns deploy/policy-svc -- nslookup <redis-hostname>
# Should resolve to private VPC IP (10.x.x.x)

# 5. Check for connection pool exhaustion:
kubectl exec -n nebula-dns deploy/policy-svc -- redis-cli -u $REDIS_URL INFO clients
# connected_clients vs maxclients

# 6. If firewall issue, update rules via Terraform or console:
# terraform/modules/databases/main.tf
# Add cluster IP range to allowed sources
```

#### Pub/Sub Channel Failure (Policy Updates Not Propagating)

**Symptoms:**
- Policy changes in API not reflected in DNS queries
- Policy cache still serving old policies after update
- No errors in logs, but cache invalidation not working

**Steps:**
```bash
# 1. Check if pub/sub channel is working
kubectl exec -n nebula-dns deploy/policy-svc -- redis-cli -u $REDIS_URL PUBSUB CHANNELS
# Expected: policy_updates

# 2. Check if Policy Service is subscribed
kubectl logs -n nebula-dns deploy/policy-svc --tail=100 | grep -i "subscribed to policy_updates"

# 3. Test manual publish to channel
kubectl exec -n nebula-dns deploy/policy-svc -- redis-cli -u $REDIS_URL PUBLISH policy_updates '{"tenant_id":"test","action":"invalidate"}'
# Check Policy Service logs for cache invalidation message

# 4. If subscription broken, restart Policy Service pods:
kubectl rollout restart deployment/policy-svc -n nebula-dns

# 5. Verify subscription restored:
kubectl logs -n nebula-dns deploy/policy-svc --tail=50 | grep -i subscribe

# 6. Test policy change propagation:
# Make policy change in API → Should see cache invalidation in logs within 1s
```

### Post-Incident

After resolution, verify the following:

1. **Redis connectivity restored:**
   ```bash
   kubectl exec -n nebula-dns deploy/policy-svc -- redis-cli -u $REDIS_URL ping
   kubectl exec -n nebula-dns deploy/api -- redis-cli -u $REDIS_URL ping
   ```

2. **Cache hit rate healthy:**
   ```bash
   # Check Grafana Policy Service dashboard
   # Cache Hit Rate should be >90%
   kubectl exec -n nebula-dns deploy/policy-svc -- curl localhost:8080/metrics | grep policy_cache_hit_rate
   ```

3. **Pub/sub working:**
   ```bash
   # Verify Policy Service subscribed to policy_updates channel
   kubectl logs -n nebula-dns deploy/policy-svc --tail=100 | grep subscribe
   ```

4. **Memory usage healthy:**
   ```bash
   kubectl exec -n nebula-dns deploy/policy-svc -- redis-cli -u $REDIS_URL INFO memory | grep -E "used_memory_human|maxmemory_human"
   # used_memory should be <80% of maxmemory
   ```

5. **Metrics recovering:**
   - Check Grafana Policy Service dashboard
   - `redis_up` returning to 1 (Redis reachable)
   - `policy_cache_hit_rate` >90%
   - `policy_evaluation_duration_seconds` p95 <50ms

6. **Document in incident report:**
   - Root cause (maintenance, TLS cert, memory, credential rotation, network)
   - Impact on policy evaluation latency and cache hit rate
   - Error budget consumed (if DNS availability affected)
   - Long-term fixes (scale Valkey, adjust eviction policy, monitoring)

### Cross-References

- [DNS Down](dns-down.md) — If DNS failures caused by Redis unavailability affecting Policy Service
- [Policy Service Crash](policy-svc-crash.md) — If Policy Service crashes due to Redis connection errors
- [SLO Runbook](../slo-runbook.md) — Error budget impact and escalation procedures

---

**Runbook Version:** 1.0
**Last Updated:** 2026-02-21
**Owner:** DevOps/SRE Team
