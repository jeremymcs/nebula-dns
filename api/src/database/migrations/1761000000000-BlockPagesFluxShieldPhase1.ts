import { MigrationInterface, QueryRunner } from 'typeorm';

export class BlockPagesFluxShieldPhase1761000000000 implements MigrationInterface {
  name = 'BlockPagesFluxShieldPhase1761000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "block_pages"
      ADD COLUMN IF NOT EXISTS "scope" varchar(20) NOT NULL DEFAULT 'tenant'
    `);
    await queryRunner.query(`
      ALTER TABLE "block_pages"
      ADD COLUMN IF NOT EXISTS "secondary_color" varchar(7) DEFAULT '#4B7CBB'
    `);
    await queryRunner.query(`
      ALTER TABLE "block_pages"
      ADD COLUMN IF NOT EXISTS "accent_color" varchar(7) DEFAULT '#FF6E62'
    `);
    await queryRunner.query(`
      ALTER TABLE "block_pages"
      ADD COLUMN IF NOT EXISTS "show_reason" boolean DEFAULT true
    `);
    await queryRunner.query(`
      ALTER TABLE "block_pages"
      ADD COLUMN IF NOT EXISTS "show_powered_by" boolean DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "block_pages"
      ADD COLUMN IF NOT EXISTS "language" varchar(10) DEFAULT 'en'
    `);
    await queryRunner.query(`
      ALTER TABLE "block_pages"
      ADD COLUMN IF NOT EXISTS "message_markdown" boolean DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "block_pages"
      ADD COLUMN IF NOT EXISTS "logo_storage_key" text
    `);

    await queryRunner.query(`
      ALTER TABLE "block_pages" ALTER COLUMN "tenant_id" DROP NOT NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_block_pages_platform_scope"
      ON "block_pages" ("scope")
      WHERE "scope" = 'platform'
    `);

    await queryRunner.query(`
      ALTER TABLE "access_requests"
      ADD COLUMN IF NOT EXISTS "requester_name" varchar(255)
    `);
    await queryRunner.query(`
      ALTER TABLE "access_requests"
      ADD COLUMN IF NOT EXISTS "block_reason" varchar(100)
    `);
    await queryRunner.query(`
      ALTER TABLE "access_requests"
      ADD COLUMN IF NOT EXISTS "allow_list_id" uuid
    `);

    await queryRunner.query(`
      INSERT INTO "block_pages" (
        "tenant_id", "name", "scope", "is_default", "show_powered_by",
        "primary_color", "secondary_color", "accent_color",
        "title", "message", "footer_text", "html_content"
      )
      SELECT NULL, 'Flux Shield Default', 'platform', true, true,
        '#1E3B78', '#4B7CBB', '#FF6E62',
        'Access Blocked',
        'This site has been blocked by your organization''s security policy.',
        'Powered by Flux Labs',
        ''
      WHERE NOT EXISTS (
        SELECT 1 FROM "block_pages" WHERE "scope" = 'platform'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "block_pages" WHERE "scope" = 'platform'`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_block_pages_platform_scope"`,
    );
    await queryRunner.query(`
      ALTER TABLE "access_requests" DROP COLUMN IF EXISTS "allow_list_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "access_requests" DROP COLUMN IF EXISTS "block_reason"
    `);
    await queryRunner.query(`
      ALTER TABLE "access_requests" DROP COLUMN IF EXISTS "requester_name"
    `);
    await queryRunner.query(`
      ALTER TABLE "block_pages" DROP COLUMN IF EXISTS "logo_storage_key"
    `);
    await queryRunner.query(`
      ALTER TABLE "block_pages" DROP COLUMN IF EXISTS "message_markdown"
    `);
    await queryRunner.query(`
      ALTER TABLE "block_pages" DROP COLUMN IF EXISTS "language"
    `);
    await queryRunner.query(`
      ALTER TABLE "block_pages" DROP COLUMN IF EXISTS "show_powered_by"
    `);
    await queryRunner.query(`
      ALTER TABLE "block_pages" DROP COLUMN IF EXISTS "show_reason"
    `);
    await queryRunner.query(`
      ALTER TABLE "block_pages" DROP COLUMN IF EXISTS "accent_color"
    `);
    await queryRunner.query(`
      ALTER TABLE "block_pages" DROP COLUMN IF EXISTS "secondary_color"
    `);
    await queryRunner.query(`
      ALTER TABLE "block_pages" DROP COLUMN IF EXISTS "scope"
    `);
  }
}
