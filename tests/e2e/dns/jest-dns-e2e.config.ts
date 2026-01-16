/**
 * Nebula DNS - DNS E2E Test Jest Configuration
 * Configuration for DNS enforcement end-to-end tests
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const config: Record<string, any> = {
  displayName: 'DNS E2E Tests',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/*.e2e-spec.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../../../api/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],
  testTimeout: 60000, // 60 seconds for E2E tests
  verbose: true,
  collectCoverage: true,
  coverageDirectory: '<rootDir>/../../../coverage/dns-e2e',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    '<rootDir>/**/*.ts',
    '!<rootDir>/**/*.e2e-spec.ts',
    '!<rootDir>/**/jest*.ts',
    '!<rootDir>/**/setup.ts',
  ],
  // Test order - run tests in specific order for dependencies
  testSequencer: '<rootDir>/test-sequencer.js',
  // Don't stop on first failure
  bail: false,
  // Force exit after tests complete
  forceExit: true,
  // Detect open handles
  detectOpenHandles: true,
};

export default config;
