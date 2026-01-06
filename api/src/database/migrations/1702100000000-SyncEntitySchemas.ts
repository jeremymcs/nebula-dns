import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncEntitySchemas1702100000000 implements MigrationInterface {
  name = 'SyncEntitySchemas1702100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // Add missing columns to user_mfa
    // ========================================
    await queryRunner.query(`
      ALTER TABLE "user_mfa" 
      ADD COLUMN IF NOT EXISTS "last_used_at" TIMESTAMPTZ
    `);

    // ========================================
    // Add missing columns to sso_configurations
    // ========================================
    await queryRunner.query(
      `ALTER TABLE "sso_configurations" ADD COLUMN IF NOT EXISTS "saml_slo_url" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "sso_configurations" ADD COLUMN IF NOT EXISTS "saml_signing_cert" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "sso_configurations" ADD COLUMN IF NOT EXISTS "saml_signing_key_encrypted" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "sso_configurations" ADD COLUMN IF NOT EXISTS "oidc_authorization_url" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "sso_configurations" ADD COLUMN IF NOT EXISTS "oidc_token_url" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "sso_configurations" ADD COLUMN IF NOT EXISTS "oidc_userinfo_url" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "sso_configurations" ADD COLUMN IF NOT EXISTS "domain_restriction" VARCHAR(255)`,
    );

    // ========================================
    // Add missing columns to agent_installations
    // ========================================
    await queryRunner.query(
      `ALTER TABLE "agent_installations" ADD COLUMN IF NOT EXISTS "error_message" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_installations" ADD COLUMN IF NOT EXISTS "settings" JSONB DEFAULT '{}'`,
    );

    // Update status check constraint to include 'disconnected' and 'error'
    await queryRunner.query(
      `ALTER TABLE "agent_installations" DROP CONSTRAINT IF EXISTS "agent_installations_status_check"`,
    );
    await queryRunner.query(`
      ALTER TABLE "agent_installations" 
      ADD CONSTRAINT "agent_installations_status_check" 
      CHECK (status IN ('active', 'inactive', 'disconnected', 'error', 'uninstalled'))
    `);

    // ========================================
    // Add missing changelog column to policy_versions
    // ========================================
    await queryRunner.query(
      `ALTER TABLE "policy_versions" ADD COLUMN IF NOT EXISTS "changelog" TEXT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // policy_versions
    await queryRunner.query(
      `ALTER TABLE "policy_versions" DROP COLUMN IF EXISTS "changelog"`,
    );

    // agent_installations
    await queryRunner.query(
      `ALTER TABLE "agent_installations" DROP CONSTRAINT IF EXISTS "agent_installations_status_check"`,
    );
    await queryRunner.query(`
      ALTER TABLE "agent_installations" 
      ADD CONSTRAINT "agent_installations_status_check" 
      CHECK (status IN ('active', 'inactive', 'uninstalled'))
    `);
    await queryRunner.query(
      `ALTER TABLE "agent_installations" DROP COLUMN IF EXISTS "settings"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_installations" DROP COLUMN IF EXISTS "error_message"`,
    );

    // sso_configurations
    await queryRunner.query(
      `ALTER TABLE "sso_configurations" DROP COLUMN IF EXISTS "domain_restriction"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sso_configurations" DROP COLUMN IF EXISTS "oidc_userinfo_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sso_configurations" DROP COLUMN IF EXISTS "oidc_token_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sso_configurations" DROP COLUMN IF EXISTS "oidc_authorization_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sso_configurations" DROP COLUMN IF EXISTS "saml_signing_key_encrypted"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sso_configurations" DROP COLUMN IF EXISTS "saml_signing_cert"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sso_configurations" DROP COLUMN IF EXISTS "saml_slo_url"`,
    );

    // user_mfa
    await queryRunner.query(
      `ALTER TABLE "user_mfa" DROP COLUMN IF EXISTS "last_used_at"`,
    );
  }
}
