// Nebula DNS - Schema Inconsistency Fixes
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// This migration fixes various schema inconsistencies between TypeORM entities,
// migrations, and the init-postgres.sql file.
// US-019: Fix database schema inconsistencies between entities and migrations

import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixSchemaInconsistencies1707000000000 implements MigrationInterface {
  name = 'FixSchemaInconsistencies1707000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // FIX 1: Location Table - ip_ranges -> ip_range
    // Entity uses 'ip_range' (inet, singular) but InitialSchema created 'ip_ranges' (text[], plural)
    // The init-postgres.sql correctly uses 'ip_range' (inet)
    // ========================================

    // Check if ip_ranges column exists (from old migration) and rename/convert it
    const hasIpRanges = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'locations' AND column_name = 'ip_ranges'
    `);

    if (hasIpRanges.length > 0) {
      // First, add the new ip_range column if it doesn't exist
      await queryRunner.query(`
        ALTER TABLE "locations"
        ADD COLUMN IF NOT EXISTS "ip_range" inet
      `);

      // Migrate data: Take the first IP from the array if it exists
      // Note: This assumes ip_ranges contained valid IP/CIDR strings
      await queryRunner.query(`
        UPDATE "locations"
        SET "ip_range" = NULLIF("ip_ranges"[1], '')::inet
        WHERE "ip_ranges" IS NOT NULL
          AND array_length("ip_ranges", 1) > 0
          AND "ip_range" IS NULL
      `);

      // Drop the old ip_ranges column
      await queryRunner.query(`
        ALTER TABLE "locations" DROP COLUMN IF EXISTS "ip_ranges"
      `);
    } else {
      // Just ensure ip_range exists as inet type
      await queryRunner.query(`
        ALTER TABLE "locations"
        ADD COLUMN IF NOT EXISTS "ip_range" inet
      `);
    }

    // ========================================
    // FIX 2: Location Table - Add dyndns column
    // Entity has dyndns but InitialSchema migration doesn't include it
    // ========================================
    await queryRunner.query(`
      ALTER TABLE "locations"
      ADD COLUMN IF NOT EXISTS "dyndns" varchar(255)
    `);

    // ========================================
    // FIX 3: Location Table - Add rate_limit column
    // Entity has rateLimit but InitialSchema migration doesn't include it
    // ========================================
    await queryRunner.query(`
      ALTER TABLE "locations"
      ADD COLUMN IF NOT EXISTS "rate_limit" integer DEFAULT 1000
    `);

    // ========================================
    // FIX 4: Policy Table - Add visual_flow column
    // Entity has visualFlow JSONB but InitialSchema migration doesn't include it
    // ========================================
    await queryRunner.query(`
      ALTER TABLE "policies"
      ADD COLUMN IF NOT EXISTS "visual_flow" jsonb
    `);

    // ========================================
    // FIX 5: Subscriptions Table - Fix plan_id type
    // InitialSchema created plan_id as UUID but entity expects varchar(50)
    // subscription_plans.id is varchar(50), so FK must match
    // ========================================

    // Check if the plan_id column is currently UUID type
    const planIdType = await queryRunner.query(`
      SELECT data_type, udt_name FROM information_schema.columns
      WHERE table_name = 'subscriptions' AND column_name = 'plan_id'
    `);

    if (planIdType.length > 0 && planIdType[0].udt_name === 'uuid') {
      // Drop the existing foreign key constraint if it exists
      await queryRunner.query(`
        ALTER TABLE "subscriptions"
        DROP CONSTRAINT IF EXISTS "FK_subscriptions_plan"
      `);

      // Create a temporary column for the new type
      await queryRunner.query(`
        ALTER TABLE "subscriptions"
        ADD COLUMN "plan_id_new" varchar(50)
      `);

      // Migrate data - lookup the plan code from subscription_plans by UUID
      // First check if subscription_plans has UUID primary key or varchar
      const subscriptionPlansIdType = await queryRunner.query(`
        SELECT data_type, udt_name FROM information_schema.columns
        WHERE table_name = 'subscription_plans' AND column_name = 'id'
      `);

      if (
        subscriptionPlansIdType.length > 0 &&
        subscriptionPlansIdType[0].udt_name === 'uuid'
      ) {
        // Old schema: subscription_plans.id is UUID, has separate 'code' column
        // Copy the code value based on UUID lookup
        await queryRunner.query(`
          UPDATE "subscriptions" s
          SET "plan_id_new" = sp.code
          FROM "subscription_plans" sp
          WHERE s.plan_id::text = sp.id::text
        `);

        // For any remaining rows without a match, set a default
        await queryRunner.query(`
          UPDATE "subscriptions"
          SET "plan_id_new" = 'free'
          WHERE "plan_id_new" IS NULL
        `);
      } else {
        // New schema: subscription_plans.id is already varchar(50)
        // Direct copy should work
        await queryRunner.query(`
          UPDATE "subscriptions"
          SET "plan_id_new" = plan_id::text
        `);
      }

      // Drop the old column
      await queryRunner.query(`
        ALTER TABLE "subscriptions" DROP COLUMN "plan_id"
      `);

      // Rename the new column
      await queryRunner.query(`
        ALTER TABLE "subscriptions"
        RENAME COLUMN "plan_id_new" TO "plan_id"
      `);

      // Make the column NOT NULL
      await queryRunner.query(`
        ALTER TABLE "subscriptions"
        ALTER COLUMN "plan_id" SET NOT NULL
      `);

      // Add the foreign key constraint back
      await queryRunner.query(`
        ALTER TABLE "subscriptions"
        ADD CONSTRAINT "FK_subscriptions_plan"
        FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id")
      `);
    }

    // ========================================
    // FIX 6: Audit Logs Table - Add missing columns from entity
    // Entity has resource_name and metadata but these aren't in InitialSchema
    // ========================================
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      ADD COLUMN IF NOT EXISTS "resource_name" varchar(255)
    `);

    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      ADD COLUMN IF NOT EXISTS "metadata" jsonb
    `);

    // ========================================
    // FIX 7: Add Missing Indexes for Performance
    // ========================================

    // Index on audit_logs.created_at for efficient time-based queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at"
      ON "audit_logs"("created_at")
    `);

    // Index on subscriptions.tenant_id for tenant lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_subscriptions_tenant_id"
      ON "subscriptions"("tenant_id")
    `);

    // Index on webhook_deliveries.created_at for delivery history queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_webhook_deliveries_created_at"
      ON "webhook_deliveries"("created_at")
    `);

    // Index on api_key_usage.created_at for usage history queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_api_key_usage_created_at"
      ON "api_key_usage"("created_at")
    `);

    // ========================================
    // FIX 8: Subscriptions Table - Add billing_cycle column
    // Entity has billingCycle but InitialSchema doesn't include it
    // ========================================
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD COLUMN IF NOT EXISTS "billing_cycle" varchar(20) DEFAULT 'monthly'
    `);

    // Add constraint for billing_cycle values
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'CHK_subscriptions_billing_cycle'
          AND table_name = 'subscriptions'
        ) THEN
          ALTER TABLE "subscriptions"
          ADD CONSTRAINT "CHK_subscriptions_billing_cycle"
          CHECK ("billing_cycle" IN ('monthly', 'yearly'));
        END IF;
      END $$;
    `);

    // ========================================
    // FIX 9: Subscriptions Table - Add missing columns from entity
    // Entity has stripeCustomerId, currentPeriodStart, currentPeriodEnd,
    // trialEnd, cancelAtPeriodEnd, canceledAt - some may be missing
    // ========================================
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD COLUMN IF NOT EXISTS "stripe_customer_id" varchar(100)
    `);

    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD COLUMN IF NOT EXISTS "current_period_start" timestamptz
    `);

    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD COLUMN IF NOT EXISTS "current_period_end" timestamptz
    `);

    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD COLUMN IF NOT EXISTS "trial_end" timestamptz
    `);

    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD COLUMN IF NOT EXISTS "cancel_at_period_end" boolean DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD COLUMN IF NOT EXISTS "canceled_at" timestamptz
    `);

    // ========================================
    // FIX 10: Location Table - Add block_page_id if missing
    // Entity may reference block_page_id but InitialSchema doesn't include it
    // ========================================
    await queryRunner.query(`
      ALTER TABLE "locations"
      ADD COLUMN IF NOT EXISTS "block_page_id" uuid
    `);

    // Add foreign key if it doesn't exist
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_locations_block_page'
          AND table_name = 'locations'
        ) THEN
          ALTER TABLE "locations"
          ADD CONSTRAINT "FK_locations_block_page"
          FOREIGN KEY ("block_page_id") REFERENCES "block_pages"("id") ON DELETE SET NULL;
        END IF;
      EXCEPTION
        WHEN others THEN
          -- Ignore if table doesn't exist yet
          NULL;
      END $$;
    `);

    // Add comment documenting the fixes
    await queryRunner.query(`
      COMMENT ON TABLE "locations" IS 'Network locations with DNS policy assignments. Fixed: ip_range type, added dyndns, rate_limit columns.';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE "policies" IS 'DNS filtering policies. Fixed: added visual_flow JSONB column for policy builder UI.';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE "subscriptions" IS 'Tenant subscription records. Fixed: plan_id type from UUID to varchar(50), added billing_cycle.';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE "audit_logs" IS 'Immutable audit trail. Fixed: added resource_name and metadata columns.';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove comments
    await queryRunner.query(`COMMENT ON TABLE "locations" IS NULL`);
    await queryRunner.query(`COMMENT ON TABLE "policies" IS NULL`);
    await queryRunner.query(`COMMENT ON TABLE "subscriptions" IS NULL`);
    await queryRunner.query(`COMMENT ON TABLE "audit_logs" IS NULL`);

    // Note: Downgrade of plan_id type from varchar back to UUID is complex
    // and may cause data loss. This rollback only removes the new columns/indexes.

    // Remove indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_api_key_usage_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_webhook_deliveries_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_subscriptions_tenant_id"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_created_at"`);

    // Remove audit_logs columns
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "metadata"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "resource_name"`,
    );

    // Remove subscriptions columns
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "canceled_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "cancel_at_period_end"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "trial_end"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "current_period_end"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "current_period_start"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "stripe_customer_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "CHK_subscriptions_billing_cycle"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "billing_cycle"`,
    );

    // Remove policies column
    await queryRunner.query(
      `ALTER TABLE "policies" DROP COLUMN IF EXISTS "visual_flow"`,
    );

    // Remove locations columns
    await queryRunner.query(
      `ALTER TABLE "locations" DROP CONSTRAINT IF EXISTS "FK_locations_block_page"`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" DROP COLUMN IF EXISTS "block_page_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" DROP COLUMN IF EXISTS "rate_limit"`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" DROP COLUMN IF EXISTS "dyndns"`,
    );

    // Note: Restoring ip_ranges from ip_range would require complex conversion
    // and is not implemented in rollback
  }
}
