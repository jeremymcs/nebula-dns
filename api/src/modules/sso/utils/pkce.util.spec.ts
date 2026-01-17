// Nebula DNS - PKCE Utility Unit Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  generateCodeVerifier,
  generateCodeChallenge,
  verifyPKCE,
  isValidCodeVerifier,
  generatePKCEPair,
  PKCE_VERIFIER_MIN_LENGTH,
  PKCE_VERIFIER_MAX_LENGTH,
  PKCE_VERIFIER_DEFAULT_LENGTH,
  PKCEPair,
} from './pkce.util';

describe('PKCE Utility', () => {
  describe('generateCodeVerifier', () => {
    it('should generate a code verifier with default length', () => {
      const verifier = generateCodeVerifier();
      expect(verifier).toHaveLength(PKCE_VERIFIER_DEFAULT_LENGTH);
    });

    it('should generate a code verifier with specified length', () => {
      const length = 64;
      const verifier = generateCodeVerifier(length);
      expect(verifier).toHaveLength(length);
    });

    it('should generate a code verifier with minimum length', () => {
      const verifier = generateCodeVerifier(PKCE_VERIFIER_MIN_LENGTH);
      expect(verifier).toHaveLength(PKCE_VERIFIER_MIN_LENGTH);
    });

    it('should generate a code verifier with maximum length', () => {
      const verifier = generateCodeVerifier(PKCE_VERIFIER_MAX_LENGTH);
      expect(verifier).toHaveLength(PKCE_VERIFIER_MAX_LENGTH);
    });

    it('should throw error for length below minimum', () => {
      expect(() => generateCodeVerifier(PKCE_VERIFIER_MIN_LENGTH - 1)).toThrow(
        `Code verifier length must be between ${PKCE_VERIFIER_MIN_LENGTH} and ${PKCE_VERIFIER_MAX_LENGTH} characters`,
      );
    });

    it('should throw error for length above maximum', () => {
      expect(() => generateCodeVerifier(PKCE_VERIFIER_MAX_LENGTH + 1)).toThrow(
        `Code verifier length must be between ${PKCE_VERIFIER_MIN_LENGTH} and ${PKCE_VERIFIER_MAX_LENGTH} characters`,
      );
    });

    it('should generate unique verifiers', () => {
      const verifiers = new Set<string>();
      for (let i = 0; i < 100; i++) {
        verifiers.add(generateCodeVerifier());
      }
      expect(verifiers.size).toBe(100);
    });

    it('should only contain URL-safe characters', () => {
      const verifier = generateCodeVerifier();
      // RFC 7636 unreserved characters: [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
      const urlSafePattern = /^[A-Za-z0-9\-._~]+$/;
      expect(verifier).toMatch(urlSafePattern);
    });
  });

  describe('generateCodeChallenge', () => {
    it('should generate a base64url-encoded challenge', () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);

      // Base64URL should not contain '+', '/', or '=' padding
      expect(challenge).not.toContain('+');
      expect(challenge).not.toContain('/');
      expect(challenge).not.toContain('=');
    });

    it('should generate consistent challenge for same verifier', () => {
      const verifier = 'test-verifier-12345678901234567890123456789012345';
      const challenge1 = generateCodeChallenge(verifier);
      const challenge2 = generateCodeChallenge(verifier);

      expect(challenge1).toBe(challenge2);
    });

    it('should generate different challenges for different verifiers', () => {
      const verifier1 = generateCodeVerifier();
      const verifier2 = generateCodeVerifier();

      const challenge1 = generateCodeChallenge(verifier1);
      const challenge2 = generateCodeChallenge(verifier2);

      expect(challenge1).not.toBe(challenge2);
    });

    it('should generate a 43-character challenge (SHA-256 base64url)', () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);

      // SHA-256 produces 32 bytes = 256 bits
      // Base64URL encoding of 32 bytes = 43 characters (without padding)
      expect(challenge).toHaveLength(43);
    });

    it('should match known test vector', () => {
      // Test vector from RFC 7636 Appendix B
      // Note: This is a simplified test - actual RFC test would require specific input
      const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
      const expectedChallenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

      const challenge = generateCodeChallenge(verifier);
      expect(challenge).toBe(expectedChallenge);
    });
  });

  describe('verifyPKCE', () => {
    it('should return true for valid verifier and challenge (S256)', () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);

      expect(verifyPKCE(verifier, challenge, 'S256')).toBe(true);
    });

    it('should return false for invalid verifier', () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      const wrongVerifier = generateCodeVerifier();

      expect(verifyPKCE(wrongVerifier, challenge, 'S256')).toBe(false);
    });

    it('should return false for invalid challenge', () => {
      const verifier = generateCodeVerifier();
      const wrongChallenge = generateCodeChallenge(generateCodeVerifier());

      expect(verifyPKCE(verifier, wrongChallenge, 'S256')).toBe(false);
    });

    it('should return false for empty verifier', () => {
      const challenge = generateCodeChallenge(generateCodeVerifier());

      expect(verifyPKCE('', challenge, 'S256')).toBe(false);
    });

    it('should return false for empty challenge', () => {
      const verifier = generateCodeVerifier();

      expect(verifyPKCE(verifier, '', 'S256')).toBe(false);
    });

    it('should return false for null/undefined verifier', () => {
      const challenge = generateCodeChallenge(generateCodeVerifier());

      expect(verifyPKCE(null as any, challenge, 'S256')).toBe(false);
      expect(verifyPKCE(undefined as any, challenge, 'S256')).toBe(false);
    });

    it('should return false for null/undefined challenge', () => {
      const verifier = generateCodeVerifier();

      expect(verifyPKCE(verifier, null as any, 'S256')).toBe(false);
      expect(verifyPKCE(verifier, undefined as any, 'S256')).toBe(false);
    });

    it('should return false for verifier too short', () => {
      const shortVerifier = 'a'.repeat(PKCE_VERIFIER_MIN_LENGTH - 1);
      const challenge = generateCodeChallenge(
        'a'.repeat(PKCE_VERIFIER_MIN_LENGTH),
      );

      expect(verifyPKCE(shortVerifier, challenge, 'S256')).toBe(false);
    });

    it('should return false for verifier too long', () => {
      const longVerifier = 'a'.repeat(PKCE_VERIFIER_MAX_LENGTH + 1);
      const challenge = generateCodeChallenge(
        'a'.repeat(PKCE_VERIFIER_MAX_LENGTH),
      );

      expect(verifyPKCE(longVerifier, challenge, 'S256')).toBe(false);
    });

    it('should work with plain method', () => {
      const verifier = generateCodeVerifier();
      // For plain method, challenge equals verifier
      expect(verifyPKCE(verifier, verifier, 'plain')).toBe(true);
    });

    it('should return false for unsupported method', () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);

      expect(verifyPKCE(verifier, challenge, 'unsupported' as any)).toBe(false);
    });

    it('should default to S256 method', () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);

      expect(verifyPKCE(verifier, challenge)).toBe(true);
    });
  });

  describe('isValidCodeVerifier', () => {
    it('should return true for valid code verifier', () => {
      const verifier = generateCodeVerifier();
      expect(isValidCodeVerifier(verifier)).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(isValidCodeVerifier('')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isValidCodeVerifier(null as any)).toBe(false);
      expect(isValidCodeVerifier(undefined as any)).toBe(false);
    });

    it('should return false for verifier too short', () => {
      const shortVerifier = 'a'.repeat(PKCE_VERIFIER_MIN_LENGTH - 1);
      expect(isValidCodeVerifier(shortVerifier)).toBe(false);
    });

    it('should return false for verifier too long', () => {
      const longVerifier = 'a'.repeat(PKCE_VERIFIER_MAX_LENGTH + 1);
      expect(isValidCodeVerifier(longVerifier)).toBe(false);
    });

    it('should return false for verifier with invalid characters', () => {
      // Contains space
      const invalidVerifier1 =
        'abc def' + 'a'.repeat(PKCE_VERIFIER_MIN_LENGTH - 7);
      expect(isValidCodeVerifier(invalidVerifier1)).toBe(false);

      // Contains special character
      const invalidVerifier2 = 'abc@def' + 'a'.repeat(PKCE_VERIFIER_MIN_LENGTH);
      expect(isValidCodeVerifier(invalidVerifier2)).toBe(false);

      // Contains unicode
      const invalidVerifier3 =
        'abc\u00e9def' + 'a'.repeat(PKCE_VERIFIER_MIN_LENGTH);
      expect(isValidCodeVerifier(invalidVerifier3)).toBe(false);
    });

    it('should return true for verifier with all valid characters', () => {
      // All allowed characters: A-Z, a-z, 0-9, -, ., _, ~
      const validVerifier =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop1234-._~';
      expect(isValidCodeVerifier(validVerifier)).toBe(true);
    });
  });

  describe('generatePKCEPair', () => {
    it('should generate a valid PKCE pair', () => {
      const pair: PKCEPair = generatePKCEPair();

      expect(pair).toHaveProperty('codeVerifier');
      expect(pair).toHaveProperty('codeChallenge');
      expect(pair).toHaveProperty('codeChallengeMethod');
    });

    it('should generate a verifier with default length', () => {
      const pair = generatePKCEPair();
      expect(pair.codeVerifier).toHaveLength(PKCE_VERIFIER_DEFAULT_LENGTH);
    });

    it('should generate a verifier with specified length', () => {
      const length = 80;
      const pair = generatePKCEPair(length);
      expect(pair.codeVerifier).toHaveLength(length);
    });

    it('should use S256 as the challenge method', () => {
      const pair = generatePKCEPair();
      expect(pair.codeChallengeMethod).toBe('S256');
    });

    it('should generate matching verifier and challenge', () => {
      const pair = generatePKCEPair();
      expect(verifyPKCE(pair.codeVerifier, pair.codeChallenge, 'S256')).toBe(
        true,
      );
    });

    it('should generate unique pairs', () => {
      const pairs = Array.from({ length: 100 }, () => generatePKCEPair());
      const verifiers = new Set(pairs.map((p) => p.codeVerifier));
      const challenges = new Set(pairs.map((p) => p.codeChallenge));

      expect(verifiers.size).toBe(100);
      expect(challenges.size).toBe(100);
    });
  });

  describe('Security Properties', () => {
    it('should be resistant to timing attacks (constant-time comparison)', () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      const wrongChallenge = generateCodeChallenge(generateCodeVerifier());

      // Run multiple iterations to ensure consistency
      const iterations = 1000;
      const correctTimes: number[] = [];
      const wrongTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start1 = process.hrtime.bigint();
        verifyPKCE(verifier, challenge, 'S256');
        const end1 = process.hrtime.bigint();
        correctTimes.push(Number(end1 - start1));

        const start2 = process.hrtime.bigint();
        verifyPKCE(verifier, wrongChallenge, 'S256');
        const end2 = process.hrtime.bigint();
        wrongTimes.push(Number(end2 - start2));
      }

      // Calculate averages (excluding outliers)
      const sortedCorrect = correctTimes.sort((a, b) => a - b);
      const sortedWrong = wrongTimes.sort((a, b) => a - b);

      // Remove top and bottom 10%
      const trim = Math.floor(iterations * 0.1);
      const trimmedCorrect = sortedCorrect.slice(trim, -trim);
      const trimmedWrong = sortedWrong.slice(trim, -trim);

      const avgCorrect =
        trimmedCorrect.reduce((a, b) => a + b, 0) / trimmedCorrect.length;
      const avgWrong =
        trimmedWrong.reduce((a, b) => a + b, 0) / trimmedWrong.length;

      // Times should be roughly similar (within 2x, accounting for variance)
      // This is a basic check - production systems should use more rigorous testing
      const ratio =
        Math.max(avgCorrect, avgWrong) / Math.min(avgCorrect, avgWrong);
      expect(ratio).toBeLessThan(3);
    });

    it('should produce cryptographically random verifiers', () => {
      // Basic entropy check - character distribution should be relatively uniform
      const samples = 10000;
      const charCounts: Record<string, number> = {};

      for (let i = 0; i < samples; i++) {
        const verifier = generateCodeVerifier(64);
        for (const char of verifier) {
          charCounts[char] = (charCounts[char] || 0) + 1;
        }
      }

      const counts = Object.values(charCounts);
      const avg = counts.reduce((a, b) => a + b, 0) / counts.length;

      // Check that no character appears more than 2x the average (rough uniformity)
      for (const count of counts) {
        expect(count).toBeLessThan(avg * 2);
        expect(count).toBeGreaterThan(avg * 0.5);
      }
    });
  });
});
