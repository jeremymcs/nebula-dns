#!/usr/bin/env node
// Nebula DNS - Run All Partner to MSP Migrations
// Orchestrates US-019, US-020, and US-021 migrations in sequence
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// Usage:
//   npx ts-node -r tsconfig-paths/register src/scripts/migrations/run-all-migrations.ts --dry-run
//   npx ts-node -r tsconfig-paths/register src/scripts/migrations/run-all-migrations.ts --execute --backup
//   npx ts-node -r tsconfig-paths/register src/scripts/migrations/run-all-migrations.ts --execute --backup --verbose --notify
//
// This script runs all three migrations in the correct order:
//   1. migrate-partners-to-msp.ts (US-019) - Creates MSP tenants from partners
//   2. migrate-partner-users.ts (US-020) - Migrates partner users to main users table
//   3. assign-default-tiers.ts (US-021) - Assigns tiers to all tenants
//
// Note: Each migration is idempotent and can be re-run safely.

import { execSync } from 'child_process';
import * as path from 'path';

interface MigrationStep {
  name: string;
  script: string;
  description: string;
}

const MIGRATIONS: MigrationStep[] = [
  {
    name: 'US-019: Migrate Partners to MSP',
    script: 'migrate-partners-to-msp.ts',
    description:
      'Creates MSP tenants from existing partners and links client tenants',
  },
  {
    name: 'US-020: Migrate Partner Users',
    script: 'migrate-partner-users.ts',
    description:
      'Migrates partner_users to the main users table with MSP tenant association',
  },
  {
    name: 'US-021: Assign Default Tiers',
    script: 'assign-default-tiers.ts',
    description:
      'Assigns home/enterprise/msp tiers based on tenant characteristics',
  },
];

function printBanner(): void {
  console.log('\n' + '='.repeat(70));
  console.log('NEBULA DNS - UNIFIED TIER MIGRATION SUITE');
  console.log('='.repeat(70));
  console.log('\nThis script will run the following migrations in sequence:\n');

  for (let i = 0; i < MIGRATIONS.length; i++) {
    const m = MIGRATIONS[i];
    console.log(`  ${i + 1}. ${m.name}`);
    console.log(`     ${m.description}`);
    console.log('');
  }
}

function parseArgs(): string[] {
  // Pass through all args except the script name
  return process.argv.slice(2);
}

function runMigration(step: MigrationStep, args: string[]): boolean {
  const scriptPath = path.join(__dirname, step.script);
  const command = `npx ts-node -r tsconfig-paths/register ${scriptPath} ${args.join(' ')}`;

  console.log('\n' + '-'.repeat(70));
  console.log(`RUNNING: ${step.name}`);
  console.log('-'.repeat(70));
  console.log(`Script: ${step.script}`);
  console.log(`Command: ${command}`);
  console.log('');

  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '../../..'),
    });
    return true;
  } catch (error) {
    console.error(`\nMigration failed: ${step.name}`);
    return false;
  }
}

function main(): void {
  printBanner();

  const args = parseArgs();

  // Check for help
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: run-all-migrations.ts [options]');
    console.log('\nOptions:');
    console.log('  --dry-run       Run without making changes (default)');
    console.log('  --execute       Actually apply changes');
    console.log('  --backup        Create JSON backup before each migration');
    console.log('  --verbose, -v   Show detailed progress');
    console.log('  --notify        Queue notifications for tier assignments');
    console.log('  --help, -h      Show this help message');
    console.log('\nExamples:');
    console.log(
      '  npm run migrate:all -- --dry-run           # Preview all changes',
    );
    console.log(
      '  npm run migrate:all -- --execute --backup  # Apply changes with backup',
    );
    process.exit(0);
  }

  const isDryRun = !args.includes('--execute');

  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'EXECUTE'}`);
  console.log(`Arguments: ${args.join(' ') || '(none)'}`);

  if (!isDryRun) {
    console.log('\n*** WARNING: Execute mode - changes will be committed! ***');
    console.log('Press Ctrl+C within 5 seconds to abort...\n');

    // Give user time to abort
    const startTime = Date.now();
    while (Date.now() - startTime < 5000) {
      // Busy wait (not ideal but simple for CLI)
    }
  }

  const results: Array<{ step: MigrationStep; success: boolean }> = [];

  for (const step of MIGRATIONS) {
    const success = runMigration(step, args);
    results.push({ step, success });

    if (!success && !isDryRun) {
      console.error('\n*** Migration failed. Stopping execution. ***');
      console.error(
        'Review the error above and fix the issue before continuing.',
      );
      console.error(
        'Migrations are idempotent - you can safely re-run after fixing.',
      );
      break;
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('MIGRATION SUITE SUMMARY');
  console.log('='.repeat(70));

  for (const { step, success } of results) {
    const status = success ? 'PASSED' : 'FAILED';
    console.log(`  ${step.name}: ${status}`);
  }

  const allPassed = results.every((r) => r.success);
  const exitCode = allPassed ? 0 : 1;

  if (isDryRun) {
    console.log('\n*** DRY RUN COMPLETE ***');
    console.log('Run with --execute to apply changes.');
  } else if (allPassed) {
    console.log('\n*** ALL MIGRATIONS COMPLETE ***');
  } else {
    console.log('\n*** MIGRATION SUITE INCOMPLETE ***');
    console.log('Fix the failed migration and re-run.');
  }

  process.exit(exitCode);
}

main();
