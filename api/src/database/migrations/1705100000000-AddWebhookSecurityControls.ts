// Nebula DNS - Webhook Security Controls Migration
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWebhookSecurityControls1705000000000 implements MigrationInterface {
  name = 'AddWebhookSecurityControls1705000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add IP allowlist column - stores array of IP addresses or CIDR ranges
    await queryRunner.query(`
      ALTER TABLE "webhooks"
      ADD COLUMN IF NOT EXISTS "ip_allowlist" TEXT[] DEFAULT '{}'
    `);

    // Add rate limit column - requests per minute (0 = no limit)
    await queryRunner.query(`
      ALTER TABLE "webhooks"
      ADD COLUMN IF NOT EXISTS "rate_limit" INTEGER DEFAULT 60
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "webhooks"
      DROP COLUMN IF EXISTS "rate_limit"
    `);

    await queryRunner.query(`
      ALTER TABLE "webhooks"
      DROP COLUMN IF EXISTS "ip_allowlist"
    `);
  }
}
