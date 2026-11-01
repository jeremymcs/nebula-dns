/**
 * Idempotent DNS Management tables (Phase 1 — platform-hosted zones).
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDnsManagement1761000000000 implements MigrationInterface {
  name = 'CreateDnsManagement1761000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dns_platform_connections" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "label" character varying(255) NOT NULL,
        "provider" character varying(50) NOT NULL DEFAULT 'cloudflare',
        "purpose" character varying(50) NOT NULL DEFAULT 'primary',
        "token_ciphertext" text NOT NULL,
        "token_key_id" character varying(50) NOT NULL DEFAULT 'primary',
        "token_fingerprint" character varying(64) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'pending',
        "verified_at" TIMESTAMP WITH TIME ZONE,
        "last_rotated_at" TIMESTAMP WITH TIME ZONE,
        "created_by_admin_id" uuid,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        CONSTRAINT "PK_dns_platform_connections" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dns_zone_assignments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "tenant_id" uuid NOT NULL,
        "provisioning_model" character varying(30) NOT NULL DEFAULT 'platform_hosted',
        "connection_id" uuid NOT NULL,
        "provider_zone_id" character varying(64) NOT NULL,
        "zone_name" character varying(255) NOT NULL,
        "status" character varying(30) NOT NULL DEFAULT 'active',
        "name_servers" jsonb NOT NULL DEFAULT '[]',
        "can_edit_records" boolean NOT NULL DEFAULT true,
        "can_toggle_proxy" boolean NOT NULL DEFAULT true,
        "can_delete_records" boolean NOT NULL DEFAULT true,
        "assigned_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "assigned_by_admin_id" uuid,
        "unassigned_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_dns_zone_assignments" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "dns_zone_assignments"
          ADD CONSTRAINT "FK_dns_zone_assignments_tenant"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_dns_zone_assignments_tenant_active"
        ON "dns_zone_assignments" ("tenant_id")
        WHERE "unassigned_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_dns_zone_assignments_provider_active"
        ON "dns_zone_assignments" ("provider_zone_id", "provisioning_model")
        WHERE "unassigned_at" IS NULL AND "provisioning_model" = 'platform_hosted'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "dns_zone_assignments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dns_platform_connections"`);
  }
}
