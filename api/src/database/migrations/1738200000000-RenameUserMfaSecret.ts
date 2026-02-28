// Nebula DNS - Migration: Rename user_mfa.secret to secret_encrypted
// The entity uses secret_encrypted (encrypted at rest); DB column was created as plain 'secret'
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameUserMfaSecret1738200000000 implements MigrationInterface {
  name = 'RenameUserMfaSecret1738200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename secret → secret_encrypted (idempotent via column existence check)
    const cols = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'user_mfa' AND table_schema = 'public'
    `);
    const names = cols.map((c: any) => c.column_name);

    if (names.includes('secret') && !names.includes('secret_encrypted')) {
      await queryRunner.query(
        `ALTER TABLE "user_mfa" RENAME COLUMN "secret" TO "secret_encrypted"`,
      );
    }

    // Drop the 'type' column — no longer in the entity
    if (names.includes('type')) {
      await queryRunner.query(
        `ALTER TABLE "user_mfa" DROP COLUMN IF EXISTS "type"`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_mfa" RENAME COLUMN "secret_encrypted" TO "secret"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_mfa" ADD COLUMN IF NOT EXISTS "type" varchar(20) NOT NULL DEFAULT 'totp'`,
    );
  }
}
