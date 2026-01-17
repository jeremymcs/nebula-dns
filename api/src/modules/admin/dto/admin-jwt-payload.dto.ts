// Nebula DNS - Admin JWT Payload DTO
// JWT token claims for admin authentication
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

/**
 * Admin JWT payload structure
 * Used for admin token validation and identity extraction
 */
export interface AdminJwtPayload {
  /**
   * Subject - the admin's unique identifier (admin_id)
   */
  sub: string;

  /**
   * Admin's email address
   */
  email: string;

  /**
   * Admin's display name
   */
  name: string;

  /**
   * Issuer - must be 'nebula-admin' to distinguish from tenant tokens
   */
  iss: string;

  /**
   * JWT ID - unique identifier for session tracking and blacklisting
   */
  jti: string;

  /**
   * Whether MFA has been verified in this session
   */
  mfaVerified: boolean;

  /**
   * Token issued at timestamp
   */
  iat?: number;

  /**
   * Token expiration timestamp
   */
  exp?: number;
}

/**
 * Admin user object returned from JWT validation
 * Attached to request.user by AdminJwtStrategy
 */
export interface AdminUser {
  /**
   * Admin's unique identifier
   */
  adminId: string;

  /**
   * Admin's email address
   */
  email: string;

  /**
   * Admin's display name
   */
  name: string;

  /**
   * Whether MFA has been verified in this session
   */
  mfaVerified: boolean;

  /**
   * JWT ID for session tracking
   */
  jti: string;
}
