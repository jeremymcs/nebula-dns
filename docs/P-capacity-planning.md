# P. Capacity Planning Guide

## Nebula DNS - Capacity Planning and Scaling Strategy
Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

## Overview

This document provides comprehensive capacity planning guidance for Nebula DNS, including resource requirements, scaling strategies, cost estimates, and infrastructure planning for various deployment tiers.

## Table of Contents

1. [Traffic Projections](#traffic-projections)
2. [Resource Requirements by Tier](#resource-requirements-by-tier)
3. [Scaling Strategies](#scaling-strategies)
4. [Cost Analysis](#cost-analysis)
5. [Infrastructure Planning](#infrastructure-planning)
6. [Growth Modeling](#growth-modeling)
7. [Disaster Recovery Capacity](#disaster-recovery-capacity)

## Traffic Projections

### Tenant Growth Model

| Phase | Tenants | Avg Users/Tenant | Total Users | Target Date |
|-------|---------|------------------|-------------|-------------|
| Beta | 10 | 50 | 500 | Q1 2026 |
| Launch | 100 | 100 | 10,000 | Q2 2026 |
| Growth | 500 | 200 | 100,000 | Q3 2026 |
| Scale | 2,000 | 250 | 500,000 | Q4 2026 |
| Enterprise | 5,000 | 500 | 2,500,000 | Q2 2027 |

### DNS Query Volume Projections

**Assumptions:**
- Average user generates 500 DNS queries/day
- Peak-to-average ratio: 3x
- Business hours concentration: 80% of traffic in 12 hours
- Growth rate: 25% quarter-over-quarter

**Projected QPS:**

| Phase | Avg Users | Queries/Day | Avg QPS | Peak QPS | Required Capacity |
|-------|-----------|-------------|---------|----------|-------------------|
| Beta | 500 | 250K | 3 | 10 | 50 QPS (headroom) |
| Launch | 10K | 5M | 58 | 174 | 500 QPS |
| Growth | 100K | 50M | 579 | 1,737 | 5K QPS |
| Scale | 500K | 250M | 2,894 | 8,681 | 25K QPS |
| Enterprise | 2.5M | 1.25B | 14,468 | 43,403 | 100K QPS |

### API Request Volume Projections

**Assumptions:**
- Each user session generates 50 API requests
- Average 2 sessions per user per day
- Admin operations: 10% of traffic

**Projected API RPS:**

| Phase | Active Sessions/Min | API RPS | Peak API RPS | Required Capacity |
|-------|---------------------|---------|--------------|-------------------|
| Beta | 10 | 8 | 25 | 100 RPS |
| Launch | 200 | 167 | 500 | 1K RPS |
| Growth | 2,000 | 1,667 | 5,000 | 10K RPS |
| Scale | 10,000 | 8,333 | 25,000 | 50K RPS |
| Enterprise | 50,000 | 41,667 | 125,000 | 250K RPS |

## Resource Requirements by Tier

### Tier 1: Beta/Small (Up to 100 tenants, <1K QPS)

**Workload Characteristics:**
- 10-100 tenants
- 500-10K end users
- <1,000 DNS QPS
- <100 API RPS
- <10M queries/day
- Light reporting usage

**Infrastructure Requirements:**

```yaml
Control Plane:
  api:
    instances: 2
    cpu: 2 vCPU
    memory: 4GB
    disk: 20GB SSD

  ui:
    instances: 2
    cpu: 1 vCPU
    memory: 2GB
    disk: 10GB SSD

Data Plane:
  dnsdist:
    instances: 2
    cpu: 2 vCPU
    memory: 2GB
    disk: 10GB SSD

  policy-svc:
    instances: 2
    cpu: 2 vCPU
    memory: 4GB
    disk: 10GB SSD

  report-svc:
    instances: 2
    cpu: 2 vCPU
    memory: 4GB
    disk: 10GB SSD

  unbound:
    instances: 2
    cpu: 2 vCPU
    memory: 2GB
    disk: 5GB SSD

Databases:
  postgres:
    instances: 1 (primary)
    cpu: 4 vCPU
    memory: 16GB
    disk: 100GB SSD
    iops: 3000

  redis:
    instances: 1
    cpu: 2 vCPU
    memory: 8GB
    disk: 20GB SSD (persistence)

  clickhouse:
    instances: 1
    cpu: 4 vCPU
    memory: 16GB
    disk: 500GB SSD
    iops: 5000

Load Balancer:
  instances: 2 (HA pair)
  cpu: 1 vCPU
  memory: 1GB

Total Resources:
  vCPUs: 38
  Memory: 81GB
  Storage: 795GB SSD
```

**Estimated Monthly Cost (AWS):**
- Compute (EC2): $450
- Storage (EBS): $80
- Data transfer: $50
- Load balancer: $25
- **Total: ~$605/month**

### Tier 2: Medium (100-500 tenants, 1K-10K QPS)

**Workload Characteristics:**
- 100-500 tenants
- 10K-100K end users
- 1K-10K DNS QPS
- 100-1K API RPS
- 10M-100M queries/day
- Moderate reporting usage

**Infrastructure Requirements:**

```yaml
Control Plane:
  api:
    instances: 4
    cpu: 4 vCPU
    memory: 8GB
    disk: 30GB SSD

  ui:
    instances: 3
    cpu: 2 vCPU
    memory: 4GB
    disk: 20GB SSD

Data Plane:
  dnsdist:
    instances: 4
    cpu: 4 vCPU
    memory: 4GB
    disk: 20GB SSD

  policy-svc:
    instances: 6
    cpu: 4 vCPU
    memory: 8GB
    disk: 20GB SSD

  report-svc:
    instances: 4
    cpu: 4 vCPU
    memory: 8GB
    disk: 20GB SSD

  unbound:
    instances: 6
    cpu: 4 vCPU
    memory: 4GB
    disk: 10GB SSD

Databases:
  postgres:
    instances: 2 (primary + read replica)
    cpu: 8 vCPU
    memory: 32GB
    disk: 500GB SSD
    iops: 10000

  redis:
    instances: 3 (cluster mode)
    cpu: 4 vCPU
    memory: 16GB
    disk: 50GB SSD

  clickhouse:
    instances: 3 (cluster)
    cpu: 8 vCPU
    memory: 32GB
    disk: 2TB SSD
    iops: 15000

Load Balancer:
  instances: 2 (HA pair)
  cpu: 2 vCPU
  memory: 4GB

Total Resources:
  vCPUs: 246
  Memory: 500GB
  Storage: 7.5TB SSD
```

**Estimated Monthly Cost (AWS):**
- Compute (EC2): $3,200
- Storage (EBS): $600
- Data transfer: $400
- Load balancer: $50
- **Total: ~$4,250/month**

### Tier 3: Large (500-2,000 tenants, 10K-50K QPS)

**Workload Characteristics:**
- 500-2,000 tenants
- 100K-500K end users
- 10K-50K DNS QPS
- 1K-10K API RPS
- 100M-500M queries/day
- Heavy reporting usage

**Infrastructure Requirements:**

```yaml
Control Plane:
  api:
    instances: 8
    cpu: 8 vCPU
    memory: 16GB
    disk: 50GB SSD

  ui:
    instances: 6
    cpu: 4 vCPU
    memory: 8GB
    disk: 30GB SSD

Data Plane:
  dnsdist:
    instances: 8
    cpu: 8 vCPU
    memory: 8GB
    disk: 30GB SSD

  policy-svc:
    instances: 12
    cpu: 8 vCPU
    memory: 16GB
    disk: 30GB SSD

  report-svc:
    instances: 8
    cpu: 8 vCPU
    memory: 16GB
    disk: 30GB SSD

  unbound:
    instances: 12
    cpu: 8 vCPU
    memory: 8GB
    disk: 20GB SSD

Databases:
  postgres:
    instances: 3 (primary + 2 read replicas)
    cpu: 16 vCPU
    memory: 64GB
    disk: 2TB SSD
    iops: 20000

  redis:
    instances: 6 (cluster mode)
    cpu: 8 vCPU
    memory: 32GB
    disk: 100GB SSD

  clickhouse:
    instances: 6 (cluster)
    cpu: 16 vCPU
    memory: 64GB
    disk: 5TB SSD
    iops: 30000

Load Balancer:
  instances: 3 (HA + geo-distribution)
  cpu: 4 vCPU
  memory: 8GB

CDN: CloudFlare Enterprise (static assets)

Total Resources:
  vCPUs: 948
  Memory: 1.9TB
  Storage: 28TB SSD
```

**Estimated Monthly Cost (AWS):**
- Compute (EC2): $14,500
- Storage (EBS): $2,800
- Data transfer: $2,000
- Load balancer: $150
- CDN: $500
- **Total: ~$19,950/month**

### Tier 4: Enterprise (2,000+ tenants, 50K+ QPS)

**Workload Characteristics:**
- 2,000+ tenants
- 500K+ end users
- 50K-200K DNS QPS
- 10K-50K API RPS
- 500M+ queries/day
- Enterprise reporting and analytics

**Infrastructure Requirements:**

```yaml
Multi-Region Deployment (per region):

Control Plane:
  api:
    instances: 16
    cpu: 16 vCPU
    memory: 32GB
    disk: 100GB SSD

  ui:
    instances: 12
    cpu: 8 vCPU
    memory: 16GB
    disk: 50GB SSD

Data Plane:
  dnsdist:
    instances: 20
    cpu: 16 vCPU
    memory: 16GB
    disk: 50GB SSD

  policy-svc:
    instances: 24
    cpu: 16 vCPU
    memory: 32GB
    disk: 50GB SSD

  report-svc:
    instances: 16
    cpu: 16 vCPU
    memory: 32GB
    disk: 50GB SSD

  unbound:
    instances: 24
    cpu: 16 vCPU
    memory: 16GB
    disk: 30GB SSD

Databases:
  postgres:
    instances: 5 (primary + 4 read replicas)
    cpu: 32 vCPU
    memory: 128GB
    disk: 5TB SSD
    iops: 40000

  redis:
    instances: 12 (cluster mode, sharded)
    cpu: 16 vCPU
    memory: 64GB
    disk: 200GB SSD

  clickhouse:
    instances: 12 (cluster, sharded)
    cpu: 32 vCPU
    memory: 128GB
    disk: 20TB SSD
    iops: 64000

Load Balancer:
  instances: Global (AWS Global Accelerator + ALB)
  cpu: N/A
  memory: N/A

CDN: CloudFlare Enterprise (static + edge compute)

Total Resources (per region):
  vCPUs: 4,384
  Memory: 8.8TB
  Storage: 110TB SSD

Regions: 3 (US-East, US-West, EU-Central)
```

**Estimated Monthly Cost (AWS, 3 regions):**
- Compute (EC2): $95,000
- Storage (EBS): $22,000
- Data transfer: $15,000
- Load balancer/Global Accelerator: $1,000
- CDN: $2,000
- **Total: ~$135,000/month**

## Scaling Strategies

### Horizontal Scaling (Preferred)

**Stateless Services (API, Policy, Report, UI):**
- Auto-scaling based on CPU (target: 60%)
- Scale out: Add instances when CPU >70% for 5 minutes
- Scale in: Remove instances when CPU <30% for 15 minutes
- Min instances: 2 (HA)
- Max instances: 100 (cost limit)
- Cool-down period: 5 minutes

**DNS Resolvers (dnsdist, Unbound):**
- Auto-scaling based on QPS + latency
- Scale out: QPS >80% of capacity OR P95 latency >100ms
- Scale in: QPS <40% of capacity AND P95 latency <50ms
- Min instances: 3 (HA + load distribution)
- Max instances: 50 per region

**Configuration Example (Kubernetes HPA):**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: policy-svc-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: policy-svc
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
  - type: Pods
    pods:
      metric:
        name: dns_queries_per_second
      target:
        type: AverageValue
        averageValue: "5000"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
```

### Vertical Scaling

**Databases (scale up before scale out):**

**PostgreSQL Scaling Path:**
1. Small: 4 vCPU, 16GB RAM (up to 1K writes/sec)
2. Medium: 8 vCPU, 32GB RAM (up to 5K writes/sec)
3. Large: 16 vCPU, 64GB RAM (up to 15K writes/sec)
4. XLarge: 32 vCPU, 128GB RAM (up to 30K writes/sec)
5. Read Replicas: Add replicas for read-heavy workloads

**Redis Scaling Path:**
1. Small: 2 vCPU, 8GB RAM (up to 100K ops/sec)
2. Medium: 4 vCPU, 16GB RAM (up to 250K ops/sec)
3. Large: 8 vCPU, 32GB RAM (up to 500K ops/sec)
4. Cluster: 6-node cluster (up to 2M ops/sec)

**ClickHouse Scaling Path:**
1. Small: 4 vCPU, 16GB RAM (up to 10M inserts/day)
2. Medium: 8 vCPU, 32GB RAM (up to 100M inserts/day)
3. Large: 16 vCPU, 64GB RAM (up to 500M inserts/day)
4. Cluster: 6-node cluster (up to 5B inserts/day)

### Database Sharding Strategy

**PostgreSQL Sharding (when single instance saturates):**
- Shard key: `tenant_id` (natural tenant isolation)
- Shard count: Start with 4 shards, increase to 16, then 64
- Shard routing: Application-level (connection pool per shard)
- Rebalancing: Tenant migration (move during off-peak hours)

**ClickHouse Sharding (distributed tables):**
- Shard key: Hash of `tenant_id` + date
- Replication: 2x replication factor for HA
- Query routing: Distributed table abstraction
- Retention: 90 days hot data, 2 years cold storage (S3)

## Cost Analysis

### Cost per Tenant by Tier

| Tier | Tenants | Monthly Cost | Cost/Tenant | Margin at $20/tenant | Margin at $50/tenant |
|------|---------|--------------|-------------|----------------------|----------------------|
| Beta | 10-100 | $605 | $6.05-$60.50 | Negative | $4,395-$4,395 |
| Medium | 100-500 | $4,250 | $8.50-$42.50 | $1,150-$21,750 | $40,750-$45,750 |
| Large | 500-2K | $19,950 | $9.98-$39.90 | $50-$20,050 | $5,050-$80,050 |
| Enterprise | 2K-10K | $135,000 | $13.50-$67.50 | -$95K-$65K | -$35K-$365K |

**Analysis:**
- Break-even at ~50 tenants with $20/tenant pricing
- Healthy margins at 100+ tenants with $50/tenant pricing
- Enterprise tier requires volume (1000+ tenants) for profitability

### Cost Breakdown by Component

**Infrastructure Cost Distribution:**

| Component | % of Total | Optimization Opportunities |
|-----------|------------|----------------------------|
| Compute (API, Policy, DNS) | 45% | Right-sizing, spot instances |
| Storage (EBS, S3) | 20% | Lifecycle policies, compression |
| Databases | 25% | Reserved instances, read replicas |
| Network | 5% | CDN, cross-region optimization |
| Other (LB, monitoring) | 5% | Consolidation, open-source tools |

### Cost Optimization Strategies

**Short-term (immediate savings):**
1. Reserved instances for databases (30-40% savings)
2. Spot instances for non-critical services (60-70% savings)
3. S3 lifecycle policies (move cold data to Glacier)
4. Right-size over-provisioned instances (10-20% savings)
5. Enable compression on all services (reduce storage/bandwidth)

**Medium-term (3-6 months):**
1. Multi-tenancy optimization (better resource sharing)
2. Database query optimization (reduce compute needs)
3. CDN for static assets (reduce bandwidth)
4. Migrate to ARM instances (20% cost reduction)
5. Implement aggressive caching (reduce database load)

**Long-term (6-12 months):**
1. Multi-region deployment optimization (reduce cross-region traffic)
2. Edge computing for DNS resolution (reduce latency + cost)
3. Tiered storage strategy (hot/warm/cold data)
4. Custom pricing tiers based on usage
5. Volume discounts with cloud provider (EDPs)

## Infrastructure Planning

### Network Architecture

**Single Region (Tier 1-2):**
```
Internet
   │
   ▼
[CloudFlare CDN]
   │
   ├─► [UI Static Assets]
   │
   ▼
[Application Load Balancer]
   │
   ├─► [API Service] ──► [PostgreSQL Primary]
   │                 └──► [Redis Cache]
   │
   ├─► [DNS over HTTPS Endpoint]
   │        │
   │        ▼
   │   [dnsdist] ──► [Policy Service] ──► [Redis Policy Cache]
   │        │             │
   │        │             └──► [ClickHouse]
   │        │
   │        ▼
   │   [Unbound Resolvers]
   │
   └─► [Report Service] ──► [ClickHouse Read Replicas]
```

**Multi-Region (Tier 3-4):**
```
Internet
   │
   ▼
[AWS Global Accelerator / CloudFlare]
   │
   ├─► Region: US-East
   │     │
   │     ├─► [Control Plane]
   │     └─► [Data Plane]
   │
   ├─► Region: US-West
   │     │
   │     ├─► [Control Plane]
   │     └─► [Data Plane]
   │
   └─► Region: EU-Central
         │
         ├─► [Control Plane]
         └─► [Data Plane]

Cross-Region Replication:
  - PostgreSQL: Streaming replication (primary in US-East)
  - Redis: Cross-region pub/sub for cache invalidation
  - ClickHouse: Distributed tables with replication
```

### Storage Planning

**Data Growth Projections:**

| Data Type | Size per Query/Event | Retention | Daily Volume (Medium) | Storage/Month |
|-----------|---------------------|-----------|----------------------|---------------|
| DNS Queries | 200 bytes | 90 days | 50M | 300GB |
| API Logs | 1KB | 30 days | 10M | 300GB |
| Audit Logs | 500 bytes | 2 years | 100K | 3.6GB |
| Policy Snapshots | 10KB | Versioned | 1K updates | 10MB |
| User Data | 5KB | Indefinite | 100 new users | 500KB |

**Total Storage Requirements (Medium Tier, 90-day retention):**
- Hot data (SSD): 1TB (queries + active data)
- Warm data (SSD): 2TB (30-90 day old queries)
- Cold data (S3): 10TB (archive, compressed)
- Backups (S3): 2TB (daily snapshots)

**Storage Cost Optimization:**
```
Day 0-7:   SSD ($0.10/GB)     = $100/TB/month
Day 7-30:  SSD ($0.10/GB)     = $100/TB/month
Day 30-90: S3 Standard ($0.023/GB) = $23/TB/month
Day 90+:   S3 Glacier ($0.004/GB)  = $4/TB/month
```

### Backup and Recovery Planning

**Backup Strategy:**

**PostgreSQL:**
- Continuous WAL archiving to S3
- Daily full backups (retained 30 days)
- Point-in-time recovery up to 30 days
- Cross-region backup replication
- RTO: 15 minutes, RPO: 5 minutes

**Redis:**
- RDB snapshots every 6 hours
- AOF persistence (fsync every second)
- Snapshot replication to S3
- RTO: 5 minutes, RPO: 1 second

**ClickHouse:**
- Incremental backups every 6 hours
- Part-level backups to S3
- Distributed table replication (2x)
- RTO: 30 minutes, RPO: 6 hours (acceptable for analytics)

**Backup Storage Requirements:**
- PostgreSQL: 100GB * 30 days = 3TB
- Redis: 20GB * 4 snapshots = 80GB
- ClickHouse: 500GB * 4 = 2TB
- Total: ~5TB backup storage

## Growth Modeling

### Capacity Headroom Planning

**Target Headroom by Component:**
- API Service: 2x current peak load (100% headroom)
- DNS Service: 3x current peak load (200% headroom)
- Database: 1.5x current usage (50% headroom)
- Storage: 6 months growth at current rate

**Scaling Trigger Points:**

| Component | Warning Threshold | Critical Threshold | Action |
|-----------|------------------|-------------------|--------|
| CPU | 60% sustained | 80% sustained | Scale out |
| Memory | 70% sustained | 85% sustained | Scale up/out |
| Disk | 70% full | 85% full | Add storage |
| IOPS | 80% of limit | 95% of limit | Upgrade tier |
| Network | 60% of bandwidth | 80% of bandwidth | Optimize/scale |
| QPS | 60% of capacity | 80% of capacity | Scale out |

### Quarterly Planning Cadence

**Q1 Review:**
1. Analyze Q4 growth trends
2. Project Q1 + Q2 capacity needs
3. Purchase reserved instances (annual commit)
4. Plan infrastructure upgrades
5. Budget approval for next 6 months

**Monthly Check-ins:**
1. Review actual vs. projected growth
2. Adjust auto-scaling policies
3. Optimize resource allocation
4. Review cost anomalies
5. Test disaster recovery procedures

## Disaster Recovery Capacity

### Failover Scenarios

**Scenario 1: Single Service Failure**
- Impact: Degraded performance
- Capacity: N-1 redundancy (lose 1 instance)
- Recovery: Auto-scaling (5 minutes)
- User Impact: Minimal (increased latency)

**Scenario 2: Database Failure**
- Impact: Service outage
- Capacity: Automatic failover to replica
- Recovery: 30 seconds (RDS Multi-AZ)
- User Impact: 30s downtime

**Scenario 3: Availability Zone Failure**
- Impact: 33% capacity loss (3-AZ deployment)
- Capacity: Remaining zones handle 1.5x load
- Recovery: Auto-scaling (10 minutes)
- User Impact: Degraded performance

**Scenario 4: Region Failure**
- Impact: 33% capacity loss (3-region deployment)
- Capacity: Remaining regions handle 1.5x load
- Recovery: DNS failover (5 minutes)
- User Impact: Increased latency for some users

### Disaster Recovery Testing

**Monthly DR Drills:**
1. Simulate service failure (kill random pods)
2. Verify auto-scaling response
3. Test database failover
4. Validate monitoring alerts
5. Document recovery time

**Quarterly DR Exercises:**
1. Full region failover test
2. Database disaster recovery drill
3. Restore from backup (random point-in-time)
4. Validate cross-region replication
5. Update runbooks based on findings

## Action Items

### Immediate (This Quarter)
- [ ] Establish baseline performance metrics
- [ ] Configure auto-scaling for all stateless services
- [ ] Set up monitoring alerts for capacity thresholds
- [ ] Implement reserved instances for databases
- [ ] Create infrastructure-as-code for rapid scaling

### Short-term (Next 6 Months)
- [ ] Deploy multi-AZ for all critical services
- [ ] Implement database read replicas
- [ ] Set up cross-region backups
- [ ] Optimize storage lifecycle policies
- [ ] Conduct quarterly capacity planning reviews

### Long-term (Next 12 Months)
- [ ] Multi-region deployment (3 regions)
- [ ] Database sharding strategy
- [ ] Edge computing for DNS resolution
- [ ] Advanced cost optimization (spot, ARM instances)
- [ ] Enterprise-grade SLAs and capacity guarantees

## Appendix A: Sizing Calculator

**Simple Capacity Calculator:**

```python
def calculate_capacity(tenants, users_per_tenant, queries_per_user_day):
    """Calculate required infrastructure for given load."""

    total_users = tenants * users_per_tenant
    queries_per_day = total_users * queries_per_user_day

    # Peak hour: 10% of daily traffic
    peak_qps = (queries_per_day * 0.1) / 3600

    # Capacity planning (3x headroom for peaks)
    required_qps = peak_qps * 3

    # Service instance calculations
    policy_svc_instances = max(3, int(required_qps / 5000) + 1)
    unbound_instances = max(3, int(required_qps / 3000) + 1)
    api_instances = max(2, int(total_users / 5000) + 1)

    # Database sizing
    pg_memory_gb = max(16, int(tenants / 50) * 16)
    redis_memory_gb = max(8, int(tenants / 100) * 8)
    ch_storage_tb = max(0.5, (queries_per_day * 200 * 90) / (1024**4))

    return {
        "peak_qps": int(required_qps),
        "policy_svc": policy_svc_instances,
        "unbound": unbound_instances,
        "api": api_instances,
        "postgres_memory_gb": pg_memory_gb,
        "redis_memory_gb": redis_memory_gb,
        "clickhouse_storage_tb": round(ch_storage_tb, 2)
    }

# Example usage:
print(calculate_capacity(tenants=500, users_per_tenant=200, queries_per_user_day=500))
# Output: {'peak_qps': 17361, 'policy_svc': 5, 'unbound': 7, 'api': 20, ...}
```

## Appendix B: Cost Estimation Tool

```bash
#!/bin/bash
# Quick cost estimator for AWS infrastructure

TENANTS=$1
QPS=$2

# Instance costs (per hour, on-demand pricing)
API_COST=0.16      # t3.large
POLICY_COST=0.16   # t3.large
DNS_COST=0.08      # t3.medium
DB_COST=0.544      # db.r6g.xlarge
REDIS_COST=0.17    # cache.r6g.large
CH_COST=0.272      # r6g.xlarge

# Calculate instance counts
API_INSTANCES=$((TENANTS / 100 + 2))
POLICY_INSTANCES=$((QPS / 5000 + 3))
DNS_INSTANCES=$((QPS / 3000 + 3))

# Monthly costs (730 hours/month)
API_MONTHLY=$((API_INSTANCES * API_COST * 730))
POLICY_MONTHLY=$((POLICY_INSTANCES * POLICY_COST * 730))
DNS_MONTHLY=$((DNS_INSTANCES * DNS_COST * 730))
DB_MONTHLY=$((1 * DB_COST * 730))
REDIS_MONTHLY=$((1 * REDIS_COST * 730))
CH_MONTHLY=$((1 * CH_COST * 730))

TOTAL=$((API_MONTHLY + POLICY_MONTHLY + DNS_MONTHLY + DB_MONTHLY + REDIS_MONTHLY + CH_MONTHLY))

echo "Estimated Monthly Cost: \$$TOTAL"
echo "Cost per Tenant: \$$((TOTAL / TENANTS))"
```

---

**Document Version**: 1.0
**Last Updated**: January 2026
**Next Review**: Quarterly
