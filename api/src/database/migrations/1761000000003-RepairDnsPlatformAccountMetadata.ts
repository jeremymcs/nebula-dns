import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 1 stored Cloudflare API token ids in metadata.accountId by mistake.
 * Clear the field so verify / zone create re-resolves via GET /accounts.
 */
export class RepairDnsPlatformAccountMetadata1761000000003
  implements MigrationInterface
{
  name = 'RepairDnsPlatformAccountMetadata1761000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE dns_platform_connections
      SET metadata = metadata - 'accountId'
      WHERE provider = 'cloudflare'
        AND metadata ? 'accountId'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Cannot restore previous (possibly incorrect) account ids.
  }
}
