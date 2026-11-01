/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Test Setup Configuration
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.ADMIN_JWT_SECRET =
  process.env.ADMIN_JWT_SECRET || 'test-admin-jwt-secret-for-e2e';

// Set reasonable timeouts for tests
jest.setTimeout(30000);

// Global test utilities
beforeAll(async () => {
  // Setup before all tests
  console.log('Starting E2E test suite');
});

afterAll(async () => {
  // Cleanup after all tests
  console.log('E2E test suite completed');
});
