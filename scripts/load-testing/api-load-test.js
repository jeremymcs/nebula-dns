/**
 * Nebula DNS - API Load Test Script
 * Run with: k6 run api-load-test.js
 * 
 * Prerequisites:
 * - Install k6: https://k6.io/docs/getting-started/installation/
 * - Set environment variables: API_URL, TEST_EMAIL, TEST_PASSWORD
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const policiesDuration = new Trend('policies_duration');
const locationsDuration = new Trend('locations_duration');

// Configuration
const BASE_URL = __ENV.API_URL || 'http://localhost:4000';
const TEST_EMAIL = __ENV.TEST_EMAIL || 'admin@example.com';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'password123';

// Test scenarios
export const options = {
  scenarios: {
    // Smoke test - verify system works
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      tags: { test_type: 'smoke' },
    },
    // Load test - normal traffic
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
      startTime: '30s',
      tags: { test_type: 'load' },
    },
    // Stress test - find breaking point
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
      startTime: '17m',
      tags: { test_type: 'stress' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    errors: ['rate<0.01'],  // Less than 1% errors
    login_duration: ['p(95)<1000'],
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
