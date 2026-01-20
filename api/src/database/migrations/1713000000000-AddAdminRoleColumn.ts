/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Add Admin Role Column Migration
 * Adds the role column to admins table for RBAC support
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminRoleColumn1713000000000 implements MigrationInterface {
  name = 'AddAdminRoleColumn1713000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add role column to admins table
    // Default is 'admin' (not 'super_admin') for security
    // Super admin must be explicitly assigned
    await queryRunner.query(`
      ALTER TABLE "admins"
      ADD COLUMN "role" varchar(20) NOT NULL DEFAULT 'admin'
    `);

    // Create index on role column for filtering queries
    await queryRunner.query(`
      CREATE INDEX "IDX_admins_role" ON "admins" ("role")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the index first
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_admins_role"
    `);

    // Drop the role column
    await queryRunner.query(`
      ALTER TABLE "admins" DROP COLUMN "role"
    `);
  }
}
