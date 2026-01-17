/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Seed Initial Admin Migration
 * Creates the first admin account using environment variables
 */

import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class SeedInitialAdmin1712000000001 implements MigrationInterface {
  name = 'SeedInitialAdmin1712000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const email =
      process.env.INITIAL_ADMIN_EMAIL || 'admin@nebula-dns.internal';
    const password =
      process.env.INITIAL_ADMIN_PASSWORD || 'ChangeThisPassword123!';
    const name = process.env.INITIAL_ADMIN_NAME || 'Initial Admin';

    // Hash password with bcrypt cost factor 12 (stricter than tenant users)
    const passwordHash = await bcrypt.hash(password, 12);

    // Check if admin already exists (idempotent migration)
    const existingAdmin = await queryRunner.query(
      `SELECT id FROM "admins" WHERE email = $1`,
      [email],
    );

    if (existingAdmin.length === 0) {
      await queryRunner.query(
        `
        INSERT INTO "admins" (
          "id",
          "email",
          "name",
          "password_hash",
          "status",
          "mfa_setup_complete"
        ) VALUES (
          gen_random_uuid(),
          $1,
          $2,
          $3,
          'pending_mfa',
          false
        )
      `,
        [email, name, passwordHash],
      );

      // Log that the admin was created (visible in migration logs)
      console.log(`Initial admin created with email: ${email}`);
      console.log(
        'IMPORTANT: Change the password and set up MFA immediately after first login!',
      );
    } else {
      console.log(`Admin with email ${email} already exists, skipping seed.`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const email =
      process.env.INITIAL_ADMIN_EMAIL || 'admin@nebula-dns.internal';

    // Only delete the seeded admin if it matches the expected email
    await queryRunner.query(`DELETE FROM "admins" WHERE email = $1`, [email]);
  }
}
