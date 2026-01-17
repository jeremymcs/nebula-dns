# Network Policies Deployment Guide

Quick reference for deploying and managing Nebula DNS network policies.

## Quick Start

### 1. Prerequisites Check

```bash
# Verify CNI supports Network Policies
kubectl get pods -n kube-system -l k8s-app=calico-node
# OR
kubectl get pods -n kube-system -l k8s-app=cilium

# Verify namespace exists
kubectl get namespace nebula-dns

# Verify namespace labels for ingress-nginx
kubectl label namespace ingress-nginx name=ingress-nginx --overwrite
kubectl label namespace kube-system name=kube-system --overwrite
```

### 2. Deploy Network Policies

```bash
# Deploy all network policies
kubectl apply -k /Users/jeremymcspadden/Github/nebula-dns/k8s/base/network-policies/

# OR deploy entire base stack (includes network policies)
kubectl apply -k /Users/jeremymcspadden/Github/nebula-dns/k8s/base/
```

### 3. Verify Deployment

```bash
# List all network policies
kubectl get networkpolicy -n nebula-dns

# Expected output:
# NAME                  POD-SELECTOR      AGE
# default-deny-all      <none>            1m
# api-netpol           app=api           1m
# ui-netpol            app=ui            1m
# policy-svc-netpol    app=policy-svc    1m
# dnsdist-netpol       app=dnsdist       1m
# postgres-netpol      app=postgres      1m
# redis-netpol         app=redis         1m
# clickhouse-netpol    app=clickhouse    1m
# unbound-netpol       app=unbound       1m
```

### 4. Run Verification Tests

```bash
# Run automated test suite
cd /Users/jeremymcspadden/Github/nebula-dns/k8s/base/network-policies/
./verify-netpol.sh
```

## Deployment Order

Network policies are applied in this order via kustomization:

1. **default-deny-all.yaml** - Baseline deny-all policy
2. **Application layer policies** - API, UI, Policy Service, dnsdist
3. **Data layer policies** - PostgreSQL, Redis, ClickHouse, Unbound

This ensures zero-trust by default with explicit whitelisting.

## Post-Deployment Checklist

- [ ] All 9 network policies deployed
- [ ] No errors in `kubectl get networkpolicy -n nebula-dns`
- [ ] Automated tests pass (`./verify-netpol.sh`)
- [ ] Application health checks pass
- [ ] DNS queries work end-to-end
- [ ] API can connect to databases
- [ ] UI is accessible via ingress
- [ ] External API calls work (Stripe, SendGrid)
- [ ] Prometheus metrics scraping works
- [ ] No unexpected policy denials in CNI logs

## Rollback

If issues occur after deployment:

```bash
# Remove all network policies
kubectl delete networkpolicy --all -n nebula-dns

# Verify removal
kubectl get networkpolicy -n nebula-dns
# Expected: No resources found

# Application should work normally without network policies
# Investigate and fix issues before reapplying
```

## Update Policies

To update a single policy:

```bash
# Edit the policy file
vi /Users/jeremymcspadden/Github/nebula-dns/k8s/base/network-policies/api-netpol.yaml

# Apply changes
kubectl apply -f /Users/jeremymcspadden/Github/nebula-dns/k8s/base/network-policies/api-netpol.yaml

# Verify update
kubectl describe networkpolicy api-netpol -n nebula-dns
```

## Production Deployment

For production overlay:

```bash
# Deploy production overlay (includes network policies from base)
kubectl apply -k /Users/jeremymcspadden/Github/nebula-dns/k8s/overlays/production/

# Verify in production namespace
kubectl get networkpolicy -n nebula-dns-production
```

## Monitoring

### View Policy Details

```bash
# Describe specific policy
kubectl describe networkpolicy api-netpol -n nebula-dns

# View all policies as YAML
kubectl get networkpolicy -n nebula-dns -o yaml
```

### Monitor Policy Denials (Calico)

```bash
# Enable logging
kubectl annotate networkpolicy api-netpol -n nebula-dns \
  projectcalico.org/metadata='{"annotations":{"log-prefix":"CALICO_DENY"}}'

# View logs
kubectl logs -n kube-system -l k8s-app=calico-node | grep DENY
```

### Monitor Policy Denials (Cilium)

```bash
# Port-forward Hubble
kubectl port-forward -n kube-system svc/hubble-relay 4245:80

# Monitor drops
hubble observe --type drop --verdict DROPPED -n nebula-dns
```

## Common Commands

```bash
# List all policies
kubectl get netpol -n nebula-dns

# Describe policy
kubectl describe netpol api-netpol -n nebula-dns

# Delete policy
kubectl delete netpol api-netpol -n nebula-dns

# Reapply all policies
kubectl apply -k /Users/jeremymcspadden/Github/nebula-dns/k8s/base/network-policies/

# Check pod labels
kubectl get pods -n nebula-dns --show-labels

# Test connectivity from pod
kubectl exec -n nebula-dns <pod-name> -- nc -zv <host> <port>
```

## Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| Connection timeout | Check pod labels match policy selectors |
| DNS not resolving | Verify DNS egress rules, check kube-dns pod |
| External calls fail | Check egress rules for HTTPS (port 443) |
| Ingress not working | Verify namespace labels on ingress-nginx |
| All traffic blocked | Check if default-deny-all is applied without specific policies |

## Files Overview

```
network-policies/
├── kustomization.yaml           # Kustomize config
├── default-deny-all.yaml        # Default deny policy
├── api-netpol.yaml              # API service policy
├── ui-netpol.yaml               # UI service policy
├── policy-svc-netpol.yaml       # Policy Service policy
├── dnsdist-netpol.yaml          # dnsdist policy
├── postgres-netpol.yaml         # PostgreSQL policy
├── redis-netpol.yaml            # Redis policy
├── clickhouse-netpol.yaml       # ClickHouse policy
├── unbound-netpol.yaml          # Unbound policy
├── verify-netpol.sh             # Automated verification script
├── README.md                    # Comprehensive documentation
├── TESTING.md                   # Testing procedures
├── DEPLOYMENT.md                # This file
└── network-policies.dot         # Visual diagram (GraphViz)
```

## Support

For issues or questions:
- Review README.md for detailed documentation
- Review TESTING.md for troubleshooting procedures
- Run `./verify-netpol.sh` for automated diagnostics
- Contact: jeremy@fluxlabs.net
