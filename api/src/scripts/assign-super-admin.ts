#!/usr/bin/env ts-node
// Nebula DNS - Assign Super Admin Role
// Migration script to assign super_admin role to existing admin
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

/**
 * Assign Super Admin Role Script
 *
 * This script assigns the super_admin role to an existing admin account.
 * Used as part of RBAC rollout to ensure at least one super_admin exists
 * before enabling enforcement.
 *
 * Usage:
 *   SUPER_ADMIN_EMAIL=admin@example.com npx ts-node src/scripts/assign-super-admin.ts
 *
 * Requirements:
 *   - SUPER_ADMIN_EMAIL: Email of existing admin to promote
 *   - Database must be accessible
 *   - Admin with specified email must exist
 *
 * Safety:
 *   - This script can be run multiple times safely (idempotent)
 *   - If admin is already super_admin, it reports success without changes
 *   - Does NOT create new accounts - use create-super-admin.ts for that
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Admin } from '../modules/admin/entities/admin.entity';
import { AdminRole } from '../modules/admin/enums/admin-role.enum';

async function assignSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL;

  // Validate environment variables
  if (!email) {
    console.error('ERROR: SUPER_ADMIN_EMAIL environment variable is required');
    console.error('');
    console.error('Usage:');
    console.error(
      '  SUPER_ADMIN_EMAIL=admin@example.com npx ts-node src/scripts/assign-super-admin.ts',
    );
    process.exit(1);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error('ERROR: Invalid email format');
    process.exit(1);
  }

  console.log('Initializing Nest application...');

  let app;
  try {
    app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn'],
    });
  } catch (error) {
    console.error(
      'ERROR: Failed to initialize application. Is the database accessible?',
    );
    console.error((error as Error).message);
    process.exit(1);
  }

  try {
    const adminRepository = app.get<Repository<Admin>>(
      getRepositoryToken(Admin),
    );

    // Find admin by email
    const admin = await adminRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!admin) {
      console.error(`ERROR: No admin found with email ${email}`);
      console.error('');
      console.error('To create a new super_admin, use the break-glass script:');
      console.error(
        '  BREAK_GLASS_EMAIL=... BREAK_GLASS_PASSWORD=... npx ts-node src/scripts/create-super-admin.ts',
      );
      await app.close();
      process.exit(1);
    }

    // Check if already super_admin
    if (admin.role === AdminRole.SUPER_ADMIN) {
      console.log('');
      console.log('========================================');
      console.log(`Admin ${email} is already a super_admin`);
      console.log('========================================');
      console.log('');
      console.log('No changes made.');
      await app.close();
      process.exit(0);
    }

    // Store old role for reporting
    const oldRole = admin.role;

    // Update role to super_admin
    await adminRepository.update(admin.id, { role: AdminRole.SUPER_ADMIN });

    console.log('');
    console.log('========================================');
    console.log('Super admin role assigned successfully!');
    console.log('========================================');
    console.log('');
    console.log(`Email: ${email}`);
    console.log(`Previous role: ${oldRole}`);
    console.log(`New role: super_admin`);
    console.log('');
    console.log('NEXT STEPS:');
    console.log('1. Verify admin can access super_admin endpoints');
    console.log('2. Review shadow mode logs for 24-48 hours');
    console.log('3. Enable RBAC enforcement: ADMIN_RBAC_ENABLED=true');
    console.log('');

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('ERROR: Failed to assign super_admin role');
    console.error((error as Error).message);
    await app.close();
    process.exit(1);
  }
}

assignSuperAdmin();
