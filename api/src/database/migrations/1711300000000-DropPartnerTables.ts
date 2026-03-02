// Nebula DNS - Drop Legacy Partner Tables Migration
// Removes the legacy partner system tables after successful migration to the new tier system
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// IMPORTANT: This migration should only be run after verifying that all partner data
// has been successfully migrated to the new MSP tier system. Run the backup script
// first: npm run script:backup-partner-data

import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropPartnerTables1711000000000 implements MigrationInterface {
  name = 'DropPartnerTables1711000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // STEP 1: Verify migration is safe to run
    // Check if there are any tenants still using partner_id that haven't been migrated
    const unmigrated = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM tenants
      WHERE partner_id IS NOT NULL
        AND managed_by_msp_id IS NULL
    `);

    if (unmigrated[0].count > 0) {
      throw new Error(
        `Cannot drop partner tables: ${unmigrated[0].count} tenant(s) still reference partner_id but have not been migrated to the new MSP system. Please run the migration script first.`,
      );
    }

    // STEP 2: Remove foreign key constraint from tenants table
    await queryRunner.query(`
      ALTER TABLE "tenants"
      DROP CONSTRAINT IF EXISTS "FK_tenants_partner"
    `);

    // STEP 3: Remove partner_id column from tenants
    // This column is no longer needed as tenants now use managed_by_msp_id
    await queryRunner.query(`
      ALTER TABLE "tenants"
      DROP COLUMN IF EXISTS "partner_id"
    `);

    // STEP 4: Drop indexes on partner tables
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_partner_users_status"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_partner_users_partner_id"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_partners_plan"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_partners_status"`);

    // STEP 5: Drop partner_users table
    await queryRunner.query(`DROP TABLE IF EXISTS "partner_users" CASCADE`);

    // STEP 6: Drop partners table
    await queryRunner.query(`DROP TABLE IF EXISTS "partners" CASCADE`);

    // Log completion
    console.log(
      '==> Successfully dropped legacy partner tables (partners, partner_users)',
    );
    console.log(
      '==> The system now uses the new tier-based MSP system (managed_by_msp_id)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // STEP 1: Recreate partners table
    await queryRunner.query(`
      CREATE TABLE "partners" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "name" varchar(255) NOT NULL,
        "slug" varchar(255) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "plan" varchar(20) NOT NULL DEFAULT 'starter',
        "contact_email" varchar(255),
        "contact_phone" varchar(255),
        "billing_email" varchar(255),
        "address" text,
        "branding" jsonb,
        "settings" jsonb,
        "stripe_customer_id" varchar(255),
        CONSTRAINT "UQ_partners_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_partners" PRIMARY KEY ("id")
      )
    `);

    // STEP 2: Recreate partner_users table
    await queryRunner.query(`
      CREATE TABLE "partner_users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "partner_id" uuid NOT NULL,
        "email" varchar(255) NOT NULL,
        "name" varchar(255) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "role" varchar(30) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "failed_login_attempts" integer NOT NULL DEFAULT 0,
        "locked_until" TIMESTAMP,
        "last_login_at" TIMESTAMP,
        "mfa_enabled" boolean NOT NULL DEFAULT false,
        "mfa_secret" varchar(255),
        "impersonating_org_id" uuid,
        CONSTRAINT "UQ_partner_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_partner_users" PRIMARY KEY ("id"),
        CONSTRAINT "FK_partner_users_partner" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE
      )
    `);

    // STEP 3: Re-add partner_id column to tenants
    await queryRunner.query(`
      ALTER TABLE "tenants"
      ADD COLUMN "partner_id" uuid
    `);

    // STEP 4: Re-add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "tenants"
      ADD CONSTRAINT "FK_tenants_partner" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL
    `);

    // STEP 5: Recreate indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_partners_status" ON "partners" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_partners_plan" ON "partners" ("plan")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_partner_users_partner_id" ON "partner_users" ("partner_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_partner_users_status" ON "partner_users" ("status")`,
    );

    console.log('==> Restored legacy partner tables (partners, partner_users)');
    console.log(
      '==> NOTE: Data must be restored from backup - see docs/msp-migration-guide.md',
    );
  }
}
