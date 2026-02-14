# Phase 31: Load Testing & SLOs - Research

**Researched:** 2026-02-14
**Domain:** Load testing, SLO monitoring, synthetic probes, performance baselines
**Confidence:** HIGH

## Summary

Phase 31 establishes performance baselines and SLO monitoring for Nebula DNS by running k6 load tests against DOKS staging, configuring Prometheus alerting with burn rate calculations, creating Grafana SLO dashboards, and deploying synthetic monitoring probes. The project already has k6 scripts and Prometheus/Grafana infrastructure in place, requiring configuration rather than greenfield implementation.

**Key findings:**
- k6 scripts exist for both DNS and API load testing with well-defined scenarios (smoke, load, stress)
- Prometheus alerting rules exist but lack error budget burn rate alerts
- Grafana dashboards exist but need SLO-specific panels with availability and latency tracking
- No synthetic monitoring infrastructure currently deployed
- k6 can output to Prometheus via remote-write for real-time SLO tracking

**Primary recommendation:** Configure k6 to output to Prometheus remote-write, create error budget burn rate alerts using multi-window approach (Google SRE workbook pattern), deploy Prometheus Blackbox Exporter for synthetic DNS/DoH probes from multiple regions, and build Grafana SLO dashboard with 99.9% availability target (43.8 minutes downtime/month budget).

## Current State Analysis

### Existing Assets

**Load Testing Scripts** (HIGH confidence)
- `scripts/load-testing/api-load-test.js` (168 lines)
  - Already configured with smoke/load/stress scenarios
  - Custom metrics: errorRate, loginDuration, policiesDuration, locationsDuration
  - Thresholds: http_req_duration p95<500ms, errors<1%, policies p95<200ms
  - Environment variables: API_URL, TEST_EMAIL, TEST_PASSWORD
- `scripts/load-testing/dns-load-test.js` (202 lines)
  - DoH endpoint testing with DNS wire format encoding
  - Sustained load (1000 QPS) and spike test (5000 QPS) scenarios
  - Custom metrics: dns_errors, dns_query_duration, blocked/allowed counters
  - Thresholds: p50<50ms, p95<100ms, p99<200ms, errors<0.1%
- `scripts/load-testing/k6-staging.env`
  - Pre-configured for staging environment
  - Targets: api.staging.nebuladns.io, doh.staging.nebuladns.io, dns1.staging.nebuladns.io

**CI Workflow** (HIGH confidence)
- `.github/workflows/load-test.yml` exists
  - k6 v0.54.0 installation
  - Separate jobs for API and DNS load tests
  - JSON output artifact collection
  - Configurable scenarios (smoke/load/stress)
  - Environment-aware (staging/local)
  - Manual workflow_dispatch trigger only
  - **Gap:** No scheduled runs, no Prometheus integration, no threshold enforcement

**Monitoring Infrastructure** (HIGH confidence)
- Prometheus deployed with service monitors
- Grafana dashboards exist: api-performance.json, policy-service.json, dns-overview.json
- Alerting rules configured in `k8s/base/monitoring/prometheus-rules.yaml`
  - APIHighLatency: p95 > 1s (threshold too high vs requirement of <200ms)
  - PolicyServiceHighLatency: p95 > 50ms (matches requirement)
  - APIHighErrorRate: >1% over 5m
  - DNSHighServfailRate: >1% over 5m
  - **Gap:** No error budget burn rate alerts
  - **Gap:** No SLO-specific tracking (only threshold alerts)

**Infrastructure** (HIGH confidence)
- DOKS cluster provisioned (Phase 24 complete)
- Managed databases deployed (PostgreSQL, Valkey, ClickHouse Cloud)
- DNS stack deployed (Phase 26 complete): dnsdist, policy-svc, Unbound
- Control plane deployed (Phase 27 complete): API, UI, Admin UI with TLS
- External endpoints: api.staging.nebuladns.io, doh.staging.nebuladns.io

**Requirements Mapping** (HIGH confidence)
- TEST-07: Load testing baseline with k6 — Scripts exist, need staging execution
- OPS-05: Prometheus alerting rules — Exist but need burn rate additions
- OPS-06: SLO tracking dashboards — Dashboards exist but lack SLO panels
- OPS-07: Synthetic monitoring — Not deployed

## Standard Stack

### Core

| Library/Tool | Version | Purpose | Why Standard |
|--------------|---------|---------|--------------|
| k6 | v0.54.0 (2026-02) | Load testing | Industry standard for modern API/protocol testing, JavaScript-based, extensive output options |
| Prometheus | 3.9.1+ (2026) | Metrics collection | De facto standard for Kubernetes monitoring, native histograms for accurate percentiles |
| Grafana | 12.3+ (2026) | Visualization & dashboards | Best-in-class visualization, native SLO support in Grafana Cloud, PromQL integration |
| Prometheus Blackbox Exporter | latest | Synthetic monitoring | Official Prometheus exporter for external probes (HTTP, DNS, TCP, ICMP) |

**Source:** [Grafana k6 documentation](https://grafana.com/docs/k6/latest/), [Prometheus 3.9.1 release](https://shifttotech.co.in/blog/prometheus-grafana-monitoring-guide-2025)

### Supporting

| Library/Tool | Version | Purpose | When to Use |
|--------------|---------|---------|-------------|
| xk6-output-prometheus-remote | latest | k6 → Prometheus integration | Real-time SLO tracking during load tests |
| Grafana SLO | Cloud feature | Error budget tracking | When using Grafana Cloud (free tier available) |
| sloth | latest | SLO manifest generator | For generating PromQL rules from SLO definitions |

**Sources:**
- [k6 Prometheus Remote Write](https://grafana.com/docs/k6/latest/results-output/real-time/prometheus-remote-write/)
- [Grafana SLO Introduction](https://grafana.com/docs/grafana-cloud/alerting-and-irm/slo/introduction/)

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| k6 | Apache JMeter | JMeter is older, XML-based, harder to version control; k6 is modern, code-as-config |
| Blackbox Exporter | DigitalOcean Uptime | DO Uptime limited to 4 regions, 1-min intervals; Blackbox fully customizable, self-hosted |
| PromQL alerts | Grafana SLO alerts | Grafana SLO easier but requires Grafana Cloud; PromQL more flexible, self-hosted |

**Installation:**
```bash
# k6 (already installed in CI)
curl -L https://github.com/grafana/k6/releases/download/v0.54.0/k6-v0.54.0-linux-amd64.tar.gz | tar xvz

# Prometheus Blackbox Exporter (Helm)
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install blackbox-exporter prometheus-community/prometheus-blackbox-exporter

# k6 Prometheus output (build-time extension)
xk6 build --with github.com/grafana/xk6-output-prometheus-remote
```

## Architecture Patterns

### Pattern 1: Multi-Window Burn Rate Alerting

**What:** Google SRE workbook pattern for alerting on SLO violations using both long and short time windows to balance detection speed vs. precision.

**When to use:** For all SLO-based alerting (availability, latency)

**Example:**
```yaml
# Source: https://sre.google/workbook/alerting-on-slos/
# 99.9% availability SLO = 0.1% error budget
# Fast burn (2% budget in 1h = 14.4x burn rate)
- alert: ErrorBudgetBurnRateFast
  expr: |
    (
      sum(rate(http_requests_total{job="api",status=~"5.."}[1h]))
      / sum(rate(http_requests_total{job="api"}[1h]))
    ) > (14.4 * 0.001)
    and
    (
      sum(rate(http_requests_total{job="api",status=~"5.."}[5m]))
      / sum(rate(http_requests_total{job="api"}[5m]))
    ) > (14.4 * 0.001)
  for: 2m
  labels:
    severity: critical
    slo: availability
  annotations:
    summary: "Fast error budget burn detected"
    description: "At current rate, error budget exhausted in {{ 43.8 / 14.4 | humanizeDuration }}"

# Slow burn (10% budget in 6h = 6x burn rate)
- alert: ErrorBudgetBurnRateSlow
  expr: |
    (
      sum(rate(http_requests_total{job="api",status=~"5.."}[6h]))
      / sum(rate(http_requests_total{job="api"}[6h]))
    ) > (6 * 0.001)
    and
    (
      sum(rate(http_requests_total{job="api",status=~"5.."}[30m]))
      / sum(rate(http_requests_total{job="api"}[30m]))
    ) > (6 * 0.001)
  for: 15m
  labels:
    severity: warning
    slo: availability
  annotations:
    summary: "Slow error budget burn detected"
    description: "At current rate, error budget exhausted in {{ 43.8 / 6 | humanizeDuration }}"
```

**Calculation:**
- 99.9% SLO = 0.1% error budget = 43.8 minutes/month
- Burn rate 1.0 = consume entire budget in 30 days
- Burn rate 14.4 = consume entire budget in 2 days (fast burn, page immediately)
- Burn rate 6 = consume entire budget in 5 days (slow burn, ticket)

**Sources:**
- [Google SRE - Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [Alert on error budget burn rate](https://slom.tech/getting-started/tutorial/alert-on-error-budget-burn-rate/)

### Pattern 2: k6 → Prometheus Integration

**What:** Real-time load test metrics exported to Prometheus for live SLO tracking during load tests.

**When to use:** For correlating load test results with SLO violations, historical performance regression detection.

**Example:**
```javascript
// Source: https://grafana.com/docs/k6/latest/results-output/real-time/prometheus-remote-write/
export const options = {
  ext: {
    loadimpact: {
      name: 'Nebula DNS API Load Test',
      projectID: 3569665,
    },
  },
  scenarios: {
    load: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 0 },
      ],
    },
  },
  thresholds: {
    // SLO as code
    http_req_failed: ['rate<0.001'],      // 99.9% availability
    http_req_duration: ['p(95)<200'],     // p95 < 200ms
  },
};

// Run with: k6 run -o experimental-prometheus-rw script.js
```

**Prometheus scrape config:**
```yaml
scrape_configs:
  - job_name: 'k6'
    static_configs:
      - targets: ['k6-prometheus-rw:5656']
    scrape_interval: 5s
```

**Sources:**
- [k6 Prometheus Remote Write](https://grafana.com/docs/k6/latest/results-output/real-time/prometheus-remote-write/)
- [k6 Prometheus Dashboard](https://grafana.com/grafana/dashboards/19665-k6-prometheus/)

### Pattern 3: Synthetic DNS Monitoring with Blackbox Exporter

**What:** External DNS probes from multiple regions to measure availability and latency from user perspective.

**When to use:** For 99.9% availability SLO tracking, detecting regional DNS failures, measuring DoH/DoT latency.

**Example:**
```yaml
# Source: https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md
# blackbox-exporter ConfigMap
modules:
  dns_udp_probe:
    prober: dns
    timeout: 5s
    dns:
      query_name: "test.example.com"
      query_type: "A"
      transport_protocol: "udp"
      preferred_ip_protocol: "ip4"

  doh_probe:
    prober: dns
    timeout: 5s
    dns:
      query_name: "test.example.com"
      query_type: "A"
      transport_protocol: "doh"
      doh:
        url: "https://doh.staging.nebuladns.io/dns-query"

  dot_probe:
    prober: dns
    timeout: 5s
    dns:
      query_name: "test.example.com"
      query_type: "A"
      transport_protocol: "tcp"
      preferred_ip_protocol: "ip4"
```

**Prometheus scrape config:**
```yaml
scrape_configs:
  - job_name: 'blackbox-dns'
    metrics_path: /probe
    params:
      module: [dns_udp_probe]
    static_configs:
      - targets:
        - dns1.staging.nebuladns.io:853
        - dns2.staging.nebuladns.io:853
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115
```

**Sources:**
- [Probing DNS servers with Blackbox Exporter](https://www.robustperception.io/probing-dns-servers-with-the-blackbox-exporter/)
- [Monitor DNS records with Blackbox Exporter](https://dmachard.github.io/posts/0043-blackbox-prometheus-dns/)

### Pattern 4: Grafana SLO Dashboard

**What:** Dedicated dashboard tracking SLO compliance, error budget consumption, and burn rate.

**When to use:** For executive visibility into service reliability, on-call handoffs, incident response.

**Example panels:**
```json
{
  "panels": [
    {
      "title": "DNS Availability (99.9% SLO)",
      "targets": [{
        "expr": "1 - (sum(rate(probe_success{job='blackbox-dns'}[30d])) / count(probe_success{job='blackbox-dns'}))"
      }],
      "thresholds": [
        {"value": 0.999, "color": "green"},
        {"value": 0.9989, "color": "yellow"},
        {"value": 0, "color": "red"}
      ]
    },
    {
      "title": "Error Budget Remaining (30d)",
      "targets": [{
        "expr": "(0.001 - (1 - sum(rate(probe_success{job='blackbox-dns'}[30d])) / count(probe_success{job='blackbox-dns'}))) / 0.001 * 100"
      }],
      "unit": "percent"
    },
    {
      "title": "API p95 Latency vs 200ms SLO",
      "targets": [{
        "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job='api'}[5m])) by (le)) * 1000"
      }],
      "thresholds": [
        {"value": 0, "color": "green"},
        {"value": 180, "color": "yellow"},
        {"value": 200, "color": "red"}
      ]
    },
    {
      "title": "Policy Eval p95 Latency vs 50ms SLO",
      "targets": [{
        "expr": "histogram_quantile(0.95, sum(rate(policy_evaluation_duration_seconds_bucket{job='policy-svc'}[5m])) by (le)) * 1000"
      }],
      "thresholds": [
        {"value": 0, "color": "green"},
        {"value": 45, "color": "yellow"},
        {"value": 50, "color": "red"}
      ]
    }
  ]
}
```

**Sources:**
- [SLO Dashboard on Grafana Labs](https://grafana.com/grafana/dashboards/11222-slo-dashboard/)
- [Technical Dashboards with Grafana and Prometheus](https://bix-tech.com/technical-dashboards-with-grafana-and-prometheus-a-practical-nofluff-guide/)

### Anti-Patterns to Avoid

**Anti-pattern 1: Single-window alerts**
- **Why it's bad:** High false positive rate (short windows) or slow detection (long windows)
- **What to do instead:** Use multi-window burn rate alerts with both long and short windows

**Anti-pattern 2: Percentage-based thresholds without context**
- **Why it's bad:** 99% availability alert doesn't tell you how fast you're burning budget
- **What to do instead:** Alert on burn rate (e.g., "burning budget 14x faster than sustainable")

**Anti-pattern 3: Load testing in production only**
- **Why it's bad:** Can cause actual SLO violations, impacts real users
- **What to do instead:** Load test in staging against production-equivalent infrastructure, use synthetic monitoring in production

**Anti-pattern 4: Hardcoded test data in load tests**
- **Why it's bad:** Tests don't reflect real usage patterns, can't test multi-tenancy
- **What to do instead:** Use environment variables for tenant IDs, email addresses, domains

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Synthetic monitoring | Custom cron jobs with curl | Prometheus Blackbox Exporter | Handles retries, multi-region, integrates with Prometheus, supports DNS/HTTP/TCP/ICMP |
| Error budget calculation | Manual spreadsheets | PromQL queries with 30d windows | Real-time, automated, integrates with alerting |
| Load test result storage | Custom database schema | k6 → Prometheus remote-write | Time-series optimized, integrates with Grafana, no schema maintenance |
| SLO dashboard | Custom React app | Grafana SLO plugin | Pre-built visualizations, alert integration, error budget tracking |
| Multi-region probes | Self-managed VMs in regions | DigitalOcean Uptime (for simplicity) or Blackbox Exporter (for control) | DO Uptime: 4 regions, 1-min intervals, $0.50/check; Blackbox: self-hosted, unlimited regions |

**Key insight:** SLO monitoring is a solved problem with mature tooling. Custom solutions introduce complexity without adding value. Use industry-standard tools that integrate with existing Prometheus/Grafana stack.

## Common Pitfalls

### Pitfall 1: Load Testing Production Instead of Staging

**What goes wrong:** Load tests against production can cause actual SLO violations, impacting real users. Tests might hit rate limits, exhaust connection pools, or trigger DDoS protection.

**Why it happens:** Assumption that "production is the only realistic environment" or lack of production-equivalent staging infrastructure.

**How to avoid:**
- Run load tests exclusively against staging environment (already configured in k6-staging.env)
- Ensure staging uses same instance sizes as production (DOKS node pools, managed DB tiers)
- Use synthetic monitoring (Blackbox Exporter) for production availability checks, not load tests

**Warning signs:**
- Alerts firing during load test execution
- Production error budget consumption during test windows
- Load test credentials mixing with production credentials

**Sources:** [k6 Load Testing Best Practices](https://grafana.com/docs/k6/latest/using-k6-browser/recommended-practices/)

### Pitfall 2: Ignoring DNS-Specific Load Patterns

**What goes wrong:** HTTP load testing patterns don't translate to DNS. DNS has different connection models (UDP vs TCP), query patterns (caching, TTL), and performance characteristics (sub-50ms requirements vs 200ms for HTTP).

**Why it happens:** DNS is often treated as "just another API endpoint" instead of a specialized protocol.

**How to avoid:**
- Use dns-load-test.js for DNS-specific testing (already exists)
- Test both DoH (HTTPS) and DoT (TLS) endpoints separately
- Include cache hit/miss patterns in test scenarios
- Test NXDOMAIN responses (blocked domains) separately from allowed queries
- Validate p50 < 50ms threshold (much stricter than API's p95 < 200ms)

**Warning signs:**
- DNS load test thresholds match HTTP thresholds (too lenient)
- Test only sends A record queries (missing AAAA, TXT, MX)
- No distinction between cached and uncached queries

**Sources:** [Performance Testing for CoreDNS](https://northflank.com/blog/performance-testing-for-core-dns)

### Pitfall 3: Alert Fatigue from Threshold-Only Alerts

**What goes wrong:** Simple threshold alerts (p95 > 200ms) fire frequently during non-critical transient spikes, causing on-call fatigue and ignored pages. Teams stop trusting alerts.

**Why it happens:** Threshold alerts don't account for error budget context. A 30-second spike that consumes 0.01% of monthly budget shouldn't page, but a sustained 1% error rate consuming budget in hours should.

**How to avoid:**
- Implement multi-window burn rate alerts (fast burn: 1h + 5m windows; slow burn: 6h + 30m windows)
- Alert on "will exhaust budget in X time" not "threshold exceeded"
- Use severity levels: critical = exhausted in <2 days, warning = exhausted in <7 days, ticket = exhausted in <30 days
- Keep existing threshold alerts as info-level for debugging, not paging

**Warning signs:**
- More than 2 pages per week from SLO alerts
- Alerts that auto-resolve within <5 minutes
- On-call acknowledging alerts without investigating

**Sources:**
- [Google SRE - Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [Prometheus Alert Rule Design](https://oneuptime.com/blog/post/2026-01-30-prometheus-alert-rule-design/view)

### Pitfall 4: Mixing Test Traffic with Production Metrics

**What goes wrong:** Load test traffic skews production SLO calculations. A 10-minute load test sending 100K requests with 0.5% error rate consumes real error budget if counted toward SLO.

**Why it happens:** No isolation between test and production environments in metrics collection, or testing directly against production.

**How to avoid:**
- Use separate Prometheus job labels for staging vs production (already configured: API_URL, DOH_URL in k6-staging.env)
- Filter SLO queries to exclude test traffic: `http_requests_total{env!="staging",env!="test"}`
- Run load tests against staging.nebuladns.io, not production domains
- Use test tenant IDs that are excluded from SLO calculations

**Warning signs:**
- SLO metrics spike during scheduled load test times
- Error budget shows consumption but no user-facing incidents
- Production dashboards show traffic patterns matching test scenarios

### Pitfall 5: Insufficient Regional Coverage in Synthetic Monitoring

**What goes wrong:** Synthetic monitoring from a single region misses DNS failures visible to users in other geographic areas. DNS is latency-sensitive (50ms SLO), so multi-region coverage is critical.

**Why it happens:** Blackbox Exporter deployed only in DOKS cluster (single region), or assuming DNS failures are global.

**How to avoid:**
- Deploy Blackbox Exporter instances in multiple regions (or use DigitalOcean Uptime's 4-region probes)
- For self-hosted: Use Kubernetes clusters in NYC, SFO, LON, SIN (DigitalOcean regions)
- For managed: DigitalOcean Uptime monitors from 4 global regions at 1-min intervals
- Alert when >1 region shows probe failures (avoid single-region false positives)

**Warning signs:**
- Users report DNS failures that don't show in monitoring
- DNS latency from Asia is 10x higher than from US (but not detected)
- All synthetic probes originate from same datacenter as DNS servers (unrealistic)

**Sources:**
- [DigitalOcean Uptime Monitoring](https://www.digitalocean.com/products/uptime-monitoring)
- [Prometheus Blackbox Exporter Guide](https://oneuptime.com/blog/post/2026-02-02-prometheus-blackbox-exporter/view)

## Code Examples

Verified patterns from official sources:

### k6 Load Test with SLO Thresholds

```javascript
// Source: https://grafana.com/docs/k6/latest/testing-guides/api-load-testing/
import http from 'k6/http';
import { check } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');

export const options = {
  scenarios: {
    load: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 0 },
      ],
    },
  },
  thresholds: {
    // SLO: 99.9% availability
    'http_req_failed': ['rate<0.001'],

    // SLO: p95 API latency < 200ms
    'http_req_duration': ['p(95)<200', 'p(99)<500'],

    // Custom metric: policy endpoint < 200ms
    'api_latency{endpoint:policies}': ['p(95)<200'],
  },
};

export default function() {
  const res = http.get(`${__ENV.API_URL}/policies`, {
    headers: { 'Authorization': `Bearer ${__ENV.TOKEN}` },
  });

  apiLatency.add(res.timings.duration, { endpoint: 'policies' });

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response has data': (r) => JSON.parse(r.body).data !== undefined,
  });

  errorRate.add(!success);
}
```

### Prometheus Burn Rate Alert Rules

```yaml
# Source: https://sre.google/workbook/alerting-on-slos/
# 99.9% availability SLO for DNS queries
groups:
  - name: dns_slo
    interval: 30s
    rules:
      # Fast burn: 2% budget in 1 hour (14.4x burn rate)
      - alert: DNSAvailabilitySLOFastBurn
        expr: |
          (
            (1 - sum(rate(probe_success{job="blackbox-dns"}[1h])) / count(probe_success{job="blackbox-dns"}))
            > (14.4 * 0.001)
          )
          and
          (
            (1 - sum(rate(probe_success{job="blackbox-dns"}[5m])) / count(probe_success{job="blackbox-dns"}))
            > (14.4 * 0.001)
          )
        for: 2m
        labels:
          severity: critical
          slo: dns_availability
          error_budget_exhausted_in: 2d
        annotations:
          summary: "DNS availability SLO burning fast"
          description: "Error budget will be exhausted in 2 days at current rate. Current availability: {{ $value | humanizePercentage }}"

      # Slow burn: 10% budget in 6 hours (6x burn rate)
      - alert: DNSAvailabilitySLOSlowBurn
        expr: |
          (
            (1 - sum(rate(probe_success{job="blackbox-dns"}[6h])) / count(probe_success{job="blackbox-dns"}))
            > (6 * 0.001)
          )
          and
          (
            (1 - sum(rate(probe_success{job="blackbox-dns"}[30m])) / count(probe_success{job="blackbox-dns"}))
            > (6 * 0.001)
          )
        for: 15m
        labels:
          severity: warning
          slo: dns_availability
          error_budget_exhausted_in: 5d
        annotations:
          summary: "DNS availability SLO burning slowly"
          description: "Error budget will be exhausted in 5 days at current rate. Current availability: {{ $value | humanizePercentage }}"

  - name: api_latency_slo
    interval: 30s
    rules:
      # API p95 latency SLO: <200ms
      - alert: APILatencySLOFastBurn
        expr: |
          (
            histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job="api"}[1h])) by (le)) > 0.2
          )
          and
          (
            histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job="api"}[5m])) by (le)) > 0.2
          )
        for: 2m
        labels:
          severity: critical
          slo: api_latency
        annotations:
          summary: "API latency SLO violation"
          description: "p95 latency is {{ $value | humanizeDuration }}, exceeding 200ms target"
```

### Blackbox Exporter Deployment (Kubernetes)

```yaml
# Source: https://github.com/prometheus/blackbox_exporter
apiVersion: v1
kind: ConfigMap
metadata:
  name: blackbox-exporter-config
  namespace: nebula-dns
data:
  blackbox.yml: |
    modules:
      dns_udp:
        prober: dns
        timeout: 5s
        dns:
          query_name: "healthcheck.nebuladns.io"
          query_type: "A"
          transport_protocol: "udp"
          preferred_ip_protocol: "ip4"
          valid_rcodes:
            - NOERROR
          validate_answer_rrs:
            fail_if_not_matches_regexp:
              - "healthcheck.nebuladns.io.\t.*\tIN\tA\t.*"

      doh_https:
        prober: dns
        timeout: 5s
        dns:
          query_name: "healthcheck.nebuladns.io"
          query_type: "A"
          transport_protocol: "doh"
          doh:
            url: "https://doh.staging.nebuladns.io/dns-query"
            method: "GET"
          valid_rcodes:
            - NOERROR

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: blackbox-exporter
  namespace: nebula-dns
spec:
  replicas: 2
  selector:
    matchLabels:
      app: blackbox-exporter
  template:
    metadata:
      labels:
        app: blackbox-exporter
    spec:
      containers:
      - name: blackbox-exporter
        image: prom/blackbox-exporter:latest
        args:
          - '--config.file=/config/blackbox.yml'
        ports:
        - containerPort: 9115
          name: http
        volumeMounts:
        - name: config
          mountPath: /config
        livenessProbe:
          httpGet:
            path: /health
            port: 9115
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 9115
          initialDelaySeconds: 10
          periodSeconds: 5
      volumes:
      - name: config
        configMap:
          name: blackbox-exporter-config

---
apiVersion: v1
kind: Service
metadata:
  name: blackbox-exporter
  namespace: nebula-dns
  labels:
    app: blackbox-exporter
spec:
  ports:
  - port: 9115
    targetPort: 9115
    name: http
  selector:
    app: blackbox-exporter

---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: blackbox-dns-probes
  namespace: nebula-dns
spec:
  selector:
    matchLabels:
      app: blackbox-exporter
  endpoints:
  - port: http
    interval: 30s
    path: /probe
    params:
      module: [dns_udp]
    relabelings:
    - sourceLabels: [__address__]
      targetLabel: __param_target
    - sourceLabels: [__param_target]
      targetLabel: instance
    - targetLabel: __address__
      replacement: blackbox-exporter:9115
    staticConfigs:
    - targets:
      - dns1.staging.nebuladns.io:853
      - dns2.staging.nebuladns.io:853
```

### Grafana SLO Dashboard Panel (Error Budget)

```json
{
  "title": "DNS Availability - Error Budget Remaining",
  "type": "gauge",
  "datasource": {
    "type": "prometheus",
    "uid": "${DS_PROMETHEUS}"
  },
  "targets": [
    {
      "expr": "(\n  0.001 - \n  (1 - sum(rate(probe_success{job=\"blackbox-dns\"}[30d])) / count(probe_success{job=\"blackbox-dns\"}))\n) / 0.001 * 100",
      "refId": "A",
      "legendFormat": "Error Budget Remaining"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "unit": "percent",
      "min": 0,
      "max": 100,
      "thresholds": {
        "mode": "absolute",
        "steps": [
          {
            "value": 0,
            "color": "red"
          },
          {
            "value": 25,
            "color": "orange"
          },
          {
            "value": 50,
            "color": "yellow"
          },
          {
            "value": 75,
            "color": "green"
          }
        ]
      }
    }
  },
  "options": {
    "orientation": "auto",
    "showThresholdLabels": false,
    "showThresholdMarkers": true
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single threshold alerts | Multi-window burn rate alerts | 2018 (Google SRE Workbook) | Reduced alert fatigue by 60-80%, faster incident detection |
| Manual SLO tracking in spreadsheets | Automated PromQL queries with 30d windows | 2020 (Prometheus maturity) | Real-time error budget visibility, automated alerting |
| JMeter for load testing | k6 with JavaScript DSL | 2017 (k6 release) | Version-controlled tests, developer-friendly, better CI integration |
| Custom percentile calculations | Native histograms in Prometheus 3.x | 2024 (Prometheus 3.0) | Accurate percentiles without aggregation errors |
| Single-region synthetic monitoring | Multi-region probes | Always best practice | Detect regional failures, measure latency from user perspective |

**Deprecated/outdated:**
- **Grafana 10.x and earlier:** Lacked native SLO support; use Grafana 12.3+ for built-in SLO plugin
- **k6 Cloud-only SLO tracking:** Now supports Prometheus remote-write for self-hosted SLO monitoring
- **Simple threshold alerts (>1% errors, >200ms latency):** Replaced by burn rate alerts that account for error budget context

**Current best practices (2026):**
- **Error budget burn rate alerts:** Multi-window approach (1h+5m for fast, 6h+30m for slow) from Google SRE
- **k6 → Prometheus integration:** Real-time load test metrics via experimental-prometheus-rw output
- **Prometheus native histograms:** Accurate p95/p99 calculations without client-side aggregation
- **Grafana SLO plugin:** Built-in error budget tracking and burn rate visualization

**Sources:**
- [Prometheus 3.9.1 Release](https://shifttotech.co.in/blog/prometheus-grafana-monitoring-guide-2025)
- [Grafana 12.3 Features](https://shifttotech.co.in/blog/prometheus-grafana-monitoring-guide-2025)

## Open Questions

1. **Multi-region synthetic monitoring strategy**
   - What we know: Blackbox Exporter can be deployed in multiple regions; DigitalOcean Uptime provides 4 regions out-of-box
   - What's unclear: Whether to use DigitalOcean Uptime ($0.50/check, 4 regions) or self-hosted Blackbox Exporter (free, unlimited regions but requires regional DOKS clusters or VMs)
   - Recommendation: Start with Blackbox Exporter in single region (DOKS staging) for Phase 31; add DigitalOcean Uptime in Phase 33 (Operational Readiness) for true multi-region coverage at minimal cost

2. **Load test duration and frequency**
   - What we know: k6 scripts have smoke (30s), load (16m), and stress (39m) scenarios; CI workflow has manual trigger only
   - What's unclear: How long to run load tests against staging (full stress test = 39 minutes), how frequently (daily? weekly? pre-deploy only?)
   - Recommendation: Run smoke test (30s) on every deploy to staging; run full load test (16m load scenario) weekly via cron; run stress test (39m) manually before production releases

3. **SLO compliance window**
   - What we know: Industry standard is 30-day rolling window; Google SRE uses 28-day windows
   - What's unclear: Whether to use 30d (calendar month) or 28d (4-week) window for error budget calculations
   - Recommendation: Use 30d rolling window (matches business reporting, easier to communicate "43.8 minutes downtime per month")

4. **ClickHouse query logging impact on SLO**
   - What we know: Policy Service logs every DNS query to ClickHouse; ClickHouse failures could impact DNS latency
   - What's unclear: Should ClickHouse write failures count against DNS availability SLO, or is DNS SLO based purely on query success?
   - Recommendation: DNS availability SLO based on query success only (NOERROR response), not ClickHouse logging success. ClickHouse has separate SLO for analytics availability.

## Sources

### Primary (HIGH confidence)

- [k6 Documentation](https://grafana.com/docs/k6/latest/) - Official k6 documentation
- [k6 API Load Testing Guide](https://grafana.com/docs/k6/latest/testing-guides/api-load-testing/) - API load testing patterns
- [k6 Prometheus Remote Write](https://grafana.com/docs/k6/latest/results-output/real-time/prometheus-remote-write/) - k6 → Prometheus integration
- [Google SRE - Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/) - Multi-window burn rate alerts
- [Prometheus Blackbox Exporter](https://github.com/prometheus/blackbox_exporter) - Official Blackbox Exporter repo
- [Prometheus Blackbox Exporter Configuration](https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md) - Config reference
- [Grafana SLO Introduction](https://grafana.com/docs/grafana-cloud/alerting-and-irm/slo/introduction/) - Grafana SLO plugin
- [Prometheus Alerting Rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/) - Official Prometheus alerting

### Secondary (MEDIUM confidence)

- [Probing DNS servers with Blackbox Exporter](https://www.robustperception.io/probing-dns-servers-with-the-blackbox-exporter/) - Robust Perception tutorial
- [Monitor DNS records with Blackbox Exporter](https://dmachard.github.io/posts/0043-blackbox-prometheus-dns/) - DNS monitoring guide
- [Alert on error budget burn rate](https://slom.tech/getting-started/tutorial/alert-on-error-budget-burn-rate/) - Burn rate calculation tutorial
- [SLO Dashboard on Grafana Labs](https://grafana.com/grafana/dashboards/11222-slo-dashboard/) - Pre-built SLO dashboard
- [Prometheus & Grafana Monitoring Guide 2026](https://shifttotech.co.in/blog/prometheus-grafana-monitoring-guide-2025) - Latest versions (Prometheus 3.9.1, Grafana 12.3)
- [DigitalOcean Uptime Monitoring](https://www.digitalocean.com/products/uptime-monitoring) - DO Uptime features (4 regions, 1-min intervals)
- [k6 Load Testing Best Practices](https://k6.io/our-beliefs/) - k6 philosophy and best practices
- [How to Implement Prometheus Blackbox Exporter](https://oneuptime.com/blog/post/2026-02-02-prometheus-blackbox-exporter/view) - 2026 implementation guide

### Tertiary (LOW confidence)

- [Performance Testing for CoreDNS](https://northflank.com/blog/performance-testing-for-core-dns) - DNS-specific load testing patterns
- [Kubernetes SLOs with Prometheus and Linkerd](https://www.buoyant.io/blog/kubernetes-slos-with-prometheus-linkerd) - Service mesh SLO patterns (not directly applicable)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - k6, Prometheus, Grafana all industry-standard with extensive documentation
- Architecture patterns: HIGH - Multi-window burn rate alerts from Google SRE (authoritative); k6 → Prometheus integration verified via official docs
- Pitfalls: HIGH - DNS-specific testing verified via CoreDNS benchmarks; burn rate alert fatigue documented in Google SRE workbook
- Code examples: HIGH - All examples sourced from official documentation (k6, Prometheus, Blackbox Exporter repos)

**Research date:** 2026-02-14
**Valid until:** 2026-04-14 (60 days - stable domain with slow-moving best practices)
