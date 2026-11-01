import { MigrationInterface, QueryRunner } from 'typeorm';

export class SsoLegacyColumns1762000000001 implements MigrationInterface {
  name = 'SsoLegacyColumns1762000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sso_configurations" ALTER COLUMN "type" DROP NOT NULL
    `);
    await queryRunner.query(`
      UPDATE "sso_configurations"
      SET "type" = COALESCE("type", "provider_type")
      WHERE "type" IS NULL AND "provider_type" IS NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "sso_configurations" ALTER COLUMN "config" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "sso_configurations" ALTER COLUMN "config" SET DEFAULT '{}'
    `);
    await queryRunner.query(`
      UPDATE "sso_configurations" SET "config" = '{}'::jsonb WHERE "config" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sso_configurations" ALTER COLUMN "config" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "sso_configurations" ALTER COLUMN "type" SET NOT NULL
    `);
  }
}
