/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Create Admins Table Migration
 * Creates the admins and admin_mfa tables for admin authentication system
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminsTable1712000000000 implements MigrationInterface {
  name = 'CreateAdminsTable1712000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create admins table
    await queryRunner.query(`
      CREATE TABLE "admins" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "email" varchar(255) NOT NULL,
        "name" varchar(255) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending_mfa',
        "mfa_setup_complete" boolean NOT NULL DEFAULT false,
        "failed_login_attempts" integer NOT NULL DEFAULT 0,
        "locked_until" TIMESTAMP,
        "last_login_at" TIMESTAMP,
        "invited_by_admin_id" uuid,
        CONSTRAINT "UQ_admins_email" UNIQUE ("email"),
        CONSTRAINT "PK_admins" PRIMARY KEY ("id")
      )
    `);

    // Create self-referencing foreign key for invited_by_admin_id
    await queryRunner.query(`
      ALTER TABLE "admins"
      ADD CONSTRAINT "FK_admins_invited_by"
      FOREIGN KEY ("invited_by_admin_id")
      REFERENCES "admins"("id")
      ON DELETE SET NULL
    `);

    // Create admin_mfa table
    await queryRunner.query(`
      CREATE TABLE "admin_mfa" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "admin_id" uuid NOT NULL,
        "secret" varchar(255) NOT NULL,
        "backup_codes" jsonb NOT NULL DEFAULT '[]',
        "is_verified" boolean NOT NULL DEFAULT false,
        "last_used_at" TIMESTAMP,
        CONSTRAINT "PK_admin_mfa" PRIMARY KEY ("id"),
        CONSTRAINT "FK_admin_mfa_admin" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_admin_mfa_admin" UNIQUE ("admin_id")
      )
    `);

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_admins_email" ON "admins" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_admins_status" ON "admins" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_mfa"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admins"`);
  }
}
