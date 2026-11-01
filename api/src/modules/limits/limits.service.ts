// Nebula DNS - Limits Enforcement Service
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Location } from '../locations/entities/location.entity';
import { FamilyMember } from '../family/entities/family-member.entity';
import {
  SubscriptionPlan,
  PlanLimits,
} from '../subscriptions/entities/subscription-plan.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { RedisService } from '../redis/redis.service';
import {
  LimitCheckResult,
  TenantLimits,
  PlanLimitsRaw,
} from './dto/limit-check.dto';
import { LimitExceededException } from './exceptions/limit-exceeded.exception';

/** Cache TTL in seconds */
const CACHE_TTL_SECONDS = 60;

/** Cache key prefixes */
const CACHE_KEYS = {
  TENANT_LIMITS: 'limits:tenant:',
  LOCATION_COUNT: 'limits:locations:',
  CLIENT_COUNT: 'limits:clients:',
  FAMILY_MEMBER_COUNT: 'limits:family:',
  DNS_ZONE_COUNT: 'limits:dns-zones:',
};

@Injectable()
export class LimitsService {
  private readonly logger = new Logger(LimitsService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(FamilyMember)
    private readonly familyMemberRepository: Repository<FamilyMember>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepository: Repository<SubscriptionPlan>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Check if a tenant can create a new location
   * @throws LimitExceededException if limit would be exceeded
   */
  async canCreateLocation(tenantId: string): Promise<LimitCheckResult> {
    const limits = await this.getTenantLimits(tenantId);
    const currentCount = await this.getLocationCount(tenantId);

    const result = this.checkLimit(currentCount, limits.locationLimit);

    if (!result.allowed) {
      throw new LimitExceededException({
        resourceType: 'location',
        current: currentCount,
        limit: limits.locationLimit!,
        tier: limits.tier,
        upgradeMessage: this.getUpgradeMessage(limits.tier, 'location'),
        upgradeUrl: '/dashboard/settings/billing',
      });
    }

    return result;
  }

  /**
   * Check if an MSP tenant can create a new client organization
   * @throws LimitExceededException if limit would be exceeded
   */
  async canCreateClient(tenantId: string): Promise<LimitCheckResult> {
    const limits = await this.getTenantLimits(tenantId);
    const currentCount = await this.getClientCount(tenantId);

    const result = this.checkLimit(currentCount, limits.clientLimit);

    if (!result.allowed) {
      throw new LimitExceededException({
        resourceType: 'client',
        current: currentCount,
        limit: limits.clientLimit!,
        tier: limits.tier,
        upgradeMessage: this.getUpgradeMessage(limits.tier, 'client'),
        upgradeUrl: '/dashboard/settings/billing',
      });
    }

    return result;
  }

  /**
   * Check if a Home tenant can invite a new family member
   * @throws LimitExceededException if limit would be exceeded
   */
  async canInviteFamilyMember(tenantId: string): Promise<LimitCheckResult> {
    const limits = await this.getTenantLimits(tenantId);
    const currentCount = await this.getFamilyMemberCount(tenantId);

    const result = this.checkLimit(currentCount, limits.familyMemberLimit);

    if (!result.allowed) {
      throw new LimitExceededException({
        resourceType: 'family_member',
        current: currentCount,
        limit: limits.familyMemberLimit!,
        tier: limits.tier,
        upgradeMessage: this.getUpgradeMessage(limits.tier, 'family_member'),
        upgradeUrl: '/dashboard/settings/billing',
      });
    }

    return result;
  }

  /**
   * Check if a tenant can be assigned another DNS management zone
   * @throws LimitExceededException if limit would be exceeded
   */
  async canAssignDnsZone(tenantId: string): Promise<LimitCheckResult> {
    const limits = await this.getTenantLimits(tenantId);
    const currentCount = await this.getDnsZoneCount(tenantId);

    const result = this.checkLimit(currentCount, limits.dnsZoneLimit);

    if (!result.allowed) {
      throw new LimitExceededException({
        resourceType: 'dns_zone',
        current: currentCount,
        limit: limits.dnsZoneLimit!,
        tier: limits.tier,
        upgradeMessage: this.getUpgradeMessage(limits.tier, 'dns_zone'),
        upgradeUrl: '/dashboard/settings/billing',
      });
    }

    return result;
  }

  async invalidateDnsZoneCountCache(tenantId: string): Promise<void> {
    await this.redisService.del(`${CACHE_KEYS.DNS_ZONE_COUNT}${tenantId}`);
  }

  /**
   * Get remaining location capacity for a tenant
   */
  async getRemainingLocations(tenantId: string): Promise<number> {
    const limits = await this.getTenantLimits(tenantId);
    if (limits.locationLimit === null) {
      return Infinity;
    }
    const currentCount = await this.getLocationCount(tenantId);
    return Math.max(0, limits.locationLimit - currentCount);
  }

  /**
   * Get remaining client capacity for an MSP tenant
   */
  async getRemainingClients(tenantId: string): Promise<number> {
    const limits = await this.getTenantLimits(tenantId);
    if (limits.clientLimit === null) {
      return Infinity;
    }
    const currentCount = await this.getClientCount(tenantId);
    return Math.max(0, limits.clientLimit - currentCount);
  }

  /**
   * Get remaining family member capacity for a Home tenant
   */
  async getRemainingFamilyMembers(tenantId: string): Promise<number> {
    const limits = await this.getTenantLimits(tenantId);
    if (limits.familyMemberLimit === null) {
      return Infinity;
    }
    const currentCount = await this.getFamilyMemberCount(tenantId);
    return Math.max(0, limits.familyMemberLimit - currentCount);
  }

  /**
   * Get all limits for a tenant based on their subscription
   */
  async getTenantLimits(tenantId: string): Promise<TenantLimits> {
    // Try to get from cache first
    const cacheKey = `${CACHE_KEYS.TENANT_LIMITS}${tenantId}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for tenant limits: ${tenantId}`);
      return JSON.parse(cached);
    }

    this.logger.debug(`Cache miss for tenant limits: ${tenantId}`);

    // Get tenant and their subscription
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    // Get subscription with plan
    const subscription = await this.subscriptionRepository.findOne({
      where: { tenantId },
      relations: ['plan'],
    });

    let planLimits: PlanLimits;
    let tier: string;

    if (subscription?.plan) {
      planLimits = subscription.plan.limits;
      tier = subscription.planId;
    } else {
      // Fall back to tenant's plan field or default to free
      const plan = await this.planRepository.findOne({
        where: { id: tenant.plan || 'free' },
      });
      planLimits = plan?.limits || this.getDefaultFreeLimits();
      tier = tenant.plan || 'free';
    }

    // Build tenant limits, applying any tenant-specific overrides
    const limits = this.buildTenantLimits(tier, planLimits, tenant);

    // Cache the result
    await this.redisService.set(
      cacheKey,
      JSON.stringify(limits),
      CACHE_TTL_SECONDS,
    );

    return limits;
  }

  /**
   * Invalidate cached limits for a tenant
   * Call this when subscription changes or tenant is updated
   */
  async invalidateLimitsCache(tenantId: string): Promise<void> {
    const keys = [
      `${CACHE_KEYS.TENANT_LIMITS}${tenantId}`,
      `${CACHE_KEYS.LOCATION_COUNT}${tenantId}`,
      `${CACHE_KEYS.CLIENT_COUNT}${tenantId}`,
      `${CACHE_KEYS.FAMILY_MEMBER_COUNT}${tenantId}`,
      `${CACHE_KEYS.DNS_ZONE_COUNT}${tenantId}`,
    ];

    for (const key of keys) {
      await this.redisService.del(key);
    }

    this.logger.debug(`Invalidated limits cache for tenant: ${tenantId}`);
  }

  /**
   * Get the current location count for a tenant
   */
  private async getLocationCount(tenantId: string): Promise<number> {
    const cacheKey = `${CACHE_KEYS.LOCATION_COUNT}${tenantId}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return parseInt(cached, 10);
    }

    const count = await this.locationRepository.count({
      where: { tenantId },
    });

    await this.redisService.set(cacheKey, count.toString(), CACHE_TTL_SECONDS);
    return count;
  }

  /**
   * Get the current client organization count for an MSP
   * Clients are tenants that have this tenant as their partner
   */
  private async getClientCount(tenantId: string): Promise<number> {
    const cacheKey = `${CACHE_KEYS.CLIENT_COUNT}${tenantId}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return parseInt(cached, 10);
    }

    // Get the tenant to check if it's an MSP
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (tenant?.tier !== 'msp') {
      // Not an MSP tenant, return 0
      await this.redisService.set(cacheKey, '0', CACHE_TTL_SECONDS);
      return 0;
    }

    // Count tenants managed by this MSP
    const count = await this.tenantRepository.count({
      where: { managedByMspId: tenantId },
    });

    await this.redisService.set(cacheKey, count.toString(), CACHE_TTL_SECONDS);
    return count;
  }

  /**
   * Get the current family member count for a tenant
   */
  private async getFamilyMemberCount(tenantId: string): Promise<number> {
    const cacheKey = `${CACHE_KEYS.FAMILY_MEMBER_COUNT}${tenantId}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return parseInt(cached, 10);
    }

    const count = await this.familyMemberRepository.count({
      where: { tenantId },
    });

    await this.redisService.set(cacheKey, count.toString(), CACHE_TTL_SECONDS);
    return count;
  }

  private async getDnsZoneCount(tenantId: string): Promise<number> {
    const cacheKey = `${CACHE_KEYS.DNS_ZONE_COUNT}${tenantId}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return parseInt(cached, 10);
    }

    const result = await this.tenantRepository.manager.query(
      `SELECT COUNT(*)::int AS count FROM dns_zone_assignments
       WHERE tenant_id = $1 AND unassigned_at IS NULL AND status = 'active'`,
      [tenantId],
    );
    const count = result[0]?.count ?? 0;

    await this.redisService.set(cacheKey, String(count), CACHE_TTL_SECONDS);
    return count;
  }

  /**
   * Check if an action is allowed given current count and limit
   */
  private checkLimit(current: number, limit: number | null): LimitCheckResult {
    // null or -1 means unlimited
    if (limit === null || limit === -1) {
      return {
        allowed: true,
        current,
        limit: null,
        remaining: null,
      };
    }

    const remaining = limit - current;
    return {
      allowed: remaining > 0,
      current,
      limit,
      remaining: Math.max(0, remaining),
    };
  }

  /**
   * Build tenant limits from plan limits with any tenant overrides
   */
  private buildTenantLimits(
    tier: string,
    planLimits: PlanLimits,
    tenant: Tenant,
  ): TenantLimits {
    // Convert -1 to null for unlimited representation
    const normalizeLimit = (value: number | undefined): number | null => {
      if (value === undefined || value === -1) {
        return null;
      }
      return value;
    };

    // Check for tenant-specific overrides (stored in settings or dedicated columns)
    const overrides =
      (tenant.settings as Record<string, unknown>)?.limitOverrides || {};
    const limitOverrides = overrides as Record<string, number | undefined>;

    return {
      tier,
      locationLimit:
        limitOverrides.locations ?? normalizeLimit(planLimits.locations),
      clientLimit:
        limitOverrides.clients ??
        normalizeLimit((planLimits as PlanLimitsRaw).clients),
      familyMemberLimit:
        limitOverrides.familyMembers ??
        normalizeLimit((planLimits as PlanLimitsRaw).family_members),
      userLimit: limitOverrides.users ?? normalizeLimit(planLimits.users),
      policyLimit:
        limitOverrides.policies ?? normalizeLimit(planLimits.policies),
      customListLimit:
        limitOverrides.customLists ?? normalizeLimit(planLimits.custom_lists),
      dnsZoneLimit: (() => {
        if (limitOverrides.dnsZones !== undefined) {
          return limitOverrides.dnsZones;
        }
        const planDnsZones = (planLimits as PlanLimitsRaw).dns_zones;
        if (planDnsZones === undefined) {
          return 1000;
        }
        return normalizeLimit(planDnsZones);
      })(),
      queriesPerMonth:
        limitOverrides.queriesPerMonth ??
        normalizeLimit(planLimits.queries_per_month),
    };
  }

  /**
   * Get default free plan limits
   */
  private getDefaultFreeLimits(): PlanLimits {
    return {
      locations: 1,
      queries_per_month: 100000,
      users: 1,
      policies: 1,
      custom_lists: 0,
    };
  }

  /**
   * Get upgrade message based on tier and resource type
   */
  private getUpgradeMessage(
    tier: string,
    _resourceType:
      | 'location'
      | 'client'
      | 'family_member'
      | 'user'
      | 'policy'
      | 'custom_list'
      | 'dns_zone',
  ): string {
    const upgradePaths: Record<string, string> = {
      free: 'Upgrade to Starter or Pro plan for more capacity.',
      starter: 'Upgrade to Pro or Enterprise plan for more capacity.',
      pro: 'Upgrade to Enterprise plan for unlimited capacity.',
      enterprise: 'Contact support to increase your limits.',
      // Home tier paths
      home_free: 'Upgrade to Home Plus for more family members.',
      home_plus: 'Contact support for additional capacity.',
      // MSP tier paths
      msp_starter: 'Upgrade to MSP Professional for more clients.',
      msp_professional: 'Upgrade to MSP Enterprise for unlimited clients.',
      msp_enterprise: 'Contact support to increase your limits.',
    };

    return upgradePaths[tier] || 'Please upgrade your plan for more capacity.';
  }
}
