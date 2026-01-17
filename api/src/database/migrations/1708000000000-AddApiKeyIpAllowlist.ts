// Nebula DNS - API Key IP Allowlisting
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApiKeyIpAllowlist1708000000000 implements MigrationInterface {
  name = 'AddApiKeyIpAllowlist1708000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add allowed_ips column - stores array of exact IP addresses
    await queryRunner.query(`
      ALTER TABLE "api_keys"
      ADD COLUMN IF NOT EXISTS "allowed_ips" TEXT[] DEFAULT NULL
    `);

    // Add allowed_cidrs column - stores array of CIDR ranges
    await queryRunner.query(`
      ALTER TABLE "api_keys"
      ADD COLUMN IF NOT EXISTS "allowed_cidrs" TEXT[] DEFAULT NULL
    `);

    // Add index for faster lookups when filtering by IP allowlist status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_api_keys_ip_allowlist"
      ON "api_keys" ((allowed_ips IS NOT NULL OR allowed_cidrs IS NOT NULL))
      WHERE allowed_ips IS NOT NULL OR allowed_cidrs IS NOT NULL
    `);

    // Add a comment explaining the IP allowlist feature
    await queryRunner.query(`
      COMMENT ON COLUMN "api_keys"."allowed_ips" IS
      'Array of exact IP addresses allowed to use this API key. If NULL and allowed_cidrs is also NULL, all IPs are allowed.'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "api_keys"."allowed_cidrs" IS
      'Array of CIDR ranges allowed to use this API key. If NULL and allowed_ips is also NULL, all IPs are allowed.'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_api_keys_ip_allowlist"
    `);

    // Remove the allowed_cidrs column
    await queryRunner.query(`
      ALTER TABLE "api_keys"
      DROP COLUMN IF EXISTS "allowed_cidrs"
    `);

    // Remove the allowed_ips column
    await queryRunner.query(`
      ALTER TABLE "api_keys"
      DROP COLUMN IF EXISTS "allowed_ips"
    `);
  }
}
