// Flux Shield - Ensure trial_history exists for admin billing (idempotent)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureTrialHistoryForAdminBilling1761000000000
  implements MigrationInterface
{
  name = 'EnsureTrialHistoryForAdminBilling1761000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trial_status_enum') THEN
          CREATE TYPE "trial_status_enum" AS ENUM ('active', 'converted', 'expired', 'cancelled');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "trial_history" (
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

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_trial_history_tenant'
        ) THEN
          ALTER TABLE "trial_history"
          ADD CONSTRAINT "fk_trial_history_tenant"
          FOREIGN KEY ("tenant_id")
          REFERENCES "tenants"("id")
          ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_trial_history_tenant_tier"
      ON "trial_history"("tenant_id", "trial_tier")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_trial_history_status"
      ON "trial_history"("status")
      WHERE "status" = 'active'
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_trial_history_ends_at"
      ON "trial_history"("ends_at")
      WHERE "status" = 'active'
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_trial_history_tenant_id"
      ON "trial_history"("tenant_id")
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op: table may pre-exist from AddTrialHistory migration
  }
}
