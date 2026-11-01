import { MigrationInterface, QueryRunner } from 'typeorm';

export class ShieldCa1762000000000 implements MigrationInterface {
  name = 'ShieldCa1762000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "shield_ca_intermediates" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "owner_tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "scope" varchar(10) NOT NULL,
        "certificate_pem" text NOT NULL,
        "private_key_encrypted" text NOT NULL,
        "serial_number" varchar(64) NOT NULL,
        "not_before" timestamptz NOT NULL,
        "not_after" timestamptz NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "subject_cn" varchar(255) NOT NULL,
        "created_at" timestamptz DEFAULT now(),
        "updated_at" timestamptz DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_shield_ca_owner"
      ON "shield_ca_intermediates" ("owner_tenant_id", "scope", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "shield_ca_intermediates"`);
  }
}
