// Nebula DNS - Create MSP Clients Migration
// Creates junction table for MSP-to-client tenant relationships (US-005)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMspClients1710000000000 implements MigrationInterface {
  name = 'CreateMspClients1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the msp_clients junction table
    await queryRunner.query(`
      CREATE TABLE "msp_clients" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "msp_tenant_id" uuid NOT NULL,
        "client_tenant_id" uuid NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "pk_msp_clients" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key constraint for msp_tenant_id
    await queryRunner.query(`
      ALTER TABLE "msp_clients"
      ADD CONSTRAINT "fk_msp_clients_msp_tenant"
      FOREIGN KEY ("msp_tenant_id")
      REFERENCES "tenants"("id")
      ON DELETE CASCADE
    `);

    // Add foreign key constraint for client_tenant_id
    await queryRunner.query(`
      ALTER TABLE "msp_clients"
      ADD CONSTRAINT "fk_msp_clients_client_tenant"
      FOREIGN KEY ("client_tenant_id")
      REFERENCES "tenants"("id")
      ON DELETE CASCADE
    `);

    // Unique constraint: one client can only have one MSP
    await queryRunner.query(`
      ALTER TABLE "msp_clients"
      ADD CONSTRAINT "uq_msp_clients_client_tenant"
      UNIQUE ("client_tenant_id")
    `);

    // Index on msp_tenant_id for fast MSP-to-clients lookup
    await queryRunner.query(`
      CREATE INDEX "idx_msp_clients_msp_tenant" ON "msp_clients"("msp_tenant_id")
    `);

    // Index on status for filtering
    await queryRunner.query(`
      CREATE INDEX "idx_msp_clients_status" ON "msp_clients"("status")
    `);

    // Composite index for common query patterns
    await queryRunner.query(`
      CREATE INDEX "idx_msp_clients_msp_status" ON "msp_clients"("msp_tenant_id", "status")
    `);

    // Migrate existing managed_by_msp_id relationships to msp_clients table
    // This ensures backward compatibility with existing MSP relationships
    await queryRunner.query(`
      INSERT INTO "msp_clients" ("msp_tenant_id", "client_tenant_id", "status")
      SELECT
        "managed_by_msp_id" as "msp_tenant_id",
        "id" as "client_tenant_id",
        CASE
          WHEN "status" = 'active' THEN 'active'
          ELSE 'suspended'
        END as "status"
      FROM "tenants"
      WHERE "managed_by_msp_id" IS NOT NULL
      ON CONFLICT ("client_tenant_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_msp_clients_msp_status"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_msp_clients_status"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_msp_clients_msp_tenant"`,
    );

    // Drop unique constraint
    await queryRunner.query(`
      ALTER TABLE "msp_clients"
      DROP CONSTRAINT IF EXISTS "uq_msp_clients_client_tenant"
    `);

    // Drop foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "msp_clients"
      DROP CONSTRAINT IF EXISTS "fk_msp_clients_client_tenant"
    `);

    await queryRunner.query(`
      ALTER TABLE "msp_clients"
      DROP CONSTRAINT IF EXISTS "fk_msp_clients_msp_tenant"
    `);

    // Drop the table
    await queryRunner.query(`DROP TABLE IF EXISTS "msp_clients"`);
  }
}
