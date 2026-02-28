// Nebula DNS - Migration: Set demo tenant tier to MSP
// The SeedDemoTenant migration defaulted to tier='home'; MSP tier is required
// for the Clients nav and client management features to appear.
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetDemoTenantMspTier1738110000000 implements MigrationInterface {
  name = 'SetDemoTenantMspTier1738110000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "tenants" SET "tier" = 'msp' WHERE "slug" = 'demo'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "tenants" SET "tier" = 'home' WHERE "slug" = 'demo'
    `);
  }
}
