// Nebula DNS - Webhook Idempotency Migration
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWebhookIdempotency1708000000000 implements MigrationInterface {
  name = 'AddWebhookIdempotency1708000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create webhook_idempotency_keys table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "webhook_idempotency_keys" (
        "key" UUID NOT NULL,
        "webhook_id" UUID NOT NULL,
        "event_type" VARCHAR(50) NOT NULL,
        "delivered_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "acknowledged" BOOLEAN NOT NULL DEFAULT false,
        "response_status" INTEGER,
        "response_body" TEXT,
        CONSTRAINT "PK_webhook_idempotency_keys" PRIMARY KEY ("key"),
        CONSTRAINT "FK_webhook_idempotency_keys_webhook" FOREIGN KEY ("webhook_id")
          REFERENCES "webhooks"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // Create indexes for efficient queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_webhook_idempotency_webhook_id"
      ON "webhook_idempotency_keys" ("webhook_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_webhook_idempotency_delivered_at"
      ON "webhook_idempotency_keys" ("delivered_at")
    `);

    // Add idempotency_key column to webhook_deliveries table
    await queryRunner.query(`
      ALTER TABLE "webhook_deliveries"
      ADD COLUMN IF NOT EXISTS "idempotency_key" UUID
    `);

    // Create index for efficient lookups by idempotency_key
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_webhook_deliveries_idempotency_key"
      ON "webhook_deliveries" ("idempotency_key")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index on webhook_deliveries
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_webhook_deliveries_idempotency_key"
    `);

    // Drop idempotency_key column from webhook_deliveries
    await queryRunner.query(`
      ALTER TABLE "webhook_deliveries"
      DROP COLUMN IF EXISTS "idempotency_key"
    `);

    // Drop indexes on webhook_idempotency_keys
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_webhook_idempotency_delivered_at"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_webhook_idempotency_webhook_id"
    `);

    // Drop webhook_idempotency_keys table
    await queryRunner.query(`
      DROP TABLE IF EXISTS "webhook_idempotency_keys"
    `);
  }
}
