/**
 * Nebula DNS - Add MSP Template Versions Migration
 * Creates tables for template versioning and client applications (US-034, US-035, US-036)
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMspTemplateVersions1711000000000 implements MigrationInterface {
  name = 'AddMspTemplateVersions1711000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // MSP Template Versions - Version history for templates (US-034)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "msp_template_versions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "template_id" uuid NOT NULL REFERENCES "msp_templates"("id") ON DELETE CASCADE,
        "version" int NOT NULL,
        "config" jsonb NOT NULL,
        "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "changelog" text,
        "is_rollback" boolean NOT NULL DEFAULT false,
        "rollback_from_version" int,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "uq_template_version" UNIQUE ("template_id", "version")
      )
    `);

    // Indexes for efficient querying
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_msp_template_versions_template" ON "msp_template_versions"("template_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_msp_template_versions_created" ON "msp_template_versions"("created_at")`,
    );

    // Client Template Applications - Track which version each client uses (US-036)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "client_template_applications" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "template_id" uuid NOT NULL REFERENCES "msp_templates"("id") ON DELETE CASCADE,
        "client_tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "applied_version" int NOT NULL,
        "applied_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "status" varchar(20) NOT NULL DEFAULT 'completed',
        "error_message" text,
        "policy_id" uuid,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "uq_client_template" UNIQUE ("client_tenant_id", "template_id"),
        CONSTRAINT "chk_application_status" CHECK ("status" IN ('pending', 'in_progress', 'completed', 'failed'))
      )
    `);

    // Indexes for client template applications
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_client_template_apps_template" ON "client_template_applications"("template_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_client_template_apps_client" ON "client_template_applications"("client_tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_client_template_apps_status" ON "client_template_applications"("status")`,
    );

    // Template Apply Jobs - Track async apply operations (US-036)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "template_apply_jobs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "template_id" uuid NOT NULL REFERENCES "msp_templates"("id") ON DELETE CASCADE,
        "template_version" int NOT NULL,
        "initiated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "total_clients" int NOT NULL DEFAULT 0,
        "processed_clients" int NOT NULL DEFAULT 0,
        "success_count" int NOT NULL DEFAULT 0,
        "failed_count" int NOT NULL DEFAULT 0,
        "client_ids" jsonb NOT NULL DEFAULT '[]',
        "results" jsonb NOT NULL DEFAULT '[]',
        "started_at" timestamp,
        "completed_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chk_job_status" CHECK ("status" IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled'))
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_template_apply_jobs_template" ON "template_apply_jobs"("template_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_template_apply_jobs_status" ON "template_apply_jobs"("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_template_apply_jobs_created" ON "template_apply_jobs"("created_at")`,
    );

    // Migrate existing templates to have initial version records
    await queryRunner.query(`
      INSERT INTO "msp_template_versions" ("template_id", "version", "config", "changelog", "created_at")
      SELECT
        "id",
        "version",
        "config",
        'Initial version',
        "created_at"
      FROM "msp_templates"
      WHERE NOT EXISTS (
        SELECT 1 FROM "msp_template_versions" WHERE "template_id" = "msp_templates"."id"
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "template_apply_jobs"`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "client_template_applications"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "msp_template_versions"`);
  }
}
