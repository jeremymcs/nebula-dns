// Nebula DNS - Limit Check DTOs
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

/**
 * Result of a limit check operation
 */
export interface LimitCheckResult {
  /** Whether the action is allowed */
  allowed: boolean;
  /** Current count of the resource */
  current: number;
  /** Maximum allowed (null = unlimited) */
  limit: number | null;
  /** Remaining capacity (null = unlimited) */
  remaining: number | null;
}

/**
 * Tenant's limits based on their subscription tier
 */
export interface TenantLimits {
  /** The tenant's subscription tier */
  tier: string;
  /** Maximum locations allowed (null = unlimited) */
  locationLimit: number | null;
  /** Maximum MSP clients allowed (null = unlimited) */
  clientLimit: number | null;
  /** Maximum family members allowed for Home tier (null = unlimited) */
  familyMemberLimit: number | null;
  /** Maximum users allowed (null = unlimited) */
  userLimit: number | null;
  /** Maximum policies allowed (null = unlimited) */
  policyLimit: number | null;
  /** Maximum custom lists allowed (null = unlimited) */
  customListLimit: number | null;
  /** Maximum assigned DNS zones (null = unlimited) */
  dnsZoneLimit: number | null;
  /** Maximum queries per month (null = unlimited) */
  queriesPerMonth: number | null;
}

/**
 * Raw limits from subscription plan
 */
export interface PlanLimitsRaw {
  locations: number;
  queries_per_month: number;
  users: number;
  policies: number;
  custom_lists: number;
  clients?: number;
  family_members?: number;
  dns_zones?: number;
}
