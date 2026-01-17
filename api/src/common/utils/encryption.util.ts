// Nebula DNS - Encryption Utilities
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// AES-256-GCM encryption with authenticated encryption
// Provides secure encryption with integrity verification via auth tags

import * as crypto from 'crypto';

// Constants for AES-256-GCM
const ALGORITHM_GCM = 'aes-256-gcm';
const ALGORITHM_CBC = 'aes-256-cbc';
const IV_LENGTH_GCM = 12; // 96-bit IV for GCM (NIST recommended)
const IV_LENGTH_CBC = 16; // 128-bit IV for CBC
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag
const KEY_LENGTH = 32; // 256-bit key

/**
 * Error class for encryption-related failures
 */
export class EncryptionError extends Error {
  constructor(
    message: string,
    public readonly context?: string,
    public readonly isLegacyFormat?: boolean,
  ) {
    super(message);
    this.name = 'EncryptionError';
  }
}

/**
 * Encryption format detection result
 */
export interface FormatDetectionResult {
  format: 'gcm' | 'cbc' | 'unknown';
  isLegacy: boolean;
}

/**
 * Derives a 256-bit key from a secret string using scrypt
 *
 * @param secret - The secret string to derive the key from
 * @param salt - Optional salt (defaults to 'nebula-dns-salt' for backward compatibility)
 * @returns A 32-byte Buffer suitable for AES-256 encryption
 */
export function deriveKey(
  secret: string,
  salt: string = 'nebula-dns-salt',
): Buffer {
  if (!secret || typeof secret !== 'string') {
    throw new EncryptionError('Secret must be a non-empty string');
  }

  return crypto.scryptSync(secret, salt, KEY_LENGTH);
}

/**
 * Encrypts plaintext using AES-256-GCM
 *
 * Format: base64(iv[12 bytes] + ciphertext[n bytes] + authTag[16 bytes])
 *
 * @param plaintext - The text to encrypt
 * @param key - A 32-byte encryption key (use deriveKey to generate)
 * @returns Base64 encoded string containing IV, ciphertext, and auth tag
 */
export function encrypt(plaintext: string, key: Buffer): string {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new EncryptionError('Plaintext must be a non-empty string');
  }

  if (!Buffer.isBuffer(key) || key.length !== KEY_LENGTH) {
    throw new EncryptionError(
      `Key must be a ${KEY_LENGTH}-byte Buffer`,
      'encrypt',
    );
  }

  // Generate random 96-bit IV (12 bytes) - NIST recommended for GCM
  const iv = crypto.randomBytes(IV_LENGTH_GCM);

  // Create cipher with GCM mode
  const cipher = crypto.createCipheriv(ALGORITHM_GCM, key, iv);

  // Encrypt the plaintext
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  // Get the 128-bit authentication tag
  const authTag = cipher.getAuthTag();

  // Concatenate: IV (12 bytes) + ciphertext + authTag (16 bytes)
  const combined = Buffer.concat([iv, encrypted, authTag]);

  // Return as base64
  return combined.toString('base64');
}

/**
 * Decrypts ciphertext using AES-256-GCM
 *
 * Expects format: base64(iv[12 bytes] + ciphertext[n bytes] + authTag[16 bytes])
 *
 * @param ciphertext - Base64 encoded encrypted data
 * @param key - A 32-byte encryption key (same key used for encryption)
 * @returns The decrypted plaintext
 * @throws EncryptionError if decryption fails or data is tampered
 */
export function decrypt(ciphertext: string, key: Buffer): string {
  if (!ciphertext || typeof ciphertext !== 'string') {
    throw new EncryptionError('Ciphertext must be a non-empty string');
  }

  if (!Buffer.isBuffer(key) || key.length !== KEY_LENGTH) {
    throw new EncryptionError(
      `Key must be a ${KEY_LENGTH}-byte Buffer`,
      'decrypt',
    );
  }

  try {
    // Decode from base64
    const combined = Buffer.from(ciphertext, 'base64');

    // Minimum length: IV (12) + at least 1 byte ciphertext + authTag (16)
    if (combined.length < IV_LENGTH_GCM + 1 + AUTH_TAG_LENGTH) {
      throw new EncryptionError(
        'Ciphertext is too short to be valid GCM format',
        'decrypt',
      );
    }

    // Extract components
    const iv = combined.subarray(0, IV_LENGTH_GCM);
    const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(
      IV_LENGTH_GCM,
      combined.length - AUTH_TAG_LENGTH,
    );

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM_GCM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    // GCM will throw an error if authentication fails (data tampered)
    throw new EncryptionError(
      'Decryption failed - data may be corrupted or tampered',
      'decrypt',
    );
  }
}

/**
 * Detects the encryption format of a ciphertext string
 *
 * CBC format: hex(iv):hex(ciphertext) - contains colon separator
 * GCM format: base64(iv + ciphertext + authTag) - no colon, valid base64
 *
 * @param ciphertext - The encrypted string to analyze
 * @returns Detection result with format type and legacy flag
 */
export function detectEncryptionFormat(
  ciphertext: string,
): FormatDetectionResult {
  if (!ciphertext || typeof ciphertext !== 'string') {
    return { format: 'unknown', isLegacy: false };
  }

  // CBC format detection: contains colon separator (iv:ciphertext in hex)
  if (ciphertext.includes(':')) {
    const parts = ciphertext.split(':');
    if (parts.length === 2) {
      const [ivHex, encryptedHex] = parts;
      // Validate hex format: IV should be 32 hex chars (16 bytes)
      if (
        ivHex.length === IV_LENGTH_CBC * 2 &&
        /^[0-9a-fA-F]+$/.test(ivHex) &&
        /^[0-9a-fA-F]+$/.test(encryptedHex)
      ) {
        return { format: 'cbc', isLegacy: true };
      }
    }
  }

  // GCM format detection: valid base64 with appropriate length
  try {
    const decoded = Buffer.from(ciphertext, 'base64');
    // GCM minimum: IV (12) + some ciphertext + authTag (16)
    if (decoded.length >= IV_LENGTH_GCM + 1 + AUTH_TAG_LENGTH) {
      // Check if re-encoding produces same string (valid base64)
      if (decoded.toString('base64') === ciphertext) {
        return { format: 'gcm', isLegacy: false };
      }
    }
  } catch {
    // Not valid base64
  }

  return { format: 'unknown', isLegacy: false };
}

/**
 * Decrypts legacy CBC-encrypted data
 *
 * Legacy format: hex(iv):hex(ciphertext)
 *
 * @param ciphertext - Hex-encoded CBC encrypted data with colon separator
 * @param key - A 32-byte encryption key
 * @returns The decrypted plaintext
 */
export function decryptLegacyCBC(ciphertext: string, key: Buffer): string {
  if (!ciphertext || typeof ciphertext !== 'string') {
    throw new EncryptionError('Ciphertext must be a non-empty string');
  }

  if (!Buffer.isBuffer(key) || key.length !== KEY_LENGTH) {
    throw new EncryptionError(
      `Key must be a ${KEY_LENGTH}-byte Buffer`,
      'decryptLegacyCBC',
    );
  }

  const parts = ciphertext.split(':');
  if (parts.length !== 2) {
    throw new EncryptionError(
      'Invalid CBC format - expected iv:ciphertext',
      'decryptLegacyCBC',
      true,
    );
  }

  const [ivHex, encryptedHex] = parts;

  try {
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    if (iv.length !== IV_LENGTH_CBC) {
      throw new EncryptionError(
        'Invalid IV length for CBC',
        'decryptLegacyCBC',
        true,
      );
    }

    const decipher = crypto.createDecipheriv(ALGORITHM_CBC, key, iv);
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    throw new EncryptionError(
      'Legacy CBC decryption failed',
      'decryptLegacyCBC',
      true,
    );
  }
}

/**
 * Smart decrypt function that handles both GCM and legacy CBC formats
 *
 * Automatically detects the encryption format and uses the appropriate
 * decryption method. This enables seamless migration from CBC to GCM.
 *
 * @param ciphertext - Encrypted data in either GCM (base64) or CBC (hex:hex) format
 * @param key - A 32-byte encryption key
 * @returns Object containing decrypted plaintext and format info
 */
export function decryptWithLegacySupport(
  ciphertext: string,
  key: Buffer,
): { plaintext: string; wasLegacy: boolean } {
  const formatInfo = detectEncryptionFormat(ciphertext);

  if (formatInfo.format === 'cbc') {
    return {
      plaintext: decryptLegacyCBC(ciphertext, key),
      wasLegacy: true,
    };
  }

  if (formatInfo.format === 'gcm') {
    return {
      plaintext: decrypt(ciphertext, key),
      wasLegacy: false,
    };
  }

  // Try GCM first, then CBC as fallback
  try {
    return {
      plaintext: decrypt(ciphertext, key),
      wasLegacy: false,
    };
  } catch {
    try {
      return {
        plaintext: decryptLegacyCBC(ciphertext, key),
        wasLegacy: true,
      };
    } catch {
      throw new EncryptionError(
        'Unable to decrypt - unknown format or invalid key',
        'decryptWithLegacySupport',
      );
    }
  }
}

/**
 * Re-encrypts data from legacy CBC format to GCM format
 *
 * @param cbcCiphertext - Legacy CBC encrypted data
 * @param key - A 32-byte encryption key (same key for both formats)
 * @returns New GCM encrypted ciphertext
 */
export function migrateToGCM(cbcCiphertext: string, key: Buffer): string {
  const plaintext = decryptLegacyCBC(cbcCiphertext, key);
  return encrypt(plaintext, key);
}

/**
 * Validates that an encryption key meets requirements
 *
 * @param key - The key to validate
 * @returns True if valid, throws otherwise
 */
export function validateKey(key: Buffer): boolean {
  if (!Buffer.isBuffer(key)) {
    throw new EncryptionError('Key must be a Buffer');
  }

  if (key.length !== KEY_LENGTH) {
    throw new EncryptionError(
      `Key must be exactly ${KEY_LENGTH} bytes (${KEY_LENGTH * 8} bits)`,
    );
  }

  return true;
}

/**
 * Generates a cryptographically secure random encryption key
 *
 * @returns A 32-byte Buffer suitable for AES-256 encryption
 */
export function generateKey(): Buffer {
  return crypto.randomBytes(KEY_LENGTH);
}

/**
 * Generates a hex-encoded key string for configuration
 *
 * @returns A 64-character hex string representing a 32-byte key
 */
export function generateKeyHex(): string {
  return generateKey().toString('hex');
}
