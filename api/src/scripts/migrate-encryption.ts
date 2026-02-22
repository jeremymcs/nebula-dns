#!/usr/bin/env node
// Nebula DNS - Encryption Migration Script
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// Migrates encrypted data from AES-256-CBC to AES-256-GCM format
// Usage: npx ts-node src/scripts/migrate-encryption.ts [--dry-run] [--verify]
//
// Options:
//   --dry-run     Preview changes without modifying the database
//   --verify      Verify data integrity after migration (re-decrypt and compare)
//   --verbose     Show detailed progress information
//   --batch-size=N  Process N records at a time (default: 100)

import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import {
  encrypt,
  decrypt,
  deriveKey,
  detectEncryptionFormat,
} from '../common/utils/encryption.util';
import { getEncryptionKey } from '../config/encryption.config';

// Configuration for the migration
interface MigrationConfig {
  dryRun: boolean;
  batchSize: number;
  verbose: boolean;
  verify: boolean;
}

// Migration statistics
interface MigrationStats {
  mfaTotal: number;
  mfaMigrated: number;
  mfaFailed: number;
  mfaVerified: number;
  mfaVerifyFailed: number;
  ssoTotal: number;
  ssoMigrated: number;
  ssoFailed: number;
  ssoVerified: number;
  ssoVerifyFailed: number;
  siemTotal: number;
  siemMigrated: number;
  siemFailed: number;
  siemVerified: number;
  siemVerifyFailed: number;
  errors: string[];
}

// Parse command line arguments
function parseArgs(): MigrationConfig {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    batchSize: parseInt(
      args.find((a) => a.startsWith('--batch-size='))?.split('=')[1] || '100',
    ),
    verbose: args.includes('--verbose') || args.includes('-v'),
    verify: args.includes('--verify'),
  };
}

/**
 * Verifies that data can be decrypted correctly after migration
 * by re-decrypting and comparing against the original plaintext
 */
function verifyMigration(
  originalPlaintext: string,
  newCiphertext: string,
  key: Buffer,
  recordId: string,
  module: string,
): { success: boolean; error?: string } {
  try {
    const decrypted = decrypt(newCiphertext, key);
    if (decrypted === originalPlaintext) {
      return { success: true };
    } else {
      return {
        success: false,
        error: `Data mismatch for ${module} record ${recordId}: plaintext does not match after re-encryption`,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Verification failed for ${module} record ${recordId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Create database connection
async function createConnection(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '4432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'nebula_dns',
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  return dataSource;
}

// Decrypt legacy CBC data for MFA
function decryptMfaLegacyCBC(encryptedText: string, legacyKey: Buffer): string {
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', legacyKey, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Decrypt legacy CBC data for SSO
function decryptSsoLegacyCBC(encryptedText: string, legacyKey: Buffer): string {
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', legacyKey, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Decrypt legacy CBC data for SIEM
function decryptSiemLegacyCBC(
  encryptedText: string,
  legacyKey: Buffer,
): string {
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', legacyKey, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Migrate MFA secrets
async function migrateMfaSecrets(
  dataSource: DataSource,
  config: MigrationConfig,
  stats: MigrationStats,
): Promise<void> {
  console.log('\n[MFA] Starting MFA secret migration...');

  const mfaKey = getEncryptionKey('MFA_ENCRYPTION_KEY');
  const legacyKey = crypto.scryptSync(mfaKey, 'salt', 32);
  const newKey = deriveKey(mfaKey, 'mfa-gcm-salt');

  // Get all MFA records
  const records = await dataSource.query(
    'SELECT id, user_id, secret_encrypted FROM user_mfa WHERE secret_encrypted IS NOT NULL',
  );

  stats.mfaTotal = records.length;
  console.log(`[MFA] Found ${records.length} records to check`);

  for (const record of records) {
    try {
      const formatInfo = detectEncryptionFormat(record.secret_encrypted);

      if (!formatInfo.isLegacy) {
        if (config.verbose) {
          console.log(`[MFA] Record ${record.id}: Already GCM, skipping`);
        }
        continue;
      }

      // Decrypt with legacy key
      const plaintext = decryptMfaLegacyCBC(record.secret_encrypted, legacyKey);

      // Re-encrypt with GCM
      const newEncrypted = encrypt(plaintext, newKey);

      // Verify the new encryption before saving (if enabled)
      if (config.verify) {
        const verifyResult = verifyMigration(
          plaintext,
          newEncrypted,
          newKey,
          record.id,
          'MFA',
        );
        if (!verifyResult.success) {
          const errorMsg = verifyResult.error || 'Verification failed';
          console.error(`[MFA] ${errorMsg}`);
          stats.errors.push(errorMsg);
          stats.mfaVerifyFailed++;
          continue; // Skip this record - data integrity issue
        }
        stats.mfaVerified++;
      }

      if (config.dryRun) {
        console.log(`[MFA] Record ${record.id}: Would migrate (dry-run)`);
        stats.mfaMigrated++;
      } else {
        await dataSource.query(
          'UPDATE user_mfa SET secret_encrypted = $1 WHERE id = $2',
          [newEncrypted, record.id],
        );
        console.log(`[MFA] Record ${record.id}: Migrated successfully`);
        stats.mfaMigrated++;
      }
    } catch (error) {
      const errorMsg = `[MFA] Record ${record.id}: Migration failed - ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      stats.errors.push(errorMsg);
      stats.mfaFailed++;
    }
  }

  const verifyMsg = config.verify
    ? `, ${stats.mfaVerified} verified, ${stats.mfaVerifyFailed} verify failed`
    : '';
  console.log(
    `[MFA] Migration complete: ${stats.mfaMigrated} migrated, ${stats.mfaFailed} failed${verifyMsg}`,
  );
}

// Migrate SSO secrets
async function migrateSsoSecrets(
  dataSource: DataSource,
  config: MigrationConfig,
  stats: MigrationStats,
): Promise<void> {
  console.log('\n[SSO] Starting SSO secret migration...');

  const ssoKey = getEncryptionKey('SSO_ENCRYPTION_KEY');
  const legacyKey = crypto.scryptSync(ssoKey, 'salt', 32);
  const newKey = deriveKey(ssoKey, 'sso-gcm-salt');

  // Get all SSO records
  const records = await dataSource.query(`
    SELECT id, tenant_id, oidc_client_secret_encrypted, saml_signing_key_encrypted
    FROM sso_configurations
    WHERE oidc_client_secret_encrypted IS NOT NULL
       OR saml_signing_key_encrypted IS NOT NULL
  `);

  stats.ssoTotal = records.length;
  console.log(`[SSO] Found ${records.length} records to check`);

  for (const record of records) {
    try {
      let updated = false;
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Check OIDC client secret
      if (record.oidc_client_secret_encrypted) {
        const formatInfo = detectEncryptionFormat(
          record.oidc_client_secret_encrypted,
        );

        if (formatInfo.isLegacy) {
          const plaintext = decryptSsoLegacyCBC(
            record.oidc_client_secret_encrypted,
            legacyKey,
          );
          const newEncrypted = encrypt(plaintext, newKey);

          // Verify before saving
          if (config.verify) {
            const verifyResult = verifyMigration(
              plaintext,
              newEncrypted,
              newKey,
              record.id,
              'SSO/OIDC',
            );
            if (!verifyResult.success) {
              const errorMsg = verifyResult.error || 'Verification failed';
              console.error(`[SSO] ${errorMsg}`);
              stats.errors.push(errorMsg);
              stats.ssoVerifyFailed++;
              continue; // Skip this record
            }
            stats.ssoVerified++;
          }

          updates.push(`oidc_client_secret_encrypted = $${paramIndex++}`);
          values.push(newEncrypted);
          updated = true;
        }
      }

      // Check SAML signing key
      if (record.saml_signing_key_encrypted) {
        const formatInfo = detectEncryptionFormat(
          record.saml_signing_key_encrypted,
        );

        if (formatInfo.isLegacy) {
          const plaintext = decryptSsoLegacyCBC(
            record.saml_signing_key_encrypted,
            legacyKey,
          );
          const newEncrypted = encrypt(plaintext, newKey);

          // Verify before saving
          if (config.verify) {
            const verifyResult = verifyMigration(
              plaintext,
              newEncrypted,
              newKey,
              record.id,
              'SSO/SAML',
            );
            if (!verifyResult.success) {
              const errorMsg = verifyResult.error || 'Verification failed';
              console.error(`[SSO] ${errorMsg}`);
              stats.errors.push(errorMsg);
              stats.ssoVerifyFailed++;
              continue; // Skip this record
            }
            stats.ssoVerified++;
          }

          updates.push(`saml_signing_key_encrypted = $${paramIndex++}`);
          values.push(newEncrypted);
          updated = true;
        }
      }

      if (!updated) {
        if (config.verbose) {
          console.log(`[SSO] Record ${record.id}: Already GCM, skipping`);
        }
        continue;
      }

      if (config.dryRun) {
        console.log(
          `[SSO] Record ${record.id}: Would migrate ${updates.length} field(s) (dry-run)`,
        );
        stats.ssoMigrated++;
      } else {
        values.push(record.id);
        await dataSource.query(
          `UPDATE sso_configurations SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
          values,
        );
        console.log(
          `[SSO] Record ${record.id}: Migrated ${updates.length} field(s) successfully`,
        );
        stats.ssoMigrated++;
      }
    } catch (error) {
      const errorMsg = `[SSO] Record ${record.id}: Migration failed - ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      stats.errors.push(errorMsg);
      stats.ssoFailed++;
    }
  }

  const verifyMsg = config.verify
    ? `, ${stats.ssoVerified} verified, ${stats.ssoVerifyFailed} verify failed`
    : '';
  console.log(
    `[SSO] Migration complete: ${stats.ssoMigrated} migrated, ${stats.ssoFailed} failed${verifyMsg}`,
  );
}

// Migrate SIEM secrets
async function migrateSiemSecrets(
  dataSource: DataSource,
  config: MigrationConfig,
  stats: MigrationStats,
): Promise<void> {
  console.log('\n[SIEM] Starting SIEM secret migration...');

  const siemKey = getEncryptionKey('SIEM_ENCRYPTION_KEY');

  // Derive legacy key the same way the old code did
  let legacyKey: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(siemKey)) {
    legacyKey = Buffer.from(siemKey, 'hex');
  } else {
    legacyKey = crypto.createHash('sha256').update(siemKey).digest();
  }

  const newKey = deriveKey(siemKey, 'siem-gcm-salt');

  // Get all SIEM records
  const records = await dataSource.query(`
    SELECT id, tenant_id, integration_type, config_encrypted
    FROM siem_integrations
    WHERE config_encrypted IS NOT NULL
  `);

  stats.siemTotal = records.length;
  console.log(`[SIEM] Found ${records.length} records to check`);

  // Fields that are encrypted per integration type
  const encryptedFields: Record<string, string[]> = {
    splunk: ['hecUrl', 'hecToken'],
    elastic: ['url', 'apiKey'],
    sentinel: ['workspaceId', 'sharedKey'],
    syslog: [], // Syslog doesn't have encrypted fields
  };

  for (const record of records) {
    try {
      const recordConfig = record.config_encrypted;
      const fields = encryptedFields[record.integration_type] || [];

      if (fields.length === 0) {
        if (config.verbose) {
          console.log(
            `[SIEM] Record ${record.id}: No encrypted fields for type ${record.integration_type}, skipping`,
          );
        }
        continue;
      }

      let updated = false;
      const newConfig = { ...recordConfig };

      for (const field of fields) {
        if (recordConfig[field]) {
          const formatInfo = detectEncryptionFormat(recordConfig[field]);

          if (formatInfo.isLegacy) {
            const plaintext = decryptSiemLegacyCBC(
              recordConfig[field],
              legacyKey,
            );
            const newEncrypted = encrypt(plaintext, newKey);

            // Verify before saving
            if (config.verify) {
              const verifyResult = verifyMigration(
                plaintext,
                newEncrypted,
                newKey,
                record.id,
                `SIEM/${field}`,
              );
              if (!verifyResult.success) {
                const errorMsg = verifyResult.error || 'Verification failed';
                console.error(`[SIEM] ${errorMsg}`);
                stats.errors.push(errorMsg);
                stats.siemVerifyFailed++;
                continue; // Skip this field
              }
              stats.siemVerified++;
            }

            newConfig[field] = newEncrypted;
            updated = true;
          }
        }
      }

      if (!updated) {
        if (config.verbose) {
          console.log(`[SIEM] Record ${record.id}: Already GCM, skipping`);
        }
        continue;
      }

      if (config.dryRun) {
        console.log(`[SIEM] Record ${record.id}: Would migrate (dry-run)`);
        stats.siemMigrated++;
      } else {
        await dataSource.query(
          'UPDATE siem_integrations SET config_encrypted = $1 WHERE id = $2',
          [newConfig, record.id],
        );
        console.log(`[SIEM] Record ${record.id}: Migrated successfully`);
        stats.siemMigrated++;
      }
    } catch (error) {
      const errorMsg = `[SIEM] Record ${record.id}: Migration failed - ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      stats.errors.push(errorMsg);
      stats.siemFailed++;
    }
  }

  const verifyMsg = config.verify
    ? `, ${stats.siemVerified} verified, ${stats.siemVerifyFailed} verify failed`
    : '';
  console.log(
    `[SIEM] Migration complete: ${stats.siemMigrated} migrated, ${stats.siemFailed} failed${verifyMsg}`,
  );
}

// Main migration function
async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Nebula DNS - Encryption Migration (CBC to GCM)');
  console.log('='.repeat(60));

  const config = parseArgs();

  if (config.dryRun) {
    console.log('\n*** DRY RUN MODE - No changes will be made ***\n');
  }

  console.log(`Batch size: ${config.batchSize}`);
  console.log(`Verbose: ${config.verbose}`);
  console.log(`Verify: ${config.verify}`);

  const stats: MigrationStats = {
    mfaTotal: 0,
    mfaMigrated: 0,
    mfaFailed: 0,
    mfaVerified: 0,
    mfaVerifyFailed: 0,
    ssoTotal: 0,
    ssoMigrated: 0,
    ssoFailed: 0,
    ssoVerified: 0,
    ssoVerifyFailed: 0,
    siemTotal: 0,
    siemMigrated: 0,
    siemFailed: 0,
    siemVerified: 0,
    siemVerifyFailed: 0,
    errors: [],
  };

  let dataSource: DataSource | null = null;

  try {
    console.log('\nConnecting to database...');
    dataSource = await createConnection();
    console.log('Connected successfully.');

    // Run migrations
    await migrateMfaSecrets(dataSource, config, stats);
    await migrateSsoSecrets(dataSource, config, stats);
    await migrateSiemSecrets(dataSource, config, stats);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(60));

    console.log(`\nMFA Secrets:`);
    console.log(`  Total:         ${stats.mfaTotal}`);
    console.log(`  Migrated:      ${stats.mfaMigrated}`);
    console.log(`  Failed:        ${stats.mfaFailed}`);
    if (config.verify) {
      console.log(`  Verified:      ${stats.mfaVerified}`);
      console.log(`  Verify Failed: ${stats.mfaVerifyFailed}`);
    }

    console.log(`\nSSO Secrets:`);
    console.log(`  Total:         ${stats.ssoTotal}`);
    console.log(`  Migrated:      ${stats.ssoMigrated}`);
    console.log(`  Failed:        ${stats.ssoFailed}`);
    if (config.verify) {
      console.log(`  Verified:      ${stats.ssoVerified}`);
      console.log(`  Verify Failed: ${stats.ssoVerifyFailed}`);
    }

    console.log(`\nSIEM Secrets:`);
    console.log(`  Total:         ${stats.siemTotal}`);
    console.log(`  Migrated:      ${stats.siemMigrated}`);
    console.log(`  Failed:        ${stats.siemFailed}`);
    if (config.verify) {
      console.log(`  Verified:      ${stats.siemVerified}`);
      console.log(`  Verify Failed: ${stats.siemVerifyFailed}`);
    }

    const totalMigrated =
      stats.mfaMigrated + stats.ssoMigrated + stats.siemMigrated;
    const totalFailed = stats.mfaFailed + stats.ssoFailed + stats.siemFailed;
    const totalVerified =
      stats.mfaVerified + stats.ssoVerified + stats.siemVerified;
    const totalVerifyFailed =
      stats.mfaVerifyFailed + stats.ssoVerifyFailed + stats.siemVerifyFailed;

    console.log(`\nTotal:`);
    console.log(`  Migrated:      ${totalMigrated}`);
    console.log(`  Failed:        ${totalFailed}`);
    if (config.verify) {
      console.log(`  Verified:      ${totalVerified}`);
      console.log(`  Verify Failed: ${totalVerifyFailed}`);
    }

    if (stats.errors.length > 0) {
      console.log(`\nErrors:`);
      for (const error of stats.errors) {
        console.log(`  - ${error}`);
      }
    }

    if (config.dryRun) {
      console.log('\n*** DRY RUN COMPLETE - No changes were made ***');
      console.log('Run without --dry-run to perform the actual migration.');
    } else {
      console.log('\nMigration complete!');
    }

    process.exit(totalFailed > 0 ? 1 : 0);
  } catch (error) {
    console.error(
      '\nFatal error:',
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  } finally {
    if (dataSource) {
      await dataSource.destroy();
    }
  }
}

// Run the migration
main();
