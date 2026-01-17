// Nebula DNS - PKCE Support Migration
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPkceSupport1707000000000 implements MigrationInterface {
  name = 'AddPkceSupport1707000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add pkce_required column to sso_configurations table
    // Default to true for new configurations (security best practice)
    await queryRunner.query(`
      ALTER TABLE "sso_configurations"
      ADD COLUMN IF NOT EXISTS "pkce_required" BOOLEAN NOT NULL DEFAULT true
    `);

    // Add comment explaining the column
    await queryRunner.query(`
      COMMENT ON COLUMN "sso_configurations"."pkce_required" IS
      'When true, PKCE (Proof Key for Code Exchange) is used for OIDC authentication. Recommended for security.'
    `);

    // Create index for efficient lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_sso_configurations_pkce_required"
      ON "sso_configurations"("pkce_required")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_sso_configurations_pkce_required"
    `);

    // Remove column
    await queryRunner.query(`
      ALTER TABLE "sso_configurations"
      DROP COLUMN IF EXISTS "pkce_required"
    `);
  }
}
