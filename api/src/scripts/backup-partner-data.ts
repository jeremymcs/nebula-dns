// Nebula DNS - Partner Data Backup Script
// Creates a JSON dump of all partner data before dropping legacy tables
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// Usage: npx ts-node -r tsconfig-paths/register src/scripts/backup-partner-data.ts
// Or: npm run script:backup-partner-data

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

interface PartnerBackup {
  exportedAt: string;
  version: string;
  partners: any[];
  partnerUsers: any[];
  tenantPartnerMappings: any[];
}

async function backupPartnerData() {
  console.log('=================================================');
  console.log('  Nebula DNS - Partner Data Backup Script');
  console.log('=================================================\n');

  // Initialize NestJS application to get database connection
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const dataSource = app.get(DataSource);

    // Check if tables exist
    const tablesExist = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'partners'
      ) as partners_exist,
      EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'partner_users'
      ) as partner_users_exist
    `);

    if (!tablesExist[0].partners_exist && !tablesExist[0].partner_users_exist) {
      console.log('INFO: Partner tables do not exist - nothing to backup.\n');
      await app.close();
      return;
    }

    // Fetch all partners
    console.log('Fetching partners...');
    const partners = tablesExist[0].partners_exist
      ? await dataSource.query(`
          SELECT
            id,
            created_at,
            updated_at,
            name,
            slug,
            status,
            plan,
            contact_email,
            contact_phone,
            billing_email,
            address,
            branding,
            settings,
            stripe_customer_id
          FROM partners
          ORDER BY created_at
        `)
      : [];
    console.log(`  Found ${partners.length} partner(s)`);

    // Fetch all partner users
    console.log('Fetching partner users...');
    const partnerUsers = tablesExist[0].partner_users_exist
      ? await dataSource.query(`
          SELECT
            id,
            created_at,
            updated_at,
            partner_id,
            email,
            name,
            password_hash,
            role,
            status,
            failed_login_attempts,
            locked_until,
            last_login_at,
            mfa_enabled,
            mfa_secret,
            impersonating_org_id
          FROM partner_users
          ORDER BY created_at
        `)
      : [];
    console.log(`  Found ${partnerUsers.length} partner user(s)`);

    // Fetch tenant-partner mappings
    console.log('Fetching tenant-partner mappings...');
    const tenantPartnerMappings = await dataSource.query(`
      SELECT
        id,
        name,
        slug,
        partner_id,
        managed_by_msp_id
      FROM tenants
      WHERE partner_id IS NOT NULL
      ORDER BY created_at
    `);
    console.log(
      `  Found ${tenantPartnerMappings.length} tenant(s) with partner associations`,
    );

    // Create backup object
    const backup: PartnerBackup = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      partners,
      partnerUsers,
      tenantPartnerMappings,
    };

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups');
    const backupFile = path.join(backupDir, `partner-data-${timestamp}.json`);

    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Write backup file
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

    console.log('\n=================================================');
    console.log('  BACKUP COMPLETED SUCCESSFULLY');
    console.log('=================================================');
    console.log(`\nBackup file: ${backupFile}`);
    console.log(`\nSummary:`);
    console.log(`  - Partners: ${partners.length}`);
    console.log(`  - Partner Users: ${partnerUsers.length}`);
    console.log(`  - Tenant Mappings: ${tenantPartnerMappings.length}`);

    // Check migration status
    const unmigrated = tenantPartnerMappings.filter(
      (t: any) => t.partner_id && !t.managed_by_msp_id,
    );
    if (unmigrated.length > 0) {
      console.log(
        `\n  WARNING: ${unmigrated.length} tenant(s) have partner_id but no managed_by_msp_id`,
      );
      console.log(
        `  These tenants need to be migrated before dropping partner tables.\n`,
      );
    } else {
      console.log(
        `\n  All tenants with partner associations have been migrated to MSP system.`,
      );
      console.log(`  It is safe to run the DropPartnerTables migration.\n`);
    }
  } catch (error) {
    console.error('ERROR: Backup failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

// Run the backup
backupPartnerData();
