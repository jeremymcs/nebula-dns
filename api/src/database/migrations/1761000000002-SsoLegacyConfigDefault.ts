import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Legacy sso_configurations.config is NOT NULL; entity uses denormalized columns.
 * Default empty JSON on insert when config is omitted (e.g. E2E fixtures).
 */
export class SsoLegacyConfigDefault1761000000002 implements MigrationInterface {
  name = 'SsoLegacyConfigDefault1761000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION sso_configurations_sync_type()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.type IS NULL AND NEW.provider_type IS NOT NULL THEN
          NEW.type := NEW.provider_type;
        ELSIF NEW.provider_type IS NULL AND NEW.type IS NOT NULL THEN
          NEW.provider_type := NEW.type;
        END IF;
        IF NEW.config IS NULL THEN
          NEW.config := '{}'::jsonb;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION sso_configurations_sync_type()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.type IS NULL AND NEW.provider_type IS NOT NULL THEN
          NEW.type := NEW.provider_type;
        ELSIF NEW.provider_type IS NULL AND NEW.type IS NOT NULL THEN
          NEW.provider_type := NEW.type;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
  }
}
