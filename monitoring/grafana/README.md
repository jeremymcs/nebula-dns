# Nebula DNS - Grafana Dashboards

Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

## Overview

This directory contains production-ready Grafana dashboards for comprehensive monitoring of the Nebula DNS platform. The dashboards provide real-time visibility into API performance, DNS operations, policy enforcement, database health, and business metrics.

## Dashboards

### 1. API Performance Dashboard (`api-performance.json`)

**Purpose:** Monitor the NestJS API control plane performance and health.

**Key Metrics:**
- Request rate (RPS)
- Error rate (5xx responses)
- P50/P95/P99 response time percentiles
- Active connections
- Request duration histogram
- Top 10 slowest endpoints

**Use Cases:**
- Identify performance bottlenecks
- Track API response time degradation
- Monitor error spikes
- Optimize slow endpoints

**Recommended Alerts:**
- Error rate > 1%
- P95 latency > 500ms
- Request rate spike > 2x baseline

---

### 2. Policy Service Dashboard (`policy-service.json`)

**Purpose:** Monitor DNS policy evaluation engine performance.

**Key Metrics:**
- Policy evaluation rate (evaluations/sec)
- P50/P95/P99 evaluation latency
- Cache hit/miss rate
- Policy decisions breakdown (allow/block/rewrite)
- Threat detections by category
- ClickHouse queue size

**Use Cases:**
- Ensure O(1) policy evaluation performance
- Monitor cache effectiveness
- Track threat detection patterns
- Identify policy bottlenecks

**Recommended Alerts:**
- Cache hit rate < 90%
- P95 latency > 10ms
- ClickHouse queue > 10,000

---

### 3. DNS Overview Dashboard (`dns-overview.json`)

**Purpose:** Monitor DNS query processing and threat blocking.

**Key Metrics:**
- Query rate (QPS)
- Block rate percentage
- Response codes breakdown
- P95 latency by query type
- Top 20 blocked domains
- Geographic distribution

**Use Cases:**
- Monitor DNS service health
- Track blocking effectiveness
- Identify attack patterns
- Analyze traffic distribution

**Recommended Alerts:**
- Block rate spike > 50%
- P95 latency > 100ms
- Query rate drop > 50%

---

### 4. Database Health Dashboard (`database-health.json`)

**Purpose:** Monitor PostgreSQL, Redis, and ClickHouse health.

**PostgreSQL Metrics:**
- Active/idle/waiting connections
- Query execution time
- Transaction rate
- Replication lag

**Redis Metrics:**
- Memory usage percentage
- Operations/sec
- Connected clients
- Cache hit/miss rate

**ClickHouse Metrics:**
- Queries/sec
- P95 query duration
- Running queries
- Insert rate

**Use Cases:**
- Prevent database resource exhaustion
- Identify slow queries
- Monitor cache effectiveness
- Track storage growth

**Recommended Alerts:**
- PostgreSQL connections > 80% of max
- Redis memory > 90%
- ClickHouse P95 latency > 5s
- Replication lag > 1s

---

### 5. Business Metrics Dashboard (`business-metrics.json`)

**Purpose:** Track business KPIs and tenant usage patterns.

**Key Metrics:**
- Active tenants
- Total queries by tenant
- Subscription distribution
- API usage by tenant
- Error rate by tenant
- Threats blocked by tenant

**Use Cases:**
- Monitor platform growth
- Identify top customers
- Track revenue metrics
- Detect abuse patterns

**Recommended Alerts:**
- Tenant error rate > 5%
- Large tenant query spike > 3x baseline

---

## Quick Start

### 1. Start Monitoring Stack

```bash
# Start full stack including monitoring
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d

# Or start monitoring only
docker-compose -f docker-compose.monitoring.yml up -d
```

### 2. Access Grafana

Open your browser to: http://localhost:4300

Default credentials:
- Username: `admin`
- Password: `admin` (change on first login)

### 3. View Dashboards

Navigate to **Dashboards** → **Nebula DNS** folder to see all dashboards.

---

## Dashboard Provisioning

Dashboards are automatically provisioned on Grafana startup via:

- **Dashboards:** `/monitoring/grafana/dashboards/*.json`
- **Provisioning Config:** `/monitoring/grafana/provisioning/dashboards/default.yaml`
- **Datasources:** `/monitoring/grafana/provisioning/datasources/default.yaml`

All dashboards support live updates and will reload automatically when modified.

---

## Datasources

### Prometheus (Primary)
- **URL:** http://prometheus:9090
- **Type:** Time-series metrics
- **Scrape Interval:** 5s (policy-svc, dnsdist), 10s (api), 15s (databases)

### ClickHouse
- **URL:** http://clickhouse:8123
- **Database:** nebula_dns
- **Type:** Analytics queries
- **Plugin:** vertamedia-clickhouse-datasource

### Loki
- **URL:** http://loki:3100
- **Type:** Log aggregation
- **Max Lines:** 1000

---

## Metrics Endpoints

Ensure your services expose Prometheus metrics:

| Service | Endpoint | Port |
|---------|----------|------|
| API | http://api:3000/metrics | 4010 |
| Policy Service | http://policy-svc:8080/metrics | 4080 |
| dnsdist | http://dnsdist:8083/metrics | 4083 |
| Redis | redis-exporter:9121 | 9121 |
| PostgreSQL | postgres-exporter:9187 | 9187 |
| Node | node-exporter:9100 | 9100 |

---

## Customization

### Modify Refresh Rate

Default: 10 seconds (API, Policy, DNS), 1 minute (Business)

To change, edit dashboard JSON:
```json
"refresh": "10s"
```

### Add Custom Panels

1. Open dashboard in Grafana UI
2. Click "Add Panel"
3. Configure query and visualization
4. Save dashboard
5. Export JSON and save to `/monitoring/grafana/dashboards/`

### Template Variables

All dashboards support the `DS_PROMETHEUS` template variable for datasource selection.

---

## Alerting

### Configure Alerts in Grafana

1. Navigate to **Alerting** → **Alert Rules**
2. Create new alert rule
3. Select dashboard panel as source
4. Define alert condition
5. Configure notification channel

### Example Alert: High API Error Rate

```yaml
Condition: Error rate > 0.05 (5%)
Evaluation: Every 1m for 5m
Query: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])
Severity: Critical
```

### Notification Channels

Configure in **Alerting** → **Contact Points**:
- Slack
- PagerDuty
- Email
- Webhook

---

## Performance Optimization

### Dashboard Loading Time

If dashboards load slowly:

1. **Reduce time range:** Use 1h instead of 24h
2. **Increase refresh interval:** Use 30s instead of 10s
3. **Limit table rows:** Reduce `topk()` from 20 to 10
4. **Use recording rules:** Pre-aggregate common queries in Prometheus

### Prometheus Query Optimization

Use recording rules in `/monitoring/prometheus/rules/`:

```yaml
groups:
  - name: nebula_dns
    interval: 30s
    rules:
      - record: nebula:api_request_rate:5m
        expr: rate(http_requests_total{job="nebuladns-api"}[5m])
```

---

## Troubleshooting

### Dashboards Not Appearing

1. Check Grafana logs:
   ```bash
   docker logs nebula-grafana
   ```

2. Verify provisioning:
   ```bash
   docker exec nebula-grafana ls /var/lib/grafana/dashboards
   docker exec nebula-grafana ls /etc/grafana/provisioning/dashboards
   ```

3. Check datasource connectivity:
   - Grafana UI → Configuration → Data Sources
   - Click "Test" on each datasource

### No Data in Panels

1. Verify Prometheus is scraping:
   - http://localhost:4090/targets

2. Check metric names:
   - http://localhost:4090/graph
   - Search for expected metrics

3. Verify service metrics endpoints:
   ```bash
   curl http://localhost:4010/metrics  # API
   curl http://localhost:4080/metrics  # Policy Service
   ```

### ClickHouse Plugin Issues

Install manually if auto-install fails:
```bash
docker exec -it nebula-grafana grafana-cli plugins install vertamedia-clickhouse-datasource
docker restart nebula-grafana
```

---

## Production Recommendations

### Security

1. **Change default credentials:**
   ```bash
   export GRAFANA_ADMIN_PASSWORD="secure-password"
   ```

2. **Enable HTTPS:**
   - Configure reverse proxy (nginx, Caddy)
   - Set `GF_SERVER_PROTOCOL=https`

3. **Restrict access:**
   - Use authentication proxy (OAuth, SAML)
   - Enable IP allowlisting

### High Availability

1. **External database:**
   ```yaml
   environment:
     - GF_DATABASE_TYPE=postgres
     - GF_DATABASE_HOST=postgres:5432
     - GF_DATABASE_NAME=grafana
   ```

2. **Persistent storage:**
   - Use named volumes (already configured)
   - Backup `/var/lib/grafana`

3. **Load balancing:**
   - Run multiple Grafana instances
   - Use shared PostgreSQL backend

### Retention

Configure in Prometheus:
```yaml
command:
  - '--storage.tsdb.retention.time=30d'
  - '--storage.tsdb.retention.size=50GB'
```

---

## Support

For issues or questions:
- Review logs: `docker logs nebula-grafana`
- Check Grafana docs: https://grafana.com/docs/
- File issue: https://github.com/your-org/nebula-dns/issues

---

## License

Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
