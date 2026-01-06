/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Initial Database Migration
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1701900000000 implements MigrationInterface {
  name = 'InitialSchema1701900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Tenants table
    await queryRunner.query(`
      CREATE TABLE "tenants" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "name" varchar(255) NOT NULL,
        "slug" varchar(255) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "plan" varchar(20) NOT NULL DEFAULT 'free',
        "settings" jsonb,
        CONSTRAINT "UQ_tenants_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_tenants" PRIMARY KEY ("id")
      )
    `);

    // Users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "tenant_id" uuid NOT NULL,
        "email" varchar(255) NOT NULL,
        "name" varchar(255) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "role" varchar(20) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "failed_login_attempts" integer NOT NULL DEFAULT 0,
        "locked_until" TIMESTAMP,
        "last_login_at" TIMESTAMP,
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "FK_users_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    // Policies table
    await queryRunner.query(`
      CREATE TABLE "policies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "tenant_id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "description" text,
        "current_version" integer NOT NULL DEFAULT 1,
        "is_default" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_policies" PRIMARY KEY ("id"),
        CONSTRAINT "FK_policies_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    // Policy versions table
    await queryRunner.query(`
      CREATE TABLE "policy_versions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "policy_id" uuid NOT NULL,
        "version" integer NOT NULL,
        "config" jsonb NOT NULL,
        "created_by" uuid,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_policy_versions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_policy_versions_policy" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_policy_versions_policy_version" UNIQUE ("policy_id", "version")
      )
    `);

    // Locations table
    await queryRunner.query(`
      CREATE TABLE "locations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "tenant_id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "description" text,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "policy_id" uuid,
        "ip_ranges" text[] DEFAULT '{}',
        CONSTRAINT "PK_locations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_locations_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_locations_policy" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE SET NULL
      )
    `);

    // Location tokens table
    await queryRunner.query(`
      CREATE TABLE "location_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "location_id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "token_hash" varchar(255) NOT NULL,
        "type" varchar(20) NOT NULL DEFAULT 'doh',
        "expires_at" TIMESTAMP,
        "last_used_at" TIMESTAMP,
        "is_revoked" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_location_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_location_tokens_location" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE
      )
    `);

    // Custom lists table
    await queryRunner.query(`
      CREATE TABLE "custom_lists" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "tenant_id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "description" text,
        "type" varchar(20) NOT NULL DEFAULT 'blocklist',
        CONSTRAINT "PK_custom_lists" PRIMARY KEY ("id"),
        CONSTRAINT "FK_custom_lists_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    // Custom list entries table
    await queryRunner.query(`
      CREATE TABLE "custom_list_entries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "list_id" uuid NOT NULL,
        "domain" varchar(255) NOT NULL,
        "comment" text,
        CONSTRAINT "PK_custom_list_entries" PRIMARY KEY ("id"),
        CONSTRAINT "FK_custom_list_entries_list" FOREIGN KEY ("list_id") REFERENCES "custom_lists"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_custom_list_entries_list_domain" UNIQUE ("list_id", "domain")
      )
    `);

    // MFA table
    await queryRunner.query(`
      CREATE TABLE "user_mfa" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "user_id" uuid NOT NULL,
        "type" varchar(20) NOT NULL DEFAULT 'totp',
        "secret" varchar(255) NOT NULL,
        "is_enabled" boolean NOT NULL DEFAULT false,
        "verified_at" TIMESTAMP,
        CONSTRAINT "PK_user_mfa" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_mfa_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_user_mfa_user" UNIQUE ("user_id")
      )
    `);

    // MFA backup codes table
    await queryRunner.query(`
      CREATE TABLE "mfa_backup_codes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "user_mfa_id" uuid NOT NULL,
        "code_hash" varchar(255) NOT NULL,
        "used_at" TIMESTAMP,
        CONSTRAINT "PK_mfa_backup_codes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_mfa_backup_codes_mfa" FOREIGN KEY ("user_mfa_id") REFERENCES "user_mfa"("id") ON DELETE CASCADE
      )
    `);

    // API keys table
    await queryRunner.query(`
      CREATE TABLE "api_keys" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "tenant_id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "key_hash" varchar(255) NOT NULL,
        "key_prefix" varchar(16) NOT NULL,
        "permissions" text[] DEFAULT '{}',
        "expires_at" TIMESTAMP,
        "last_used_at" TIMESTAMP,
        "is_revoked" boolean NOT NULL DEFAULT false,
        "created_by" uuid,
        CONSTRAINT "PK_api_keys" PRIMARY KEY ("id"),
        CONSTRAINT "FK_api_keys_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    // API key usage table
    await queryRunner.query(`
      CREATE TABLE "api_key_usage" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "api_key_id" uuid NOT NULL,
        "endpoint" varchar(255) NOT NULL,
        "method" varchar(10) NOT NULL,
        "status_code" integer NOT NULL,
        "ip_address" varchar(45),
        CONSTRAINT "PK_api_key_usage" PRIMARY KEY ("id"),
        CONSTRAINT "FK_api_key_usage_key" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE CASCADE
      )
    `);

    // Invitations table
    await queryRunner.query(`
      CREATE TABLE "invitations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "tenant_id" uuid NOT NULL,
        "email" varchar(255) NOT NULL,
        "role" varchar(20) NOT NULL,
        "token_hash" varchar(255) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "expires_at" TIMESTAMP NOT NULL,
        "accepted_at" TIMESTAMP,
        "invited_by" uuid,
        CONSTRAINT "PK_invitations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_invitations_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    // SSO configurations table
    await queryRunner.query(`
      CREATE TABLE "sso_configurations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "tenant_id" uuid NOT NULL,
        "type" varchar(20) NOT NULL,
        "provider" varchar(50),
        "config" jsonb NOT NULL,
        "is_enabled" boolean NOT NULL DEFAULT false,
        "domain" varchar(255),
        CONSTRAINT "PK_sso_configurations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sso_configurations_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_sso_configurations_tenant_type" UNIQUE ("tenant_id", "type")
      )
    `);

    // Agent installations table
    await queryRunner.query(`
      CREATE TABLE "agent_installations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "tenant_id" uuid NOT NULL,
        "location_id" uuid,
        "name" varchar(255) NOT NULL,
        "agent_id" varchar(64) NOT NULL,
        "platform" varchar(20) NOT NULL,
        "version" varchar(20) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "last_seen_at" TIMESTAMP,
        "ip_address" varchar(45),
        "hostname" varchar(255),
        "os_version" varchar(100),
        CONSTRAINT "PK_agent_installations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_agent_installations_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_agent_installations_location" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL,
        CONSTRAINT "UQ_agent_installations_agent_id" UNIQUE ("agent_id")
      )
    `);

    // Block pages table
    await queryRunner.query(`
      CREATE TABLE "block_pages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "tenant_id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "html_content" text NOT NULL,
        "css_content" text,
        "is_default" boolean NOT NULL DEFAULT false,
        "show_reason" boolean NOT NULL DEFAULT true,
        "show_request_access" boolean NOT NULL DEFAULT true,
        "logo_url" varchar(500),
        CONSTRAINT "PK_block_pages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_block_pages_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    // Access requests table
    await queryRunner.query(`
      CREATE TABLE "access_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "tenant_id" uuid NOT NULL,
        "domain" varchar(255) NOT NULL,
        "reason" text,
        "requester_ip" varchar(45),
        "requester_info" jsonb,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "reviewed_by" uuid,
        "reviewed_at" TIMESTAMP,
        "review_notes" text,
        CONSTRAINT "PK_access_requests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_access_requests_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    // SIEM integrations table
    await queryRunner.query(`
      CREATE TABLE "siem_integrations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "tenant_id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "type" varchar(50) NOT NULL,
        "config" jsonb NOT NULL,
        "is_enabled" boolean NOT NULL DEFAULT true,
        "last_event_at" TIMESTAMP,
        "error_count" integer NOT NULL DEFAULT 0,
        "last_error" text,
        CONSTRAINT "PK_siem_integrations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_siem_integrations_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    // Webhooks table
    await queryRunner.query(`
      CREATE TABLE "webhooks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "tenant_id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "url" varchar(500) NOT NULL,
        "secret" varchar(255) NOT NULL,
        "events" text[] DEFAULT '{}',
        "is_enabled" boolean NOT NULL DEFAULT true,
        "last_triggered_at" TIMESTAMP,
        "failure_count" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_webhooks" PRIMARY KEY ("id"),
        CONSTRAINT "FK_webhooks_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    // Webhook deliveries table
    await queryRunner.query(`
      CREATE TABLE "webhook_deliveries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "webhook_id" uuid NOT NULL,
        "event_type" varchar(50) NOT NULL,
        "payload" jsonb NOT NULL,
        "status_code" integer,
        "response_body" text,
        "duration_ms" integer,
        "error" text,
        CONSTRAINT "PK_webhook_deliveries" PRIMARY KEY ("id"),
        CONSTRAINT "FK_webhook_deliveries_webhook" FOREIGN KEY ("webhook_id") REFERENCES "webhooks"("id") ON DELETE CASCADE
      )
    `);

    // Scheduled reports table
    await queryRunner.query(`
      CREATE TABLE "scheduled_reports" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "tenant_id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "report_type" varchar(50) NOT NULL,
        "schedule" varchar(100) NOT NULL,
        "recipients" text[] DEFAULT '{}',
        "config" jsonb,
        "is_enabled" boolean NOT NULL DEFAULT true,
        "last_run_at" TIMESTAMP,
        "next_run_at" TIMESTAMP,
        CONSTRAINT "PK_scheduled_reports" PRIMARY KEY ("id"),
        CONSTRAINT "FK_scheduled_reports_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    // Report history table
    await queryRunner.query(`
      CREATE TABLE "report_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "scheduled_report_id" uuid NOT NULL,
        "status" varchar(20) NOT NULL,
        "file_url" varchar(500),
        "error" text,
        "sent_to" text[] DEFAULT '{}',
        CONSTRAINT "PK_report_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_report_history_report" FOREIGN KEY ("scheduled_report_id") REFERENCES "scheduled_reports"("id") ON DELETE CASCADE
      )
    `);

    // Subscriptions table
    await queryRunner.query(`
      CREATE TABLE "subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "tenant_id" uuid NOT NULL,
        "plan_id" uuid NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "current_period_start" TIMESTAMP NOT NULL,
        "current_period_end" TIMESTAMP NOT NULL,
        "cancel_at_period_end" boolean NOT NULL DEFAULT false,
        "stripe_subscription_id" varchar(255),
        CONSTRAINT "PK_subscriptions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_subscriptions_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_subscriptions_tenant" UNIQUE ("tenant_id")
      )
    `);

    // Subscription plans table
    await queryRunner.query(`
      CREATE TABLE "subscription_plans" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "name" varchar(100) NOT NULL,
        "code" varchar(50) NOT NULL,
        "description" text,
        "price_monthly" decimal(10,2) NOT NULL,
        "price_yearly" decimal(10,2) NOT NULL,
        "limits" jsonb NOT NULL,
        "features" text[] DEFAULT '{}',
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_subscription_plans" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_subscription_plans_code" UNIQUE ("code")
      )
    `);

    // Add foreign key for subscriptions -> plans
    await queryRunner.query(`
      ALTER TABLE "subscriptions" 
      ADD CONSTRAINT "FK_subscriptions_plan" 
      FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id")
    `);

    // Signup requests table
    await queryRunner.query(`
      CREATE TABLE "signup_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "email" varchar(255) NOT NULL,
        "company_name" varchar(255),
        "plan_code" varchar(50) NOT NULL,
        "verification_token" varchar(255) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "verified_at" TIMESTAMP,
        "expires_at" TIMESTAMP NOT NULL,
        CONSTRAINT "PK_signup_requests" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_users_tenant_id" ON "users" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_email" ON "users" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_policies_tenant_id" ON "policies" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_locations_tenant_id" ON "locations" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_locations_policy_id" ON "locations" ("policy_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_custom_lists_tenant_id" ON "custom_lists" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_custom_list_entries_list_id" ON "custom_list_entries" ("list_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_custom_list_entries_domain" ON "custom_list_entries" ("domain")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_api_keys_tenant_id" ON "api_keys" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_api_keys_key_prefix" ON "api_keys" ("key_prefix")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_invitations_tenant_id" ON "invitations" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_invitations_email" ON "invitations" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_agent_installations_tenant_id" ON "agent_installations" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_webhooks_tenant_id" ON "webhooks" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_scheduled_reports_tenant_id" ON "scheduled_reports" ("tenant_id")`,
    );

    // Insert default subscription plans
    await queryRunner.query(`
      INSERT INTO "subscription_plans" ("id", "name", "code", "description", "price_monthly", "price_yearly", "limits", "features", "sort_order")
      VALUES 
        (uuid_generate_v4(), 'Free', 'free', 'For individuals and small teams getting started', 0, 0, 
         '{"locations": 1, "users": 2, "queries_per_month": 100000, "policies": 2, "lists": 5}',
         ARRAY['Basic DNS filtering', '100K queries/month', '1 location', '2 users', 'Community support'],
         1),
        (uuid_generate_v4(), 'Pro', 'pro', 'For growing teams that need more control', 29.00, 290.00,
         '{"locations": 10, "users": 10, "queries_per_month": 10000000, "policies": 20, "lists": 100}',
         ARRAY['Advanced DNS filtering', '10M queries/month', '10 locations', '10 users', 'Priority support', 'Custom block pages', 'API access'],
         2),
        (uuid_generate_v4(), 'Enterprise', 'enterprise', 'For organizations with advanced security needs', 99.00, 990.00,
         '{"locations": -1, "users": -1, "queries_per_month": -1, "policies": -1, "lists": -1}',
         ARRAY['Unlimited DNS filtering', 'Unlimited queries', 'Unlimited locations', 'Unlimited users', 'Dedicated support', 'SSO/SAML', 'SIEM integration', 'Custom SLAs'],
         3)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "signup_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subscriptions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subscription_plans"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "report_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "scheduled_reports"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "webhook_deliveries"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "webhooks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "siem_integrations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "access_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "block_pages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agent_installations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sso_configurations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "invitations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "api_key_usage"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "api_keys"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "mfa_backup_codes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_mfa"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "custom_list_entries"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "custom_lists"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "location_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "locations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "policy_versions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "policies"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenants"`);
  }
}
