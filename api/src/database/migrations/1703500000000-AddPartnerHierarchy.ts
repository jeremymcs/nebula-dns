/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Migration: Add Partner (MSP) hierarchy for multi-tenant SaaS
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPartnerHierarchy1703500000000 implements MigrationInterface {
  name = 'AddPartnerHierarchy1703500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Partners table (MSP/Resellers)
    await queryRunner.query(`
      CREATE TABLE "partners" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "name" varchar(255) NOT NULL,
        "slug" varchar(255) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "plan" varchar(20) NOT NULL DEFAULT 'starter',
        "contact_email" varchar(255),
        "contact_phone" varchar(255),
        "billing_email" varchar(255),
        "address" text,
        "branding" jsonb,
        "settings" jsonb,
        "stripe_customer_id" varchar(255),
        CONSTRAINT "UQ_partners_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_partners" PRIMARY KEY ("id")
      )
    `);

    // Partner users table (MSP staff)
    await queryRunner.query(`
      CREATE TABLE "partner_users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "partner_id" uuid NOT NULL,
        "email" varchar(255) NOT NULL,
        "name" varchar(255) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "role" varchar(30) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "failed_login_attempts" integer NOT NULL DEFAULT 0,
        "locked_until" TIMESTAMP,
        "last_login_at" TIMESTAMP,
        "mfa_enabled" boolean NOT NULL DEFAULT false,
        "mfa_secret" varchar(255),
        "impersonating_org_id" uuid,
        CONSTRAINT "UQ_partner_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_partner_users" PRIMARY KEY ("id"),
        CONSTRAINT "FK_partner_users_partner" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE
      )
    `);

    // Add partner_id to tenants (organizations)
    await queryRunner.query(`
      ALTER TABLE "tenants" 
      ADD COLUMN "partner_id" uuid,
      ADD COLUMN "contact_email" varchar(255),
      ADD COLUMN "contact_phone" varchar(50),
      ADD COLUMN "address" text,
      ADD COLUMN "industry" varchar(100),
      ADD COLUMN "company_size" varchar(50)
    `);

    // Add foreign key constraint for partner_id
    await queryRunner.query(`
      ALTER TABLE "tenants"
      ADD CONSTRAINT "FK_tenants_partner" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL
    `);

    // Create indexes for better query performance
    await queryRunner.query(`CREATE INDEX "IDX_partners_status" ON "partners" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_partners_plan" ON "partners" ("plan")`);
    await queryRunner.query(`CREATE INDEX "IDX_partner_users_partner_id" ON "partner_users" ("partner_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_partner_users_status" ON "partner_users" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_tenants_partner_id" ON "tenants" ("partner_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tenants_partner_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_partner_users_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_partner_users_partner_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_partners_plan"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_partners_status"`);

    // Remove foreign key and columns from tenants
    await queryRunner.query(`ALTER TABLE "tenants" DROP CONSTRAINT IF EXISTS "FK_tenants_partner"`);
    await queryRunner.query(`
      ALTER TABLE "tenants" 
      DROP COLUMN IF EXISTS "partner_id",
      DROP COLUMN IF EXISTS "contact_email",
      DROP COLUMN IF EXISTS "contact_phone",
      DROP COLUMN IF EXISTS "address",
      DROP COLUMN IF EXISTS "industry",
      DROP COLUMN IF EXISTS "company_size"
    `);

    // Drop partner_users table
    await queryRunner.query(`DROP TABLE IF EXISTS "partner_users"`);

    // Drop partners table
    await queryRunner.query(`DROP TABLE IF EXISTS "partners"`);
  }
}

