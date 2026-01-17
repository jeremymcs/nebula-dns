// Nebula DNS - Webhook Secret Rotation Migration
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWebhookSecretRotation1708000000000 implements MigrationInterface {
  name = 'AddWebhookSecretRotation1708000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add previous_secret column - stores the old secret during grace period
    await queryRunner.query(`
      ALTER TABLE "webhooks"
      ADD COLUMN IF NOT EXISTS "previous_secret" VARCHAR(255) NULL
    `);

    // Add secret_rotated_at column - timestamp of the last secret rotation
    await queryRunner.query(`
      ALTER TABLE "webhooks"
      ADD COLUMN IF NOT EXISTS "secret_rotated_at" TIMESTAMPTZ NULL
    `);

    // Add secret_grace_period_ends column - when the grace period expires
    await queryRunner.query(`
      ALTER TABLE "webhooks"
      ADD COLUMN IF NOT EXISTS "secret_grace_period_ends" TIMESTAMPTZ NULL
    `);

    // Create index for efficient cleanup of expired grace periods
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_webhooks_grace_period_ends"
      ON "webhooks" ("secret_grace_period_ends")
      WHERE "previous_secret" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_webhooks_grace_period_ends"
    `);

    // Drop the columns
    await queryRunner.query(`
      ALTER TABLE "webhooks"
      DROP COLUMN IF EXISTS "secret_grace_period_ends"
    `);

    await queryRunner.query(`
      ALTER TABLE "webhooks"
      DROP COLUMN IF EXISTS "secret_rotated_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "webhooks"
      DROP COLUMN IF EXISTS "previous_secret"
    `);
  }
}
