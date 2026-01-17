// Nebula DNS - Audit Log Immutability Migration
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditLogImmutability1706000000000 implements MigrationInterface {
  name = 'AddAuditLogImmutability1706000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add previous_hash column for hash chain linking
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      ADD COLUMN IF NOT EXISTS "previous_hash" VARCHAR(64) NULL
    `);

    // Add record_hash column for current record hash
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      ADD COLUMN IF NOT EXISTS "record_hash" VARCHAR(64) NOT NULL DEFAULT ''
    `);

    // Create index on record_hash for efficient lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_record_hash" ON "audit_logs"("record_hash")
    `);

    // Create index on previous_hash for chain verification
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_previous_hash" ON "audit_logs"("previous_hash")
    `);

    // Create trigger function to prevent UPDATE on audit_logs
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_audit_log_update()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'UPDATE operations are not permitted on audit_logs table. Audit logs are immutable for compliance and security purposes.';
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger function to prevent DELETE on audit_logs
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_audit_log_delete()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'DELETE operations are not permitted on audit_logs table. Audit logs are immutable for compliance and security purposes.';
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create UPDATE prevention trigger
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS audit_logs_prevent_update ON "audit_logs";
      CREATE TRIGGER audit_logs_prevent_update
        BEFORE UPDATE ON "audit_logs"
        FOR EACH ROW
        EXECUTE FUNCTION prevent_audit_log_update();
    `);

    // Create DELETE prevention trigger
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS audit_logs_prevent_delete ON "audit_logs";
      CREATE TRIGGER audit_logs_prevent_delete
        BEFORE DELETE ON "audit_logs"
        FOR EACH ROW
        EXECUTE FUNCTION prevent_audit_log_delete();
    `);

    // Add comment to table documenting immutability
    await queryRunner.query(`
      COMMENT ON TABLE "audit_logs" IS 'Immutable audit log table. UPDATE and DELETE operations are prevented by database triggers for compliance and security purposes.';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove triggers
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS audit_logs_prevent_update ON "audit_logs"
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS audit_logs_prevent_delete ON "audit_logs"
    `);

    // Remove trigger functions
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS prevent_audit_log_update()
    `);

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS prevent_audit_log_delete()
    `);

    // Remove indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_audit_logs_previous_hash"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_audit_logs_record_hash"
    `);

    // Remove columns
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      DROP COLUMN IF EXISTS "record_hash"
    `);

    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      DROP COLUMN IF EXISTS "previous_hash"
    `);

    // Remove table comment
    await queryRunner.query(`
      COMMENT ON TABLE "audit_logs" IS NULL
    `);
  }
}
