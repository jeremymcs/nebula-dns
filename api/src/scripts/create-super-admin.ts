#!/usr/bin/env ts-node
// Nebula DNS - Break Glass Super Admin Creation
// Emergency script to create super_admin when none exists
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

/**
 * Break Glass Super Admin Creation Script
 *
 * This script creates a super_admin account when no super_admin exists.
 * It is intended for emergency recovery scenarios only.
 *
 * Usage:
 *   BREAK_GLASS_EMAIL=admin@example.com BREAK_GLASS_PASSWORD=... npx ts-node src/scripts/create-super-admin.ts
 *
 * Requirements:
 *   - BREAK_GLASS_EMAIL: Email for the new admin account
 *   - BREAK_GLASS_PASSWORD: Password (must meet admin password requirements: 14+ chars)
 *   - Database must be accessible
 *   - No existing super_admin accounts
 *
 * Security:
 *   - This script ONLY works if no super_admin exists
 *   - Requires server/database access to run
 *   - Change password and enable MFA immediately after use
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Admin } from '../modules/admin/entities/admin.entity';
import { AdminRole } from '../modules/admin/enums/admin-role.enum';

async function createBreakGlassAdmin() {
  const email = process.env.BREAK_GLASS_EMAIL;
  const password = process.env.BREAK_GLASS_PASSWORD;

  // Validate environment variables
  if (!email || !password) {
    console.error('ERROR: BREAK_GLASS_EMAIL and BREAK_GLASS_PASSWORD environment variables are required');
    console.error('');
    console.error('Usage:');
    console.error('  BREAK_GLASS_EMAIL=admin@example.com BREAK_GLASS_PASSWORD=YourSecurePassword123! npx ts-node src/scripts/create-super-admin.ts');
    process.exit(1);
  }

  // Validate password requirements (14+ characters)
  if (password.length < 14) {
    console.error('ERROR: Password must be at least 14 characters');
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
    console.error('ERROR: Failed to initialize application. Is the database accessible?');
    console.error((error as Error).message);
    process.exit(1);
  }

  try {
    const adminRepository = app.get<Repository<Admin>>(getRepositoryToken(Admin));

    // Check if any super_admin exists
    const existingSuperAdminCount = await adminRepository.count({
      where: { role: AdminRole.SUPER_ADMIN },
    });

    if (existingSuperAdminCount > 0) {
      console.error('ERROR: Super admin already exists. This script only works when no super_admin exists.');
      console.error('Use the admin UI or API to manage existing admin accounts.');
      await app.close();
      process.exit(1);
    }

    // Check if email is already in use
    const existingAdmin = await adminRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existingAdmin) {
      console.error(`ERROR: Email ${email} is already in use by an existing admin account.`);
      await app.close();
      process.exit(1);
    }

    // Create the break-glass super_admin
    console.log(`Creating break-glass super_admin: ${email}`);

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = adminRepository.create({
      email: email.toLowerCase(),
      name: 'Break Glass Admin',
      passwordHash,
      role: AdminRole.SUPER_ADMIN,
      status: 'pending_mfa', // Require MFA setup on first login
      mfaSetupComplete: false,
    });

    await adminRepository.save(admin);

    console.log('');
    console.log('========================================');
    console.log('Break-glass super_admin created successfully!');
    console.log('========================================');
    console.log('');
    console.log(`Email: ${email}`);
    console.log(`Role: super_admin`);
    console.log(`Status: pending_mfa`);
    console.log('');
    console.log('IMPORTANT SECURITY NOTES:');
    console.log('1. Log in immediately and complete MFA setup');
    console.log('2. Change the password after first login');
    console.log('3. Consider creating a second super_admin for redundancy');
    console.log('4. Review audit logs for any suspicious activity');
    console.log('');

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('ERROR: Failed to create super_admin');
    console.error((error as Error).message);
    await app.close();
    process.exit(1);
  }
}

createBreakGlassAdmin();
