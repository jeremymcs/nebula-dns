/**
 * Flux Shield - Mobile Phase 0 API prep (idempotent)
 * Admin refresh tokens, mobile devices, notification preferences/deliveries
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class MobilePhase0ApiPrep1762000000000 implements MigrationInterface {
  name = 'MobilePhase0ApiPrep1762000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_refresh_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "admin_id" uuid NOT NULL,
        "token_hash" varchar(128) NOT NULL,
        "family_id" uuid NOT NULL,
        "device_id" uuid,
        "session_jti" varchar(64) NOT NULL,
        "mfa_verified" boolean NOT NULL DEFAULT false,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        "replaced_by_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_refresh_tokens" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_admin_refresh_tokens_admin'
        ) THEN
          ALTER TABLE "admin_refresh_tokens"
          ADD CONSTRAINT "FK_admin_refresh_tokens_admin"
          FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_admin_refresh_tokens_hash"
      ON "admin_refresh_tokens"("token_hash")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_admin_refresh_tokens_family"
      ON "admin_refresh_tokens"("family_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_admin_refresh_tokens_admin"
      ON "admin_refresh_tokens"("admin_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "mobile_devices" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "external_device_id" varchar(128) NOT NULL,
        "platform" varchar(32) NOT NULL,
        "app_version" varchar(64),
        "device_name" varchar(255),
        "expo_push_token" varchar(512),
        "is_jailbroken" boolean NOT NULL DEFAULT false,
        "admin_id" uuid,
        "user_id" uuid,
        "tenant_id" uuid,
        "last_refresh_jti" varchar(64),
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_mobile_devices" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_mobile_devices_owner" CHECK (
          ("admin_id" IS NOT NULL AND "user_id" IS NULL)
          OR ("admin_id" IS NULL AND "user_id" IS NOT NULL)
        )
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_mobile_devices_admin'
        ) THEN
          ALTER TABLE "mobile_devices"
          ADD CONSTRAINT "FK_mobile_devices_admin"
          FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_mobile_devices_user'
        ) THEN
          ALTER TABLE "mobile_devices"
          ADD CONSTRAINT "FK_mobile_devices_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_mobile_devices_tenant'
        ) THEN
          ALTER TABLE "mobile_devices"
          ADD CONSTRAINT "FK_mobile_devices_tenant"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_mobile_devices_admin_external"
      ON "mobile_devices"("admin_id", "external_device_id")
      WHERE "admin_id" IS NOT NULL AND "revoked_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_mobile_devices_user_external"
      ON "mobile_devices"("user_id", "external_device_id")
      WHERE "user_id" IS NOT NULL AND "revoked_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_preferences" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "admin_id" uuid,
        "user_id" uuid,
        "tenant_id" uuid,
        "channel" varchar(64) NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_preferences" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_notification_preferences_owner" CHECK (
          ("admin_id" IS NOT NULL AND "user_id" IS NULL)
          OR ("admin_id" IS NULL AND "user_id" IS NOT NULL)
        )
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_notification_preferences_admin'
        ) THEN
          ALTER TABLE "notification_preferences"
          ADD CONSTRAINT "FK_notification_preferences_admin"
          FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_notification_preferences_user'
        ) THEN
          ALTER TABLE "notification_preferences"
          ADD CONSTRAINT "FK_notification_preferences_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_notification_preferences_admin_channel"
      ON "notification_preferences"("admin_id", "channel")
      WHERE "admin_id" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_notification_preferences_user_channel"
      ON "notification_preferences"("user_id", "channel")
      WHERE "user_id" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_deliveries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "admin_id" uuid,
        "user_id" uuid,
        "device_id" uuid,
        "event_type" varchar(64) NOT NULL,
        "title" varchar(255) NOT NULL,
        "body" text NOT NULL,
        "status" varchar(32) NOT NULL DEFAULT 'pending',
        "expo_ticket_id" varchar(128),
        "error_message" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "sent_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_notification_deliveries" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notification_deliveries_status"
      ON "notification_deliveries"("status")
    `);

    // Legacy InitialSchema columns (type, config) remain NOT NULL; sync from provider_type on insert
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION sync_sso_config_legacy_columns()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.type IS NULL AND NEW.provider_type IS NOT NULL THEN
          NEW.type := NEW.provider_type;
        ELSIF NEW.type IS NULL THEN
          NEW.type := 'saml';
        END IF;
        IF NEW.config IS NULL THEN
          NEW.config := '{}'::jsonb;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_sso_config_legacy_sync ON "sso_configurations"
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_sso_config_legacy_sync
      BEFORE INSERT OR UPDATE ON "sso_configurations"
      FOR EACH ROW EXECUTE FUNCTION sync_sso_config_legacy_columns()
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Idempotent forward-only migration for production safety
  }
}
