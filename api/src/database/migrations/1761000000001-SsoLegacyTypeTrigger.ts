import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Keeps legacy sso_configurations.type in sync with provider_type for inserts
 * (TypeORM plain-object saves and tests do not always run @BeforeInsert hooks).
 */
export class SsoLegacyTypeTrigger1761000000001 implements MigrationInterface {
  name = 'SsoLegacyTypeTrigger1761000000001';

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
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS sso_configurations_sync_type_trigger ON sso_configurations
    `);
    await queryRunner.query(`
      CREATE TRIGGER sso_configurations_sync_type_trigger
      BEFORE INSERT OR UPDATE ON sso_configurations
      FOR EACH ROW EXECUTE FUNCTION sso_configurations_sync_type()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS sso_configurations_sync_type_trigger ON sso_configurations
    `);
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS sso_configurations_sync_type()
    `);
  }
}
