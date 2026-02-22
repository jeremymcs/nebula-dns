// Nebula DNS - Add Family Invitations Migration
// Creates the family_invitations table for Home tier family member invitations
// Also adds 'member' to the users role enum
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFamilyInvitations1711000000000 implements MigrationInterface {
  name = 'AddFamilyInvitations1711000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create family_invitations table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "family_invitations" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "invited_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "email" varchar(255) NOT NULL,
        "display_name" varchar(255),
        "token_hash" varchar(255) NOT NULL UNIQUE,
        "status" varchar(20) NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'accepted', 'expired', 'cancelled')),
        "accepted_at" timestamptz,
        "accepted_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "expires_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for efficient querying
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_family_invitations_tenant" ON "family_invitations"("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_family_invitations_email" ON "family_invitations"("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_family_invitations_status" ON "family_invitations"("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_family_invitations_token_hash" ON "family_invitations"("token_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_family_invitations_expires" ON "family_invitations"("expires_at") WHERE status = 'pending'`,
    );

    // Add 'member' role to the users table's role constraint
    // First check if we have a CHECK constraint on the role column
    // Note: PostgreSQL doesn't directly support modifying CHECK constraints, so we need to
    // drop and recreate. However, since the role column is just varchar, we can skip this
    // as the application enforces the role values.

    // Update the users role CHECK constraint to include 'member'
    // First drop the existing constraint (if exists) and add new one
    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        ALTER TABLE users ADD CONSTRAINT users_role_check
          CHECK (role IN ('owner', 'admin', 'analyst', 'readonly', 'member'));
      EXCEPTION WHEN OTHERS THEN
        -- Constraint may not exist in all environments, continue
        NULL;
      END $$;
    `);

    // Add comment for documentation
    await queryRunner.query(
      `COMMENT ON COLUMN "users"."role" IS 'User role: owner, admin, analyst, readonly, member (Home tier family member)'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove comment
    await queryRunner.query(`COMMENT ON COLUMN "users"."role" IS NULL`);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "family_invitations"`);
  }
}
