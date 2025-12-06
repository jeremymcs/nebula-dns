# Nebula DNS - Production Deployment Guide

This guide covers deploying Nebula DNS to production environments.

## Table of Contents

1. [Infrastructure Requirements](#infrastructure-requirements)
2. [DNS Infrastructure Setup](#dns-infrastructure-setup)
3. [Kubernetes Deployment](#kubernetes-deployment)
4. [Security Configuration](#security-configuration)
5. [Monitoring Setup](#monitoring-setup)
6. [Backup and Recovery](#backup-and-recovery)
7. [Scaling Considerations](#scaling-considerations)
8. [Troubleshooting](#troubleshooting)

---

## Infrastructure Requirements

### Minimum Production Setup

| Component | Specification | Quantity |
|-----------|--------------|----------|
| API Servers | 2 vCPU, 4GB RAM | 2+ |
| Policy Service | 2 vCPU, 2GB RAM | 3+ |
| dnsdist | 2 vCPU, 2GB RAM | 2+ |
| PostgreSQL | 4 vCPU, 16GB RAM, SSD | 1 primary + 1 replica |
| Redis | 2 vCPU, 8GB RAM | 1 cluster (3 nodes) |
| ClickHouse | 4 vCPU, 16GB RAM, SSD | 1+ |

### Recommended Production Setup (10K+ QPS)

| Component | Specification | Quantity |
|-----------|--------------|----------|
| API Servers | 4 vCPU, 8GB RAM | 3+ |
| Policy Service | 4 vCPU, 4GB RAM | 5+ |
| dnsdist | 4 vCPU, 4GB RAM | 3+ |
| PostgreSQL | 8 vCPU, 32GB RAM, NVMe | 1 primary + 2 replicas |
| Redis | 4 vCPU, 16GB RAM | 6-node cluster |
| ClickHouse | 8 vCPU, 32GB RAM, NVMe | 3-node cluster |

---

## DNS Infrastructure Setup

### Public IP Addresses

Obtain dedicated public IP addresses for DNS services:

```bash
# Example: AWS Elastic IPs
aws ec2 allocate-address --domain vpc --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=nebula-dns-primary}]'
aws ec2 allocate-address --domain vpc --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=nebula-dns-secondary}]'
```

### DNS Records

Configure DNS records for your service:

```zone
; Primary DNS service
dns.example.com.     IN  A       203.0.113.10
dns.example.com.     IN  AAAA    2001:db8::10

; DoH endpoint
doh.example.com.     IN  CNAME   dns.example.com.

; DoT endpoint  
dot.example.com.     IN  CNAME   dns.example.com.

; API and UI
api.example.com.     IN  A       203.0.113.20
app.example.com.     IN  A       203.0.113.20
```

### TLS Certificates

#### Option 1: Let's Encrypt with cert-manager

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Apply ClusterIssuer
kubectl apply -f k8s/base/cert-manager/cluster-issuer.yaml

# Apply Certificates
kubectl apply -f k8s/base/cert-manager/certificates.yaml
```

#### Option 2: Commercial Certificates

```bash
# Create secret from certificate files
kubectl create secret tls dnsdist-tls \
  --cert=path/to/fullchain.pem \
  --key=path/to/privkey.pem \
  -n nebula-dns
```

### Load Balancer Configuration

#### AWS Network Load Balancer

```yaml
apiVersion: v1
kind: Service
metadata:
  name: dnsdist
  namespace: nebula-dns
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
    service.beta.kubernetes.io/aws-load-balancer-eip-allocations: "eipalloc-xxx,eipalloc-yyy"
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  ports:
    - name: dot
      port: 853
      protocol: TCP
    - name: doh
      port: 443
      protocol: TCP
  selector:
    app: dnsdist
```

#### GCP Load Balancer

```yaml
apiVersion: v1
kind: Service
metadata:
  name: dnsdist
  namespace: nebula-dns
  annotations:
    cloud.google.com/load-balancer-type: "External"
    networking.gke.io/load-balancer-ip-addresses: "nebula-dns-ip"
spec:
  type: LoadBalancer
  ports:
    - name: dot
      port: 853
    - name: doh  
      port: 443
  selector:
    app: dnsdist
```

### Anycast Configuration (Advanced)

For global distribution, configure BGP anycast:

1. **Obtain ASN and IP prefix** from your provider (e.g., ARIN, RIPE)
2. **Configure BGP sessions** with upstream providers
3. **Deploy dnsdist instances** in multiple regions
4. **Advertise same IP prefix** from all locations

```bash
# Example BIRD BGP configuration
protocol bgp upstream1 {
  local as 65001;
  neighbor 203.0.113.1 as 64512;
  import all;
  export filter {
    if net = 198.51.100.0/24 then accept;
    reject;
  };
}
```

---

## Kubernetes Deployment

### Prerequisites

```bash
# Install required operators
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
helm install external-secrets external-secrets/external-secrets -n external-secrets --create-namespace
```

### Deploy Base Resources

```bash
# Create namespace and base resources
kubectl apply -k k8s/base

# Verify deployments
kubectl get pods -n nebula-dns
```

### Deploy Production Overlay

```bash
# Configure secrets first
kubectl apply -f k8s/overlays/production/secrets.yaml

# Deploy production configuration
kubectl apply -k k8s/overlays/production

# Verify
kubectl get pods -n nebula-dns
kubectl get svc -n nebula-dns
kubectl get hpa -n nebula-dns
```

### Verify DNS Resolution

```bash
# Test DoH
curl -H "Accept: application/dns-message" \
  "https://dns.example.com/dns-query?dns=AAABAAABAAAAAAAAB2dvb2dsZQNjb20AAAEAAQ"

# Test DoT
kdig +tls @dns.example.com google.com

# Test with token
curl -H "Authorization: Bearer <location-token>" \
  -H "Accept: application/dns-message" \
  "https://dns.example.com/dns-query?dns=AAABAAABAAAAAAAAB2dvb2dsZQNjb20AAAEAAQ"
```

---

## Security Configuration

### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-policy
  namespace: nebula-dns
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - port: 3000
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - port: 5432
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - port: 6379
```

### Pod Security Standards

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: nebula-dns
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### Secrets Rotation

Schedule regular secret rotation:

```bash
# Generate new JWT secret
NEW_SECRET=$(openssl rand -base64 64)

# Update in vault
aws secretsmanager update-secret \
  --secret-id nebula-dns/production/jwt \
  --secret-string "{\"secret\": \"$NEW_SECRET\"}"

# External Secrets will sync automatically
```

---

## Monitoring Setup

### Install Prometheus Stack

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace \
  --set grafana.enabled=true
```

### Apply ServiceMonitors and Rules

```bash
kubectl apply -f k8s/base/monitoring/
```

### Import Grafana Dashboard

1. Access Grafana at `http://grafana.your-domain.com`
2. Go to Dashboards → Import
3. Upload `k8s/base/monitoring/grafana-dashboard.json`

### Configure Alerting

```bash
# PagerDuty integration
kubectl create secret generic pagerduty-config \
  -n monitoring \
  --from-literal=routing_key=<your-routing-key>
```

---

## Backup and Recovery

### Automated Backups

```bash
# Apply backup CronJobs
kubectl apply -f k8s/base/backups/

# Verify CronJobs
kubectl get cronjobs -n nebula-dns
```

### Manual Backup

```bash
# PostgreSQL
kubectl exec -n nebula-dns postgres-0 -- \
  pg_dump -U postgres nebula_dns | gzip > backup.sql.gz

# Redis
kubectl exec -n nebula-dns redis-0 -- \
  redis-cli BGSAVE
```

### Disaster Recovery

1. **Database Restoration**
   ```bash
   kubectl cp backup.sql.gz nebula-dns/postgres-0:/tmp/
   kubectl exec -n nebula-dns postgres-0 -- \
     bash -c "gunzip -c /tmp/backup.sql.gz | psql -U postgres nebula_dns"
   ```

2. **Redis Restoration**
   ```bash
   kubectl cp dump.rdb nebula-dns/redis-0:/data/
   kubectl rollout restart statefulset/redis -n nebula-dns
   ```

---

## Scaling Considerations

### Horizontal Pod Autoscaling

HPAs are configured for all services. Monitor and adjust:

```bash
# Check HPA status
kubectl get hpa -n nebula-dns

# Adjust limits
kubectl patch hpa policy-svc -n nebula-dns \
  --patch '{"spec":{"maxReplicas":100}}'
```

### Database Scaling

#### PostgreSQL Read Replicas

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: nebula-dns-postgres
spec:
  instances: 3
  postgresql:
    parameters:
      max_connections: "200"
```

#### Redis Cluster

```bash
# Scale Redis cluster
redis-cli --cluster add-node new-node:6379 existing-node:6379
redis-cli --cluster rebalance existing-node:6379
```

### Query Log Partitioning

ClickHouse partitions by month. For high volume:

```sql
-- Add more frequent partitioning
ALTER TABLE nebula_dns.query_logs
MODIFY SETTING index_granularity = 4096;
```

---

## Troubleshooting

### DNS Resolution Issues

```bash
# Check dnsdist health
kubectl exec -n nebula-dns dnsdist-0 -- \
  dnsdist -c "showServers()"

# Check policy service
kubectl logs -n nebula-dns -l app=policy-svc --tail=100

# Test policy evaluation
curl -X POST http://policy-svc:8080/evaluate \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"xxx","location_id":"yyy","qname":"google.com","qtype":1}'
```

### API Issues

```bash
# Check API logs
kubectl logs -n nebula-dns -l app=api --tail=100

# Check database connection
kubectl exec -n nebula-dns api-xxx -- \
  node -e "require('pg').Pool({connectionString: process.env.DATABASE_URL}).query('SELECT 1')"
```

### Performance Issues

```bash
# Check resource usage
kubectl top pods -n nebula-dns

# Check Redis latency
kubectl exec -n nebula-dns redis-0 -- \
  redis-cli --latency

# Check PostgreSQL slow queries
kubectl exec -n nebula-dns postgres-0 -- \
  psql -U postgres -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| High DNS latency | Policy cache miss | Increase Redis memory, check cache TTL |
| 5xx errors on API | Database connection | Check connection pool, add replicas |
| Certificate errors | Expired certs | Check cert-manager, renew certificates |
| Pod crash loops | OOM | Increase memory limits |
| Slow queries | Missing indexes | Run EXPLAIN ANALYZE, add indexes |

---

## Support

For production support:
- Documentation: `docs/`
- Issues: GitHub Issues
- Email: support@example.com
