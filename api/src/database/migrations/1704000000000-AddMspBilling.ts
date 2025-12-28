import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMspBilling1704000000000 implements MigrationInterface {
  name = 'AddMspBilling1704000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Query Bundles - Available DNS query packages
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "query_bundles" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(100) NOT NULL,
        "description" varchar(500),
        "query_count" bigint NOT NULL,
        "price" decimal(10,2) NOT NULL,
        "price_per_million" decimal(10,4) NOT NULL,
        "validity_days" int NOT NULL DEFAULT 30,
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" int NOT NULL DEFAULT 0,
        "stripe_price_id" varchar(255),
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // MSP Subscriptions - Per-MSP billing settings and balance
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "msp_subscriptions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "partner_id" uuid NOT NULL REFERENCES "partners"("id") ON DELETE CASCADE,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "query_balance" bigint NOT NULL DEFAULT 0,
        "total_purchased" bigint NOT NULL DEFAULT 0,
        "total_used" bigint NOT NULL DEFAULT 0,
        "overage_rate" decimal(10,4) NOT NULL DEFAULT 0.50,
        "current_overage" bigint NOT NULL DEFAULT 0,
        "auto_purchase_threshold" bigint,
        "auto_purchase_bundle_id" uuid,
        "alert_threshold" bigint,
        "last_alert_at" timestamp,
        "billing_period_start" timestamp,
        "billing_period_end" timestamp,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "uq_msp_subscription_partner" UNIQUE ("partner_id")
      )
    `);

    // MSP Purchases - Bundle purchase history
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "msp_purchases" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "partner_id" uuid NOT NULL REFERENCES "partners"("id") ON DELETE CASCADE,
        "bundle_id" uuid REFERENCES "query_bundles"("id") ON DELETE SET NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "query_count" bigint NOT NULL,
        "amount" decimal(10,2) NOT NULL,
        "stripe_payment_intent_id" varchar(255),
        "stripe_invoice_id" varchar(255),
        "expires_at" timestamp,
        "description" varchar(500),
        "is_auto_purchase" boolean NOT NULL DEFAULT false,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // MSP Usage - Daily aggregated usage per MSP/tenant
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "msp_usage" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "partner_id" uuid NOT NULL REFERENCES "partners"("id") ON DELETE CASCADE,
        "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE SET NULL,
        "usage_date" date NOT NULL,
        "query_count" bigint NOT NULL DEFAULT 0,
        "blocked_count" bigint NOT NULL DEFAULT 0,
        "allowed_count" bigint NOT NULL DEFAULT 0,
        "threat_count" bigint NOT NULL DEFAULT 0,
        "is_billed" boolean NOT NULL DEFAULT false,
        "billed_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "uq_msp_usage_daily" UNIQUE ("partner_id", "tenant_id", "usage_date")
      )
    `);

    // MSP Invoices
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "msp_invoices" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "partner_id" uuid NOT NULL REFERENCES "partners"("id") ON DELETE CASCADE,
        "invoice_number" varchar(50) NOT NULL UNIQUE,
        "status" varchar(20) NOT NULL DEFAULT 'draft',
        "period_start" timestamp NOT NULL,
        "period_end" timestamp NOT NULL,
        "subtotal" decimal(10,2) NOT NULL DEFAULT 0,
        "tax" decimal(10,2) NOT NULL DEFAULT 0,
        "total" decimal(10,2) NOT NULL DEFAULT 0,
        "line_items" jsonb NOT NULL DEFAULT '[]',
        "stripe_invoice_id" varchar(255),
        "stripe_invoice_url" varchar(1000),
        "due_date" timestamp,
        "paid_at" timestamp,
        "notes" text,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_msp_subscriptions_partner" ON "msp_subscriptions"("partner_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_msp_purchases_partner" ON "msp_purchases"("partner_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_msp_purchases_created" ON "msp_purchases"("created_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_msp_usage_partner_date" ON "msp_usage"("partner_id", "usage_date")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_msp_usage_tenant_date" ON "msp_usage"("tenant_id", "usage_date")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_msp_invoices_partner" ON "msp_invoices"("partner_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_msp_invoices_status" ON "msp_invoices"("status")`);

    // Insert default bundles
    await queryRunner.query(`
      INSERT INTO "query_bundles" ("name", "description", "query_count", "price", "price_per_million", "validity_days", "sort_order")
      VALUES 
        ('Starter', '1 million DNS queries', 1000000, 49.00, 49.0000, 30, 1),
        ('Growth', '5 million DNS queries', 5000000, 199.00, 39.8000, 30, 2),
        ('Professional', '25 million DNS queries', 25000000, 799.00, 31.9600, 30, 3),
        ('Enterprise', '100 million DNS queries', 100000000, 2499.00, 24.9900, 30, 4),
        ('Unlimited', '500 million DNS queries', 500000000, 9999.00, 19.9980, 30, 5)
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "msp_invoices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "msp_usage"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "msp_purchases"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "msp_subscriptions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "query_bundles"`);
  }
}

