# Nebula DNS Load Testing

This directory contains k6 load testing scripts for Nebula DNS.

## Prerequisites

Install k6:
```bash
# macOS
brew install k6

# Ubuntu/Debian
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Docker
docker pull grafana/k6
```

## API Load Test

Tests the REST API endpoints.

```bash
# Set environment variables
export API_URL=https://api.example.com
export TEST_EMAIL=admin@example.com
export TEST_PASSWORD=your-password

# Run the test
k6 run api-load-test.js

# Run with HTML report
k6 run api-load-test.js --out json=results.json
```

## DNS Load Test

Tests DNS resolution performance via DoH.

```bash
# Set environment variables
export DOH_URL=https://dns.example.com/dns-query
export DNS_TOKEN=your-location-token

# Run the test
k6 run dns-load-test.js
```

## Test Scenarios

### Smoke Test
- 1 virtual user for 30 seconds
- Verify basic functionality

### Load Test
- Ramp up to 100 virtual users
- Sustained load for 5 minutes
- Verify system handles normal traffic

### Stress Test
- Ramp up to 300 virtual users
- Find the breaking point
- Verify graceful degradation

### Spike Test
- Sudden spike to 5K QPS
- Test auto-scaling behavior
- Verify recovery

## Thresholds

| Metric | Target |
|--------|--------|
| API p95 latency | < 500ms |
| API p99 latency | < 1000ms |
| DNS p50 latency | < 50ms |
| DNS p95 latency | < 100ms |
| Error rate | < 0.1% |

## Grafana Dashboard

Import the results to Grafana for visualization:

1. Install k6 Grafana data source
2. Configure InfluxDB output:
   ```bash
   k6 run --out influxdb=http://localhost:8086/k6 api-load-test.js
   ```
3. Import dashboard from Grafana.com (ID: 2587)

## CI/CD Integration

Run load tests in CI pipeline:

```yaml
# .github/workflows/load-test.yml
load-test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    
    - name: Install k6
      run: |
        sudo gpg -k
        sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
        echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
        sudo apt-get update
        sudo apt-get install k6
    
    - name: Run load test
      env:
        API_URL: ${{ secrets.STAGING_API_URL }}
        TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
        TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
      run: k6 run scripts/load-testing/api-load-test.js --out json=results.json
    
    - name: Upload results
      uses: actions/upload-artifact@v3
      with:
        name: load-test-results
        path: results.json
```
