# Nebula DNS Monitoring - Quick Start Guide

Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

## 1. Start the Monitoring Stack

### Full Stack (Application + Monitoring)

```bash
# Start all services including monitoring
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d

# Verify all services are running
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml ps
```

### Monitoring Only

```bash
# If you already have the application running
docker-compose -f docker-compose.monitoring.yml up -d

# Check monitoring services
docker-compose -f docker-compose.monitoring.yml ps
```

## 2. Access Dashboards

### Grafana
- **URL:** http://localhost:4300
- **Username:** admin
- **Password:** admin (change on first login)

### Prometheus
- **URL:** http://localhost:4090
- **Targets:** http://localhost:4090/targets
- **Query Interface:** http://localhost:4090/graph

### Loki (Logs)
- **URL:** http://localhost:4100
- **Access via Grafana:** Explore → Select Loki datasource

## 3. View Dashboards

1. Open Grafana: http://localhost:4300
2. Navigate to **Dashboards** → **Browse**
3. Click on **Nebula DNS** folder
4. Select a dashboard:
   - **API Performance** - Control plane monitoring
   - **Policy Service** - DNS policy evaluation
   - **DNS Overview** - Query processing and blocking
   - **Database Health** - PostgreSQL, Redis, ClickHouse
   - **Business Metrics** - Tenant usage and KPIs

## 4. Verify Metrics Collection

### Check Prometheus Targets

```bash
# Open Prometheus targets page
open http://localhost:4090/targets

# All targets should show "UP" status:
# - nebuladns-api
# - nebuladns-policy-svc
# - dnsdist
# - redis
# - postgresql
# - clickhouse
# - node
```

### Test Metrics Endpoints

```bash
# API metrics
curl http://localhost:4010/metrics

# Policy Service metrics
curl http://localhost:4080/metrics

# dnsdist metrics
curl http://localhost:4083/metrics

# Redis exporter
curl http://localhost:9121/metrics

# PostgreSQL exporter
curl http://localhost:9187/metrics

# Node exporter
curl http://localhost:9100/metrics
```

## 5. Common Tasks

### View Logs in Grafana

1. Open Grafana → **Explore**
2. Select **Loki** datasource
3. Enter LogQL query:
   ```logql
   {container_name="dnsfilter-api"}
   ```

### Create Custom Dashboard

1. Navigate to **Dashboards** → **New Dashboard**
2. Click **Add visualization**
3. Select **Prometheus** datasource
4. Enter PromQL query:
   ```promql
   rate(http_requests_total{job="nebuladns-api"}[5m])
   ```
5. Configure visualization (Graph, Table, Stat, etc.)
6. Click **Apply** and **Save**

### Set Up Alerts

1. Go to **Alerting** → **Alert rules** → **New alert rule**
2. Define query and threshold:
   ```promql
   rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
   ```
3. Set evaluation interval: Every 1m for 5m
4. Configure notification channel
5. Save alert rule

## 6. Monitoring Ports Reference

| Service | Port | URL |
|---------|------|-----|
| Grafana | 4300 | http://localhost:4300 |
| Prometheus | 4090 | http://localhost:4090 |
| Loki | 4100 | http://localhost:4100 |
| Alertmanager | 9093 | http://localhost:9093 |
| Redis Exporter | 9121 | http://localhost:9121/metrics |
| Postgres Exporter | 9187 | http://localhost:9187/metrics |
| Node Exporter | 9100 | http://localhost:9100/metrics |

## 7. Dashboard Overview

### API Performance
- **Refresh:** 10s
- **Time Range:** Last 1 hour
- **Panels:** 9 panels covering request rate, latency, errors, slowest endpoints

### Policy Service
- **Refresh:** 10s
- **Time Range:** Last 1 hour
- **Panels:** 9 panels covering evaluations, cache hits, decisions, threats

### DNS Overview
- **Refresh:** 10s
- **Time Range:** Last 1 hour
- **Panels:** 10 panels covering queries, blocks, latency, top domains, geo

### Database Health
- **Refresh:** 10s
- **Time Range:** Last 1 hour
- **Panels:** 20 panels covering PostgreSQL, Redis, ClickHouse metrics

### Business Metrics
- **Refresh:** 1m
- **Time Range:** Last 24 hours
- **Panels:** 11 panels covering tenants, usage, subscriptions, errors

## 8. Troubleshooting

### Dashboards Not Loading

```bash
# Check Grafana logs
docker logs nebula-grafana

# Verify dashboard files are mounted
docker exec nebula-grafana ls /var/lib/grafana/dashboards

# Restart Grafana
docker restart nebula-grafana
```

### No Data in Panels

```bash
# Check Prometheus is scraping
curl http://localhost:4090/api/v1/targets

# Verify service metrics are working
curl http://localhost:4010/metrics | grep http_requests_total

# Check Prometheus logs
docker logs nebula-prometheus
```

### ClickHouse Plugin Not Installed

```bash
# Install plugin manually
docker exec -it nebula-grafana grafana-cli plugins install vertamedia-clickhouse-datasource

# Restart Grafana
docker restart nebula-grafana
```

### Connection Refused Errors

```bash
# Check network
docker network inspect dnsfilter-network

# Verify services are running
docker-compose ps

# Check if ports are accessible
curl http://localhost:4090/-/healthy  # Prometheus
curl http://localhost:4300/api/health  # Grafana
```

## 9. Stop Monitoring Stack

```bash
# Stop all services
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml down

# Stop monitoring only
docker-compose -f docker-compose.monitoring.yml down

# Stop and remove volumes (WARNING: deletes all metrics data)
docker-compose -f docker-compose.monitoring.yml down -v
```

## 10. Production Considerations

### Change Default Credentials

```bash
# Set in environment or .env file
export GRAFANA_ADMIN_USER="admin"
export GRAFANA_ADMIN_PASSWORD="your-secure-password"

# Restart services
docker-compose -f docker-compose.monitoring.yml up -d grafana
```

### Configure Retention

Edit `monitoring/prometheus/prometheus.yml`:
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

# Add to docker-compose.monitoring.yml
command:
  - '--storage.tsdb.retention.time=30d'
  - '--storage.tsdb.retention.size=50GB'
```

### Enable Alerting

1. Configure Alertmanager: `monitoring/alertmanager/alertmanager.yml`
2. Add alert rules: `monitoring/prometheus/rules/*.yml`
3. Configure notification channels in Grafana

### Backup Dashboards

```bash
# Export dashboards
docker exec nebula-grafana ls /var/lib/grafana/dashboards > dashboard-list.txt

# Backup Grafana data
docker run --rm \
  -v nebula-dns_grafana-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/grafana-backup.tar.gz /data
```

## Next Steps

1. ✅ Start monitoring stack
2. ✅ Access Grafana and view dashboards
3. ✅ Verify metrics collection
4. 📝 Configure alerts for critical metrics
5. 📝 Set up notification channels (Slack, PagerDuty, etc.)
6. 📝 Create custom dashboards for specific use cases
7. 📝 Configure retention policies
8. 📝 Set up automated backups

## Support

For detailed documentation, see:
- [Grafana Dashboards README](./grafana/README.md)
- [Prometheus Configuration](./prometheus/prometheus.yml)
- [Alert Rules](./prometheus/rules/)

---

**Ready to monitor!** 🚀
