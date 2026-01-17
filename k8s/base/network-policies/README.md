# Nebula DNS - Network Policies

Network Policies for Kubernetes implementing zero-trust network security with micro-segmentation.

## Overview

This directory contains Kubernetes Network Policies that implement defense-in-depth security by restricting network traffic between pods to only what is necessary. The policies follow a **default-deny** approach where all traffic is blocked by default, and specific policies whitelist only required communication paths.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                              │
└────────────┬────────────────────────────────────────────────┘
             │
             │ DoT:853, DoH:443
             ▼
      ┌──────────────┐
      │   dnsdist    │ ◄─────────────┐
      └──────┬───────┘                │
             │                        │
             │ HTTP:8080              │ DNS:53
             ▼                        │
      ┌──────────────┐         ┌──────────────┐
      │ policy-svc   │────────►│   unbound    │
      └──────┬───────┘         └──────────────┘
             │                        │
             │ Redis:6379             │ DNS:53 (internet)
             │ ClickHouse:8123        │
             ▼                        ▼
┌────────────────────────────────────────────┐
│            Data Layer                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │  Redis   │  │ ClickHouse│  │ Postgres │ │
│  └──────────┘  └──────────┘  └──────────┘ │
└────────────────────────────────────────────┘
             ▲
             │ PG:5432, Redis:6379, CH:8123
             │
      ┌──────────────┐
      │     API      │
      └──────┬───────┘
             ▲
             │ HTTP:3000
             │
      ┌──────────────┐
      │ Ingress NGINX│
      └──────────────┘
             ▲
             │ HTTPS:443
             │
      ┌──────────────┐
      │      UI      │
      └──────────────┘
```

## Policy Files

### Default Policy
- **default-deny-all.yaml**: Denies all ingress and egress traffic by default (zero-trust baseline)

### Application Layer
- **api-netpol.yaml**: API service policy
  - Ingress: Ingress NGINX controller
  - Egress: PostgreSQL, Redis, ClickHouse, external HTTPS (Stripe, SendGrid)

- **ui-netpol.yaml**: UI service policy
  - Ingress: Ingress NGINX controller only
  - Egress: DNS only (API calls go through browser)

- **policy-svc-netpol.yaml**: Policy Service policy
  - Ingress: dnsdist, API
  - Egress: Redis, ClickHouse, Unbound

- **dnsdist-netpol.yaml**: dnsdist policy
  - Ingress: Internet (DoT:853, DoH:443)
  - Egress: Policy Service, Unbound

### Data Layer
- **postgres-netpol.yaml**: PostgreSQL policy
  - Ingress: API only
  - Egress: DNS, S3 backup

- **redis-netpol.yaml**: Redis policy
  - Ingress: API, Policy Service, Report Service
  - Egress: DNS

- **clickhouse-netpol.yaml**: ClickHouse policy
  - Ingress: API, Policy Service, Report Service
  - Egress: DNS, S3 backup

- **unbound-netpol.yaml**: Unbound policy
  - Ingress: dnsdist, Policy Service
  - Egress: Internet DNS (port 53, 853)

## Deployment

### Apply Network Policies

```bash
# Apply all network policies
kubectl apply -k /Users/jeremymcspadden/Github/nebula-dns/k8s/base/network-policies/

# Or apply with base kustomization
kubectl apply -k /Users/jeremymcspadden/Github/nebula-dns/k8s/base/

# Apply for production overlay
kubectl apply -k /Users/jeremymcspadden/Github/nebula-dns/k8s/overlays/production/
```

### Verify Deployment

```bash
# List all network policies
kubectl get networkpolicies -n nebula-dns

# Describe specific policy
kubectl describe networkpolicy api-netpol -n nebula-dns

# Check all policies are applied
kubectl get netpol -n nebula-dns -o wide
```

Expected output:
```
NAME                  POD-SELECTOR      AGE
default-deny-all      <none>            1m
api-netpol           app=api           1m
ui-netpol            app=ui            1m
policy-svc-netpol    app=policy-svc    1m
dnsdist-netpol       app=dnsdist       1m
postgres-netpol      app=postgres      1m
redis-netpol         app=redis         1m
clickhouse-netpol    app=clickhouse    1m
unbound-netpol       app=unbound       1m
```

## Testing & Verification

### 1. Test Default Deny Policy

Test that pods cannot communicate when not explicitly allowed:

```bash
# Create test pod
kubectl run test-pod --image=busybox -n nebula-dns -- sleep 3600

# Try to connect to Redis (should fail)
kubectl exec -n nebula-dns test-pod -- nc -zv redis 6379
# Expected: Connection timed out

# Clean up
kubectl delete pod test-pod -n nebula-dns
```

### 2. Test API to PostgreSQL (Should Work)

```bash
# Get API pod name
API_POD=$(kubectl get pod -n nebula-dns -l app=api -o jsonpath='{.items[0].metadata.name}')

# Test PostgreSQL connection
kubectl exec -n nebula-dns $API_POD -- nc -zv postgres 5432
# Expected: Connection succeeded

# Test unauthorized connection to ClickHouse from non-allowed pod
kubectl exec -n nebula-dns $API_POD -- nc -zv clickhouse 8123
# Expected: Connection succeeded (API is allowed)
```

### 3. Test Policy Service to Redis (Should Work)

```bash
# Get Policy Service pod name
POLICY_POD=$(kubectl get pod -n nebula-dns -l app=policy-svc -o jsonpath='{.items[0].metadata.name}')

# Test Redis connection
kubectl exec -n nebula-dns $POLICY_POD -- nc -zv redis 6379
# Expected: Connection succeeded

# Test PostgreSQL connection (should fail - not allowed)
kubectl exec -n nebula-dns $POLICY_POD -- nc -zv postgres 5432
# Expected: Connection timed out
```

### 4. Test dnsdist External Connectivity

```bash
# Test DNS over TLS endpoint from outside cluster
dig @dns1.nebuladns.io -p 853 +tls example.com
# Expected: DNS response

# Test DNS over HTTPS endpoint
curl -H 'accept: application/dns-json' 'https://dns1.nebuladns.io/dns-query?name=example.com&type=A'
# Expected: DNS JSON response
```

### 5. Test UI Isolation

```bash
# Get UI pod name
UI_POD=$(kubectl get pod -n nebula-dns -l app=ui -o jsonpath='{.items[0].metadata.name}')

# Try to connect to API (should fail - traffic goes through browser)
kubectl exec -n nebula-dns $UI_POD -- nc -zv api 80
# Expected: Connection timed out

# Try to connect to Redis (should fail)
kubectl exec -n nebula-dns $UI_POD -- nc -zv redis 6379
# Expected: Connection timed out
```

### 6. Test DNS Resolution (All Pods)

All pods should be able to resolve DNS:

```bash
# Test DNS resolution from API
kubectl exec -n nebula-dns $API_POD -- nslookup kubernetes.default.svc.cluster.local
# Expected: DNS response

# Test DNS resolution from Policy Service
kubectl exec -n nebula-dns $POLICY_POD -- nslookup kubernetes.default.svc.cluster.local
# Expected: DNS response
```

### 7. Test Database Isolation

```bash
# Get PostgreSQL pod name
PG_POD=$(kubectl get pod -n nebula-dns -l app=postgres -o jsonpath='{.items[0].metadata.name}')

# PostgreSQL should only accept connections from API
# Try from test pod (should fail)
kubectl run test-pod --image=postgres:14 -n nebula-dns -- sleep 3600
kubectl exec -n nebula-dns test-pod -- psql -h postgres -U nebula -c "SELECT 1"
# Expected: Connection timed out

# Clean up
kubectl delete pod test-pod -n nebula-dns
```

## Monitoring Network Policy Violations

### Enable Network Policy Logging (CNI Dependent)

For Calico:
```bash
# Enable logging for denied connections
kubectl annotate networkpolicy api-netpol -n nebula-dns \
  projectcalico.org/metadata='{"annotations":{"log-prefix":"CALICO_DENY"}}'
```

For Cilium:
```bash
# Check network policy status
cilium endpoint list

# Monitor policy drops
hubble observe --type drop --verdict DROPPED
```

### View Logs

```bash
# Check CNI logs for network policy denials
kubectl logs -n kube-system -l k8s-app=calico-node | grep DENY

# Or for Cilium
kubectl logs -n kube-system -l k8s-app=cilium | grep "Policy denied"
```

## Troubleshooting

### Connection Timeouts

If legitimate traffic is being blocked:

1. **Check pod labels match policy selectors**:
   ```bash
   kubectl get pod -n nebula-dns --show-labels
   kubectl describe netpol -n nebula-dns <policy-name>
   ```

2. **Verify namespace labels** (for namespace selectors):
   ```bash
   kubectl get namespace ingress-nginx --show-labels
   kubectl get namespace kube-system --show-labels
   ```

3. **Temporarily disable policy** for testing:
   ```bash
   kubectl delete netpol <policy-name> -n nebula-dns
   # Test connection
   # Re-apply policy
   kubectl apply -f <policy-file>
   ```

### DNS Resolution Issues

If DNS is failing:

```bash
# Check kube-dns labels
kubectl get pod -n kube-system -l k8s-app=kube-dns --show-labels

# Verify DNS egress rules in all policies
kubectl get netpol -n nebula-dns -o yaml | grep -A5 "port: 53"
```

### External API Calls Failing (API Service)

If Stripe/SendGrid calls fail:

```bash
# Check API egress for HTTPS (port 443)
kubectl describe netpol api-netpol -n nebula-dns | grep -A10 Egress

# Test external connectivity
API_POD=$(kubectl get pod -n nebula-dns -l app=api -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n nebula-dns $API_POD -- curl -I https://api.stripe.com
```

## Security Considerations

### Defense in Depth

Network Policies are one layer of security. Also implement:

- **Pod Security Policies/Standards**: Restrict container capabilities
- **RBAC**: Limit Kubernetes API access
- **Secrets Management**: Use external-secrets or sealed-secrets
- **mTLS**: Enable service mesh for encrypted inter-pod communication
- **Audit Logging**: Enable Kubernetes audit logs

### CNI Requirements

Network Policies require a CNI plugin that supports them:

**Supported CNIs**:
- Calico (recommended)
- Cilium (recommended)
- Weave Net
- Antrea
- kube-router

**NOT Supported**:
- Flannel (without Calico)
- Default Docker bridge

### Performance Impact

Network Policies have minimal performance overhead when using modern CNI plugins like Calico or Cilium. The policies are evaluated at kernel level (eBPF for Cilium) and add negligible latency.

## Best Practices

1. **Start with default-deny**: Apply `default-deny-all.yaml` first
2. **Whitelist incrementally**: Add specific policies for each service
3. **Test in staging**: Verify policies in non-production first
4. **Monitor denials**: Enable logging to catch blocked legitimate traffic
5. **Use labels consistently**: Ensure pod labels match policy selectors
6. **Document exceptions**: Comment why specific egress rules exist
7. **Regular audits**: Review policies quarterly for unnecessary rules
8. **Namespace isolation**: Use namespace selectors for cross-namespace traffic

## Production Checklist

Before deploying to production:

- [ ] CNI plugin supports Network Policies (Calico/Cilium)
- [ ] All services have appropriate labels
- [ ] Namespace labels configured (ingress-nginx, kube-system)
- [ ] DNS resolution tested from all pods
- [ ] Inter-service communication verified
- [ ] External API calls tested (Stripe, SendGrid)
- [ ] LoadBalancer ingress tested (dnsdist)
- [ ] Monitoring/logging configured for policy violations
- [ ] Backup jobs can connect to databases
- [ ] Metrics scraping works (Prometheus)
- [ ] Health checks pass after policy application

## References

- [Kubernetes Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Calico Network Policy](https://docs.projectcalico.org/security/calico-network-policy)
- [Cilium Network Policy](https://docs.cilium.io/en/stable/policy/)
- [NetworkPolicy Editor](https://editor.cilium.io/)

## Support

For issues or questions:
- Open an issue in the repository
- Contact: jeremy@fluxlabs.net
