// Nebula DNS - Migration: Update Scheduled Reports Schema
// Aligns scheduled_reports and report_history tables with current entity definitions
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateScheduledReportsSchema1738000000000 implements MigrationInterface {
  name = 'UpdateScheduledReportsSchema1738000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── scheduled_reports ─────────────────────────────────────────────────────

    // Add created_by column (FK to users, nullable)
    await queryRunner.query(`
      ALTER TABLE "scheduled_reports"
        ADD COLUMN IF NOT EXISTS "created_by" uuid,
        ADD COLUMN IF NOT EXISTS "description" text,
        ADD COLUMN IF NOT EXISTS "schedule_type" varchar(20),
        ADD COLUMN IF NOT EXISTS "schedule_day" int,
        ADD COLUMN IF NOT EXISTS "schedule_time" time DEFAULT '08:00',
        ADD COLUMN IF NOT EXISTS "timezone" varchar(50) DEFAULT 'UTC',
        ADD COLUMN IF NOT EXISTS "filters" jsonb DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS "format" varchar(10) DEFAULT 'pdf',
        ADD COLUMN IF NOT EXISTS "last_sent_at" timestamptz
    `);

    // Migrate old schedule column → schedule_type (take first word as best-effort)
    await queryRunner.query(`
      UPDATE "scheduled_reports"
        SET "schedule_type" = CASE
          WHEN "schedule" ILIKE '%daily%'   THEN 'daily'
          WHEN "schedule" ILIKE '%weekly%'  THEN 'weekly'
          WHEN "schedule" ILIKE '%monthly%' THEN 'monthly'
          ELSE 'daily'
        END
      WHERE "schedule_type" IS NULL
    `);

    // Set NOT NULL now that all rows have a value
    await queryRunner.query(`
      ALTER TABLE "scheduled_reports"
        ALTER COLUMN "schedule_type" SET NOT NULL
    `);

    // Migrate last_run_at → last_sent_at
    await queryRunner.query(`
      UPDATE "scheduled_reports"
        SET "last_sent_at" = "last_run_at"
      WHERE "last_run_at" IS NOT NULL AND "last_sent_at" IS NULL
    `);

    // Migrate recipients text[] → jsonb
    await queryRunner.query(`
      ALTER TABLE "scheduled_reports"
        ALTER COLUMN "recipients" TYPE jsonb
        USING to_jsonb("recipients")
    `);

    // Drop old columns no longer in the entity
    await queryRunner.query(`
      ALTER TABLE "scheduled_reports"
        DROP COLUMN IF EXISTS "schedule",
        DROP COLUMN IF EXISTS "config",
        DROP COLUMN IF EXISTS "last_run_at"
    `);

    // Add FK constraint for created_by → users
    await queryRunner.query(`
      ALTER TABLE "scheduled_reports"
        ADD CONSTRAINT "FK_scheduled_reports_created_by"
        FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    // ── report_history ─────────────────────────────────────────────────────────

    // Add missing columns
    await queryRunner.query(`
      ALTER TABLE "report_history"
        ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS "tenant_id" uuid,
        ADD COLUMN IF NOT EXISTS "recipients_sent" jsonb DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS "file_size_bytes" int,
        ADD COLUMN IF NOT EXISTS "error_message" text,
        ADD COLUMN IF NOT EXISTS "started_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "completed_at" timestamptz
    `);

    // Migrate sent_to text[] → recipients_sent jsonb
    await queryRunner.query(`
      UPDATE "report_history"
        SET "recipients_sent" = to_jsonb("sent_to")
      WHERE "sent_to" IS NOT NULL
    `);

    // Migrate error text → error_message text
    await queryRunner.query(`
      UPDATE "report_history"
        SET "error_message" = "error"
      WHERE "error" IS NOT NULL AND "error_message" IS NULL
    `);

    // Backfill tenant_id from parent scheduled_report
    await queryRunner.query(`
      UPDATE "report_history" rh
        SET "tenant_id" = sr."tenant_id"
        FROM "scheduled_reports" sr
        WHERE rh."scheduled_report_id" = sr."id"
        AND rh."tenant_id" IS NULL
    `);

    // Drop old columns
    await queryRunner.query(`
      ALTER TABLE "report_history"
        DROP COLUMN IF EXISTS "sent_to",
        DROP COLUMN IF EXISTS "error"
    `);

    // Add FK constraint for tenant_id
    await queryRunner.query(`
      ALTER TABLE "report_history"
        ADD CONSTRAINT "FK_report_history_tenant"
        FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // report_history: restore old columns
    await queryRunner.query(`ALTER TABLE "report_history" DROP CONSTRAINT IF EXISTS "FK_report_history_tenant"`);
    await queryRunner.query(`
      ALTER TABLE "report_history"
        ADD COLUMN IF NOT EXISTS "sent_to" text[] DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS "error" text
    `);
    await queryRunner.query(`
      UPDATE "report_history"
        SET "sent_to" = ARRAY(SELECT jsonb_array_elements_text("recipients_sent")),
            "error" = "error_message"
    `);
    await queryRunner.query(`
      ALTER TABLE "report_history"
        DROP COLUMN IF EXISTS "updated_at",
        DROP COLUMN IF EXISTS "tenant_id",
        DROP COLUMN IF EXISTS "recipients_sent",
        DROP COLUMN IF EXISTS "file_size_bytes",
        DROP COLUMN IF EXISTS "error_message",
        DROP COLUMN IF EXISTS "started_at",
        DROP COLUMN IF EXISTS "completed_at"
    `);

    // scheduled_reports: restore old columns
    await queryRunner.query(`ALTER TABLE "scheduled_reports" DROP CONSTRAINT IF EXISTS "FK_scheduled_reports_created_by"`);
    await queryRunner.query(`
      ALTER TABLE "scheduled_reports"
        ADD COLUMN IF NOT EXISTS "schedule" varchar(100),
        ADD COLUMN IF NOT EXISTS "config" jsonb,
        ADD COLUMN IF NOT EXISTS "last_run_at" TIMESTAMP
    `);
    await queryRunner.query(`
      UPDATE "scheduled_reports" SET "schedule" = "schedule_type", "last_run_at" = "last_sent_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "scheduled_reports"
        ALTER COLUMN "recipients" TYPE text[] USING ARRAY(SELECT jsonb_array_elements_text("recipients"))
    `);
    await queryRunner.query(`
      ALTER TABLE "scheduled_reports"
        DROP COLUMN IF EXISTS "created_by",
        DROP COLUMN IF EXISTS "description",
        DROP COLUMN IF EXISTS "schedule_type",
        DROP COLUMN IF EXISTS "schedule_day",
        DROP COLUMN IF EXISTS "schedule_time",
        DROP COLUMN IF EXISTS "timezone",
        DROP COLUMN IF EXISTS "filters",
        DROP COLUMN IF EXISTS "format",
        DROP COLUMN IF EXISTS "last_sent_at"
    `);
  }
}
