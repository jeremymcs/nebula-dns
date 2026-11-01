import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Keeps legacy sso_configurations columns (type, config) in sync with provider_type
 * so TypeORM inserts that only set provider_type satisfy NOT NULL constraints.
 */
export class SsoLegacyColumnSync1760100000000 implements MigrationInterface {
  name = 'SsoLegacyColumnSync1760100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION sync_sso_configurations_legacy_columns()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.provider_type IS NOT NULL THEN
          NEW.type := COALESCE(NEW.type, NEW.provider_type);
        END IF;
        NEW.config := COALESCE(NEW.config, '{}'::jsonb);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_sso_configurations_legacy_sync ON "sso_configurations"
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_sso_configurations_legacy_sync
      BEFORE INSERT OR UPDATE ON "sso_configurations"
      FOR EACH ROW
      EXECUTE FUNCTION sync_sso_configurations_legacy_columns()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_sso_configurations_legacy_sync ON "sso_configurations"
    `);
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS sync_sso_configurations_legacy_columns()
    `);
  }
}
