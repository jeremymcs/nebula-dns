// Nebula DNS - Add Tenant Tier System Migration
// Implements US-001: Add tier field to tenant entity for unified user tiers
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantTierSystem1709000000000 implements MigrationInterface {
  name = 'AddTenantTierSystem1709000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for tenant tier
    await queryRunner.query(`
      CREATE TYPE "tenant_tier_enum" AS ENUM ('home', 'enterprise', 'msp')
    `);

    // Create enum type for subscription status
    await queryRunner.query(`
      CREATE TYPE "subscription_status_enum" AS ENUM ('active', 'grace', 'suspended')
    `);

    // Add tier column with default 'home' for new tenants
    await queryRunner.query(`
      ALTER TABLE "tenants"
      ADD COLUMN "tier" "tenant_tier_enum" NOT NULL DEFAULT 'home'
    `);

    // Add location_limit column (null = unlimited)
    await queryRunner.query(`
      ALTER TABLE "tenants"
      ADD COLUMN "location_limit" integer
    `);

    // Add client_limit column for MSP tier (null = unlimited)
    await queryRunner.query(`
      ALTER TABLE "tenants"
      ADD COLUMN "client_limit" integer
    `);

    // Add subscription_status column with default 'active'
    await queryRunner.query(`
      ALTER TABLE "tenants"
      ADD COLUMN "subscription_status" "subscription_status_enum" NOT NULL DEFAULT 'active'
    `);

    // Add managed_by_msp_id column (self-referential FK for MSP-managed clients)
    await queryRunner.query(`
      ALTER TABLE "tenants"
      ADD COLUMN "managed_by_msp_id" uuid
    `);

    // Add foreign key constraint for managed_by_msp_id
    await queryRunner.query(`
      ALTER TABLE "tenants"
      ADD CONSTRAINT "fk_tenants_managed_by_msp"
      FOREIGN KEY ("managed_by_msp_id")
      REFERENCES "tenants"("id")
      ON DELETE SET NULL
    `);

    // Update existing tenants to 'enterprise' tier (per acceptance criteria)
    await queryRunner.query(`
      UPDATE "tenants"
      SET "tier" = 'enterprise'
      WHERE "tier" = 'home'
    `);

    // Create index for efficient MSP client lookups
    await queryRunner.query(`
      CREATE INDEX "idx_tenants_managed_by_msp" ON "tenants"("managed_by_msp_id")
      WHERE "managed_by_msp_id" IS NOT NULL
    `);

    // Create index for tier-based queries
    await queryRunner.query(`
      CREATE INDEX "idx_tenants_tier" ON "tenants"("tier")
    `);

    // Create index for subscription status queries
    await queryRunner.query(`
      CREATE INDEX "idx_tenants_subscription_status" ON "tenants"("subscription_status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_tenants_subscription_status"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tenants_tier"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_tenants_managed_by_msp"`,
    );

    // Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "tenants"
      DROP CONSTRAINT IF EXISTS "fk_tenants_managed_by_msp"
    `);

    // Drop columns
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP COLUMN IF EXISTS "managed_by_msp_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP COLUMN IF EXISTS "subscription_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP COLUMN IF EXISTS "client_limit"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP COLUMN IF EXISTS "location_limit"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP COLUMN IF EXISTS "tier"`,
    );

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "subscription_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tenant_tier_enum"`);
  }
}
