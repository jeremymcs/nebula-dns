# Network Policy Testing Guide

This guide provides comprehensive testing procedures for Nebula DNS network policies.

## Prerequisites

1. **Kubernetes Cluster with Network Policy Support**
   - CNI: Calico, Cilium, or Weave Net
   - Kubernetes 1.20+
   - kubectl configured

2. **Required Tools**
   ```bash
   # Install netcat for testing
   kubectl run test-tools --image=nicolaka/netshoot -n nebula-dns -- sleep 3600
   ```

3. **Verify CNI Support**
   ```bash
   # For Calico
   kubectl get pods -n kube-system -l k8s-app=calico-node

   # For Cilium
   kubectl get pods -n kube-system -l k8s-app=cilium
   ```

## Quick Test Suite

Run the automated verification script:

```bash
cd /Users/jeremymcspadden/Github/nebula-dns/k8s/base/network-policies/
./verify-netpol.sh
```

## Manual Testing Procedures

### Test 1: Default Deny Policy

**Objective**: Verify that unauthorized pods cannot communicate

```bash
# Create test pod without specific labels
kubectl run unauthorized-pod --image=busybox -n nebula-dns -- sleep 3600

# Wait for pod to be ready
kubectl wait --for=condition=Ready pod/unauthorized-pod -n nebula-dns --timeout=30s

# Try to connect to Redis (should fail)
kubectl exec -n nebula-dns unauthorized-pod -- nc -zv redis 6379
# Expected: Connection timed out (exit code 1)

# Try to connect to PostgreSQL (should fail)
kubectl exec -n nebula-dns unauthorized-pod -- nc -zv postgres 5432
# Expected: Connection timed out (exit code 1)

# Try to connect to API (should fail)
kubectl exec -n nebula-dns unauthorized-pod -- nc -zv api 80
# Expected: Connection timed out (exit code 1)

# Clean up
kubectl delete pod unauthorized-pod -n nebula-dns
```

**Expected Result**: All connections should timeout (blocked by default-deny-all policy)

---

### Test 2: API to Database Layer

**Objective**: Verify API can connect to PostgreSQL, Redis, ClickHouse

```bash
# Get API pod name
API_POD=$(kubectl get pod -n nebula-dns -l app=api -o jsonpath='{.items[0].metadata.name}')

# Test PostgreSQL connection
echo "Testing API -> PostgreSQL..."
kubectl exec -n nebula-dns $API_POD -- nc -zv postgres 5432
# Expected: Connection succeeded (exit code 0)

# Test Redis connection
echo "Testing API -> Redis..."
kubectl exec -n nebula-dns $API_POD -- nc -zv redis 6379
# Expected: Connection succeeded (exit code 0)

# Test ClickHouse HTTP connection
echo "Testing API -> ClickHouse..."
kubectl exec -n nebula-dns $API_POD -- nc -zv clickhouse 8123
# Expected: Connection succeeded (exit code 0)

# Test ClickHouse native connection
kubectl exec -n nebula-dns $API_POD -- nc -zv clickhouse 9000
# Expected: Connection succeeded (exit code 0)
```

**Expected Result**: All connections should succeed

---

### Test 3: Policy Service Connectivity

**Objective**: Verify Policy Service can connect to Redis, ClickHouse, Unbound but NOT PostgreSQL

```bash
# Get Policy Service pod name
POLICY_POD=$(kubectl get pod -n nebula-dns -l app=policy-svc -o jsonpath='{.items[0].metadata.name}')

# Test Redis connection (should succeed)
echo "Testing Policy Service -> Redis..."
kubectl exec -n nebula-dns $POLICY_POD -- nc -zv redis 6379
# Expected: Connection succeeded

# Test ClickHouse connection (should succeed)
echo "Testing Policy Service -> ClickHouse..."
kubectl exec -n nebula-dns $POLICY_POD -- nc -zv clickhouse 8123
# Expected: Connection succeeded

# Test PostgreSQL connection (should FAIL - not in egress rules)
echo "Testing Policy Service -> PostgreSQL (should fail)..."
kubectl exec -n nebula-dns $POLICY_POD -- timeout 2 nc -zv postgres 5432
# Expected: Connection timed out (exit code 124)

# Test Unbound connection (should succeed)
echo "Testing Policy Service -> Unbound..."
kubectl exec -n nebula-dns $POLICY_POD -- nc -zv unbound 53
# Expected: Connection succeeded
```

**Expected Result**: Redis, ClickHouse, Unbound succeed; PostgreSQL fails

---

### Test 4: UI Isolation

**Objective**: Verify UI cannot directly access backend services

```bash
# Get UI pod name
UI_POD=$(kubectl get pod -n nebula-dns -l app=ui -o jsonpath='{.items[0].metadata.name}')

# Test API connection (should fail - goes through browser)
echo "Testing UI -> API (should fail)..."
kubectl exec -n nebula-dns $UI_POD -- timeout 2 nc -zv api 80
# Expected: Connection timed out

# Test Redis connection (should fail)
echo "Testing UI -> Redis (should fail)..."
kubectl exec -n nebula-dns $UI_POD -- timeout 2 nc -zv redis 6379
# Expected: Connection timed out

# Test PostgreSQL connection (should fail)
echo "Testing UI -> PostgreSQL (should fail)..."
kubectl exec -n nebula-dns $UI_POD -- timeout 2 nc -zv postgres 5432
# Expected: Connection timed out
```

**Expected Result**: All connections should fail (UI is isolated)

---

### Test 5: dnsdist to Policy Service

**Objective**: Verify dnsdist can query Policy Service

```bash
# Get dnsdist pod name
DNSDIST_POD=$(kubectl get pod -n nebula-dns -l app=dnsdist -o jsonpath='{.items[0].metadata.name}')

# Test Policy Service connection
echo "Testing dnsdist -> Policy Service..."
kubectl exec -n nebula-dns $DNSDIST_POD -- nc -zv policy-svc 80
# Expected: Connection succeeded

# Test Unbound connection
echo "Testing dnsdist -> Unbound..."
kubectl exec -n nebula-dns $DNSDIST_POD -- nc -zv unbound 53
# Expected: Connection succeeded

# Test Redis connection (should FAIL - not allowed)
echo "Testing dnsdist -> Redis (should fail)..."
kubectl exec -n nebula-dns $DNSDIST_POD -- timeout 2 nc -zv redis 6379
# Expected: Connection timed out
```

**Expected Result**: Policy Service and Unbound succeed; Redis fails

---

### Test 6: DNS Resolution (All Pods)

**Objective**: Verify all pods can resolve DNS via kube-dns

```bash
# Test from API pod
API_POD=$(kubectl get pod -n nebula-dns -l app=api -o jsonpath='{.items[0].metadata.name}')
echo "Testing DNS from API pod..."
kubectl exec -n nebula-dns $API_POD -- nslookup kubernetes.default.svc.cluster.local
# Expected: Returns DNS response with IP

# Test from Policy Service pod
POLICY_POD=$(kubectl get pod -n nebula-dns -l app=policy-svc -o jsonpath='{.items[0].metadata.name}')
echo "Testing DNS from Policy Service pod..."
kubectl exec -n nebula-dns $POLICY_POD -- nslookup kubernetes.default.svc.cluster.local
# Expected: Returns DNS response with IP

# Test from UI pod
UI_POD=$(kubectl get pod -n nebula-dns -l app=ui -o jsonpath='{.items[0].metadata.name}')
echo "Testing DNS from UI pod..."
kubectl exec -n nebula-dns $UI_POD -- nslookup kubernetes.default.svc.cluster.local
# Expected: Returns DNS response with IP
```

**Expected Result**: All pods should resolve DNS successfully

---

### Test 7: Database Ingress Isolation

**Objective**: Verify databases only accept connections from authorized pods

```bash
# Create unauthorized pod
kubectl run db-test-pod --image=postgres:14 -n nebula-dns -- sleep 3600
kubectl wait --for=condition=Ready pod/db-test-pod -n nebula-dns --timeout=30s

# Try to connect to PostgreSQL (should fail)
echo "Testing unauthorized pod -> PostgreSQL (should fail)..."
kubectl exec -n nebula-dns db-test-pod -- timeout 2 bash -c "PGPASSWORD=password psql -h postgres -U nebula -d nebula -c 'SELECT 1'"
# Expected: Connection timed out or refused

# Try to connect to Redis (should fail)
echo "Testing unauthorized pod -> Redis (should fail)..."
kubectl exec -n nebula-dns db-test-pod -- timeout 2 nc -zv redis 6379
# Expected: Connection timed out

# Clean up
kubectl delete pod db-test-pod -n nebula-dns
```

**Expected Result**: Unauthorized pod cannot connect to databases

---

### Test 8: External HTTPS Access (API Only)

**Objective**: Verify API can make external HTTPS calls

```bash
# Get API pod name
API_POD=$(kubectl get pod -n nebula-dns -l app=api -o jsonpath='{.items[0].metadata.name}')

# Test external HTTPS (Stripe API)
echo "Testing API -> External HTTPS (stripe.com)..."
kubectl exec -n nebula-dns $API_POD -- nc -zv stripe.com 443
# Expected: Connection succeeded

# Test from Policy Service (should fail - not in egress)
POLICY_POD=$(kubectl get pod -n nebula-dns -l app=policy-svc -o jsonpath='{.items[0].metadata.name}')
echo "Testing Policy Service -> External HTTPS (should have limited access)..."
kubectl exec -n nebula-dns $POLICY_POD -- timeout 2 nc -zv stripe.com 443
# Expected: Depends on policy - may timeout
```

**Expected Result**: API can access external HTTPS, other services restricted

---

### Test 9: Ingress Controller Access

**Objective**: Verify Ingress NGINX can reach UI and API

```bash
# Get Ingress NGINX pod name
INGRESS_POD=$(kubectl get pod -n ingress-nginx -l app.kubernetes.io/component=controller -o jsonpath='{.items[0].metadata.name}')

# Test connection to UI service
echo "Testing Ingress -> UI service..."
kubectl exec -n ingress-nginx $INGRESS_POD -- nc -zv ui.nebula-dns.svc.cluster.local 80
# Expected: Connection succeeded

# Test connection to API service
echo "Testing Ingress -> API service..."
kubectl exec -n ingress-nginx $INGRESS_POD -- nc -zv api.nebula-dns.svc.cluster.local 80
# Expected: Connection succeeded
```

**Expected Result**: Ingress controller can reach UI and API services

---

### Test 10: End-to-End DNS Query Flow

**Objective**: Verify complete DNS query path works

```bash
# From outside the cluster, query dnsdist
# Get LoadBalancer IP
DNSDIST_IP=$(kubectl get svc dnsdist-1 -n nebula-dns -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test DNS over TLS (DoT)
echo "Testing DNS over TLS..."
dig @$DNSDIST_IP -p 853 +tls example.com
# Expected: DNS response with A record

# Test DNS over HTTPS (DoH)
echo "Testing DNS over HTTPS..."
curl -H 'accept: application/dns-json' "https://$DNSDIST_IP/dns-query?name=example.com&type=A"
# Expected: JSON DNS response
```

**Expected Result**: DNS queries work end-to-end through network policies

---

## Load Testing with Network Policies

Test performance impact of network policies:

```bash
# Run k6 load test
k6 run /Users/jeremymcspadden/Github/nebula-dns/scripts/load-testing/api-load-test.js

# Compare metrics before and after network policies
# Expected: < 5% latency increase
```

---

## Monitoring Network Policy Denials

### Calico Monitoring

```bash
# Enable logging for denied packets
kubectl annotate networkpolicy api-netpol -n nebula-dns \
  projectcalico.org/metadata='{"annotations":{"log-prefix":"CALICO_DENY_API"}}'

# View denied packets
kubectl logs -n kube-system -l k8s-app=calico-node | grep CALICO_DENY
```

### Cilium Monitoring

```bash
# Install Hubble CLI
curl -LO https://github.com/cilium/hubble/releases/latest/download/hubble-linux-amd64.tar.gz
tar xzvf hubble-linux-amd64.tar.gz
sudo mv hubble /usr/local/bin/

# Port-forward Hubble Relay
kubectl port-forward -n kube-system svc/hubble-relay 4245:80 &

# Monitor policy drops in real-time
hubble observe --type drop --verdict DROPPED -n nebula-dns

# Filter by specific pod
hubble observe --type drop --from-pod nebula-dns/api- -n nebula-dns
```

---

## Troubleshooting Common Issues

### Issue: Legitimate Traffic Blocked

**Symptoms**: Connection timeouts for expected traffic

**Debug Steps**:
1. Check pod labels:
   ```bash
   kubectl get pod -n nebula-dns --show-labels
   ```

2. Verify policy selectors:
   ```bash
   kubectl describe networkpolicy api-netpol -n nebula-dns
   ```

3. Check namespace labels:
   ```bash
   kubectl get namespace ingress-nginx --show-labels
   ```

4. Temporarily disable policy:
   ```bash
   kubectl delete networkpolicy api-netpol -n nebula-dns
   # Test connection
   kubectl apply -f api-netpol.yaml
   ```

---

### Issue: DNS Resolution Failing

**Symptoms**: Pods cannot resolve DNS names

**Debug Steps**:
1. Check kube-dns pods:
   ```bash
   kubectl get pod -n kube-system -l k8s-app=kube-dns
   ```

2. Verify DNS egress in all policies:
   ```bash
   kubectl get networkpolicy -n nebula-dns -o yaml | grep -A10 "port: 53"
   ```

3. Test DNS directly:
   ```bash
   kubectl exec -n nebula-dns $API_POD -- nslookup kubernetes.default.svc.cluster.local 10.96.0.10
   ```

---

### Issue: External API Calls Failing

**Symptoms**: Stripe/SendGrid API calls timeout

**Debug Steps**:
1. Check egress rules:
   ```bash
   kubectl describe networkpolicy api-netpol -n nebula-dns | grep -A20 Egress
   ```

2. Verify external connectivity:
   ```bash
   kubectl exec -n nebula-dns $API_POD -- curl -I https://api.stripe.com
   ```

3. Check if external egress is blocked by cluster network policy:
   ```bash
   kubectl get networkpolicy --all-namespaces
   ```

---

## Performance Benchmarking

### Before Network Policies

```bash
# Run baseline test
k6 run --vus 100 --duration 60s /Users/jeremymcspadden/Github/nebula-dns/scripts/load-testing/api-load-test.js > baseline.txt
```

### After Network Policies

```bash
# Run test with policies
k6 run --vus 100 --duration 60s /Users/jeremymcspadden/Github/nebula-dns/scripts/load-testing/api-load-test.js > with-netpol.txt

# Compare results
diff baseline.txt with-netpol.txt
```

**Expected Impact**: < 5% latency increase with modern CNI (Calico/Cilium)

---

## Security Audit

Regular security checks for network policies:

```bash
# 1. List all policies
kubectl get networkpolicy -n nebula-dns

# 2. Check for policies without egress rules (might block DNS)
kubectl get networkpolicy -n nebula-dns -o json | jq '.items[] | select(.spec.policyTypes | contains(["Egress"]) | not) | .metadata.name'

# 3. Verify default-deny exists
kubectl get networkpolicy default-deny-all -n nebula-dns

# 4. Check for overly permissive rules
kubectl get networkpolicy -n nebula-dns -o yaml | grep -A5 "from: \[\]"

# 5. Validate all pods are covered
kubectl get pods -n nebula-dns -o custom-columns=POD:.metadata.name,LABELS:.metadata.labels
```

---

## Cleanup

Remove all network policies (for testing):

```bash
# Delete all network policies
kubectl delete networkpolicy --all -n nebula-dns

# Verify deletion
kubectl get networkpolicy -n nebula-dns
# Expected: No resources found
```

Reapply policies:

```bash
kubectl apply -k /Users/jeremymcspadden/Github/nebula-dns/k8s/base/network-policies/
```

---

## Production Readiness Checklist

Before deploying to production:

- [ ] All automated tests pass (`./verify-netpol.sh`)
- [ ] Manual connectivity tests pass
- [ ] DNS resolution works from all pods
- [ ] External API calls work (Stripe, SendGrid)
- [ ] LoadBalancer ingress works (dnsdist)
- [ ] Prometheus can scrape metrics
- [ ] Health checks pass
- [ ] No unexpected policy denials in logs
- [ ] Performance impact < 5%
- [ ] Backup jobs can connect to databases
- [ ] Namespace labels configured correctly
- [ ] CNI supports Network Policies (Calico/Cilium)
- [ ] Monitoring configured for policy violations
- [ ] Team trained on troubleshooting network policies
- [ ] Runbook created for policy-related incidents

---

## Additional Resources

- [Kubernetes Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Network Policy Editor](https://editor.cilium.io/)
- [Calico Network Policy Tutorial](https://docs.projectcalico.org/security/tutorials/kubernetes-policy-basic)
- [Cilium Network Policy Examples](https://docs.cilium.io/en/stable/policy/language/)
