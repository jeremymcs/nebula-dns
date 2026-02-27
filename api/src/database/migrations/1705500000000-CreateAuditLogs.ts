// Nebula DNS - Create Audit Logs Table
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogs1705500000000 implements MigrationInterface {
  name = 'CreateAuditLogs1705500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "user_id" uuid NULL,
        "action" varchar(50) NOT NULL,
        "resource_type" varchar(50) NOT NULL,
        "resource_id" uuid NULL,
        "resource_name" varchar(255) NULL,
        "old_value" jsonb NULL,
        "new_value" jsonb NULL,
        "ip_address" inet NULL,
        "user_agent" text NULL,
        "metadata" jsonb NULL,
        "previous_hash" varchar(64) NULL,
        "record_hash" varchar(64) NOT NULL DEFAULT '',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_audit_logs_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_audit_logs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_audit_logs_tenant_id" ON "audit_logs"("tenant_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "audit_logs"("user_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "audit_logs"("created_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "audit_logs"("action")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_audit_logs_resource_type" ON "audit_logs"("resource_type")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
  }
}
