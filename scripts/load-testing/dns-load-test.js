// Nebula DNS - DNS Query Load Test Script
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// Tests the DNS resolution performance via DoH endpoint
//
// Run with: k6 run dns-load-test.js
// For staging: k6 run --env-file=k6-staging.env dns-load-test.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import encoding from 'k6/encoding';

// Custom metrics
const errorRate = new Rate('dns_errors');
const queryDuration = new Trend('dns_query_duration');
const blockedQueries = new Counter('blocked_queries');
const allowedQueries = new Counter('allowed_queries');

// Configuration
const DOH_URL = __ENV.DOH_URL || 'https://localhost:4443/dns-query';
const DNS_SERVER = __ENV.DNS_SERVER || 'localhost';
const DNS_PORT = __ENV.DNS_PORT || '4853';
const TEST_DOMAIN = __ENV.TEST_DOMAIN || 'example.com';
const AUTH_TOKEN = __ENV.DNS_TOKEN || '';
const SCENARIO = __ENV.K6_SCENARIO || 'smoke';

// Test domains
const TEST_DOMAINS = [
  // Allowed domains
  'google.com',
  'github.com',
  'stackoverflow.com',
  'amazon.com',
  'microsoft.com',
  'cloudflare.com',
  'apple.com',
  'netflix.com',
  'twitter.com',
  'linkedin.com',
  
  // Configurable test domain
  TEST_DOMAIN,
  
  // Potentially blocked (for testing)
  'malware-test.example.com',
  'phishing-test.example.com',
  'adult-test.example.com',
];

// DNS wire format helpers
function encodeDNSQuery(domain) {
  // Simplified DNS query encoding for A record
  const parts = domain.split('.');
  let query = '';
  
  // Transaction ID
  query += String.fromCharCode(0x00, 0x01);
  // Flags (standard query)
  query += String.fromCharCode(0x01, 0x00);
  // Questions: 1
  query += String.fromCharCode(0x00, 0x01);
  // Answer RRs: 0
  query += String.fromCharCode(0x00, 0x00);
  // Authority RRs: 0
  query += String.fromCharCode(0x00, 0x00);
  // Additional RRs: 0
  query += String.fromCharCode(0x00, 0x00);
  
  // QNAME
  for (const part of parts) {
    query += String.fromCharCode(part.length);
    query += part;
  }
  query += String.fromCharCode(0x00);
  
  // QTYPE: A (1)
  query += String.fromCharCode(0x00, 0x01);
  // QCLASS: IN (1)
  query += String.fromCharCode(0x00, 0x01);
  
  return encoding.b64encode(query, 'rawurl');
}

// Test scenario definitions
const SCENARIOS = {
  smoke: {
    executor: 'constant-arrival-rate',
    rate: 10,              // 10 requests per second
    timeUnit: '1s',
    duration: '30s',
    preAllocatedVUs: 5,
    maxVUs: 20,
  },
  sustained: {
    executor: 'constant-arrival-rate',
    rate: 1000,           // 1000 requests per second
    timeUnit: '1s',
    duration: '5m',
    preAllocatedVUs: 100,
    maxVUs: 500,
  },
  spike: {
    executor: 'ramping-arrival-rate',
    startRate: 100,
    timeUnit: '1s',
    stages: [
      { duration: '1m', target: 100 },
      { duration: '30s', target: 5000 },  // Spike to 5K QPS
      { duration: '1m', target: 5000 },
      { duration: '30s', target: 100 },
      { duration: '1m', target: 100 },
    ],
    preAllocatedVUs: 200,
    maxVUs: 1000,
  },
};

export const options = {
  scenarios: {
    [SCENARIO]: SCENARIOS[SCENARIO] || SCENARIOS.smoke,
  },
  thresholds: {
    dns_query_duration: ['p(50)<50', 'p(95)<100', 'p(99)<200'],  // ms
    dns_errors: ['rate<0.001'],  // Less than 0.1% errors
    http_req_duration: ['p(99)<500'],
  },
};

export default function() {
  // Pick a random domain
  const domain = TEST_DOMAINS[Math.floor(Math.random() * TEST_DOMAINS.length)];
  
  // Encode DNS query
  const dnsQuery = encodeDNSQuery(domain);
  
  // Make DoH request
  const headers = {
    'Accept': 'application/dns-message',
    'Content-Type': 'application/dns-message',
  };
  
  if (AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }
  
  const start = Date.now();
  const res = http.get(`${DOH_URL}?dns=${dnsQuery}`, { headers });
  const duration = Date.now() - start;
  
  queryDuration.add(duration);
  
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'has dns response': (r) => r.headers['Content-Type'] === 'application/dns-message',
  });
  
  errorRate.add(!success);
  
  // Track blocked vs allowed (simplified - check response code)
  if (res.status === 200) {
    // Parse minimal response to check RCODE
    const body = res.body;
    if (body && body.length >= 4) {
      const flags = body.charCodeAt(2) << 8 | body.charCodeAt(3);
      const rcode = flags & 0x0F;
      
      if (rcode === 3) {  // NXDOMAIN
        blockedQueries.add(1);
      } else {
        allowedQueries.add(1);
      }
    }
  }
  
  // Small random sleep to simulate real traffic patterns
  sleep(Math.random() * 0.1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'dns-load-test-results.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, options) {
  const metrics = data.metrics;
  
  let summary = '\n========== DNS Load Test Summary ==========\n\n';
  
  if (metrics.dns_query_duration) {
    const q = metrics.dns_query_duration.values;
    summary += `DNS Query Duration:\n`;
    summary += `  p50: ${q['p(50)'].toFixed(2)}ms\n`;
    summary += `  p95: ${q['p(95)'].toFixed(2)}ms\n`;
    summary += `  p99: ${q['p(99)'].toFixed(2)}ms\n\n`;
  }
  
  if (metrics.http_reqs) {
    summary += `Total Queries: ${metrics.http_reqs.values.count}\n`;
    summary += `QPS: ${(metrics.http_reqs.values.rate).toFixed(2)}\n\n`;
  }
  
  if (metrics.dns_errors) {
    summary += `Error Rate: ${(metrics.dns_errors.values.rate * 100).toFixed(3)}%\n\n`;
  }
  
  if (metrics.blocked_queries && metrics.allowed_queries) {
    const blocked = metrics.blocked_queries.values.count;
    const allowed = metrics.allowed_queries.values.count;
    summary += `Blocked: ${blocked}\n`;
    summary += `Allowed: ${allowed}\n`;
  }
  
  summary += '\n============================================\n';
  
  return summary;
}
