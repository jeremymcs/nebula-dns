// Nebula DNS - Encryption Configuration Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  getEncryptionConfigStatus,
  validateEncryptionConfig,
  getEncryptionKey,
  ENCRYPTION_KEYS,
  MIN_KEY_LENGTH_BYTES,
} from './encryption.config';

describe('Encryption Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
    // Clear all encryption keys
    for (const key of ENCRYPTION_KEYS) {
      delete process.env[key];
    }
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getEncryptionConfigStatus', () => {
    it('should report all keys as not present when none are set', () => {
      const status = getEncryptionConfigStatus();

      // In development, isConfigured is true (no errors) even with missing keys
      // Keys should all be marked as not present
      expect(status.warnings.length).toBeGreaterThan(0);
      expect(status.keys.every((k) => !k.isPresent)).toBe(true);
    });

    it('should report keys as present when configured', () => {
      // Set valid encryption keys (at least 32 bytes)
      process.env.MFA_ENCRYPTION_KEY = 'this-is-a-valid-32-byte-test-key';
      process.env.SSO_ENCRYPTION_KEY = 'another-valid-32-byte-test-key!!';
      process.env.SIEM_ENCRYPTION_KEY = 'yet-another-valid-32-byte-key!!!';
      process.env.ALERTING_ENCRYPTION_KEY = 'alerting-valid-32-byte-test-key';

      const status = getEncryptionConfigStatus();

      expect(status.isConfigured).toBe(true);
      expect(status.errors.length).toBe(0);
      expect(status.keys.every((k) => k.isPresent)).toBe(true);
    });

    it('should validate key length correctly for base64 encoded keys', () => {
      // A 32-byte key base64 encoded (openssl rand -base64 32)
      process.env.MFA_ENCRYPTION_KEY =
        'K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=';
      process.env.SSO_ENCRYPTION_KEY =
        'K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=';
      process.env.SIEM_ENCRYPTION_KEY =
        'K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=';
      process.env.ALERTING_ENCRYPTION_KEY =
        'K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=';

      const status = getEncryptionConfigStatus();

      expect(status.keys.every((k) => k.isValidLength)).toBe(true);
    });

    it('should reject keys that are too short', () => {
      process.env.MFA_ENCRYPTION_KEY = 'short';
      process.env.SSO_ENCRYPTION_KEY = 'also-short';
      process.env.SIEM_ENCRYPTION_KEY = 'too-short';

      const status = getEncryptionConfigStatus();

      expect(status.keys.every((k) => !k.isValidLength)).toBe(true);
    });

    it('should report errors in production environment', () => {
      process.env.NODE_ENV = 'production';

      const status = getEncryptionConfigStatus();

      expect(status.errors.length).toBeGreaterThan(0);
      expect(status.isConfigured).toBe(false);
    });

    it('should report warnings in development environment', () => {
      process.env.NODE_ENV = 'development';

      const status = getEncryptionConfigStatus();

      expect(status.warnings.length).toBeGreaterThan(0);
      expect(status.errors.length).toBe(0);
    });
  });

  describe('validateEncryptionConfig', () => {
    it('should not throw in development when keys are missing', () => {
      process.env.NODE_ENV = 'development';

      expect(() => validateEncryptionConfig()).not.toThrow();
    });

    it('should throw in production when keys are missing', () => {
      process.env.NODE_ENV = 'production';

      expect(() => validateEncryptionConfig()).toThrow(
        /Missing or invalid encryption keys/,
      );
    });

    it('should not throw in production when all keys are valid', () => {
      process.env.NODE_ENV = 'production';
      process.env.MFA_ENCRYPTION_KEY = 'this-is-a-valid-32-byte-test-key';
      process.env.SSO_ENCRYPTION_KEY = 'another-valid-32-byte-test-key!!';
      process.env.SIEM_ENCRYPTION_KEY = 'yet-another-valid-32-byte-key!!!';
      process.env.ALERTING_ENCRYPTION_KEY = 'alerting-valid-32-byte-test-key';

      expect(() => validateEncryptionConfig()).not.toThrow();
    });
  });

  describe('getEncryptionKey', () => {
    it('should return the key value when configured', () => {
      const testKey = 'my-secure-encryption-key-for-testing';
      process.env.MFA_ENCRYPTION_KEY = testKey;

      const result = getEncryptionKey('MFA_ENCRYPTION_KEY');

      expect(result).toBe(testKey);
    });

    it('should return fallback in development when key is missing', () => {
      process.env.NODE_ENV = 'development';

      const result = getEncryptionKey('MFA_ENCRYPTION_KEY');

      expect(result).toContain('insecure-dev-key');
      expect(result).toContain('MFA_ENCRYPTION_KEY');
    });

    it('should throw in production when key is missing', () => {
      process.env.NODE_ENV = 'production';

      expect(() => getEncryptionKey('MFA_ENCRYPTION_KEY')).toThrow(
        /required but not configured/,
      );
    });
  });

  describe('constants', () => {
    it('should have MIN_KEY_LENGTH_BYTES set to 32', () => {
      expect(MIN_KEY_LENGTH_BYTES).toBe(32);
    });

    it('should have all expected encryption keys defined', () => {
      expect(ENCRYPTION_KEYS).toContain('MFA_ENCRYPTION_KEY');
      expect(ENCRYPTION_KEYS).toContain('SSO_ENCRYPTION_KEY');
      expect(ENCRYPTION_KEYS).toContain('SIEM_ENCRYPTION_KEY');
    });
  });
});
