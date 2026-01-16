/**
 * Nebula DNS - Add MSP Templates Migration
 * Creates the msp_templates table for MSP policy template management
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMspTemplates1705000000000 implements MigrationInterface {
  name = 'AddMspTemplates1705000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // MSP Templates - Policy templates for MSP partners
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "msp_templates" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "partner_id" uuid NOT NULL REFERENCES "partners"("id") ON DELETE CASCADE,
        "name" varchar(255) NOT NULL,
        "description" text,
        "config" jsonb NOT NULL DEFAULT '{}',
        "version" int NOT NULL DEFAULT 1,
        "is_default" boolean NOT NULL DEFAULT false,
        "category" varchar(100),
        "tags" varchar(50)[] DEFAULT '{}',
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for efficient querying
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_msp_templates_partner" ON "msp_templates"("partner_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_msp_templates_is_default" ON "msp_templates"("is_default")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_msp_templates_category" ON "msp_templates"("category")`,
    );

    // Unique constraint for template name within a partner
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_msp_templates_partner_name" ON "msp_templates"("partner_id", "name")`,
    );

    // Template deployment history tracking
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "msp_template_deployments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "template_id" uuid NOT NULL REFERENCES "msp_templates"("id") ON DELETE CASCADE,
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "deployed_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "template_version" int NOT NULL,
        "deployment_mode" varchar(20) NOT NULL DEFAULT 'overlay',
        "status" varchar(20) NOT NULL DEFAULT 'completed',
        "policies_created" int NOT NULL DEFAULT 0,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chk_deployment_mode" CHECK ("deployment_mode" IN ('new_tenant', 'overlay')),
        CONSTRAINT "chk_deployment_status" CHECK ("status" IN ('pending', 'in_progress', 'completed', 'failed'))
      )
    `);

    // Indexes for deployment history
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_msp_template_deployments_template" ON "msp_template_deployments"("template_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_msp_template_deployments_tenant" ON "msp_template_deployments"("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_msp_template_deployments_created" ON "msp_template_deployments"("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "msp_template_deployments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "msp_templates"`);
  }
}
