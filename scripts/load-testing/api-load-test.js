// Nebula DNS - API Load Test Script
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// Run with: k6 run api-load-test.js
//
// Prerequisites:
// - Install k6: https://k6.io/docs/getting-started/installation/
// - Set environment variables: API_URL, TEST_EMAIL, TEST_PASSWORD
// - For staging: k6 run --env-file=k6-staging.env api-load-test.js

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const policiesDuration = new Trend('policies_duration');
const locationsDuration = new Trend('locations_duration');

// Configuration
const BASE_URL = __ENV.API_URL || 'http://localhost:4010';
const TEST_EMAIL = __ENV.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'password';
const SCENARIO = __ENV.K6_SCENARIO || 'smoke';

// Test scenario definitions
const SCENARIOS = {
  smoke: {
    executor: 'constant-vus',
    vus: 1,
    duration: '30s',
    tags: { test_type: 'smoke' },
  },
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 50 },   // Ramp up
      { duration: '5m', target: 50 },   // Stay at 50
      { duration: '2m', target: 100 },  // Ramp to 100
      { duration: '5m', target: 100 },  // Stay at 100
      { duration: '2m', target: 0 },    // Ramp down
    ],
    tags: { test_type: 'load' },
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 100 },
      { duration: '5m', target: 100 },
      { duration: '2m', target: 200 },
      { duration: '5m', target: 200 },
      { duration: '2m', target: 300 },
      { duration: '5m', target: 300 },
      { duration: '5m', target: 0 },
    ],
    tags: { test_type: 'stress' },
  },
};

// Test scenarios - select based on K6_SCENARIO env var
export const options = {
  scenarios: {
    [SCENARIO]: SCENARIOS[SCENARIO] || SCENARIOS.smoke,
  },
  ext: {
    loadimpact: {
      name: 'Nebula DNS API Baseline',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],  // SLO: p95 API latency <200ms
    errors: ['rate<0.001'],  // SLO: 99.9% availability = <0.1% errors
    login_duration: ['p(95)<500'],  // Login can be slower
    policies_duration: ['p(95)<200'],
    locations_duration: ['p(95)<200'],
  },
};

// Setup - runs once before tests
export function setup() {
  // Login and get token
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginRes.status !== 200 && loginRes.status !== 201) {
    throw new Error(`Login failed: ${loginRes.status} ${loginRes.body}`);
  }

  const body = JSON.parse(loginRes.body);
  return { token: body.accessToken };
}

// Main test function
export default function(data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  group('Authentication', () => {
    const start = Date.now();
    const res = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }), { headers: { 'Content-Type': 'application/json' } });
    
    loginDuration.add(Date.now() - start);
    
    const success = check(res, {
      'login status is 200/201': (r) => r.status === 200 || r.status === 201,
      'login has token': (r) => JSON.parse(r.body).accessToken !== undefined,
    });
    
    errorRate.add(!success);
  });

  sleep(1);

  group('Policies', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/policies`, { headers });
    
    policiesDuration.add(Date.now() - start);
    
    const success = check(res, {
      'policies status is 200': (r) => r.status === 200,
      'policies returns array': (r) => Array.isArray(JSON.parse(r.body).data),
    });
    
    errorRate.add(!success);
  });

  sleep(0.5);

  group('Locations', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/locations`, { headers });
    
    locationsDuration.add(Date.now() - start);
    
    const success = check(res, {
      'locations status is 200': (r) => r.status === 200,
      'locations returns array': (r) => Array.isArray(JSON.parse(r.body).data),
    });
    
    errorRate.add(!success);
  });

  sleep(0.5);

  group('Dashboard Stats', () => {
    const res = http.get(`${BASE_URL}/reports/summary`, { headers });
    
    const success = check(res, {
      'summary status is 200': (r) => r.status === 200,
    });
    
    errorRate.add(!success);
  });

  sleep(1);
}

// Teardown - runs once after tests
export function teardown(data) {
  console.log('Load test completed');
}

// Handle summary - output results
export function handleSummary(data) {
  return {
    'stdout': textSummary(data),
    'api-load-test-results.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  const metrics = data.metrics;

  let summary = '\n========== API Load Test Summary ==========\n\n';

  if (metrics.http_req_duration) {
    const h = metrics.http_req_duration.values;
    summary += `HTTP Request Duration:\n`;
    summary += `  p50: ${h['p(50)'].toFixed(2)}ms\n`;
    summary += `  p95: ${h['p(95)'].toFixed(2)}ms\n`;
    summary += `  p99: ${h['p(99)'].toFixed(2)}ms\n\n`;
  }

  if (metrics.login_duration) {
    const l = metrics.login_duration.values;
    summary += `Login Duration:\n`;
    summary += `  p50: ${l['p(50)'].toFixed(2)}ms\n`;
    summary += `  p95: ${l['p(95)'].toFixed(2)}ms\n\n`;
  }

  if (metrics.policies_duration) {
    const p = metrics.policies_duration.values;
    summary += `Policies Duration:\n`;
    summary += `  p50: ${p['p(50)'].toFixed(2)}ms\n`;
    summary += `  p95: ${p['p(95)'].toFixed(2)}ms\n\n`;
  }

  if (metrics.locations_duration) {
    const loc = metrics.locations_duration.values;
    summary += `Locations Duration:\n`;
    summary += `  p50: ${loc['p(50)'].toFixed(2)}ms\n`;
    summary += `  p95: ${loc['p(95)'].toFixed(2)}ms\n\n`;
  }

  if (metrics.http_reqs) {
    summary += `Total Requests: ${metrics.http_reqs.values.count}\n`;
    summary += `Requests/sec: ${(metrics.http_reqs.values.rate).toFixed(2)}\n\n`;
  }

  if (metrics.errors) {
    summary += `Error Rate: ${(metrics.errors.values.rate * 100).toFixed(3)}%\n\n`;
  }

  summary += '\n============================================\n';

  return summary;
}
