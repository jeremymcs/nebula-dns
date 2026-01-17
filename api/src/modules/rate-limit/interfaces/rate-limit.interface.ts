// Nebula DNS - Distributed Rate Limiting Interfaces
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

/**
 * Rate limit types for different limiting strategies
 */
export enum RateLimitType {
  PER_IP = 'per-ip',
  PER_TENANT = 'per-tenant',
  PER_LOCATION = 'per-location',
  PER_API_KEY = 'per-api-key',
}

/**
 * Result of a rate limit check
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
  current: number;
}

/**
 * Options for rate limiting
 */
export interface RateLimitOptions {
  type: RateLimitType;
  limit: number;
  windowMs: number;
  // Optional custom key generator
  keyGenerator?: (request: any) => string;
  // Skip rate limiting for certain conditions
  skip?: (request: any) => boolean;
  // Custom error message
  message?: string;
}

/**
 * Rate limit configuration stored in Redis pub/sub
 */
export interface RateLimitConfig {
  type: RateLimitType;
  identifier: string;
  limit: number;
  windowMs: number;
  enabled: boolean;
}

/**
 * Rate limit invalidation message for pub/sub
 */
export interface RateLimitInvalidationMessage {
  type: 'rate_limit';
  action: 'update' | 'reset' | 'delete';
  config?: RateLimitConfig;
  identifier?: string;
}
