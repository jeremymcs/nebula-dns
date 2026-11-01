// Nebula DNS - Migration: Seed Demo Tenant
// Creates a demo tenant and admin user for the "Try Demo" button on the login page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class SeedDemoTenant1738100000000 implements MigrationInterface {
  name = 'SeedDemoTenant1738100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Idempotent: skip if demo user already exists
    const existing = await queryRunner.query(
      `SELECT id FROM "users" WHERE email = 'admin@demo.local'`,
    );
    if (existing.length > 0) {
      console.log('Demo tenant already exists, skipping seed.');
      return;
    }

    // Hash the demo password (bcrypt cost 10 — lower for demo, not sensitive)
    const passwordHash = await bcrypt.hash('Admin@12345!', 10);

    // 1. Create demo tenant
    const tenantResult = await queryRunner.query(
      `
      INSERT INTO "tenants" ("id", "name", "slug", "status", "plan", "tier", "settings")
      VALUES (
        gen_random_uuid(),
        'Demo Organization',
        'demo',
        'active',
        'enterprise',
        'msp',
        '{"demo": true}'::jsonb
      )
      RETURNING id
      `,
    );
    const tenantId = tenantResult[0].id;

    // 2. Create demo admin user
    await queryRunner.query(
      `
      INSERT INTO "users" (
        "id", "tenant_id", "email", "name",
        "password_hash", "role", "status"
      ) VALUES (
        gen_random_uuid(),
        $1,
        'admin@demo.local',
        'Demo Admin',
        $2,
        'owner',
        'active'
      )
      `,
      [tenantId, passwordHash],
    );

    console.log('Demo tenant seeded: admin@demo.local / Admin@12345!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "tenants" WHERE slug = 'demo'`);
  }
}
