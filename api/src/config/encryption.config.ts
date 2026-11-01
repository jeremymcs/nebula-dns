// Nebula DNS - Encryption Configuration
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

/**
 * Centralized encryption key validation and configuration.
 * Ensures all encryption keys are properly configured before application startup.
 *
 * Security Requirements:
 * - All encryption keys MUST be at least 32 bytes (256 bits) for AES-256
 * - In production, missing keys will cause startup failure
 * - In development/test, missing keys will log warnings
 */

import { Logger } from '@nestjs/common';

const logger = new Logger('EncryptionConfig');

/**
 * Minimum required key length in bytes (32 bytes = 256 bits for AES-256)
 */
export const MIN_KEY_LENGTH_BYTES = 32;

/**
 * Required encryption keys for the application
 */
export const ENCRYPTION_KEYS = [
  'MFA_ENCRYPTION_KEY',
  'SSO_ENCRYPTION_KEY',
  'SIEM_ENCRYPTION_KEY',
  'ALERTING_ENCRYPTION_KEY',
  'DNS_MANAGEMENT_ENCRYPTION_KEY',
] as const;

export type EncryptionKeyName = (typeof ENCRYPTION_KEYS)[number];

export interface EncryptionKeyValidationResult {
  key: EncryptionKeyName;
  isPresent: boolean;
  isValidLength: boolean;
  actualLength?: number;
}

export interface EncryptionConfigStatus {
  isConfigured: boolean;
  environment: string;
  keys: EncryptionKeyValidationResult[];
  errors: string[];
  warnings: string[];
}

/**
 * Validates the length of an encryption key.
 * Keys can be provided as:
 * - Base64 encoded (recommended): openssl rand -base64 32
 * - Hex encoded: openssl rand -hex 32
 * - Raw string (must be at least 32 characters)
 */
function validateKeyLength(key: string): {
  isValid: boolean;
  decodedLength: number;
} {
  // Try to detect encoding and calculate actual byte length
  let decodedLength: number;

  // Check if it looks like base64 (contains only base64 chars and may have padding)
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  if (base64Regex.test(key)) {
    try {
      const decoded = Buffer.from(key, 'base64');
      decodedLength = decoded.length;
      return { isValid: decodedLength >= MIN_KEY_LENGTH_BYTES, decodedLength };
    } catch {
      // Not valid base64, fall through
    }
  }

  // Check if it looks like hex (even length, only hex chars)
  const hexRegex = /^[0-9a-fA-F]+$/;
  if (hexRegex.test(key) && key.length % 2 === 0) {
    decodedLength = key.length / 2;
    return { isValid: decodedLength >= MIN_KEY_LENGTH_BYTES, decodedLength };
  }

  // Treat as raw string
  decodedLength = Buffer.from(key, 'utf8').length;
  return { isValid: decodedLength >= MIN_KEY_LENGTH_BYTES, decodedLength };
}

/**
 * Validates a single encryption key
 */
function validateEncryptionKey(
  keyName: EncryptionKeyName,
): EncryptionKeyValidationResult {
  const keyValue = process.env[keyName];

  if (!keyValue || keyValue.trim() === '') {
    return {
      key: keyName,
      isPresent: false,
      isValidLength: false,
    };
  }

  const { isValid, decodedLength } = validateKeyLength(keyValue);

  return {
    key: keyName,
    isPresent: true,
    isValidLength: isValid,
    actualLength: decodedLength,
  };
}

/**
 * Validates all encryption keys and returns the configuration status.
 * Does not throw - returns status for health checks.
 */
export function getEncryptionConfigStatus(): EncryptionConfigStatus {
  const environment = process.env.NODE_ENV || 'development';
  const keys = ENCRYPTION_KEYS.map(validateEncryptionKey);
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const result of keys) {
    if (!result.isPresent) {
      const message = `Encryption key ${result.key} is not configured`;
      if (environment === 'production') {
        errors.push(message);
      } else {
        warnings.push(message);
      }
    } else if (!result.isValidLength) {
      const message = `Encryption key ${result.key} is too short (${result.actualLength} bytes, minimum ${MIN_KEY_LENGTH_BYTES} bytes required)`;
      if (environment === 'production') {
        errors.push(message);
      } else {
        warnings.push(message);
      }
    }
  }

  return {
    isConfigured: errors.length === 0,
    environment,
    keys,
    errors,
    warnings,
  };
}

/**
 * Validates encryption configuration at application startup.
 * - In production: Throws error if any keys are missing or invalid
 * - In development/test: Logs warnings but allows startup
 */
export function validateEncryptionConfig(): void {
  const status = getEncryptionConfigStatus();
  const isProduction = status.environment === 'production';

  // Log warnings for development/test
  for (const warning of status.warnings) {
    logger.warn(`[SECURITY WARNING] ${warning}`);
  }

  // In production, fail fast on any errors
  if (isProduction && status.errors.length > 0) {
    const errorMessage = [
      'Encryption configuration validation failed in production:',
      '',
      ...status.errors.map((e) => `  - ${e}`),
      '',
      'To fix this, set the following environment variables with secure keys:',
      '',
      ...ENCRYPTION_KEYS.map((key) => `  ${key}=$(openssl rand -base64 32)`),
      '',
      'See .env.example for more details.',
    ].join('\n');

    logger.error(errorMessage);
    throw new Error(
      `Missing or invalid encryption keys in production. See logs for details.`,
    );
  }

  // Log success
  if (status.isConfigured && status.warnings.length === 0) {
    logger.log('Encryption configuration validated successfully');
  } else if (!isProduction) {
    logger.warn(
      'Encryption configuration has warnings. This is acceptable for development but MUST be fixed before production deployment.',
    );
  }
}

/**
 * Gets an encryption key value, throwing if not configured.
 * Use this instead of direct process.env access for encryption keys.
 */
export function getEncryptionKey(keyName: EncryptionKeyName): string {
  const value = process.env[keyName];
  const environment = process.env.NODE_ENV || 'development';

  if (!value || value.trim() === '') {
    if (environment === 'production') {
      throw new Error(
        `Encryption key ${keyName} is required but not configured`,
      );
    }
    // In development, log a warning and return a deterministic test key
    // This allows tests to run but is NOT secure for production
    logger.warn(
      `[SECURITY WARNING] ${keyName} not configured - using insecure test key`,
    );
    return `insecure-dev-key-${keyName}-do-not-use-in-production`;
  }

  return value;
}
