/**
 * Nebula DNS - Add SAML Signing Columns Migration
 * Adds columns for SAML request signing and key rotation support
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSamlSigningColumns1706000000000 implements MigrationInterface {
  name = 'AddSamlSigningColumns1706000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if columns already exist before adding them
    const table = await queryRunner.getTable('sso_configurations');

    // Add saml_sign_requests column if not exists
    const hasSignRequests = table?.columns.find(
      (col) => col.name === 'saml_sign_requests',
    );
    if (!hasSignRequests) {
      await queryRunner.query(`
        ALTER TABLE "sso_configurations"
        ADD COLUMN "saml_sign_requests" boolean NOT NULL DEFAULT true
      `);
    }

    // Add saml_previous_signing_cert column if not exists
    const hasPreviousCert = table?.columns.find(
      (col) => col.name === 'saml_previous_signing_cert',
    );
    if (!hasPreviousCert) {
      await queryRunner.query(`
        ALTER TABLE "sso_configurations"
        ADD COLUMN "saml_previous_signing_cert" text
      `);
    }

    // Add saml_previous_cert_expires_at column if not exists
    const hasPreviousCertExpires = table?.columns.find(
      (col) => col.name === 'saml_previous_cert_expires_at',
    );
    if (!hasPreviousCertExpires) {
      await queryRunner.query(`
        ALTER TABLE "sso_configurations"
        ADD COLUMN "saml_previous_cert_expires_at" timestamp
      `);
    }

    // Add saml_signing_cert column if not exists (in case it's missing)
    const hasSigningCert = table?.columns.find(
      (col) => col.name === 'saml_signing_cert',
    );
    if (!hasSigningCert) {
      await queryRunner.query(`
        ALTER TABLE "sso_configurations"
        ADD COLUMN "saml_signing_cert" text
      `);
    }

    // Add saml_signing_key_encrypted column if not exists (in case it's missing)
    const hasSigningKey = table?.columns.find(
      (col) => col.name === 'saml_signing_key_encrypted',
    );
    if (!hasSigningKey) {
      await queryRunner.query(`
        ALTER TABLE "sso_configurations"
        ADD COLUMN "saml_signing_key_encrypted" text
      `);
    }

    // Add index for cleanup of expired previous certificates
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_sso_configurations_previous_cert_expires"
      ON "sso_configurations"("saml_previous_cert_expires_at")
      WHERE "saml_previous_cert_expires_at" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_sso_configurations_previous_cert_expires"
    `);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE "sso_configurations"
      DROP COLUMN IF EXISTS "saml_previous_cert_expires_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "sso_configurations"
      DROP COLUMN IF EXISTS "saml_previous_signing_cert"
    `);

    await queryRunner.query(`
      ALTER TABLE "sso_configurations"
      DROP COLUMN IF EXISTS "saml_sign_requests"
    `);
  }
}
