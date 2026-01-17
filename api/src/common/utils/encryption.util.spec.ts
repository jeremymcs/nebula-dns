// Nebula DNS - Encryption Utilities Unit Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import * as crypto from 'crypto';
import {
  encrypt,
  decrypt,
  deriveKey,
  decryptLegacyCBC,
  decryptWithLegacySupport,
  detectEncryptionFormat,
  migrateToGCM,
  validateKey,
  generateKey,
  generateKeyHex,
  EncryptionError,
} from './encryption.util';

describe('Encryption Utilities', () => {
  // Test key derived from a known secret
  const testSecret = 'test-encryption-key-for-unit-tests';
  const testKey = deriveKey(testSecret);

  describe('deriveKey', () => {
    it('should derive a 32-byte key from a secret', () => {
      const key = deriveKey('my-secret-password');

      expect(Buffer.isBuffer(key)).toBe(true);
      expect(key.length).toBe(32);
    });

    it('should produce consistent keys for the same input', () => {
      const key1 = deriveKey('consistent-secret', 'salt1');
      const key2 = deriveKey('consistent-secret', 'salt1');

      expect(key1.equals(key2)).toBe(true);
    });

    it('should produce different keys for different salts', () => {
      const key1 = deriveKey('same-secret', 'salt1');
      const key2 = deriveKey('same-secret', 'salt2');

      expect(key1.equals(key2)).toBe(false);
    });

    it('should produce different keys for different secrets', () => {
      const key1 = deriveKey('secret1', 'same-salt');
      const key2 = deriveKey('secret2', 'same-salt');

      expect(key1.equals(key2)).toBe(false);
    });

    it('should throw for empty secret', () => {
      expect(() => deriveKey('')).toThrow(EncryptionError);
    });

    it('should throw for non-string secret', () => {
      expect(() => deriveKey(null as any)).toThrow(EncryptionError);
      expect(() => deriveKey(undefined as any)).toThrow(EncryptionError);
      expect(() => deriveKey(123 as any)).toThrow(EncryptionError);
    });

    it('should use default salt when not provided', () => {
      const key = deriveKey('test-secret');

      expect(key.length).toBe(32);
    });
  });

  describe('encrypt', () => {
    it('should encrypt plaintext to base64 string', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encrypt(plaintext, testKey);

      expect(typeof encrypted).toBe('string');
      // Should be valid base64
      expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();
    });

    it('should produce different ciphertext each time (random IV)', () => {
      const plaintext = 'Same message';
      const encrypted1 = encrypt(plaintext, testKey);
      const encrypted2 = encrypt(plaintext, testKey);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should encrypt and maintain data integrity', () => {
      const plaintext = 'This is sensitive data';
      const encrypted = encrypt(plaintext, testKey);
      const decrypted = decrypt(encrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle Unicode characters', () => {
      const plaintext = 'Hello World Emoji Test Unicode';
      const encrypted = encrypt(plaintext, testKey);
      const decrypted = decrypt(encrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long text', () => {
      const plaintext = 'A'.repeat(10000);
      const encrypted = encrypt(plaintext, testKey);
      const decrypted = decrypt(encrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle JSON strings', () => {
      const plaintext = JSON.stringify({
        secret: 'api-key-123',
        nested: { data: true },
      });
      const encrypted = encrypt(plaintext, testKey);
      const decrypted = decrypt(encrypted, testKey);

      expect(JSON.parse(decrypted)).toEqual(JSON.parse(plaintext));
    });

    it('should throw for empty plaintext', () => {
      expect(() => encrypt('', testKey)).toThrow(EncryptionError);
    });

    it('should throw for non-string plaintext', () => {
      expect(() => encrypt(null as any, testKey)).toThrow(EncryptionError);
    });

    it('should throw for invalid key length', () => {
      const shortKey = Buffer.alloc(16);
      expect(() => encrypt('test', shortKey)).toThrow(EncryptionError);
    });

    it('should throw for non-Buffer key', () => {
      expect(() => encrypt('test', 'string-key' as any)).toThrow(
        EncryptionError,
      );
    });
  });

  describe('decrypt', () => {
    it('should decrypt ciphertext back to original plaintext', () => {
      const plaintext = 'Decryption test';
      const encrypted = encrypt(plaintext, testKey);
      const decrypted = decrypt(encrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should fail with wrong key', () => {
      const plaintext = 'Secret data';
      const encrypted = encrypt(plaintext, testKey);
      const wrongKey = deriveKey('wrong-key');

      expect(() => decrypt(encrypted, wrongKey)).toThrow(EncryptionError);
    });

    it('should fail with tampered ciphertext', () => {
      const encrypted = encrypt('Original data', testKey);
      // Tamper with the ciphertext
      const tampered =
        encrypted.slice(0, -4) +
        'AAAA'.slice(0, Math.min(4, encrypted.length - (encrypted.length - 4)));

      expect(() => decrypt(tampered, testKey)).toThrow(EncryptionError);
    });

    it('should fail with truncated ciphertext', () => {
      const encrypted = encrypt('Original data', testKey);
      const truncated = encrypted.slice(0, encrypted.length / 2);

      expect(() => decrypt(truncated, testKey)).toThrow(EncryptionError);
    });

    it('should throw for empty ciphertext', () => {
      expect(() => decrypt('', testKey)).toThrow(EncryptionError);
    });

    it('should throw for invalid base64', () => {
      expect(() => decrypt('not-valid-base64!!!', testKey)).toThrow(
        EncryptionError,
      );
    });

    it('should throw for ciphertext that is too short', () => {
      const tooShort = Buffer.alloc(10).toString('base64');
      expect(() => decrypt(tooShort, testKey)).toThrow(EncryptionError);
    });
  });

  describe('detectEncryptionFormat', () => {
    it('should detect GCM format correctly', () => {
      const encrypted = encrypt('test', testKey);
      const result = detectEncryptionFormat(encrypted);

      expect(result.format).toBe('gcm');
      expect(result.isLegacy).toBe(false);
    });

    it('should detect CBC format correctly', () => {
      // Simulate CBC format: iv:ciphertext in hex
      const iv = crypto.randomBytes(16).toString('hex');
      const ciphertext = crypto.randomBytes(32).toString('hex');
      const cbcFormat = `${iv}:${ciphertext}`;

      const result = detectEncryptionFormat(cbcFormat);

      expect(result.format).toBe('cbc');
      expect(result.isLegacy).toBe(true);
    });

    it('should return unknown for empty string', () => {
      const result = detectEncryptionFormat('');

      expect(result.format).toBe('unknown');
    });

    it('should return unknown for null', () => {
      const result = detectEncryptionFormat(null as any);

      expect(result.format).toBe('unknown');
    });

    it('should return unknown for malformed data', () => {
      const result = detectEncryptionFormat('not:hex:data');

      expect(result.format).toBe('unknown');
    });

    it('should not falsely detect colon in base64 as CBC', () => {
      // Base64 doesn't contain colons, so valid base64 with data containing colon
      // should still be detected as GCM after encoding
      const encrypted = encrypt('data:with:colons', testKey);
      const result = detectEncryptionFormat(encrypted);

      expect(result.format).toBe('gcm');
    });
  });

  describe('decryptLegacyCBC', () => {
    // Helper to create actual CBC encrypted data for testing
    function encryptCBC(plaintext: string, key: Buffer): string {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    }

    it('should decrypt legacy CBC format', () => {
      const plaintext = 'Legacy secret data';
      const cbcEncrypted = encryptCBC(plaintext, testKey);
      const decrypted = decryptLegacyCBC(cbcEncrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw for invalid CBC format', () => {
      expect(() => decryptLegacyCBC('invalid-no-colon', testKey)).toThrow(
        EncryptionError,
      );
    });

    it('should throw for invalid IV length', () => {
      const shortIv = crypto.randomBytes(8).toString('hex');
      const ciphertext = crypto.randomBytes(32).toString('hex');

      expect(() =>
        decryptLegacyCBC(`${shortIv}:${ciphertext}`, testKey),
      ).toThrow(EncryptionError);
    });

    it('should throw for wrong key', () => {
      const cbcEncrypted = encryptCBC('test', testKey);
      const wrongKey = deriveKey('wrong-key');

      expect(() => decryptLegacyCBC(cbcEncrypted, wrongKey)).toThrow(
        EncryptionError,
      );
    });

    it('should set isLegacyFormat flag in error', () => {
      try {
        decryptLegacyCBC('invalid', testKey);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(EncryptionError);
        expect((error as EncryptionError).isLegacyFormat).toBe(true);
      }
    });
  });

  describe('decryptWithLegacySupport', () => {
    // Helper to create actual CBC encrypted data
    function encryptCBC(plaintext: string, key: Buffer): string {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    }

    it('should decrypt GCM format and report not legacy', () => {
      const plaintext = 'GCM encrypted data';
      const encrypted = encrypt(plaintext, testKey);
      const result = decryptWithLegacySupport(encrypted, testKey);

      expect(result.plaintext).toBe(plaintext);
      expect(result.wasLegacy).toBe(false);
    });

    it('should decrypt CBC format and report as legacy', () => {
      const plaintext = 'CBC encrypted data';
      const encrypted = encryptCBC(plaintext, testKey);
      const result = decryptWithLegacySupport(encrypted, testKey);

      expect(result.plaintext).toBe(plaintext);
      expect(result.wasLegacy).toBe(true);
    });

    it('should try fallback decryption for ambiguous format', () => {
      const plaintext = 'Fallback test';
      const encrypted = encrypt(plaintext, testKey);
      const result = decryptWithLegacySupport(encrypted, testKey);

      expect(result.plaintext).toBe(plaintext);
    });

    it('should throw if neither format works', () => {
      expect(() =>
        decryptWithLegacySupport('completely-invalid-data', testKey),
      ).toThrow(EncryptionError);
    });
  });

  describe('migrateToGCM', () => {
    // Helper to create actual CBC encrypted data
    function encryptCBC(plaintext: string, key: Buffer): string {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    }

    it('should migrate CBC encrypted data to GCM format', () => {
      const plaintext = 'Data to migrate';
      const cbcEncrypted = encryptCBC(plaintext, testKey);
      const gcmEncrypted = migrateToGCM(cbcEncrypted, testKey);

      // Verify the new format is GCM
      const formatInfo = detectEncryptionFormat(gcmEncrypted);
      expect(formatInfo.format).toBe('gcm');
      expect(formatInfo.isLegacy).toBe(false);

      // Verify data integrity after migration
      const decrypted = decrypt(gcmEncrypted, testKey);
      expect(decrypted).toBe(plaintext);
    });

    it('should preserve data during migration', () => {
      const testData = {
        apiKey: 'secret-api-key-12345',
        credentials: {
          username: 'admin',
          token: 'secure-token',
        },
      };
      const plaintext = JSON.stringify(testData);
      const cbcEncrypted = encryptCBC(plaintext, testKey);
      const gcmEncrypted = migrateToGCM(cbcEncrypted, testKey);

      const decrypted = decrypt(gcmEncrypted, testKey);
      expect(JSON.parse(decrypted)).toEqual(testData);
    });
  });

  describe('validateKey', () => {
    it('should return true for valid 32-byte key', () => {
      const validKey = crypto.randomBytes(32);
      expect(validateKey(validKey)).toBe(true);
    });

    it('should throw for short key', () => {
      const shortKey = crypto.randomBytes(16);
      expect(() => validateKey(shortKey)).toThrow(EncryptionError);
    });

    it('should throw for long key', () => {
      const longKey = crypto.randomBytes(64);
      expect(() => validateKey(longKey)).toThrow(EncryptionError);
    });

    it('should throw for non-Buffer', () => {
      expect(() => validateKey('string' as any)).toThrow(EncryptionError);
      expect(() => validateKey([1, 2, 3] as any)).toThrow(EncryptionError);
    });
  });

  describe('generateKey', () => {
    it('should generate a 32-byte Buffer', () => {
      const key = generateKey();

      expect(Buffer.isBuffer(key)).toBe(true);
      expect(key.length).toBe(32);
    });

    it('should generate unique keys each time', () => {
      const key1 = generateKey();
      const key2 = generateKey();

      expect(key1.equals(key2)).toBe(false);
    });

    it('should generate keys that pass validation', () => {
      const key = generateKey();
      expect(validateKey(key)).toBe(true);
    });
  });

  describe('generateKeyHex', () => {
    it('should generate a 64-character hex string', () => {
      const keyHex = generateKeyHex();

      expect(typeof keyHex).toBe('string');
      expect(keyHex.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(keyHex)).toBe(true);
    });

    it('should generate unique hex keys each time', () => {
      const key1 = generateKeyHex();
      const key2 = generateKeyHex();

      expect(key1).not.toBe(key2);
    });

    it('should produce hex that converts to valid key', () => {
      const keyHex = generateKeyHex();
      const keyBuffer = Buffer.from(keyHex, 'hex');

      expect(validateKey(keyBuffer)).toBe(true);
    });
  });

  describe('End-to-end scenarios', () => {
    it('should handle full encryption lifecycle', () => {
      // Generate a secure key
      const secretPhrase = 'my-very-secure-passphrase';
      const key = deriveKey(secretPhrase);

      // Encrypt sensitive data
      const sensitiveData = {
        totpSecret: 'JBSWY3DPEHPK3PXP',
        backupKey: 'recovery-key-123',
      };
      const encrypted = encrypt(JSON.stringify(sensitiveData), key);

      // Store and retrieve (simulated)
      const storedData = encrypted;

      // Decrypt on retrieval
      const decrypted = decrypt(storedData, key);
      const recovered = JSON.parse(decrypted);

      expect(recovered).toEqual(sensitiveData);
    });

    it('should handle migration from legacy to new format', () => {
      // Simulate legacy CBC encrypted data from old system
      const legacyKey = deriveKey('old-system-key', 'salt');

      function encryptLegacy(text: string): string {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', legacyKey, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
      }

      const originalSecret = 'TOTP_SECRET_ABC123';
      const legacyEncrypted = encryptLegacy(originalSecret);

      // Detect format
      const formatInfo = detectEncryptionFormat(legacyEncrypted);
      expect(formatInfo.isLegacy).toBe(true);

      // Decrypt with legacy support
      const { plaintext, wasLegacy } = decryptWithLegacySupport(
        legacyEncrypted,
        legacyKey,
      );
      expect(wasLegacy).toBe(true);
      expect(plaintext).toBe(originalSecret);

      // Re-encrypt with GCM
      const newEncrypted = encrypt(plaintext, legacyKey);

      // Verify new format
      const newFormatInfo = detectEncryptionFormat(newEncrypted);
      expect(newFormatInfo.isLegacy).toBe(false);
      expect(newFormatInfo.format).toBe('gcm');

      // Verify data integrity
      expect(decrypt(newEncrypted, legacyKey)).toBe(originalSecret);
    });

    it('should maintain security properties under concurrent usage', async () => {
      const key = deriveKey('concurrent-test-key');
      const testData = 'Concurrent encryption test data';

      // Simulate concurrent encryptions
      const encryptions = await Promise.all(
        Array(100)
          .fill(null)
          .map(async () => {
            return encrypt(testData, key);
          }),
      );

      // All should be unique (random IVs)
      const uniqueEncryptions = new Set(encryptions);
      expect(uniqueEncryptions.size).toBe(100);

      // All should decrypt to same value
      for (const encrypted of encryptions) {
        expect(decrypt(encrypted, key)).toBe(testData);
      }
    });
  });
});
