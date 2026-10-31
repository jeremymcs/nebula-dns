/**
 * Idempotent alignment of PostgreSQL schema with TypeORM entities.
 * Adds missing tables/columns and backfills from legacy columns where possible.
 * Does not drop legacy columns (see PR description for destructive drift).
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncEntitySchemaDrift1760000000000 implements MigrationInterface {
  name = 'SyncEntitySchemaDrift1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // -------------------------------------------------------------------------
    // Missing tables
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "playbooks_trigger_enum" AS ENUM(
          'threat_detected', 'high_block_rate', 'new_domain', 'policy_violation', 'manual'
        );
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "playbooks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" character varying NOT NULL,
        "description" text,
        "trigger" "playbooks_trigger_enum" NOT NULL DEFAULT 'manual',
        "trigger_conditions" jsonb NOT NULL DEFAULT '{}',
        "actions" jsonb NOT NULL DEFAULT '[]',
        "is_enabled" boolean NOT NULL DEFAULT true,
        "run_count" integer NOT NULL DEFAULT 0,
        "last_run_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_playbooks" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "onboarding_progress" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "steps_completed" jsonb NOT NULL DEFAULT '[]',
        "current_step" character varying(50) NOT NULL DEFAULT 'welcome',
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "skipped_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_onboarding_progress" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_onboarding_progress_tenant" UNIQUE ("tenant_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "team_invitations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "tenant_id" uuid NOT NULL,
        "invited_by" uuid NOT NULL,
        "email" character varying(255) NOT NULL,
        "role" character varying(20) NOT NULL,
        "token_hash" character varying(255) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'pending',
        "message" text,
        "accepted_at" TIMESTAMP WITH TIME ZONE,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        CONSTRAINT "PK_team_invitations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_team_invitations_token_hash" UNIQUE ("token_hash")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_groups" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "policy_id" uuid,
        "priority" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_user_groups" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_group_members" (
        "group_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        CONSTRAINT "PK_user_group_members" PRIMARY KEY ("group_id", "user_id")
      )
    `);

    // -------------------------------------------------------------------------
    // locations
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "settings" jsonb
    `);

    // -------------------------------------------------------------------------
    // location_tokens
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE "location_tokens" ADD COLUMN IF NOT EXISTS "token_prefix" varchar(12)
    `);
    await queryRunner.query(`
      ALTER TABLE "location_tokens" ADD COLUMN IF NOT EXISTS "label" varchar(255)
    `);
    await queryRunner.query(`
      ALTER TABLE "location_tokens" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true
    `);
    await queryRunner.query(`
      UPDATE "location_tokens"
      SET "token_prefix" = COALESCE("token_prefix", LEFT("token_hash", 12), 'legacy'),
          "label" = COALESCE("label", "name"),
          "is_active" = COALESCE("is_active", NOT COALESCE("is_revoked", false))
      WHERE "token_prefix" IS NULL OR "label" IS NULL OR "is_active" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "location_tokens" ALTER COLUMN "is_active" SET DEFAULT true
    `);
    await queryRunner.query(`
      UPDATE "location_tokens" SET "is_active" = true WHERE "is_active" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "location_tokens" ALTER COLUMN "is_active" SET NOT NULL
    `);
    await queryRunner.query(`
      UPDATE "location_tokens" SET "token_prefix" = 'legacy' WHERE "token_prefix" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "location_tokens" ALTER COLUMN "token_prefix" SET NOT NULL
    `);

    // -------------------------------------------------------------------------
    // webhooks & deliveries
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE "webhooks" ADD COLUMN IF NOT EXISTS "secret_hash" varchar(255)
    `);
    await queryRunner.query(`
      ALTER TABLE "webhooks" ADD COLUMN IF NOT EXISTS "headers" jsonb DEFAULT '{}'
    `);
    await queryRunner.query(`
      ALTER TABLE "webhooks" ADD COLUMN IF NOT EXISTS "last_status_code" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "webhooks" ADD COLUMN IF NOT EXISTS "last_error" text
    `);
    await queryRunner.query(`
      UPDATE "webhooks"
      SET "secret_hash" = COALESCE("secret_hash", "secret"),
          "headers" = COALESCE("headers", '{}'::jsonb)
      WHERE "secret_hash" IS NULL OR "headers" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "webhooks" ALTER COLUMN "headers" SET DEFAULT '{}'
    `);
    await queryRunner.query(`
      UPDATE "webhooks" SET "headers" = '{}'::jsonb WHERE "headers" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "webhooks" ALTER COLUMN "headers" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "webhook_deliveries" ADD COLUMN IF NOT EXISTS "response_time_ms" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "webhook_deliveries" ADD COLUMN IF NOT EXISTS "retry_count" integer DEFAULT 0
    `);
    await queryRunner.query(`
      UPDATE "webhook_deliveries"
      SET "response_time_ms" = COALESCE("response_time_ms", "duration_ms"),
          "retry_count" = COALESCE("retry_count", 0)
      WHERE "response_time_ms" IS NULL OR "retry_count" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "webhook_deliveries" SET "retry_count" = 0 WHERE "retry_count" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "webhook_deliveries" ALTER COLUMN "retry_count" SET NOT NULL
    `);

    // -------------------------------------------------------------------------
    // subscription_plans & signup_requests
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "currency" varchar(3) DEFAULT 'USD'
    `);
    await queryRunner.query(`
      ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "stripe_price_monthly_id" varchar(100)
    `);
    await queryRunner.query(`
      ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "stripe_price_yearly_id" varchar(100)
    `);
    await queryRunner.query(`
      UPDATE "subscription_plans" SET "currency" = 'USD' WHERE "currency" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "subscription_plans" ALTER COLUMN "currency" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "signup_requests" ADD COLUMN IF NOT EXISTS "plan_id" varchar(50)
    `);
    await queryRunner.query(`
      ALTER TABLE "signup_requests" ADD COLUMN IF NOT EXISTS "billing_cycle" varchar(20) DEFAULT 'monthly'
    `);
    await queryRunner.query(`
      ALTER TABLE "signup_requests" ADD COLUMN IF NOT EXISTS "stripe_checkout_session_id" varchar(100)
    `);
    await queryRunner.query(`
      ALTER TABLE "signup_requests" ADD COLUMN IF NOT EXISTS "tenant_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "signup_requests" ADD COLUMN IF NOT EXISTS "user_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "signup_requests" ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'
    `);
    await queryRunner.query(`
      ALTER TABLE "signup_requests" ADD COLUMN IF NOT EXISTS "ip_address" inet
    `);
    await queryRunner.query(`
      ALTER TABLE "signup_requests" ADD COLUMN IF NOT EXISTS "user_agent" text
    `);
    await queryRunner.query(`
      ALTER TABLE "signup_requests" ADD COLUMN IF NOT EXISTS "completed_at" timestamptz
    `);
    await queryRunner.query(`
      UPDATE "signup_requests"
      SET "plan_id" = COALESCE("plan_id", "plan_code"),
          "billing_cycle" = COALESCE("billing_cycle", 'monthly'),
          "metadata" = COALESCE("metadata", '{}'::jsonb)
      WHERE "plan_id" IS NULL OR "billing_cycle" IS NULL OR "metadata" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "signup_requests" SET "plan_id" = 'free' WHERE "plan_id" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "signup_requests" ALTER COLUMN "plan_id" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "signup_requests" ALTER COLUMN "billing_cycle" SET NOT NULL
    `);
    await queryRunner.query(`
      UPDATE "signup_requests" SET "metadata" = '{}'::jsonb WHERE "metadata" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "signup_requests" ALTER COLUMN "metadata" SET NOT NULL
    `);

    // -------------------------------------------------------------------------
    // sso_configurations (entity column set; legacy type/provider/config retained)
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE "sso_configurations" ADD COLUMN IF NOT EXISTS "provider_type" varchar(20)
    `);
    await queryRunner.query(`
      ALTER TABLE "sso_configurations" ADD COLUMN IF NOT EXISTS "saml_entity_id" varchar(500)
    `);
    await queryRunner.query(`
      ALTER TABLE "sso_configurations" ADD COLUMN IF NOT EXISTS "saml_sso_url" varchar(500)
    `);
    await queryRunner.query(`
      ALTER TABLE "sso_configurations" ADD COLUMN IF NOT EXISTS "saml_certificate" text
    `);
    await queryRunner.query(`
      ALTER TABLE "sso_configurations" ADD COLUMN IF NOT EXISTS "oidc_issuer" varchar(500)
    `);
    await queryRunner.query(`
      ALTER TABLE "sso_configurations" ADD COLUMN IF NOT EXISTS "oidc_client_id" varchar(255)
    `);
    await queryRunner.query(`
      ALTER TABLE "sso_configurations" ADD COLUMN IF NOT EXISTS "oidc_client_secret_encrypted" varchar(500)
    `);
    await queryRunner.query(`
      ALTER TABLE "sso_configurations" ADD COLUMN IF NOT EXISTS "oidc_scopes" varchar(255) DEFAULT 'openid profile email'
    `);
    await queryRunner.query(`
      ALTER TABLE "sso_configurations" ADD COLUMN IF NOT EXISTS "auto_provision_users" boolean DEFAULT true
    `);
    await queryRunner.query(`
      ALTER TABLE "sso_configurations" ADD COLUMN IF NOT EXISTS "default_role" varchar(20) DEFAULT 'readonly'
    `);
    await queryRunner.query(`
      ALTER TABLE "sso_configurations" ADD COLUMN IF NOT EXISTS "attribute_mapping" jsonb DEFAULT '{}'
    `);
    await queryRunner.query(`
      UPDATE "sso_configurations"
      SET
        "provider_type" = COALESCE("provider_type", "type", 'saml'),
        "saml_entity_id" = COALESCE("saml_entity_id", "config"->>'entityId', "config"->>'entity_id'),
        "saml_sso_url" = COALESCE("saml_sso_url", "config"->>'ssoUrl', "config"->>'sso_url'),
        "saml_certificate" = COALESCE("saml_certificate", "config"->>'certificate'),
        "oidc_issuer" = COALESCE("oidc_issuer", "config"->>'issuer'),
        "oidc_client_id" = COALESCE("oidc_client_id", "config"->>'clientId', "config"->>'client_id'),
        "oidc_client_secret_encrypted" = COALESCE(
          "oidc_client_secret_encrypted",
          "config"->>'clientSecret',
          "config"->>'client_secret'
        ),
        "oidc_scopes" = COALESCE("oidc_scopes", 'openid profile email'),
        "auto_provision_users" = COALESCE("auto_provision_users", true),
        "default_role" = COALESCE("default_role", 'readonly'),
        "attribute_mapping" = COALESCE("attribute_mapping", '{}'::jsonb)
      WHERE "provider_type" IS NULL
         OR "oidc_scopes" IS NULL
         OR "auto_provision_users" IS NULL
         OR "default_role" IS NULL
         OR "attribute_mapping" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "sso_configurations" SET "provider_type" = 'saml' WHERE "provider_type" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "sso_configurations" ALTER COLUMN "provider_type" SET NOT NULL
    `);
    await queryRunner.query(`
      UPDATE "sso_configurations" SET "oidc_scopes" = 'openid profile email' WHERE "oidc_scopes" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "sso_configurations" ALTER COLUMN "oidc_scopes" SET NOT NULL
    `);
    await queryRunner.query(`
      UPDATE "sso_configurations" SET "auto_provision_users" = true WHERE "auto_provision_users" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "sso_configurations" ALTER COLUMN "auto_provision_users" SET NOT NULL
    `);
    await queryRunner.query(`
      UPDATE "sso_configurations" SET "default_role" = 'readonly' WHERE "default_role" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "sso_configurations" ALTER COLUMN "default_role" SET NOT NULL
    `);
    await queryRunner.query(`
      UPDATE "sso_configurations" SET "attribute_mapping" = '{}'::jsonb WHERE "attribute_mapping" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "sso_configurations" ALTER COLUMN "attribute_mapping" SET NOT NULL
    `);

    // -------------------------------------------------------------------------
    // siem_integrations
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE "siem_integrations" ADD COLUMN IF NOT EXISTS "integration_type" varchar(20)
    `);
    await queryRunner.query(`
      ALTER TABLE "siem_integrations" ADD COLUMN IF NOT EXISTS "config_encrypted" jsonb DEFAULT '{}'
    `);
    await queryRunner.query(`
      ALTER TABLE "siem_integrations" ADD COLUMN IF NOT EXISTS "log_types" jsonb DEFAULT '["blocked","threats"]'
    `);
    await queryRunner.query(`
      ALTER TABLE "siem_integrations" ADD COLUMN IF NOT EXISTS "include_allowed" boolean DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "siem_integrations" ADD COLUMN IF NOT EXISTS "min_severity" varchar(20) DEFAULT 'low'
    `);
    await queryRunner.query(`
      ALTER TABLE "siem_integrations" ADD COLUMN IF NOT EXISTS "last_sent_at" timestamptz
    `);
    await queryRunner.query(`
      UPDATE "siem_integrations"
      SET
        "integration_type" = COALESCE("integration_type", LEFT("type", 20), 'webhook'),
        "config_encrypted" = COALESCE("config_encrypted", "config", '{}'::jsonb),
        "log_types" = COALESCE("log_types", '["blocked","threats"]'::jsonb),
        "include_allowed" = COALESCE("include_allowed", false),
        "min_severity" = COALESCE("min_severity", 'low'),
        "last_sent_at" = COALESCE("last_sent_at", "last_event_at"::timestamptz)
      WHERE "integration_type" IS NULL
         OR "config_encrypted" IS NULL
         OR "log_types" IS NULL
         OR "include_allowed" IS NULL
         OR "min_severity" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "siem_integrations" SET "integration_type" = 'webhook' WHERE "integration_type" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "siem_integrations" ALTER COLUMN "integration_type" SET NOT NULL
    `);
    await queryRunner.query(`
      UPDATE "siem_integrations" SET "config_encrypted" = '{}'::jsonb WHERE "config_encrypted" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "siem_integrations" ALTER COLUMN "config_encrypted" SET NOT NULL
    `);
    await queryRunner.query(`
      UPDATE "siem_integrations" SET "log_types" = '["blocked","threats"]'::jsonb WHERE "log_types" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "siem_integrations" ALTER COLUMN "log_types" SET NOT NULL
    `);
    await queryRunner.query(`
      UPDATE "siem_integrations" SET "include_allowed" = false WHERE "include_allowed" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "siem_integrations" ALTER COLUMN "include_allowed" SET NOT NULL
    `);
    await queryRunner.query(`
      UPDATE "siem_integrations" SET "min_severity" = 'low' WHERE "min_severity" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "siem_integrations" ALTER COLUMN "min_severity" SET NOT NULL
    `);

    // -------------------------------------------------------------------------
    // mfa_backup_codes
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE "mfa_backup_codes" ADD COLUMN IF NOT EXISTS "user_id" uuid
    `);
    await queryRunner.query(`
      UPDATE "mfa_backup_codes" mbc
      SET "user_id" = um."user_id"
      FROM "user_mfa" um
      WHERE um."id" = mbc."user_mfa_id" AND mbc."user_id" IS NULL
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM "mfa_backup_codes" WHERE "user_id" IS NULL
        ) THEN
          ALTER TABLE "mfa_backup_codes" ALTER COLUMN "user_id" SET NOT NULL;
        END IF;
      END $$;
    `);

    // -------------------------------------------------------------------------
    // custom lists
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE "custom_list_entries" ADD COLUMN IF NOT EXISTS "type" varchar(20) DEFAULT 'exact'
    `);
    await queryRunner.query(`
      UPDATE "custom_list_entries" SET "type" = 'exact' WHERE "type" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "custom_list_entries" ALTER COLUMN "type" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "custom_lists" ADD COLUMN IF NOT EXISTS "is_enabled" boolean DEFAULT true
    `);
    await queryRunner.query(`
      ALTER TABLE "custom_lists" ADD COLUMN IF NOT EXISTS "entry_count" integer DEFAULT 0
    `);
    await queryRunner.query(`
      UPDATE "custom_lists" cl
      SET "entry_count" = COALESCE(
        (SELECT COUNT(*)::int FROM "custom_list_entries" e WHERE e."list_id" = cl."id"),
        0
      )
      WHERE "entry_count" IS NULL OR "entry_count" = 0
    `);
    await queryRunner.query(`
      UPDATE "custom_lists" SET "is_enabled" = true WHERE "is_enabled" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "custom_lists" ALTER COLUMN "is_enabled" SET NOT NULL
    `);
    await queryRunner.query(`
      UPDATE "custom_lists" SET "entry_count" = 0 WHERE "entry_count" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "custom_lists" ALTER COLUMN "entry_count" SET NOT NULL
    `);

    // -------------------------------------------------------------------------
    // block_pages
    // -------------------------------------------------------------------------
    await queryRunner.query(
      `ALTER TABLE "block_pages" ADD COLUMN IF NOT EXISTS "background_color" varchar(7) DEFAULT '#f3f4f6'`,
    );
    await queryRunner.query(
      `ALTER TABLE "block_pages" ADD COLUMN IF NOT EXISTS "primary_color" varchar(7) DEFAULT '#4f46e5'`,
    );
    await queryRunner.query(
      `ALTER TABLE "block_pages" ADD COLUMN IF NOT EXISTS "text_color" varchar(7) DEFAULT '#1f2937'`,
    );
    await queryRunner.query(
      `ALTER TABLE "block_pages" ADD COLUMN IF NOT EXISTS "title" varchar(255) DEFAULT 'Access Blocked'`,
    );
    await queryRunner.query(
      `ALTER TABLE "block_pages" ADD COLUMN IF NOT EXISTS "message" text DEFAULT 'This website has been blocked by your organization''s security policy.'`,
    );
    await queryRunner.query(
      `ALTER TABLE "block_pages" ADD COLUMN IF NOT EXISTS "show_category" boolean DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "block_pages" ADD COLUMN IF NOT EXISTS "show_domain" boolean DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "block_pages" ADD COLUMN IF NOT EXISTS "show_timestamp" boolean DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "block_pages" ADD COLUMN IF NOT EXISTS "custom_css" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "block_pages" ADD COLUMN IF NOT EXISTS "custom_html" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "block_pages" ADD COLUMN IF NOT EXISTS "footer_text" varchar(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "block_pages" ADD COLUMN IF NOT EXISTS "support_email" varchar(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "block_pages" ADD COLUMN IF NOT EXISTS "support_url" text`,
    );
    await queryRunner.query(`
      UPDATE "block_pages"
      SET
        "custom_css" = COALESCE("custom_css", "css_content"),
        "custom_html" = COALESCE("custom_html", "html_content"),
        "show_category" = COALESCE("show_category", "show_reason", true),
        "background_color" = COALESCE("background_color", '#f3f4f6'),
        "primary_color" = COALESCE("primary_color", '#4f46e5'),
        "text_color" = COALESCE("text_color", '#1f2937'),
        "title" = COALESCE("title", 'Access Blocked'),
        "message" = COALESCE(
          "message",
          'This website has been blocked by your organization''s security policy.'
        ),
        "show_domain" = COALESCE("show_domain", true),
        "show_timestamp" = COALESCE("show_timestamp", true)
    `);
    await queryRunner.query(`
      UPDATE "block_pages" SET "background_color" = '#f3f4f6' WHERE "background_color" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "block_pages" SET "primary_color" = '#4f46e5' WHERE "primary_color" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "block_pages" SET "text_color" = '#1f2937' WHERE "text_color" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "block_pages" SET "title" = 'Access Blocked' WHERE "title" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "block_pages"
      SET "message" = 'This website has been blocked by your organization''s security policy.'
      WHERE "message" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "block_pages" SET "show_category" = true WHERE "show_category" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "block_pages" SET "show_domain" = true WHERE "show_domain" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "block_pages" SET "show_timestamp" = true WHERE "show_timestamp" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "block_pages" ALTER COLUMN "background_color" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "block_pages" ALTER COLUMN "primary_color" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "block_pages" ALTER COLUMN "text_color" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "block_pages" ALTER COLUMN "title" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "block_pages" ALTER COLUMN "message" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "block_pages" ALTER COLUMN "show_category" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "block_pages" ALTER COLUMN "show_domain" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "block_pages" ALTER COLUMN "show_timestamp" SET NOT NULL
    `);

    // -------------------------------------------------------------------------
    // access_requests
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE "access_requests" ADD COLUMN IF NOT EXISTS "location_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "access_requests" ADD COLUMN IF NOT EXISTS "category" varchar(50)
    `);
    await queryRunner.query(`
      ALTER TABLE "access_requests" ADD COLUMN IF NOT EXISTS "requester_email" varchar(255)
    `);
    await queryRunner.query(`
      ALTER TABLE "access_requests" ADD COLUMN IF NOT EXISTS "review_note" text
    `);
    await queryRunner.query(`
      ALTER TABLE "access_requests" ADD COLUMN IF NOT EXISTS "expires_at" timestamptz
    `);
    await queryRunner.query(`
      UPDATE "access_requests"
      SET
        "review_note" = COALESCE("review_note", "review_notes"),
        "requester_email" = COALESCE("requester_email", "requester_info"->>'email')
      WHERE "review_note" IS NULL OR "requester_email" IS NULL
    `);

    // -------------------------------------------------------------------------
    // api_keys & usage
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "user_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "scopes" jsonb DEFAULT '["read"]'
    `);
    await queryRunner.query(`
      ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "rate_limit" integer DEFAULT 1000
    `);
    await queryRunner.query(`
      ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true
    `);
    await queryRunner.query(`
      ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "last_used_ip" inet
    `);
    await queryRunner.query(`
      UPDATE "api_keys"
      SET
        "scopes" = COALESCE(
          "scopes",
          CASE
            WHEN "permissions" IS NULL OR array_length("permissions", 1) IS NULL
            THEN '["read"]'::jsonb
            ELSE to_jsonb("permissions")
          END
        ),
        "rate_limit" = COALESCE("rate_limit", 1000),
        "is_active" = COALESCE("is_active", NOT COALESCE("is_revoked", false))
      WHERE "scopes" IS NULL OR "rate_limit" IS NULL OR "is_active" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "api_keys" SET "scopes" = '["read"]'::jsonb WHERE "scopes" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "api_keys" ALTER COLUMN "scopes" SET NOT NULL
    `);
    await queryRunner.query(`
      UPDATE "api_keys" SET "rate_limit" = 1000 WHERE "rate_limit" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "api_keys" ALTER COLUMN "rate_limit" SET NOT NULL
    `);
    await queryRunner.query(`
      UPDATE "api_keys" SET "is_active" = true WHERE "is_active" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "api_keys" ALTER COLUMN "is_active" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "api_key_usage" ADD COLUMN IF NOT EXISTS "response_time_ms" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "api_key_usage" ADD COLUMN IF NOT EXISTS "user_agent" text
    `);

    // -------------------------------------------------------------------------
    // agent_installations
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE "agent_installations" ADD COLUMN IF NOT EXISTS "device_id" varchar(255)
    `);
    await queryRunner.query(`
      ALTER TABLE "agent_installations" ADD COLUMN IF NOT EXISTS "device_name" varchar(255)
    `);
    await queryRunner.query(`
      ALTER TABLE "agent_installations" ADD COLUMN IF NOT EXISTS "agent_version" varchar(20)
    `);
    await queryRunner.query(`
      UPDATE "agent_installations"
      SET
        "device_id" = COALESCE("device_id", "agent_id"),
        "device_name" = COALESCE("device_name", "name", "hostname"),
        "agent_version" = COALESCE("agent_version", "version")
      WHERE "device_id" IS NULL OR "agent_version" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "agent_installations" SET "device_id" = 'unknown' WHERE "device_id" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "agent_installations" ALTER COLUMN "device_id" SET NOT NULL
    `);
    await queryRunner.query(`
      UPDATE "agent_installations" SET "agent_version" = '0.0.0' WHERE "agent_version" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "agent_installations" ALTER COLUMN "agent_version" SET NOT NULL
    `);

    // -------------------------------------------------------------------------
    // Foreign keys for new tables (guarded)
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "playbooks"
        ADD CONSTRAINT "FK_playbooks_tenant"
        FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "onboarding_progress"
        ADD CONSTRAINT "FK_onboarding_progress_tenant"
        FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "team_invitations"
        ADD CONSTRAINT "FK_team_invitations_tenant"
        FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "team_invitations"
        ADD CONSTRAINT "FK_team_invitations_invited_by"
        FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "user_groups"
        ADD CONSTRAINT "FK_user_groups_tenant"
        FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "user_group_members"
        ADD CONSTRAINT "FK_user_group_members_group"
        FOREIGN KEY ("group_id") REFERENCES "user_groups"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "user_group_members"
        ADD CONSTRAINT "FK_user_group_members_user"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "mfa_backup_codes"
        ADD CONSTRAINT "FK_mfa_backup_codes_user"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Intentionally no-op: additive migration only.
  }
}
