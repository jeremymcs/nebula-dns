/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Create Admin User Management Tables Migration
 * Creates admin_invitations and admin_activity_logs tables for admin user management
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminUserManagementTables1714000000000 implements MigrationInterface {
  name = 'CreateAdminUserManagementTables1714000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create admin_invitations table
    await queryRunner.query(`
      CREATE TABLE "admin_invitations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "invited_by_admin_id" uuid NOT NULL,
        "email" varchar(255) NOT NULL,
        "role" varchar(20) NOT NULL,
        "token_hash" varchar(64) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "expires_at" TIMESTAMP NOT NULL,
        "accepted_at" TIMESTAMP,
        CONSTRAINT "PK_admin_invitations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_admin_invitations_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "FK_admin_invitations_invited_by"
          FOREIGN KEY ("invited_by_admin_id")
          REFERENCES "admins"("id")
          ON DELETE CASCADE
      )
    `);

    // Create indexes for admin_invitations
    await queryRunner.query(`
      CREATE INDEX "idx_admin_invitations_email"
      ON "admin_invitations" ("email")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_admin_invitations_status"
      ON "admin_invitations" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_admin_invitations_expires"
      ON "admin_invitations" ("expires_at")
    `);

    // Create admin_activity_logs table
    await queryRunner.query(`
      CREATE TABLE "admin_activity_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "admin_id" uuid NOT NULL,
        "action" varchar(50) NOT NULL,
        "target_admin_id" uuid,
        "metadata" jsonb,
        "ip_address" varchar(45),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_activity_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_admin_activity_logs_admin"
          FOREIGN KEY ("admin_id")
          REFERENCES "admins"("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_admin_activity_logs_target_admin"
          FOREIGN KEY ("target_admin_id")
          REFERENCES "admins"("id")
          ON DELETE SET NULL
      )
    `);

    // Create indexes for admin_activity_logs
    await queryRunner.query(`
      CREATE INDEX "idx_admin_activity_admin"
      ON "admin_activity_logs" ("admin_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_admin_activity_action"
      ON "admin_activity_logs" ("action")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_admin_activity_created"
      ON "admin_activity_logs" ("created_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_admin_activity_target"
      ON "admin_activity_logs" ("target_admin_id")
      WHERE "target_admin_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (activity logs first, then invitations)
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_activity_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_invitations"`);
  }
}
