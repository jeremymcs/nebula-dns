#!/usr/bin/env node
// Nebula DNS - Migrate Partners to MSP Tier (US-019)
// Migrates existing partner data to the unified tier system
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// Usage:
//   npx ts-node -r tsconfig-paths/register src/scripts/migrations/migrate-partners-to-msp.ts --dry-run
//   npx ts-node -r tsconfig-paths/register src/scripts/migrations/migrate-partners-to-msp.ts --execute --backup
//   npx ts-node -r tsconfig-paths/register src/scripts/migrations/migrate-partners-to-msp.ts --execute --backup --verbose

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
  withTransaction,
  validatePrerequisites,
} from './migration-utils';

/**
 * Partner record from database
 */
interface PartnerRecord {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  contact_email: string | null;
  contact_phone: string | null;
  billing_email: string | null;
  address: string | null;
  branding: object | null;
  settings: object | null;
  stripe_customer_id: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Tenant record linked to a partner
 */
interface PartnerTenantRecord {
  id: string;
  partner_id: string;
  name: string;
  slug: string;
  status: string;
  tier: string;
}

/**
 * Get all partners from the database
 */
async function getAllPartners(
  queryRunner: QueryRunner,
): Promise<PartnerRecord[]> {
  return await queryRunner.query(`
    SELECT
      id, name, slug, status, plan,
      contact_email, contact_phone, billing_email, address,
      branding, settings, stripe_customer_id,
      created_at, updated_at
    FROM partners
    ORDER BY created_at
  `);
}

/**
 * Get all tenants linked to a partner
 */
async function getPartnerTenants(
  queryRunner: QueryRunner,
  partnerId: string,
): Promise<PartnerTenantRecord[]> {
  return await queryRunner.query(
    `
    SELECT id, partner_id, name, slug, status, tier
    FROM tenants
    WHERE partner_id = $1
    ORDER BY created_at
  `,
    [partnerId],
  );
}

/**
 * Create an MSP tenant for a partner if one doesn't exist
 */
async function createMspTenantForPartner(
  queryRunner: QueryRunner,
  partner: PartnerRecord,
  config: MigrationConfig,
): Promise<string> {
  // Check if an MSP tenant already exists for this partner
  const existingMspTenants = await queryRunner.query(
    `
    SELECT id FROM tenants
    WHERE slug = $1 AND tier = 'msp'
  `,
    [`${partner.slug}-msp`],
  );

  if (existingMspTenants.length > 0) {
    logVerbose(
      `  MSP tenant already exists for partner ${partner.name}`,
      config,
    );
    return existingMspTenants[0].id;
  }

  // Check if slug is available
  let mspSlug = `${partner.slug}-msp`;
  const existingSlug = await recordExists(
    queryRunner,
    'tenants',
    'slug',
    mspSlug,
  );
  if (existingSlug) {
    // Generate unique slug
    let counter = 1;
    while (
      await recordExists(
        queryRunner,
        'tenants',
        'slug',
        `${mspSlug}-${counter}`,
      )
    ) {
      counter++;
    }
    mspSlug = `${mspSlug}-${counter}`;
  }

  // Map partner plan to location limit
  const locationLimits: Record<string, number | null> = {
    starter: 10,
    professional: 50,
    enterprise: null, // unlimited
  };

  const clientLimits: Record<string, number | null> = {
    starter: 5,
    professional: 25,
    enterprise: null, // unlimited
  };

  // Create the MSP tenant
  const result = await queryRunner.query(
    `
    INSERT INTO tenants (
      name, slug, status, plan, tier,
      location_limit, client_limit, subscription_status,
      contact_email, contact_phone, address,
      settings, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, 'msp',
      $5, $6, 'active',
      $7, $8, $9,
      $10, $11, $12
    )
    RETURNING id
  `,
    [
      `${partner.name} (MSP)`,
      mspSlug,
      partner.status,
      partner.plan,
      locationLimits[partner.plan] || null,
      clientLimits[partner.plan] || null,
      partner.contact_email,
      partner.contact_phone,
      partner.address,
      JSON.stringify({
        timezone:
          (partner.settings as Record<string, unknown> | null)?.timezone ||
          'UTC',
        branding: partner.branding,
        partnerMigration: {
          originalPartnerId: partner.id,
          migratedAt: new Date().toISOString(),
        },
      }),
      partner.created_at,
      partner.updated_at,
    ],
  );

  log(`  Created MSP tenant "${mspSlug}" for partner "${partner.name}"`);
  return result[0].id;
}

/**
 * Update partner-linked tenants to reference the MSP tenant
 */
async function updatePartnerTenantsToMspClients(
  queryRunner: QueryRunner,
  mspTenantId: string,
  clientTenants: PartnerTenantRecord[],
  config: MigrationConfig,
  stats: MigrationStats,
): Promise<void> {
  for (const tenant of clientTenants) {
    stats.processed++;

    try {
      // Check if msp_clients record already exists
      const existingRelation = await queryRunner.query(
        `SELECT id FROM msp_clients WHERE client_tenant_id = $1`,
        [tenant.id],
      );

      if (existingRelation.length > 0) {
        logVerbose(
          `    Skipping tenant ${tenant.name}: already linked to MSP`,
          config,
        );
        stats.skipped++;
        continue;
      }

      // Create msp_clients record
      await queryRunner.query(
        `
        INSERT INTO msp_clients (msp_tenant_id, client_tenant_id, status)
        VALUES ($1, $2, $3)
        ON CONFLICT (client_tenant_id) DO NOTHING
      `,
        [
          mspTenantId,
          tenant.id,
          tenant.status === 'active' ? 'active' : 'suspended',
        ],
      );

      // Update the tenant's managed_by_msp_id
      await queryRunner.query(
        `
        UPDATE tenants
        SET managed_by_msp_id = $1, updated_at = NOW()
        WHERE id = $2
      `,
        [mspTenantId, tenant.id],
      );

      logVerbose(`    Linked tenant "${tenant.name}" to MSP`, config);
      stats.succeeded++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      log(`    Failed to link tenant ${tenant.name}: ${message}`, 'error');
      stats.failed++;
      stats.errors.push({ id: tenant.id, message });
    }
  }
}

/**
 * Main migration function for partners to MSP tier
 */
async function migratePartnersToMsp(
  queryRunner: QueryRunner,
  config: MigrationConfig,
  stats: MigrationStats,
): Promise<void> {
  log('Starting partner to MSP migration...');

  // Get all partners
  const partners = await getAllPartners(queryRunner);
  log(`Found ${partners.length} partners to migrate`);

  if (partners.length === 0) {
    log('No partners found. Migration complete.');
    return;
  }

  // Process each partner
  for (const partner of partners) {
    log(`\nProcessing partner: ${partner.name} (${partner.slug})`);
    stats.processed++;

    try {
      // Create or get the MSP tenant for this partner
      const mspTenantId = await createMspTenantForPartner(
        queryRunner,
        partner,
        config,
      );

      // Get all tenants linked to this partner
      const clientTenants = await getPartnerTenants(queryRunner, partner.id);
      log(`  Found ${clientTenants.length} client tenants`);

      // Update client tenants to reference the MSP tenant
      await updatePartnerTenantsToMspClients(
        queryRunner,
        mspTenantId,
        clientTenants,
        config,
        stats,
      );

      // Store mapping for reference
      await queryRunner.query(
        `
        UPDATE tenants
        SET settings = settings || $1::jsonb
        WHERE id = $2
      `,
        [
          JSON.stringify({
            partnerMigration: {
              originalPartnerId: partner.id,
              migratedAt: new Date().toISOString(),
              originalPartnerName: partner.name,
            },
          }),
          mspTenantId,
        ],
      );

      stats.succeeded++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      log(`  Failed to migrate partner ${partner.name}: ${message}`, 'error');
      stats.failed++;
      stats.errors.push({ id: partner.id, message });
    }
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const config = parseArgs();
  const stats = createStats();

  printHeader('Nebula DNS - Partner to MSP Migration (US-019)', config);

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
        ['partners', 'partner_users', 'tenants', 'msp_clients'],
        config,
      );
    }

    // Run migration in transaction
    await withTransaction(dataSource, config, async (queryRunner) => {
      await migratePartnersToMsp(queryRunner, config, stats);
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
