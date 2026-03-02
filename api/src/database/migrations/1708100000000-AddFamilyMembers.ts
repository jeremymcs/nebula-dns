// Nebula DNS - Add Family Members Migration
// Creates the family_members table for parental controls
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFamilyMembers1708000000000 implements MigrationInterface {
  name = 'AddFamilyMembers1708000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create family_members table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "family_members" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "name" varchar(255) NOT NULL,
        "avatar" varchar(255) DEFAULT '',
        "date_of_birth" date,
        "role" varchar(20) NOT NULL DEFAULT 'child' CHECK ("role" IN ('parent', 'teen', 'child')),
        "devices" jsonb NOT NULL DEFAULT '[]',
        "policy_overrides" jsonb NOT NULL DEFAULT '{}',
        "schedules" jsonb NOT NULL DEFAULT '[]',
        "screen_time" jsonb NOT NULL DEFAULT '{}',
        "parental_pin_hash" varchar(255),
        "is_online" boolean NOT NULL DEFAULT false,
        "last_activity_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for efficient querying
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_family_members_tenant" ON "family_members"("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_family_members_role" ON "family_members"("role")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_family_members_is_online" ON "family_members"("is_online")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_family_members_created" ON "family_members"("created_at")`,
    );

    // Create GIN index for JSONB devices column for efficient device lookups
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_family_members_devices" ON "family_members" USING GIN ("devices")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "family_members"`);
  }
}
