#!/usr/bin/env node
// Nebula DNS - Assign Default Tiers to Existing Tenants (US-021)
// Categorizes existing tenants by their characteristics and assigns appropriate tiers
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// Usage:
//   npx ts-node -r tsconfig-paths/register src/scripts/migrations/assign-default-tiers.ts --dry-run
//   npx ts-node -r tsconfig-paths/register src/scripts/migrations/assign-default-tiers.ts --execute --backup
//   npx ts-node -r tsconfig-paths/register src/scripts/migrations/assign-default-tiers.ts --execute --backup --verbose
//   npx ts-node -r tsconfig-paths/register src/scripts/migrations/assign-default-tiers.ts --execute --notify
//
// Tier Assignment Rules:
//   1. Tenants with partner relationships -> 'msp' tier
//   2. Tenants with 5+ locations -> 'enterprise' tier
//   3. Tenants with <5 locations -> 'home' tier

import * as fs from 'fs';
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
  withTransaction,
  validatePrerequisites,
} from './migration-utils';

/**
 * Extended config for tier assignment
 */
interface TierAssignmentConfig extends MigrationConfig {
  notify: boolean;
  overrideFile: string | null;
}

/**
 * Tenant record with location count
 */
interface TenantWithStats {
  id: string;
  name: string;
  slug: string;
  status: string;
  tier: string;
  partner_id: string | null;
  managed_by_msp_id: string | null;
  location_count: number;
  contact_email: string | null;
}

/**
 * Tier assignment result
 */
interface TierAssignment {
  tenantId: string;
  tenantName: string;
  currentTier: string;
  newTier: string;
  reason: string;
  contactEmail: string | null;
}

/**
 * Manual override entry
 */
interface TierOverride {
  tenantId: string;
  tier: 'home' | 'enterprise' | 'msp';
  reason: string;
}

// Threshold for enterprise tier
const ENTERPRISE_LOCATION_THRESHOLD = 5;

/**
 * Parse extended command line arguments
 */
function parseTierAssignmentArgs(): TierAssignmentConfig {
  const baseConfig = parseArgs();
  const args = process.argv.slice(2);

  return {
    ...baseConfig,
    notify: args.includes('--notify'),
    overrideFile:
      args.find((a) => a.startsWith('--override-file='))?.split('=')[1] || null,
  };
}

/**
 * Get all tenants with their location counts
 */
async function getAllTenantsWithStats(
  queryRunner: QueryRunner,
): Promise<TenantWithStats[]> {
  return await queryRunner.query(`
    SELECT
      t.id,
      t.name,
      t.slug,
      t.status,
      t.tier,
      t.partner_id,
      t.managed_by_msp_id,
      t.contact_email,
      COUNT(l.id)::int as location_count
    FROM tenants t
    LEFT JOIN locations l ON l.tenant_id = t.id
    GROUP BY t.id, t.name, t.slug, t.status, t.tier, t.partner_id, t.managed_by_msp_id, t.contact_email
    ORDER BY t.created_at
  `);
}

/**
 * Load manual overrides from file
 */
function loadOverrides(overrideFile: string | null): Map<string, TierOverride> {
  const overrides = new Map<string, TierOverride>();

  if (!overrideFile) {
    return overrides;
  }

  try {
    const data = JSON.parse(fs.readFileSync(overrideFile, 'utf-8'));

    if (Array.isArray(data)) {
      for (const override of data) {
        if (override.tenantId && override.tier) {
          overrides.set(override.tenantId, override);
        }
      }
    }

    log(`Loaded ${overrides.size} manual overrides from ${overrideFile}`);
  } catch (error) {
    log(
      `Warning: Could not load overrides from ${overrideFile}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'warn',
    );
  }

  return overrides;
}

/**
 * Determine the appropriate tier for a tenant
 */
function determineTier(
  tenant: TenantWithStats,
  overrides: Map<string, TierOverride>,
): { tier: string; reason: string } {
  // Check for manual override
  const override = overrides.get(tenant.id);
  if (override) {
    return {
      tier: override.tier,
      reason: `Manual override: ${override.reason}`,
    };
  }

  // Rule 1: Partner relationship -> MSP tier
  if (tenant.partner_id || tenant.managed_by_msp_id) {
    // If it's managed by an MSP, it stays as client (not MSP tier itself)
    if (tenant.managed_by_msp_id && !tenant.partner_id) {
      // This is a client managed by MSP - determine by location count
      if (tenant.location_count >= ENTERPRISE_LOCATION_THRESHOLD) {
        return {
          tier: 'enterprise',
          reason: `MSP client with ${tenant.location_count} locations (>= ${ENTERPRISE_LOCATION_THRESHOLD})`,
        };
      }
      return {
        tier: 'home',
        reason: `MSP client with ${tenant.location_count} locations (< ${ENTERPRISE_LOCATION_THRESHOLD})`,
      };
    }

    // Has partner_id means this was a partner's org - should be MSP
    return {
      tier: 'msp',
      reason: `Has partner relationship (partner_id: ${tenant.partner_id})`,
    };
  }

  // Rule 2: 5+ locations -> Enterprise tier
  if (tenant.location_count >= ENTERPRISE_LOCATION_THRESHOLD) {
    return {
      tier: 'enterprise',
      reason: `${tenant.location_count} locations (>= ${ENTERPRISE_LOCATION_THRESHOLD} threshold)`,
    };
  }

  // Rule 3: <5 locations -> Home tier
  return {
    tier: 'home',
    reason: `${tenant.location_count} locations (< ${ENTERPRISE_LOCATION_THRESHOLD} threshold)`,
  };
}

/**
 * Check if tenant is already an MSP (from previous migration)
 */
async function isTenantMsp(
  queryRunner: QueryRunner,
  tenantId: string,
): Promise<boolean> {
  const result = await queryRunner.query(
    `
    SELECT COUNT(*) as count FROM msp_clients WHERE msp_tenant_id = $1
  `,
    [tenantId],
  );
  return parseInt(result[0].count) > 0;
}

/**
 * Update tenant tier
 */
async function updateTenantTier(
  queryRunner: QueryRunner,
  tenantId: string,
  newTier: string,
): Promise<void> {
  await queryRunner.query(
    `
    UPDATE tenants
    SET tier = $1, updated_at = NOW()
    WHERE id = $2
  `,
    [newTier, tenantId],
  );
}

/**
 * Record tier assignment in audit logs
 */
async function recordTierAssignment(
  queryRunner: QueryRunner,
  assignment: TierAssignment,
): Promise<void> {
  await queryRunner.query(
    `
    INSERT INTO audit_logs (
      tenant_id, action, resource_type, resource_id,
      resource_name, old_value, new_value, metadata, created_at
    ) VALUES (
      $1, 'tier_assigned', 'tenant', $1,
      $2, $3, $4, $5, NOW()
    )
  `,
    [
      assignment.tenantId,
      assignment.tenantName,
      JSON.stringify({ tier: assignment.currentTier }),
      JSON.stringify({ tier: assignment.newTier }),
      JSON.stringify({
        reason: assignment.reason,
        migrationType: 'default_tier_assignment',
        assignedAt: new Date().toISOString(),
      }),
    ],
  );
}

/**
 * Queue notification for tier assignment (would integrate with notification system)
 */
async function queueTierNotification(
  queryRunner: QueryRunner,
  assignment: TierAssignment,
  config: TierAssignmentConfig,
): Promise<void> {
  if (!config.notify || !assignment.contactEmail) {
    return;
  }

  // In a real implementation, this would queue a notification via the notification service
  // For now, we'll log it and could insert into a notifications queue table
  logVerbose(
    `  Would notify ${assignment.contactEmail} about tier assignment: ${assignment.newTier}`,
    config,
  );

  // Store notification intent in metadata
  await queryRunner.query(
    `
    INSERT INTO audit_logs (
      tenant_id, action, resource_type, resource_id,
      resource_name, metadata, created_at
    ) VALUES (
      $1, 'tier_notification_queued', 'tenant', $1,
      $2, $3, NOW()
    )
  `,
    [
      assignment.tenantId,
      assignment.tenantName,
      JSON.stringify({
        email: assignment.contactEmail,
        newTier: assignment.newTier,
        reason: assignment.reason,
      }),
    ],
  );
}

/**
 * Main tier assignment function
 */
async function assignDefaultTiers(
  queryRunner: QueryRunner,
  config: TierAssignmentConfig,
  stats: MigrationStats,
): Promise<void> {
  log('Starting tier assignment...');

  // Load manual overrides
  const overrides = loadOverrides(config.overrideFile);

  // Get all tenants with stats
  const tenants = await getAllTenantsWithStats(queryRunner);
  log(`Found ${tenants.length} tenants to process`);

  if (tenants.length === 0) {
    log('No tenants found. Assignment complete.');
    return;
  }

  // Track assignments for summary
  const assignments: TierAssignment[] = [];
  const tierCounts = { home: 0, enterprise: 0, msp: 0 };

  // Process each tenant
  for (const tenant of tenants) {
    stats.processed++;

    try {
      logVerbose(
        `\nProcessing tenant: ${tenant.name} (${tenant.slug})`,
        config,
      );
      logVerbose(`  Current tier: ${tenant.tier}`, config);
      logVerbose(`  Location count: ${tenant.location_count}`, config);

      // Check if tenant already has clients (is an MSP)
      const isExistingMsp = await isTenantMsp(queryRunner, tenant.id);
      if (isExistingMsp && tenant.tier !== 'msp') {
        // Force MSP tier for tenants that already have clients
        const assignment: TierAssignment = {
          tenantId: tenant.id,
          tenantName: tenant.name,
          currentTier: tenant.tier,
          newTier: 'msp',
          reason: 'Has MSP clients in msp_clients table',
          contactEmail: tenant.contact_email,
        };

        await updateTenantTier(queryRunner, tenant.id, 'msp');
        await recordTierAssignment(queryRunner, assignment);
        await queueTierNotification(queryRunner, assignment, config);

        assignments.push(assignment);
        tierCounts.msp++;
        stats.succeeded++;
        log(`  Assigned tier: msp (has existing clients)`);
        continue;
      }

      // Determine tier based on rules
      const { tier: newTier, reason } = determineTier(tenant, overrides);

      // Skip if tier is already correct
      if (tenant.tier === newTier) {
        logVerbose(`  Tier already correct: ${newTier}`, config);
        stats.skipped++;
        tierCounts[newTier as keyof typeof tierCounts]++;
        continue;
      }

      const assignment: TierAssignment = {
        tenantId: tenant.id,
        tenantName: tenant.name,
        currentTier: tenant.tier,
        newTier: newTier,
        reason: reason,
        contactEmail: tenant.contact_email,
      };

      // Update the tier
      await updateTenantTier(queryRunner, tenant.id, newTier);

      // Record in audit log
      await recordTierAssignment(queryRunner, assignment);

      // Queue notification if enabled
      await queueTierNotification(queryRunner, assignment, config);

      assignments.push(assignment);
      tierCounts[newTier as keyof typeof tierCounts]++;
      stats.succeeded++;

      log(`  Assigned tier: ${newTier} (${reason})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      log(`  Failed to assign tier for ${tenant.name}: ${message}`, 'error');
      stats.failed++;
      stats.errors.push({ id: tenant.id, message });
    }
  }

  // Print tier distribution summary
  console.log('\n' + '-'.repeat(50));
  console.log('TIER DISTRIBUTION');
  console.log('-'.repeat(50));
  console.log(`  Home:       ${tierCounts.home}`);
  console.log(`  Enterprise: ${tierCounts.enterprise}`);
  console.log(`  MSP:        ${tierCounts.msp}`);
  console.log(`  Total:      ${tenants.length}`);

  // Print changed assignments
  if (assignments.length > 0) {
    console.log('\n' + '-'.repeat(50));
    console.log('TIER CHANGES');
    console.log('-'.repeat(50));
    for (const assignment of assignments) {
      console.log(`  ${assignment.tenantName}:`);
      console.log(`    ${assignment.currentTier} -> ${assignment.newTier}`);
      console.log(`    Reason: ${assignment.reason}`);
    }
  }
}

/**
 * Generate override template file
 */
async function generateOverrideTemplate(
  queryRunner: QueryRunner,
): Promise<void> {
  const tenants = await getAllTenantsWithStats(queryRunner);

  const template = tenants.map((t) => ({
    tenantId: t.id,
    tenantName: t.name,
    currentTier: t.tier,
    locationCount: t.location_count,
    tier: '', // Admin fills this in
    reason: '', // Admin fills this in
  }));

  const filename = `tier-overrides-template-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(template, null, 2));

  log(`Override template generated: ${filename}`);
  log(
    'Edit this file and use with --override-file=<path> to apply manual overrides.',
  );
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const config = parseTierAssignmentArgs();
  const stats = createStats();

  // Check for template generation mode
  if (process.argv.includes('--generate-template')) {
    const dataSource = await createConnection();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      await generateOverrideTemplate(queryRunner);
    } finally {
      await queryRunner.release();
      await dataSource.destroy();
    }
    return;
  }

  printHeader('Nebula DNS - Default Tier Assignment (US-021)', config);

  console.log(`Additional Options:`);
  console.log(`  Notify: ${config.notify}`);
  console.log(`  Override File: ${config.overrideFile || 'none'}`);
  console.log(
    `  Enterprise Threshold: ${ENTERPRISE_LOCATION_THRESHOLD} locations`,
  );
  console.log('');

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
      await createBackup(dataSource, ['tenants', 'audit_logs'], config);
    }

    // Run tier assignment in transaction
    await withTransaction(dataSource, config, async (queryRunner) => {
      await assignDefaultTiers(queryRunner, config, stats);
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
