// Nebula DNS - Create Subscription Plan Limits Migration
// Creates the subscription_plan_limits table for tier-based billing
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubscriptionPlanLimits1709000000000 implements MigrationInterface {
  name = 'CreateSubscriptionPlanLimits1709000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create subscription_plan_limits table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "subscription_plan_limits" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "stripe_price_id" varchar(100) NOT NULL UNIQUE,
        "name" varchar(100) NOT NULL,
        "tier" varchar(20) NOT NULL CHECK ("tier" IN ('home', 'enterprise', 'msp')),
        "location_limit" integer,
        "client_limit" integer,
        "family_member_limit" integer NOT NULL DEFAULT 5,
        "price_per_location" decimal(10, 2),
        "price_per_client" decimal(10, 2),
        "base_price" decimal(10, 2) NOT NULL DEFAULT 0,
        "trial_days" integer NOT NULL DEFAULT 14,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for Stripe price ID lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_subscription_plan_limits_stripe_price_id"
      ON "subscription_plan_limits"("stripe_price_id")
    `);

    // Create index for tier lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_subscription_plan_limits_tier"
      ON "subscription_plan_limits"("tier")
    `);

    // Create index for active plans
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_subscription_plan_limits_is_active"
      ON "subscription_plan_limits"("is_active")
    `);

    // Seed default plans
    await this.seedDefaultPlans(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "subscription_plan_limits"`);
  }

  private async seedDefaultPlans(queryRunner: QueryRunner): Promise<void> {
    // Home Basic: 3 locations, 5 family members, $4.99/mo
    await queryRunner.query(`
      INSERT INTO "subscription_plan_limits" (
        "stripe_price_id", "name", "tier", "location_limit", "client_limit",
        "family_member_limit", "price_per_location", "price_per_client",
        "base_price", "trial_days"
      ) VALUES (
        'price_home_basic_monthly',
        'Home Basic',
        'home',
        3,
        NULL,
        5,
        NULL,
        NULL,
        4.99,
        14
      )
    `);

    // Home Plus: 10 locations, 5 family members, $9.99/mo
    await queryRunner.query(`
      INSERT INTO "subscription_plan_limits" (
        "stripe_price_id", "name", "tier", "location_limit", "client_limit",
        "family_member_limit", "price_per_location", "price_per_client",
        "base_price", "trial_days"
      ) VALUES (
        'price_home_plus_monthly',
        'Home Plus',
        'home',
        10,
        NULL,
        5,
        NULL,
        NULL,
        9.99,
        14
      )
    `);

    // Enterprise Starter: 25 locations, $29.99/mo
    await queryRunner.query(`
      INSERT INTO "subscription_plan_limits" (
        "stripe_price_id", "name", "tier", "location_limit", "client_limit",
        "family_member_limit", "price_per_location", "price_per_client",
        "base_price", "trial_days"
      ) VALUES (
        'price_enterprise_starter_monthly',
        'Enterprise Starter',
        'enterprise',
        25,
        NULL,
        0,
        NULL,
        NULL,
        29.99,
        14
      )
    `);

    // Enterprise Pro: 100 locations, $99.99/mo
    await queryRunner.query(`
      INSERT INTO "subscription_plan_limits" (
        "stripe_price_id", "name", "tier", "location_limit", "client_limit",
        "family_member_limit", "price_per_location", "price_per_client",
        "base_price", "trial_days"
      ) VALUES (
        'price_enterprise_pro_monthly',
        'Enterprise Pro',
        'enterprise',
        100,
        NULL,
        0,
        NULL,
        NULL,
        99.99,
        14
      )
    `);

    // MSP Starter: 10 clients, $199/mo + $15/client
    await queryRunner.query(`
      INSERT INTO "subscription_plan_limits" (
        "stripe_price_id", "name", "tier", "location_limit", "client_limit",
        "family_member_limit", "price_per_location", "price_per_client",
        "base_price", "trial_days"
      ) VALUES (
        'price_msp_starter_monthly',
        'MSP Starter',
        'msp',
        NULL,
        10,
        0,
        NULL,
        15.00,
        199.00,
        14
      )
    `);

    // MSP Pro: 100 clients, $499/mo + $12/client
    await queryRunner.query(`
      INSERT INTO "subscription_plan_limits" (
        "stripe_price_id", "name", "tier", "location_limit", "client_limit",
        "family_member_limit", "price_per_location", "price_per_client",
        "base_price", "trial_days"
      ) VALUES (
        'price_msp_pro_monthly',
        'MSP Pro',
        'msp',
        NULL,
        100,
        0,
        NULL,
        12.00,
        499.00,
        14
      )
    `);
  }
}
