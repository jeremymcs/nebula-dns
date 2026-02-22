// Nebula DNS - Migration Utilities
// Shared utilities for migration scripts (US-019, US-020, US-021)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { DataSource, QueryRunner } from 'typeorm';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
config({ path: ['.env.local', '.env'] });

/**
 * Migration configuration options
 */
export interface MigrationConfig {
  dryRun: boolean;
  verbose: boolean;
  backup: boolean;
  backupDir: string;
  batchSize: number;
}

/**
 * Migration statistics tracking
 */
export interface MigrationStats {
  processed: number;
  succeeded: number;
  skipped: number;
  failed: number;
  errors: Array<{ id: string; message: string }>;
  startTime: Date;
  endTime?: Date;
}

/**
 * Partner user role to standard user role mapping
 */
export const ROLE_MAPPING: Record<string, string> = {
  partner_owner: 'owner',
  partner_admin: 'admin',
  partner_support: 'admin',
  partner_billing: 'readonly',
  partner_viewer: 'readonly',
};

/**
 * Parse command line arguments for migration scripts
 */
export function parseArgs(): MigrationConfig {
  const args = process.argv.slice(2);

  return {
    dryRun: !args.includes('--execute'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    backup: args.includes('--backup'),
    backupDir:
      args.find((a) => a.startsWith('--backup-dir='))?.split('=')[1] ||
      path.join(process.cwd(), 'backups'),
    batchSize: parseInt(
      args.find((a) => a.startsWith('--batch-size='))?.split('=')[1] || '100',
    ),
  };
}

/**
 * Create a database connection
 */
export async function createConnection(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '4432'),
    username: process.env.DB_USERNAME || 'nebula',
    password: process.env.DB_PASSWORD || 'nebula',
    database: process.env.DB_DATABASE || 'nebula',
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  return dataSource;
}

/**
 * Create initial migration stats object
 */
export function createStats(): MigrationStats {
  return {
    processed: 0,
    succeeded: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    startTime: new Date(),
  };
}

/**
 * Log a message with timestamp
 */
export function log(
  message: string,
  level: 'info' | 'warn' | 'error' = 'info',
): void {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '[INFO]',
    warn: '[WARN]',
    error: '[ERROR]',
  }[level];

  console.log(`${timestamp} ${prefix} ${message}`);
}

/**
 * Log verbose message (only if verbose mode enabled)
 */
export function logVerbose(message: string, config: MigrationConfig): void {
  if (config.verbose) {
    log(message);
  }
}

/**
 * Print migration header
 */
export function printHeader(title: string, config: MigrationConfig): void {
  console.log('\n' + '='.repeat(70));
  console.log(title);
  console.log('='.repeat(70));

  if (config.dryRun) {
    console.log('\n*** DRY RUN MODE - No changes will be made ***\n');
  } else {
    console.log('\n*** EXECUTE MODE - Changes will be committed ***\n');
  }

  console.log(`Configuration:`);
  console.log(`  Dry Run: ${config.dryRun}`);
  console.log(`  Verbose: ${config.verbose}`);
  console.log(`  Backup: ${config.backup}`);
  console.log(`  Batch Size: ${config.batchSize}`);
  console.log('');
}

/**
 * Print migration summary
 */
export function printSummary(
  stats: MigrationStats,
  config: MigrationConfig,
): void {
  stats.endTime = new Date();
  const duration = (stats.endTime.getTime() - stats.startTime.getTime()) / 1000;

  console.log('\n' + '='.repeat(70));
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(70));

  console.log(`\nResults:`);
  console.log(`  Processed: ${stats.processed}`);
  console.log(`  Succeeded: ${stats.succeeded}`);
  console.log(`  Skipped: ${stats.skipped}`);
  console.log(`  Failed: ${stats.failed}`);
  console.log(`  Duration: ${duration.toFixed(2)}s`);

  if (stats.errors.length > 0) {
    console.log(`\nErrors:`);
    for (const error of stats.errors) {
      console.log(`  - [${error.id}] ${error.message}`);
    }
  }

  if (config.dryRun) {
    console.log('\n*** DRY RUN COMPLETE - No changes were made ***');
    console.log('Run with --execute to apply changes.');
  } else {
    console.log('\n*** MIGRATION COMPLETE ***');
  }
}

/**
 * Create backup of specified tables
 */
export async function createBackup(
  dataSource: DataSource,
  tables: string[],
  config: MigrationConfig,
): Promise<string | null> {
  if (!config.backup) {
    return null;
  }

  // Ensure backup directory exists
  if (!fs.existsSync(config.backupDir)) {
    fs.mkdirSync(config.backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(
    config.backupDir,
    `migration-backup-${timestamp}.json`,
  );

  log(`Creating backup to ${backupFile}`);

  const backup: Record<string, any[]> = {};

  for (const table of tables) {
    try {
      const records = await dataSource.query(`SELECT * FROM "${table}"`);
      backup[table] = records;
      log(`  Backed up ${records.length} records from ${table}`);
    } catch (error) {
      log(
        `  Warning: Could not backup table ${table}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'warn',
      );
    }
  }

  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  log(`Backup complete: ${backupFile}`);

  return backupFile;
}

/**
 * Check if a record already exists (for idempotency)
 */
export async function recordExists(
  queryRunner: QueryRunner,
  table: string,
  column: string,
  value: string,
): Promise<boolean> {
  const result = await queryRunner.query(
    `SELECT COUNT(*) as count FROM "${table}" WHERE "${column}" = $1`,
    [value],
  );
  return parseInt(result[0].count) > 0;
}

/**
 * Generate a unique email by appending suffix if needed
 */
export async function generateUniqueEmail(
  queryRunner: QueryRunner,
  baseEmail: string,
  table: string = 'users',
): Promise<string> {
  // First check if base email is available
  const exists = await recordExists(queryRunner, table, 'email', baseEmail);
  if (!exists) {
    return baseEmail;
  }

  // Try with +msp suffix
  const [localPart, domain] = baseEmail.split('@');
  const mspEmail = `${localPart}+msp@${domain}`;
  const mspExists = await recordExists(queryRunner, table, 'email', mspEmail);
  if (!mspExists) {
    return mspEmail;
  }

  // Try with numeric suffixes
  let counter = 1;
  let newEmail = `${localPart}+msp${counter}@${domain}`;
  while (await recordExists(queryRunner, table, 'email', newEmail)) {
    counter++;
    newEmail = `${localPart}+msp${counter}@${domain}`;
    if (counter > 100) {
      throw new Error(`Could not generate unique email for ${baseEmail}`);
    }
  }

  return newEmail;
}

/**
 * Map partner role to standard user role
 */
export function mapPartnerRole(partnerRole: string): string {
  return ROLE_MAPPING[partnerRole] || 'readonly';
}

/**
 * Validate migration prerequisites
 */
export async function validatePrerequisites(
  dataSource: DataSource,
): Promise<{ valid: boolean; issues: string[] }> {
  const issues: string[] = [];

  // Check required tables exist
  const requiredTables = [
    'tenants',
    'users',
    'partners',
    'partner_users',
    'msp_clients',
  ];

  for (const table of requiredTables) {
    try {
      await dataSource.query(`SELECT 1 FROM "${table}" LIMIT 1`);
    } catch {
      issues.push(`Required table "${table}" does not exist`);
    }
  }

  // Check tier column exists on tenants
  try {
    await dataSource.query(`SELECT "tier" FROM "tenants" LIMIT 1`);
  } catch {
    issues.push('Column "tier" does not exist on tenants table');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Transaction wrapper for safe execution
 */
export async function withTransaction<T>(
  dataSource: DataSource,
  config: MigrationConfig,
  operation: (queryRunner: QueryRunner) => Promise<T>,
): Promise<T> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const result = await operation(queryRunner);

    if (config.dryRun) {
      await queryRunner.rollbackTransaction();
      log('Transaction rolled back (dry run)');
    } else {
      await queryRunner.commitTransaction();
      log('Transaction committed');
    }

    return result;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
