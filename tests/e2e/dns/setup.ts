/**
 * Nebula DNS - DNS E2E Test Setup
 * Global setup and teardown for DNS enforcement tests
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import { PolicyServiceClient, checkDockerServices, sleep } from './test-helpers';

// Set test environment
process.env.NODE_ENV = 'test';

// Extend Jest timeout for E2E tests
jest.setTimeout(60000);

// Global test setup
beforeAll(async () => {
  console.log('\n========================================');
  console.log('  Nebula DNS - DNS E2E Test Suite');
  console.log('========================================\n');

  // Log environment configuration
  console.log('Test Environment:');
  console.log(`  API URL:        ${process.env.API_URL || 'http://localhost:4010'}`);
  console.log(`  DoH URL:        ${process.env.DOH_URL || 'https://localhost:4443/dns-query'}`);
  console.log(`  Policy Svc URL: ${process.env.POLICY_SVC_URL || 'http://localhost:4080'}`);
  console.log(`  ClickHouse URL: ${process.env.CLICKHOUSE_URL || 'http://localhost:4123'}`);
  console.log('');

  // Check if Docker services are available
  try {
    const services = await checkDockerServices();
    console.log('Docker Services Status:');
    console.log(`  API:         ${services.api ? '✓' : '✗'}`);
    console.log(`  Policy Svc:  ${services.policySvc ? '✓' : '✗'}`);
    console.log(`  ClickHouse:  ${services.clickhouse ? '✓' : '✗'}`);
    console.log('');

    if (!services.policySvc) {
      console.warn('WARNING: Policy service is not available. Some tests may be skipped.');
    }
  } catch (error) {
    console.warn('Could not check Docker services:', error);
  }

  // Wait for services to be ready
  console.log('Waiting for services to be ready...');
  await sleep(2000);

  console.log('Setup complete. Starting tests...\n');
});

// Global test teardown
afterAll(async () => {
  console.log('\n========================================');
  console.log('  DNS E2E Test Suite Completed');
  console.log('========================================\n');
});

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
