// Nebula DNS - Add Trial History Migration
// Creates trial_history table for tier upgrade trials (US-032, US-033)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTrialHistory1711000000000 implements MigrationInterface {
  name = 'AddTrialHistory1711000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for trial status
    await queryRunner.query(`
      CREATE TYPE "trial_status_enum" AS ENUM ('active', 'converted', 'expired', 'cancelled')
    `);

    // Create trial_history table
    await queryRunner.query(`
      CREATE TABLE "trial_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "trial_tier" "tenant_tier_enum" NOT NULL,
        "original_tier" "tenant_tier_enum" NOT NULL,
        "started_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "ends_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "status" "trial_status_enum" NOT NULL DEFAULT 'active',
        "ended_at" TIMESTAMP WITH TIME ZONE,
        "converted_at" TIMESTAMP WITH TIME ZONE,
        "stripe_subscription_id" varchar(100),
        "warning_email_sent" boolean NOT NULL DEFAULT false,
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_trial_history" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key constraint to tenants table
    await queryRunner.query(`
      ALTER TABLE "trial_history"
      ADD CONSTRAINT "fk_trial_history_tenant"
      FOREIGN KEY ("tenant_id")
      REFERENCES "tenants"("id")
      ON DELETE CASCADE
    `);

    // Create unique index to enforce one trial per tier per tenant
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_trial_history_tenant_tier"
      ON "trial_history"("tenant_id", "trial_tier")
    `);

    // Create index for finding active trials
    await queryRunner.query(`
      CREATE INDEX "idx_trial_history_status"
      ON "trial_history"("status")
      WHERE "status" = 'active'
    `);

    // Create index for finding expiring trials (for scheduled job)
    await queryRunner.query(`
      CREATE INDEX "idx_trial_history_ends_at"
      ON "trial_history"("ends_at")
      WHERE "status" = 'active'
    `);

    // Create index for tenant lookups
    await queryRunner.query(`
      CREATE INDEX "idx_trial_history_tenant_id"
      ON "trial_history"("tenant_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_trial_history_tenant_id"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_trial_history_ends_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_trial_history_status"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_trial_history_tenant_tier"`,
    );

    // Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "trial_history"
      DROP CONSTRAINT IF EXISTS "fk_trial_history_tenant"
    `);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "trial_history"`);

    // Drop enum type
    await queryRunner.query(`DROP TYPE IF EXISTS "trial_status_enum"`);
  }
}
