import { MigrationInterface, QueryRunner } from 'typeorm';

export class FluxShieldAgent1761000000000 implements MigrationInterface {
  name = 'FluxShieldAgent1761000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "agent_install_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "location_id" uuid,
        "token_hash" varchar(255) NOT NULL,
        "token_prefix" varchar(12) NOT NULL,
        "roles" jsonb NOT NULL DEFAULT '["dns-enforce"]',
        "expires_at" TIMESTAMPTZ NOT NULL,
        "used_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_agent_install_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_agent_install_tokens_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_agent_install_tokens_location" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_agent_install_tokens_hash" ON "agent_install_tokens" ("token_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_agent_install_tokens_tenant" ON "agent_install_tokens" ("tenant_id")`,
    );

    await queryRunner.query(`
      ALTER TABLE "agent_installations"
      ADD COLUMN IF NOT EXISTS "device_secret_hash" varchar(255)
    `);
    await queryRunner.query(`
      ALTER TABLE "agent_installations"
      ADD COLUMN IF NOT EXISTS "roles" jsonb NOT NULL DEFAULT '["dns-enforce"]'
    `);
    await queryRunner.query(`
      ALTER TABLE "agent_installations"
      ADD COLUMN IF NOT EXISTS "dns_enforced" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "agent_installations"
      ADD COLUMN IF NOT EXISTS "doh_token_hash" varchar(255)
    `);
    await queryRunner.query(`
      ALTER TABLE "agent_installations"
      ADD COLUMN IF NOT EXISTS "last_tamper_at" TIMESTAMPTZ
    `);
    await queryRunner.query(`
      ALTER TABLE "agent_installations"
      ADD COLUMN IF NOT EXISTS "tamper_count" integer NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "locations"
      ADD COLUMN IF NOT EXISTS "site_ip_updated_at" TIMESTAMPTZ
    `);
    await queryRunner.query(`
      ALTER TABLE "locations"
      ADD COLUMN IF NOT EXISTS "site_ip_updated_by_agent_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "locations"
      ADD CONSTRAINT "FK_locations_site_ip_agent"
      FOREIGN KEY ("site_ip_updated_by_agent_id")
      REFERENCES "agent_installations"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "locations" DROP CONSTRAINT IF EXISTS "FK_locations_site_ip_agent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" DROP COLUMN IF EXISTS "site_ip_updated_by_agent_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" DROP COLUMN IF EXISTS "site_ip_updated_at"`,
    );

    await queryRunner.query(
      `ALTER TABLE "agent_installations" DROP COLUMN IF EXISTS "tamper_count"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_installations" DROP COLUMN IF EXISTS "last_tamper_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_installations" DROP COLUMN IF EXISTS "doh_token_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_installations" DROP COLUMN IF EXISTS "dns_enforced"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_installations" DROP COLUMN IF EXISTS "roles"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_installations" DROP COLUMN IF EXISTS "device_secret_hash"`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "agent_install_tokens"`);
  }
}
