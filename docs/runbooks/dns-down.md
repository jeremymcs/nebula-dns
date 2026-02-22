# Runbook: DNS Resolution Failure

// Nebula DNS - DNS Resolution Failure Incident Response
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

**Severity:** Critical
**Services Affected:** dnsdist, Unbound, policy-svc, DigitalOcean LoadBalancers
**Related Alerts:** DNSAvailabilitySLOFastBurn, DNSAvailabilitySLOSlowBurn, DNSDown

## Quick Actions (DO THIS FIRST)

⏱️ **Target: 5 minutes to initial diagnosis**

- [ ] 1. Check pod status: `kubectl get pods -n nebula-dns | grep -E 'dnsdist|unbound|policy-svc'`
- [ ] 2. View recent dnsdist logs: `kubectl logs -n nebula-dns deploy/dnsdist --tail=50`
- [ ] 3. View recent unbound logs: `kubectl logs -n nebula-dns statefulset/unbound --tail=50`
- [ ] 4. Test DNS resolution: `drill @<loadbalancer-ip> google.com` or `dig @<loadbalancer-ip> google.com`
- [ ] 5. Check dnsdist backend health: `kubectl exec -n nebula-dns deploy/dnsdist -- echo "showServers()" | nc 127.0.0.1 5199`
- [ ] 6. Check LoadBalancer IPs: `kubectl get svc -n nebula-dns | grep LoadBalancer`
- [ ] 7. If dnsdist pods down → Restart: `kubectl rollout restart deployment/dnsdist -n nebula-dns`
- [ ] 8. If unbound pods down → Restart: `kubectl rollout restart statefulset/unbound -n nebula-dns`
- [ ] 9. If policy-svc unavailable → See [policy-svc-crash.md](policy-svc-crash.md)
- [ ] 10. If Redis down → See [redis-down.md](redis-down.md)

---

## Diagnostic Context

### Common Causes (by frequency)

1. **dnsdist crash** (30%) — OOMKill, configuration error, LoadBalancer health check failing
2. **Unbound cache corruption** (20%) — Corrupted cache files, disk I/O errors, pod OOM
3. **Upstream resolver failure** (20%) — Root servers unreachable, network partition, firewall rules
4. **LoadBalancer IP change** (15%) — DigitalOcean maintenance, LoadBalancer deleted/recreated
5. **Policy Service unavailable** (15%) — Redis connection failure, ClickHouse write errors, crash loop

### How DNS Resolution Works in Nebula DNS

```
Client → DO LoadBalancer → dnsdist → Policy Service (evaluate) → Unbound (resolve)
                                           ↓
                                    ClickHouse (log query)
```

1. Client sends DNS query to LoadBalancer IP (DoT port 853, DoH port 443, or UDP port 53)
2. LoadBalancer forwards to dnsdist pod
3. dnsdist extracts tenant ID from client IP or DoH header
4. dnsdist forwards to policy-svc for policy evaluation
5. Policy-svc checks Redis cache for tenant policies
6. If allowed, dnsdist forwards to Unbound for recursive resolution
7. Unbound queries upstream resolvers (root servers, TLD servers, authoritative servers)
8. Response returned to client

**Failure at any step causes DNS resolution failure.**

### Warning Signs

- `probe_success{job="blackbox-dns"}` drops below 0.999 (99.9%)
- `dnsdist_backend_down_total` metric increases
- `unbound_cache_hits_total` drops to zero (cache corruption)
- Pod restart count increases: `kubectl get pods -n nebula-dns | grep -E 'dnsdist|unbound'`
- LoadBalancer health check failures in DigitalOcean console

### Related Alerts

- **DNSAvailabilitySLOFastBurn** → DNS queries failing at 14.4× acceptable rate (critical, page immediately)
- **DNSAvailabilitySLOSlowBurn** → DNS queries failing at 6× acceptable rate (warning, investigate during business hours)
- **DNSDown** → All DNS probes failing (100% failure rate)

### Resolution Procedures

#### dnsdist Pod Failure

**Symptoms:**
- Pods in CrashLoopBackOff or OOMKilled state
- `kubectl logs` shows configuration errors or out-of-memory messages
- LoadBalancer health checks failing

**Steps:**
```bash
# 1. Check pod status and describe for events
kubectl get pods -n nebula-dns -l app=dnsdist
kubectl describe pod -n nebula-dns -l app=dnsdist

# 2. View logs from current and previous pod
kubectl logs -n nebula-dns deploy/dnsdist --tail=100
kubectl logs -n nebula-dns deploy/dnsdist --previous

# 3. Check for OOMKill events
kubectl describe pod -n nebula-dns -l app=dnsdist | grep -i "OOMKilled"

# 4. If OOMKilled, increase memory limits in Helm values:
# helm/safedns/values-production.yaml
# dnsdist.resources.limits.memory: 512Mi → 1Gi

# 5. If configuration error, check ConfigMap:
kubectl get configmap dnsdist-config -n nebula-dns -o yaml

# 6. Restart deployment:
kubectl rollout restart deployment/dnsdist -n nebula-dns
kubectl rollout status deployment/dnsdist -n nebula-dns --timeout=300s

# 7. Verify health:
kubectl exec -n nebula-dns deploy/dnsdist -- echo "showServers()" | nc 127.0.0.1 5199
```

#### Unbound Cache Corruption

**Symptoms:**
- DNS queries time out or return SERVFAIL
- Unbound logs show "cache lookup failed" or I/O errors
- `unbound_cache_hits_total` metric drops to zero

**Steps:**
```bash
# 1. Check unbound pod logs
kubectl logs -n nebula-dns statefulset/unbound --tail=100

# 2. Test resolution from inside pod
kubectl exec -n nebula-dns unbound-0 -- drill @127.0.0.1 google.com

# 3. Check persistent volume status
kubectl get pvc -n nebula-dns | grep unbound
kubectl describe pvc -n nebula-dns unbound-data-unbound-0

# 4. If cache corrupted, delete pod to trigger recreation with fresh cache:
kubectl delete pod -n nebula-dns unbound-0
# StatefulSet will recreate pod automatically

# 5. Wait for pod to be ready:
kubectl wait --for=condition=ready pod/unbound-0 -n nebula-dns --timeout=300s

# 6. Verify cache is working:
# First query (cache miss):
kubectl exec -n nebula-dns unbound-0 -- drill @127.0.0.1 google.com
# Second query (cache hit - should be faster):
kubectl exec -n nebula-dns unbound-0 -- drill @127.0.0.1 google.com
```

#### Upstream Resolver Failure

**Symptoms:**
- Unbound logs show "send failed" or "timeout" errors
- DNS queries time out after 5+ seconds
- All queries fail, not just specific domains

**Steps:**
```bash
# 1. Test upstream connectivity from Unbound pod
kubectl exec -n nebula-dns unbound-0 -- ping -c 3 198.41.0.4  # a.root-servers.net

# 2. Check if root hints are accessible
kubectl exec -n nebula-dns unbound-0 -- drill @198.41.0.4 . NS

# 3. Check Unbound configuration for upstream forwarders
kubectl get configmap unbound-config -n nebula-dns -o yaml | grep -A 5 "forward-zone"

# 4. Test direct resolution without cache
kubectl exec -n nebula-dns unbound-0 -- unbound-control flush google.com
kubectl exec -n nebula-dns unbound-0 -- drill @127.0.0.1 google.com

# 5. If upstream unreachable, check Kubernetes network policies:
kubectl get networkpolicies -n nebula-dns
# Ensure egress to 0.0.0.0/0 on port 53 is allowed

# 6. Check DigitalOcean firewall rules:
doctl compute firewall list
# Verify no rules blocking outbound DNS (port 53)
```

#### LoadBalancer IP Change

**Symptoms:**
- Clients cannot reach DNS service
- Old DNS IPs no longer respond
- New LoadBalancer IPs assigned

**Steps:**
```bash
# 1. Get current LoadBalancer IPs
kubectl get svc -n nebula-dns | grep LoadBalancer

# 2. Check if external-dns has updated DNS records:
kubectl logs -n nebula-dns deploy/external-dns --tail=50 | grep -E 'dns1|dns2|doh'

# 3. Query current DNS records:
dig dns1.staging.nebuladns.io +short
dig dns2.staging.nebuladns.io +short
dig doh.staging.nebuladns.io +short

# 4. If records don't match LoadBalancer IPs, force external-dns sync:
kubectl delete pod -n nebula-dns -l app=external-dns
# external-dns will reconcile on startup

# 5. If manual intervention needed, update DNS via DigitalOcean console:
# https://cloud.digitalocean.com/networking/domains

# 6. Verify resolution after DNS propagation (up to 5 minutes):
drill @8.8.8.8 dns1.staging.nebuladns.io
```

#### Policy Service Unavailable

**Symptoms:**
- dnsdist logs show "policy-svc connection refused" or timeout
- `dnsdist_backend_down_total{backend="policy-svc"}` metric increases
- DNS queries fail with SERVFAIL

**Steps:**
```bash
# 1. Check policy-svc pod status
kubectl get pods -n nebula-dns -l app=policy-svc

# 2. If pods down, see policy-svc-crash.md runbook
# Cross-reference: policy-svc-crash.md

# 3. If pods running but dnsdist can't reach them, check service:
kubectl get svc -n nebula-dns policy-svc
kubectl get endpoints -n nebula-dns policy-svc

# 4. Test connectivity from dnsdist pod:
kubectl exec -n nebula-dns deploy/dnsdist -- curl -v http://policy-svc.nebula-dns.svc.cluster.local:8080/health

# 5. Check for NetworkPolicy blocking traffic:
kubectl get networkpolicy -n nebula-dns
# Ensure policy-svc is reachable from dnsdist namespace
```

### Post-Incident

After resolution, verify the following:

1. **DNS resolution working from external client:**
   ```bash
   drill @<loadbalancer-ip> google.com
   drill @<loadbalancer-ip> blocked-domain.com  # Should return NXDOMAIN
   ```

2. **All pods healthy:**
   ```bash
   kubectl get pods -n nebula-dns | grep -E 'dnsdist|unbound|policy-svc'
   # All should show Running with 0 restarts
   ```

3. **Metrics recovering:**
   - Check Grafana SLO dashboard: Error budget consumption should decrease
   - `probe_success{job="blackbox-dns"}` returning to 1.0 (100%)
   - `dnsdist_backend_down_total` no longer increasing

4. **Document in incident report:**
   - Root cause identified
   - Time to detection (alert fired → acknowledged)
   - Time to resolution (acknowledged → service restored)
   - Error budget consumed
   - Action items to prevent recurrence

5. **Update runbook if needed:**
   - If new failure mode discovered, add to "Common Causes"
   - If new diagnostic step helped, add to "Resolution Procedures"

### Cross-References

- [Redis Down](redis-down.md) — If policy-svc failure caused by Redis unavailability
- [Policy Service Crash](policy-svc-crash.md) — If policy-svc pods in CrashLoopBackOff
- [Database Down](database-down.md) — Unlikely cause, but check if API also failing

---

**Runbook Version:** 1.0
**Last Updated:** 2026-02-21
**Owner:** DevOps/SRE Team
