# Pod Disruption Budgets (PDBs)

This directory contains Pod Disruption Budget configurations for Nebula DNS services. PDBs ensure high availability during voluntary disruptions such as node drains, cluster upgrades, and manual pod evictions.

## Overview

Pod Disruption Budgets protect critical services by guaranteeing a minimum number of pods remain available during maintenance operations. This prevents complete service outages during routine cluster maintenance.

## PDB Configurations

### api-pdb.yaml
- **Service**: NestJS API Backend
- **Min Available**: 1 pod
- **Current Replicas**: 2 (via HPA, min=2, max=10)
- **Rationale**: Ensures API remains responsive during rolling updates while allowing one pod to be disrupted

### policy-svc-pdb.yaml
- **Service**: DNS Policy Evaluation Service (Go)
- **Min Available**: 2 pods
- **Current Replicas**: 3 (via HPA, min=3, max=20)
- **Rationale**: CRITICAL for DNS resolution. Higher minimum ensures DNS queries can always be evaluated even during disruptions
- **Impact**: Most critical PDB - DNS service depends on this

### dnsdist-pdb.yaml
- **Service**: DNS Frontend/Load Balancer
- **Min Available**: 1 pod
- **Current Replicas**: 2 (via HPA, min=2, max=10)
- **Rationale**: CRITICAL for DNS service availability. Ensures DNS requests can always be received
- **Note**: Works with hard pod anti-affinity to ensure pods are on different nodes

### ui-pdb.yaml
- **Service**: Next.js Dashboard Frontend
- **Min Available**: 1 pod
- **Current Replicas**: 2 (default deployment replicas)
- **Rationale**: Maintains dashboard access during maintenance, though less critical than DNS services

## How PDBs Work

### Voluntary vs Involuntary Disruptions

**Voluntary Disruptions** (Protected by PDBs):
- Node drains for maintenance
- Cluster upgrades
- Manual pod deletions
- Autoscaler scale-downs

**Involuntary Disruptions** (NOT Protected by PDBs):
- Hardware failures
- Kernel panics
- Network partitions
- Out-of-memory kills

### Disruption Calculation

Kubernetes calculates `disruptionsAllowed` as:
```
disruptionsAllowed = currentReplicas - minAvailable
```

For example, with policy-svc:
- Current replicas: 3
- Min available: 2
- Disruptions allowed: 1

When `disruptionsAllowed = 0`, Kubernetes will block voluntary disruptions until more replicas are available.

## Relationship with HPA

PDBs work in coordination with Horizontal Pod Autoscalers:

| Service | HPA Min | HPA Max | PDB Min | Max Disruptions |
|---------|---------|---------|---------|-----------------|
| API | 2 | 10 | 1 | 1-9 |
| Policy Service | 3 | 20 | 2 | 1-18 |
| dnsdist | 2 | 10 | 1 | 1-9 |
| UI | N/A (static) | N/A | 1 | 1 |

**Important**: PDB `minAvailable` must be less than HPA `minReplicas` to allow any disruptions.

## Testing PDBs

### Verify PDB Status

```bash
# List all PDBs
kubectl get pdb -n nebula-dns

# Detailed status
kubectl describe pdb policy-svc-pdb -n nebula-dns

# Watch disruptions allowed
kubectl get pdb -n nebula-dns -o custom-columns=NAME:.metadata.name,MIN:.spec.minAvailable,CURRENT:.status.currentHealthy,ALLOWED:.status.disruptionsAllowed
```

### Test Node Drain

```bash
# Simulate maintenance by draining a node
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Watch pod rescheduling (should respect PDB minimums)
kubectl get pods -n nebula-dns -w

# Check PDB status during drain
kubectl get pdb -n nebula-dns -w

# Uncordon node when done
kubectl uncordon <node-name>
```

### Test Rolling Update

```bash
# Trigger a rolling update
kubectl set image deployment/policy-svc policy-svc=ghcr.io/nebuladns/policy-svc:new-tag -n nebula-dns

# Watch rollout (should respect PDB)
kubectl rollout status deployment/policy-svc -n nebula-dns

# Verify PDB maintained minimum
kubectl get pdb policy-svc-pdb -n nebula-dns
```

## Customization

### Increasing Availability

For stricter availability requirements:

```yaml
# policy-svc-pdb.yaml
spec:
  minAvailable: 3  # Increased from 2
```

**Remember**: Ensure HPA `minReplicas` is adjusted accordingly (e.g., to 4+).

### Using Percentage-Based PDBs

Alternative approach using percentages:

```yaml
spec:
  minAvailable: 50%  # Instead of absolute number
```

### Using maxUnavailable

Alternative to `minAvailable`:

```yaml
spec:
  maxUnavailable: 1  # Allow max 1 pod to be unavailable
```

## Monitoring and Alerts

### Recommended Alerts

1. **PDB Blocking Disruptions**
```yaml
alert: PodDisruptionBudgetAtLimit
expr: kube_poddisruptionbudget_status_desired_healthy - kube_poddisruptionbudget_status_current_healthy == 0
for: 15m
annotations:
  summary: "PDB {{ $labels.poddisruptionbudget }} is blocking disruptions"
```

2. **Unhealthy PDB**
```yaml
alert: PodDisruptionBudgetUnhealthy
expr: kube_poddisruptionbudget_status_current_healthy < kube_poddisruptionbudget_status_desired_healthy
for: 5m
annotations:
  summary: "PDB {{ $labels.poddisruptionbudget }} has unhealthy pods"
```

### Grafana Metrics

Key metrics to dashboard:
- `kube_poddisruptionbudget_status_current_healthy`
- `kube_poddisruptionbudget_status_desired_healthy`
- `kube_poddisruptionbudget_status_pod_disruptions_allowed`

## Best Practices

1. **DNS-Critical Services**: Use higher `minAvailable` values (policy-svc: 2, dnsdist: 1)
2. **Match with HPA**: Ensure `minAvailable < HPA minReplicas` to allow disruptions
3. **Anti-Affinity**: Combine with pod anti-affinity for node-level redundancy
4. **Test Regularly**: Perform controlled node drains to verify behavior
5. **Monitor**: Set up alerts when `disruptionsAllowed` reaches 0
6. **Document Changes**: Update this README when modifying PDB values

## Troubleshooting

### PDB Blocking Drain

**Symptom**: `kubectl drain` hangs or fails with "Cannot evict pod"

**Cause**: Not enough healthy pods to satisfy PDB

**Solution**:
```bash
# Check PDB status
kubectl describe pdb -n nebula-dns

# Check pod health
kubectl get pods -n nebula-dns

# If needed, temporarily scale up
kubectl scale deployment/policy-svc --replicas=5 -n nebula-dns

# Wait for pods to be ready, then retry drain
```

### PDB Not Enforcing

**Symptom**: Pods evicted despite PDB

**Cause**: PDB selector not matching pods

**Solution**:
```bash
# Verify selector matches
kubectl get pdb policy-svc-pdb -n nebula-dns -o yaml | grep -A 5 selector
kubectl get pods -n nebula-dns -l app=policy-svc --show-labels

# Labels should match between PDB selector and pod labels
```

## References

- [Kubernetes PDB Documentation](https://kubernetes.io/docs/tasks/run-application/configure-pdb/)
- [Specifying a Disruption Budget](https://kubernetes.io/docs/tasks/run-application/configure-pdb/#specifying-a-poddisruptionbudget)
- [Nebula DNS Production Deployment Guide](../../../docs/N-production-deployment.md)

## Support

For issues related to PDBs or high availability:
- Check pod health: `kubectl get pods -n nebula-dns`
- Review PDB status: `kubectl describe pdb -n nebula-dns`
- Contact: DevOps team or GitHub Issues
