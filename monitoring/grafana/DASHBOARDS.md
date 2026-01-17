# Nebula DNS - Dashboard Summary

Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

## Dashboard Files Created

All dashboards are located in `/monitoring/grafana/dashboards/`

| Dashboard | File | Panels | Refresh | Purpose |
|-----------|------|--------|---------|---------|
| API Performance | `api-performance.json` | 9 | 10s | Monitor NestJS API control plane |
| Policy Service | `policy-service.json` | 9 | 10s | Monitor DNS policy evaluation engine |
| DNS Overview | `dns-overview.json` | 10 | 10s | Monitor DNS queries and blocking |
| Database Health | `database-health.json` | 20 | 10s | Monitor PostgreSQL, Redis, ClickHouse |
| Business Metrics | `business-metrics.json` | 11 | 1m | Track tenant usage and KPIs |

## Dashboard Details

### 1. API Performance (`api-performance.json`)
**UID:** `nebula-api-performance`

**Panels:**
1. Request Rate (RPS) - Stat
2. Error Rate - Stat
3. P95 Response Time - Stat
4. Active Connections - Stat
5. Request Rate by Endpoint - Time Series
6. Response Time Percentiles (P50/P95/P99) - Time Series
7. Status Codes - Stacked Time Series
8. Request Duration Histogram - Heatmap
9. Top 10 Slowest Endpoints (P95) - Table

**Key Metrics:**
- `http_requests_total` - Total request count
- `http_request_duration_seconds` - Request latency
- `http_active_connections` - Active connection count

**Tags:** nebula-dns, api, performance

---

### 2. Policy Service (`policy-service.json`)
**UID:** `nebula-policy-service`

**Panels:**
1. Evaluation Rate (eval/s) - Stat
2. P95 Evaluation Latency - Stat
3. Cache Hit Rate - Stat
4. ClickHouse Queue Size - Stat
5. Evaluation Latency Percentiles - Time Series
6. Policy Decisions Breakdown - Pie Chart
7. Threat Detections by Category - Stacked Time Series
8. Cache Hit/Miss Rate - Time Series
9. Policy Decisions Over Time - Time Series

**Key Metrics:**
- `policy_evaluations_total` - Evaluation count
- `policy_evaluation_duration_seconds` - Evaluation latency
- `policy_cache_hits_total` / `policy_cache_misses_total` - Cache performance
- `policy_decisions_total` - Decision counts by type
- `policy_threats_detected_total` - Threat detections
- `clickhouse_queue_size` - Queue depth

**Tags:** nebula-dns, policy-service, enforcement

---

### 3. DNS Overview (`dns-overview.json`)
**UID:** `nebula-dns-overview`

**Panels:**
1. Query Rate (QPS) - Stat
2. Block Rate % - Stat
3. P95 Query Latency - Stat
4. Total Queries (24h) - Stat
5. Query Rate (Allowed vs Blocked) - Stacked Time Series
6. Response Codes Breakdown - Pie Chart
7. P95 Latency by Query Type - Time Series
8. Query Rate by Type - Stacked Time Series
9. Top 20 Blocked Domains (1h) - Table
10. Geographic Distribution (Top 15 Countries) - Table

**Key Metrics:**
- `dns_queries_total` - Total DNS queries
- `dns_queries_blocked_total` - Blocked queries
- `dns_query_duration_seconds` - Query latency
- `dns_responses_total` - Response codes

**Tags:** nebula-dns, dns, dnsdist

---

### 4. Database Health (`database-health.json`)
**UID:** `nebula-database-health`

**Sections:**

#### PostgreSQL (7 panels)
1. Active Connections - Stat
2. Idle Connections - Stat
3. Waiting Connections - Stat
4. Avg Query Time - Stat
5. Transactions/sec - Stat
6. Replication Lag - Gauge
7. Connection Pool Status - Time Series
8. Transaction Rate - Time Series

**Metrics:**
- `pg_stat_activity_count` - Connection counts by state
- `pg_stat_database_blks_read` - Query performance
- `pg_stat_database_xact_commit` / `xact_rollback` - Transaction stats
- `pg_replication_lag` - Replication delay

#### Redis (6 panels)
9. Memory Usage % - Gauge
10. Memory Used - Stat
11. Operations/sec - Stat
12. Connected Clients - Stat
13. Redis Memory Usage - Time Series
14. Redis Operations - Time Series

**Metrics:**
- `redis_memory_used_bytes` / `redis_memory_max_bytes` - Memory usage
- `redis_commands_processed_total` - Command rate
- `redis_connected_clients` - Connection count
- `redis_keyspace_hits_total` / `misses_total` - Cache performance

#### ClickHouse (6 panels)
15. Queries/sec - Stat
16. P95 Query Duration - Stat
17. Running Queries - Stat
18. Insert Rate - Stat
19. ClickHouse Query Performance - Time Series
20. ClickHouse Throughput - Time Series

**Metrics:**
- `clickhouse_query_total` - Query count
- `clickhouse_query_duration_seconds` - Query latency
- `clickhouse_running_queries` - Active queries
- `clickhouse_insert_bytes_total` / `select_bytes_total` - Throughput

**Tags:** nebula-dns, database, postgresql, redis, clickhouse

---

### 5. Business Metrics (`business-metrics.json`)
**UID:** `nebula-business-metrics`

**Panels:**
1. Active Tenants - Stat
2. Total Queries (24h) - Stat
3. API Requests (24h) - Stat
4. Threats Blocked (24h) - Stat
5. Active Tenants Over Time - Time Series
6. Subscription Distribution - Pie Chart
7. Top 20 Tenants by Query Volume (24h) - Table
8. Top 20 Tenants by API Usage (24h) - Table
9. DNS Query Rate by Tenant - Stacked Time Series
10. Error Rate by Tenant - Table (color-coded)
11. Threats Blocked by Tenant (24h) - Bar Gauge

**Key Metrics:**
- `tenant_active` - Active tenant count
- `tenant_subscription` - Subscription types
- All metrics filtered by `tenant_id` label

**Tags:** nebula-dns, business, tenants, metrics

---

## Provisioning Configuration

### Dashboard Provisioning
**File:** `provisioning/dashboards/default.yaml`
```yaml
providers:
  - name: 'Nebula DNS'
    folder: 'Nebula DNS'
    type: file
    path: /var/lib/grafana/dashboards
```

### Datasource Provisioning
**File:** `provisioning/datasources/default.yaml`

**Datasources Configured:**
1. **Prometheus** (default)
   - URL: http://prometheus:9090
   - Type: prometheus
   - Timeout: 60s
   - Method: POST

2. **ClickHouse**
   - URL: http://clickhouse:8123
   - Type: vertamedia-clickhouse-datasource
   - Database: nebula_dns
   - Credentials: nebula/nebula

3. **Loki**
   - URL: http://loki:3100
   - Type: loki
   - Max Lines: 1000

---

## Docker Compose Integration

**File:** `docker-compose.monitoring.yml`

**Services Added:**
- prometheus (port 4090)
- grafana (port 4300)
- loki (port 4100)
- promtail
- redis-exporter (port 9121)
- postgres-exporter (port 9187)
- node-exporter (port 9100)
- alertmanager (port 9093)

**Volumes:**
- `grafana-data` - Persistent dashboard storage
- `prometheus-data` - Metrics storage (30d retention)
- `loki-data` - Log storage
- `alertmanager-data` - Alert state

---

## Alert Recommendations

### Critical Alerts (PagerDuty)

1. **API Error Rate > 5%**
   ```promql
   rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
   ```

2. **Policy Service P95 Latency > 10ms**
   ```promql
   histogram_quantile(0.95, rate(policy_evaluation_duration_seconds_bucket[5m])) > 0.01
   ```

3. **DNS Query Rate Drop > 50%**
   ```promql
   rate(dns_queries_total[5m]) < 0.5 * avg_over_time(rate(dns_queries_total[5m])[1h:5m])
   ```

4. **Database Connections > 80%**
   ```promql
   pg_stat_activity_count{state="active"} / pg_settings_max_connections > 0.8
   ```

5. **Redis Memory > 90%**
   ```promql
   redis_memory_used_bytes / redis_memory_max_bytes > 0.9
   ```

### Warning Alerts (Slack)

1. **Cache Hit Rate < 90%**
   ```promql
   rate(policy_cache_hits_total[5m]) / (rate(policy_cache_hits_total[5m]) + rate(policy_cache_misses_total[5m])) < 0.9
   ```

2. **API P95 Latency > 500ms**
   ```promql
   histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
   ```

3. **DNS Block Rate Spike > 50%**
   ```promql
   rate(dns_queries_blocked_total[5m]) / rate(dns_queries_total[5m]) > 0.5
   ```

---

## Performance Notes

### Query Optimization

All dashboards use optimized queries:
- 5m rate windows for high-frequency metrics
- Histogram quantiles for latency percentiles
- `topk()` for limiting result sets
- Stacked time series for multi-dimensional data

### Resource Usage

Expected Grafana resource usage:
- **Memory:** ~200MB (idle), ~500MB (active)
- **CPU:** ~0.1 cores (idle), ~0.5 cores (active)
- **Storage:** ~100MB for dashboards + datasource config

Expected Prometheus resource usage:
- **Memory:** ~2GB (30d retention, 10K series)
- **CPU:** ~1 core
- **Storage:** ~20GB (30d retention)

### Scaling Considerations

For high-traffic deployments (>10K QPS):
- Increase Prometheus retention: `--storage.tsdb.retention.time=90d`
- Add recording rules for common queries
- Consider Thanos/Cortex for long-term storage
- Use query caching in Grafana

---

## Maintenance

### Regular Tasks

**Daily:**
- Review critical alerts
- Check dashboard load times
- Verify data collection gaps

**Weekly:**
- Review slow queries in API Performance dashboard
- Analyze top blocked domains for false positives
- Check database health trends

**Monthly:**
- Review and optimize slow dashboard queries
- Clean up old alerts
- Update dashboard panels based on new requirements
- Export and backup dashboards

### Backup Procedure

```bash
# Export all dashboards
curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
  http://localhost:4300/api/search?type=dash-db | \
  jq -r '.[].uid' | \
  xargs -I {} curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
  http://localhost:4300/api/dashboards/uid/{} > backup-{}.json

# Backup Grafana volume
docker run --rm \
  -v nebula-dns_grafana-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/grafana-$(date +%Y%m%d).tar.gz /data
```

---

## Version History

- **v1.0** (2026-01-16) - Initial dashboard creation
  - 5 dashboards with 59 total panels
  - Full provisioning automation
  - Docker Compose integration
  - Documentation and quick start guide

---

For detailed usage instructions, see [README.md](./README.md)
For quick start guide, see [QUICKSTART.md](../QUICKSTART.md)
