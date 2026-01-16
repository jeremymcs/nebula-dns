/**
 * Nebula DNS - DNS E2E Test Sequencer
 * Controls the order of test execution for proper dependency handling
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

const Sequencer = require('@jest/test-sequencer').default;

class DnsE2eSequencer extends Sequencer {
  /**
   * Sort test files to run in specific order
   * Some tests depend on others (e.g., policy-sync should run before fail-open)
   */
  sort(tests) {
    // Define test priority order (lower number = run earlier)
    const testOrder = {
      'block-allow.e2e-spec.ts': 1,
      'category-filter.e2e-spec.ts': 2,
      'safe-search.e2e-spec.ts': 3,
      'policy-sync.e2e-spec.ts': 4,
      'tenant-isolation.e2e-spec.ts': 5,
      'clickhouse-logging.e2e-spec.ts': 6,
      'fail-open.e2e-spec.ts': 7, // Run last as it may affect other tests
    };

    return [...tests].sort((a, b) => {
      // Extract filename from path
      const fileA = a.path.split('/').pop();
      const fileB = b.path.split('/').pop();

      const orderA = testOrder[fileA] || 100;
      const orderB = testOrder[fileB] || 100;

      return orderA - orderB;
    });
  }
}

module.exports = DnsE2eSequencer;
