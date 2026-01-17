// Nebula DNS - PKCE Utilities for OIDC
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import * as crypto from 'crypto';

/**
 * PKCE (Proof Key for Code Exchange) utilities for OAuth 2.0 / OIDC
 *
 * PKCE is a security extension to OAuth 2.0 that prevents authorization code
 * interception attacks. It is recommended for all public clients and is
 * increasingly required by identity providers.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7636
 */

/**
 * Characters allowed in the code verifier (unreserved URI characters)
 * Per RFC 7636 Section 4.1
 */
const ALLOWED_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

/**
 * Minimum length of code verifier per RFC 7636
 */
export const PKCE_VERIFIER_MIN_LENGTH = 43;

/**
 * Maximum length of code verifier per RFC 7636
 */
export const PKCE_VERIFIER_MAX_LENGTH = 128;

/**
 * Default length of code verifier (recommended for security)
 */
export const PKCE_VERIFIER_DEFAULT_LENGTH = 64;

/**
 * Supported code challenge methods
 */
export type CodeChallengeMethod = 'S256' | 'plain';

/**
 * Generate a cryptographically random code_verifier
 *
 * The code verifier is a high-entropy cryptographic random string using
 * the unreserved characters [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~",
 * with a minimum length of 43 characters and a maximum length of 128 characters.
 *
 * @param length - Length of the code verifier (43-128, default: 64)
 * @returns A URL-safe random string to be used as the code_verifier
 * @throws Error if length is outside the allowed range
 */
export function generateCodeVerifier(
  length: number = PKCE_VERIFIER_DEFAULT_LENGTH,
): string {
  if (length < PKCE_VERIFIER_MIN_LENGTH || length > PKCE_VERIFIER_MAX_LENGTH) {
    throw new Error(
      `Code verifier length must be between ${PKCE_VERIFIER_MIN_LENGTH} and ${PKCE_VERIFIER_MAX_LENGTH} characters`,
    );
  }

  // Generate random bytes
  const randomBytes = crypto.randomBytes(length);

  // Map bytes to allowed characters
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ALLOWED_CHARS[randomBytes[i] % ALLOWED_CHARS.length];
  }

  return result;
}

/**
 * Generate a code_challenge from a code_verifier using S256 method
 *
 * S256 is the SHA-256 hash of the code verifier, Base64URL encoded.
 * This is the recommended method as it provides better security than plain.
 *
 * code_challenge = BASE64URL(SHA256(code_verifier))
 *
 * @param verifier - The code_verifier to hash
 * @returns The base64url-encoded SHA-256 hash of the verifier
 */
export function generateCodeChallenge(verifier: string): string {
  // Create SHA-256 hash of the verifier
  const hash = crypto.createHash('sha256').update(verifier, 'ascii').digest();

  // Convert to base64url encoding (no padding)
  return hash
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Verify that a code_verifier matches a code_challenge
 *
 * This function computes the challenge from the provided verifier
 * and compares it to the expected challenge using constant-time comparison
 * to prevent timing attacks.
 *
 * @param verifier - The code_verifier provided by the client
 * @param challenge - The code_challenge to verify against
 * @param method - The challenge method used (default: 'S256')
 * @returns true if the verifier matches the challenge, false otherwise
 */
export function verifyPKCE(
  verifier: string,
  challenge: string,
  method: CodeChallengeMethod = 'S256',
): boolean {
  if (!verifier || !challenge) {
    return false;
  }

  // Validate verifier length
  if (
    verifier.length < PKCE_VERIFIER_MIN_LENGTH ||
    verifier.length > PKCE_VERIFIER_MAX_LENGTH
  ) {
    return false;
  }

  let computedChallenge: string;

  if (method === 'S256') {
    computedChallenge = generateCodeChallenge(verifier);
  } else if (method === 'plain') {
    // Plain method - challenge equals verifier (not recommended)
    computedChallenge = verifier;
  } else {
    // Unsupported method
    return false;
  }

  // Use constant-time comparison to prevent timing attacks
  return timingSafeEqual(computedChallenge, challenge);
}

/**
 * Perform a constant-time string comparison
 *
 * This prevents timing attacks by ensuring the comparison takes
 * the same amount of time regardless of where strings differ.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal, false otherwise
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a comparison to maintain constant time
    crypto.timingSafeEqual(
      Buffer.from(a.padEnd(Math.max(a.length, b.length), '\0')),
      Buffer.from(b.padEnd(Math.max(a.length, b.length), '\0')),
    );
    return false;
  }

  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

/**
 * Validate that a string is a valid code verifier format
 *
 * @param verifier - The string to validate
 * @returns true if the string is a valid code verifier format
 */
export function isValidCodeVerifier(verifier: string): boolean {
  if (!verifier) {
    return false;
  }

  if (
    verifier.length < PKCE_VERIFIER_MIN_LENGTH ||
    verifier.length > PKCE_VERIFIER_MAX_LENGTH
  ) {
    return false;
  }

  // Check that all characters are from the allowed set
  for (const char of verifier) {
    if (!ALLOWED_CHARS.includes(char)) {
      return false;
    }
  }

  return true;
}

/**
 * PKCE pair containing both verifier and challenge
 */
export interface PKCEPair {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: CodeChallengeMethod;
}

/**
 * Generate a complete PKCE pair (verifier and challenge)
 *
 * @param length - Length of the code verifier (43-128, default: 64)
 * @returns An object containing the code verifier, challenge, and method
 */
export function generatePKCEPair(
  length: number = PKCE_VERIFIER_DEFAULT_LENGTH,
): PKCEPair {
  const codeVerifier = generateCodeVerifier(length);
  const codeChallenge = generateCodeChallenge(codeVerifier);

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256',
  };
}
