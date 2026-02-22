#!/usr/bin/env node
// Nebula DNS - Migrate Partner Users to Main User Table (US-020)
// Merges partner users into the main users table with MSP tenant association
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// Usage:
//   npx ts-node -r tsconfig-paths/register src/scripts/migrations/migrate-partner-users.ts --dry-run
//   npx ts-node -r tsconfig-paths/register src/scripts/migrations/migrate-partner-users.ts --execute --backup
//   npx ts-node -r tsconfig-paths/register src/scripts/migrations/migrate-partner-users.ts --execute --backup --verbose

import { QueryRunner } from 'typeorm';
import {
  MigrationConfig,
  MigrationStats,
  parseArgs,
  createConnection,
  createStats,
  log,
  logVerbose,
  printHeader,
  printSummary,
  createBackup,
  recordExists,
  generateUniqueEmail,
  mapPartnerRole,
  withTransaction,
  validatePrerequisites,
} from './migration-utils';

/**
 * Partner user record from database
 */
interface PartnerUserRecord {
  id: string;
  partner_id: string;
  email: string;
  name: string;
  password_hash: string;
  role: string;
  status: string;
  failed_login_attempts: number;
  locked_until: Date | null;
  last_login_at: Date | null;
  mfa_enabled: boolean;
  mfa_secret: string | null;
  impersonating_org_id: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Partner record for context
 */
interface PartnerInfo {
  id: string;
  name: string;
  slug: string;
}

// Note: MspTenantMapping interface removed - using Map<string, string | null> directly

/**
 * Get all partner users from the database
 */
async function getAllPartnerUsers(
  queryRunner: QueryRunner,
): Promise<PartnerUserRecord[]> {
  return await queryRunner.query(`
    SELECT
      id, partner_id, email, name, password_hash, role, status,
      failed_login_attempts, locked_until, last_login_at,
      mfa_enabled, mfa_secret, impersonating_org_id,
      created_at, updated_at
    FROM partner_users
    ORDER BY created_at
  `);
}

/**
 * Get partner info by ID
 */
async function getPartnerInfo(
  queryRunner: QueryRunner,
  partnerId: string,
): Promise<PartnerInfo | null> {
  const result = await queryRunner.query(
    `SELECT id, name, slug FROM partners WHERE id = $1`,
    [partnerId],
  );
  return result.length > 0 ? result[0] : null;
}

/**
 * Get MSP tenant ID for a partner (from the migration metadata)
 */
async function getMspTenantForPartner(
  queryRunner: QueryRunner,
  partnerId: string,
): Promise<string | null> {
  // First try to find by migration metadata
  const metadataResult = await queryRunner.query(
    `
    SELECT id FROM tenants
    WHERE tier = 'msp'
    AND settings->>'partnerMigration' IS NOT NULL
    AND (settings->'partnerMigration'->>'originalPartnerId')::text = $1
  `,
    [partnerId],
  );

  if (metadataResult.length > 0) {
    return metadataResult[0].id;
  }

  // Fallback: try to find by slug pattern
  const partner = await getPartnerInfo(queryRunner, partnerId);
  if (partner) {
    const slugResult = await queryRunner.query(
      `SELECT id FROM tenants WHERE slug LIKE $1 AND tier = 'msp' LIMIT 1`,
      [`${partner.slug}-msp%`],
    );
    if (slugResult.length > 0) {
      return slugResult[0].id;
    }
  }

  return null;
}

/**
 * Check if user already exists in main users table (by email or by migration metadata)
 */
async function findExistingUser(
  queryRunner: QueryRunner,
  email: string,
  partnerUserId: string,
): Promise<{ id: string; email: string } | null> {
  // First check by migration metadata in any tenant
  const metadataResult = await queryRunner.query(
    `
    SELECT u.id, u.email
    FROM users u
    WHERE u.id::text = $1
  `,
    [partnerUserId],
  );

  if (metadataResult.length > 0) {
    return metadataResult[0];
  }

  // Check by exact email match
  const emailResult = await queryRunner.query(
    `SELECT id, email FROM users WHERE email = $1`,
    [email],
  );

  if (emailResult.length > 0) {
    return emailResult[0];
  }

  return null;
}

/**
 * Create user record in main users table
 */
async function createUserFromPartnerUser(
  queryRunner: QueryRunner,
  partnerUser: PartnerUserRecord,
  mspTenantId: string,
  finalEmail: string,
  _config: MigrationConfig,
): Promise<string> {
  const mappedRole = mapPartnerRole(partnerUser.role);

  const result = await queryRunner.query(
    `
    INSERT INTO users (
      id, tenant_id, email, name, password_hash, role, status,
      failed_login_attempts, locked_until, last_login_at,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10,
      $11, $12
    )
    RETURNING id
  `,
    [
      partnerUser.id, // Preserve original ID for easier rollback
      mspTenantId,
      finalEmail,
      partnerUser.name,
      partnerUser.password_hash, // Password hash stays the same
      mappedRole,
      partnerUser.status,
      partnerUser.failed_login_attempts,
      partnerUser.locked_until,
      partnerUser.last_login_at,
      partnerUser.created_at,
      partnerUser.updated_at,
    ],
  );

  return result[0].id;
}

/**
 * Migrate MFA settings if enabled
 */
async function migrateMfaSettings(
  queryRunner: QueryRunner,
  partnerUser: PartnerUserRecord,
  userId: string,
  config: MigrationConfig,
): Promise<void> {
  if (!partnerUser.mfa_enabled || !partnerUser.mfa_secret) {
    return;
  }

  // Check if MFA record already exists
  const existingMfa = await recordExists(
    queryRunner,
    'user_mfa',
    'user_id',
    userId,
  );
  if (existingMfa) {
    logVerbose(
      `    MFA already migrated for user ${partnerUser.email}`,
      config,
    );
    return;
  }

  await queryRunner.query(
    `
    INSERT INTO user_mfa (user_id, secret_encrypted, is_enabled, verified_at, created_at, updated_at)
    VALUES ($1, $2, $3, NOW(), $4, $5)
    ON CONFLICT (user_id) DO NOTHING
  `,
    [
      userId,
      partnerUser.mfa_secret,
      partnerUser.mfa_enabled,
      partnerUser.created_at,
      partnerUser.updated_at,
    ],
  );

  logVerbose(`    Migrated MFA settings for user ${partnerUser.email}`, config);
}

/**
 * Store migration metadata for audit trail
 */
async function storeMigrationMetadata(
  queryRunner: QueryRunner,
  partnerUser: PartnerUserRecord,
  userId: string,
  originalEmail: string,
  finalEmail: string,
): Promise<void> {
  // Store in audit_logs for reference
  await queryRunner.query(
    `
    INSERT INTO audit_logs (
      tenant_id, user_id, action, resource_type, resource_id,
      resource_name, metadata, created_at
    )
    SELECT
      tenant_id, $1, 'partner_user_migrated', 'user', $1,
      $2, $3, NOW()
    FROM users WHERE id = $1
  `,
    [
      userId,
      partnerUser.name,
      JSON.stringify({
        originalPartnerId: partnerUser.partner_id,
        originalPartnerUserId: partnerUser.id,
        originalRole: partnerUser.role,
        originalEmail: originalEmail,
        newEmail: finalEmail,
        emailChanged: originalEmail !== finalEmail,
        migratedAt: new Date().toISOString(),
      }),
    ],
  );
}

/**
 * Main migration function for partner users
 */
async function migratePartnerUsers(
  queryRunner: QueryRunner,
  config: MigrationConfig,
  stats: MigrationStats,
): Promise<void> {
  log('Starting partner user migration...');

  // Get all partner users
  const partnerUsers = await getAllPartnerUsers(queryRunner);
  log(`Found ${partnerUsers.length} partner users to migrate`);

  if (partnerUsers.length === 0) {
    log('No partner users found. Migration complete.');
    return;
  }

  // Build partner to MSP tenant mapping cache
  const partnerMspCache: Map<string, string | null> = new Map();

  // Track email conflicts for reporting
  const emailConflicts: Array<{ original: string; new: string; user: string }> =
    [];

  // Process each partner user
  for (const partnerUser of partnerUsers) {
    stats.processed++;

    try {
      log(`\nProcessing partner user: ${partnerUser.email}`);

      // Get or find MSP tenant for this partner
      let mspTenantId = partnerMspCache.get(partnerUser.partner_id);
      if (mspTenantId === undefined) {
        mspTenantId = await getMspTenantForPartner(
          queryRunner,
          partnerUser.partner_id,
        );
        partnerMspCache.set(partnerUser.partner_id, mspTenantId);
      }

      if (!mspTenantId) {
        log(
          `  No MSP tenant found for partner ${partnerUser.partner_id}. Run migrate-partners-to-msp.ts first.`,
          'error',
        );
        stats.failed++;
        stats.errors.push({
          id: partnerUser.id,
          message: `No MSP tenant found for partner ${partnerUser.partner_id}`,
        });
        continue;
      }

      // Check if user already migrated
      const existingUser = await findExistingUser(
        queryRunner,
        partnerUser.email,
        partnerUser.id,
      );

      if (existingUser && existingUser.id === partnerUser.id) {
        logVerbose(`  User already migrated (ID match)`, config);
        stats.skipped++;
        continue;
      }

      // Handle email conflicts
      let finalEmail = partnerUser.email;
      if (existingUser) {
        // Email exists but different user - need to handle conflict
        log(`  Email conflict detected for ${partnerUser.email}`, 'warn');

        // Generate unique email
        finalEmail = await generateUniqueEmail(queryRunner, partnerUser.email);
        log(`  Resolved to: ${finalEmail}`);

        emailConflicts.push({
          original: partnerUser.email,
          new: finalEmail,
          user: partnerUser.name,
        });
      }

      // Check if trying to insert with same ID would fail
      const idExists = await recordExists(
        queryRunner,
        'users',
        'id',
        partnerUser.id,
      );
      if (idExists) {
        logVerbose(
          `  User with ID ${partnerUser.id} already exists, skipping`,
          config,
        );
        stats.skipped++;
        continue;
      }

      // Create the user record
      const userId = await createUserFromPartnerUser(
        queryRunner,
        partnerUser,
        mspTenantId,
        finalEmail,
        config,
      );

      log(`  Created user with role: ${mapPartnerRole(partnerUser.role)}`);

      // Migrate MFA settings
      await migrateMfaSettings(queryRunner, partnerUser, userId, config);

      // Store migration metadata
      await storeMigrationMetadata(
        queryRunner,
        partnerUser,
        userId,
        partnerUser.email,
        finalEmail,
      );

      stats.succeeded++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      log(`  Failed to migrate user ${partnerUser.email}: ${message}`, 'error');
      stats.failed++;
      stats.errors.push({ id: partnerUser.id, message });
    }
  }

  // Report email conflicts
  if (emailConflicts.length > 0) {
    console.log('\n' + '-'.repeat(50));
    console.log('EMAIL CONFLICTS RESOLVED');
    console.log('-'.repeat(50));
    for (const conflict of emailConflicts) {
      console.log(`  ${conflict.user}:`);
      console.log(`    Original: ${conflict.original}`);
      console.log(`    New:      ${conflict.new}`);
    }
    console.log(
      '\nNote: Users with changed emails should be notified to use their new email for login.',
    );
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const config = parseArgs();
  const stats = createStats();

  printHeader('Nebula DNS - Partner User Migration (US-020)', config);

  let dataSource = null;

  try {
    log('Connecting to database...');
    dataSource = await createConnection();
    log('Connected successfully.');

    // Validate prerequisites
    const validation = await validatePrerequisites(dataSource);
    if (!validation.valid) {
      log('Prerequisites check failed:', 'error');
      for (const issue of validation.issues) {
        log(`  - ${issue}`, 'error');
      }
      process.exit(1);
    }
    log('Prerequisites validated.');

    // Create backup if requested
    if (config.backup) {
      await createBackup(
        dataSource,
        ['partner_users', 'users', 'user_mfa', 'audit_logs'],
        config,
      );
    }

    // Run migration in transaction
    await withTransaction(dataSource, config, async (queryRunner) => {
      await migratePartnerUsers(queryRunner, config, stats);
    });

    printSummary(stats, config);
    process.exit(stats.failed > 0 ? 1 : 0);
  } catch (error) {
    log(
      `Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'error',
    );
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    if (dataSource) {
      await dataSource.destroy();
    }
  }
}

// Run the migration
main();
