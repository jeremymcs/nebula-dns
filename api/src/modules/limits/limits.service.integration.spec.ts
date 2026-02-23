// Nebula DNS - Limits Service Integration Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { LimitsService } from './limits.service';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Location } from '../locations/entities/location.entity';
import { FamilyMember } from '../family/entities/family-member.entity';
import { SubscriptionPlan } from '../subscriptions/entities/subscription-plan.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { RedisService } from '../redis/redis.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LimitExceededException } from './exceptions/limit-exceeded.exception';
import { ALL_TEST_ENTITIES } from '../../test/all-entities';

/**
 * LimitsService Integration Tests
 *
 * These tests verify:
 * - Limit enforcement for different tiers
 * - Limit caching and invalidation
 * - canCreateLocation() for each tier
 * - canCreateClient() for MSP tier
 *
 * Uses in-memory database and mocked Redis for isolation.
 */
describe('LimitsService Integration', () => {
  let module: TestingModule;
  let limitsService: LimitsService;
  let tenantRepository: Repository<Tenant>;
  let locationRepository: Repository<Location>;
  let planRepository: Repository<SubscriptionPlan>;
  let subscriptionRepository: Repository<Subscription>;
  let redisService: RedisService;

  // Mock Redis cache
  const mockRedisCache = new Map<string, string>();

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: ALL_TEST_ENTITIES,
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([
          Tenant,
          Location,
          FamilyMember,
          SubscriptionPlan,
          Subscription,
        ]),
      ],
      providers: [
        LimitsService,
        {
          provide: RedisService,
          useValue: {
            get: jest.fn((key: string) => mockRedisCache.get(key) || null),
            set: jest.fn((key: string, value: string) => {
              mockRedisCache.set(key, value);
              return Promise.resolve();
            }),
            del: jest.fn((key: string) => {
              mockRedisCache.delete(key);
              return Promise.resolve();
            }),
          },
        },
      ],
    }).compile();

    limitsService = module.get<LimitsService>(LimitsService);
    tenantRepository = module.get(getRepositoryToken(Tenant));
    locationRepository = module.get(getRepositoryToken(Location));
    planRepository = module.get(getRepositoryToken(SubscriptionPlan));
    subscriptionRepository = module.get(getRepositoryToken(Subscription));
    redisService = module.get<RedisService>(RedisService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  beforeEach(async () => {
    // Clear database
    await locationRepository.delete({});
    await subscriptionRepository.delete({});
    await tenantRepository.delete({});
    await planRepository.delete({});

    // Clear Redis mock cache
    mockRedisCache.clear();
    jest.clearAllMocks();
  });

  describe('canCreateLocation - Free Tier', () => {
    it('should allow creating location when under limit', async () => {
      // Create free plan
      const freePlan = planRepository.create({
        id: 'free',
        name: 'Free',
        limits: {
          locations: 1,
          queries_per_month: 100000,
          users: 1,
          policies: 1,
          custom_lists: 0,
        },
      });
      await planRepository.save(freePlan);

      // Create tenant on free plan
      const tenant = tenantRepository.create({
        name: 'Test Tenant',
        slug: 'test-tenant',
        plan: 'free',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      // Should allow creating first location
      const result = await limitsService.canCreateLocation(tenant.id);

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(0);
      expect(result.limit).toBe(1);
      expect(result.remaining).toBe(1);
    });

    it('should block creating location when limit exceeded', async () => {
      // Create free plan
      const freePlan = planRepository.create({
        id: 'free',
        name: 'Free',
        limits: {
          locations: 1,
          queries_per_month: 100000,
          users: 1,
          policies: 1,
          custom_lists: 0,
        },
      });
      await planRepository.save(freePlan);

      // Create tenant
      const tenant = tenantRepository.create({
        name: 'Test Tenant',
        slug: 'test-tenant',
        plan: 'free',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      // Create a location (using up the limit)
      const location = locationRepository.create({
        tenantId: tenant.id,
        name: 'Office',
        ipRange: '192.168.1.1/32',
      });
      await locationRepository.save(location);

      // Should throw LimitExceededException
      await expect(limitsService.canCreateLocation(tenant.id)).rejects.toThrow(
        LimitExceededException,
      );
    });
  });

  describe('canCreateLocation - Pro Tier', () => {
    it('should allow multiple locations for Pro tier', async () => {
      // Create pro plan
      const proPlan = planRepository.create({
        id: 'pro',
        name: 'Pro',
        limits: {
          locations: 10,
          queries_per_month: 10000000,
          users: 10,
          policies: 20,
          custom_lists: 10,
        },
      });
      await planRepository.save(proPlan);

      // Create tenant
      const tenant = tenantRepository.create({
        name: 'Pro Tenant',
        slug: 'pro-tenant',
        plan: 'pro',
        tier: 'enterprise',
      });
      await tenantRepository.save(tenant);

      // Create subscription
      const subscription = subscriptionRepository.create({
        tenantId: tenant.id,
        planId: 'pro',
        status: 'active',
        plan: proPlan,
      });
      await subscriptionRepository.save(subscription);

      // Create 5 locations
      for (let i = 0; i < 5; i++) {
        const location = locationRepository.create({
          tenantId: tenant.id,
          name: `Location ${i}`,
          ipRange: `192.168.1.${i}/32`,
        });
        await locationRepository.save(location);
      }

      // Should still allow more
      const result = await limitsService.canCreateLocation(tenant.id);

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(5);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(5);
    });
  });

  describe('canCreateLocation - Unlimited Tier', () => {
    it('should allow unlimited locations for Enterprise tier', async () => {
      // Create enterprise plan with unlimited locations (-1)
      const enterprisePlan = planRepository.create({
        id: 'enterprise',
        name: 'Enterprise',
        limits: {
          locations: -1, // Unlimited
          queries_per_month: -1,
          users: -1,
          policies: -1,
          custom_lists: -1,
        },
      });
      await planRepository.save(enterprisePlan);

      // Create tenant
      const tenant = tenantRepository.create({
        name: 'Enterprise Tenant',
        slug: 'enterprise-tenant',
        plan: 'enterprise',
        tier: 'enterprise',
      });
      await tenantRepository.save(tenant);

      // Create subscription
      const subscription = subscriptionRepository.create({
        tenantId: tenant.id,
        planId: 'enterprise',
        status: 'active',
        plan: enterprisePlan,
      });
      await subscriptionRepository.save(subscription);

      // Create many locations
      for (let i = 0; i < 100; i++) {
        const location = locationRepository.create({
          tenantId: tenant.id,
          name: `Location ${i}`,
          ipRange: `192.168.${Math.floor(i / 255)}.${i % 255}/32`,
        });
        await locationRepository.save(location);
      }

      // Should still allow more (unlimited)
      const result = await limitsService.canCreateLocation(tenant.id);

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(100);
      expect(result.limit).toBeNull();
      expect(result.remaining).toBeNull();
    });
  });

  describe('canCreateClient - MSP Tier', () => {
    it('should allow creating clients for MSP tier', async () => {
      // Create MSP plan
      const mspPlan = planRepository.create({
        id: 'msp_professional',
        name: 'MSP Professional',
        priceMonthly: 0,
        priceYearly: 0,
        limits: {
          locations: -1,
          queries_per_month: -1,
          users: -1,
          policies: -1,
          custom_lists: -1,
        } as any, // Clients limit handled separately
      });
      await planRepository.save(mspPlan);

      // Create MSP tenant
      const mspTenant = tenantRepository.create({
        name: 'MSP Tenant',
        slug: 'msp-tenant',
        plan: 'enterprise' as any,
        tier: 'msp',
        partnerId: 'partner-123',
        clientLimit: 50,
      });
      await tenantRepository.save(mspTenant);

      // Create subscription
      const subscription = subscriptionRepository.create({
        tenantId: mspTenant.id,
        planId: 'msp_professional',
        status: 'active',
        plan: mspPlan,
      });
      await subscriptionRepository.save(subscription);

      // Should allow creating clients
      const result = await limitsService.canCreateClient(mspTenant.id);

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(0);
      expect(result.limit).toBe(50);
      expect(result.remaining).toBe(50);
    });

    it('should block creating client when limit exceeded', async () => {
      // Create MSP tenant with small limit
      const mspTenant = tenantRepository.create({
        name: 'MSP Tenant',
        slug: 'msp-tenant',
        plan: 'enterprise' as any,
        tier: 'msp',
        partnerId: 'partner-123',
        clientLimit: 2,
      });
      await tenantRepository.save(mspTenant);

      // Create 2 client tenants
      for (let i = 0; i < 2; i++) {
        const client = tenantRepository.create({
          name: `Client ${i}`,
          slug: `client-${i}`,
          plan: 'pro',
          tier: 'enterprise',
          partnerId: 'partner-123',
        });
        await tenantRepository.save(client);
      }

      // Should throw LimitExceededException
      await expect(limitsService.canCreateClient(mspTenant.id)).rejects.toThrow(
        LimitExceededException,
      );
    });
  });

  describe('Limit Caching', () => {
    it('should cache tenant limits in Redis', async () => {
      // Create plan
      const plan = planRepository.create({
        id: 'pro',
        name: 'Pro',
        limits: {
          locations: 10,
          queries_per_month: 10000000,
          users: 10,
          policies: 20,
          custom_lists: 10,
        },
      });
      await planRepository.save(plan);

      // Create tenant
      const tenant = tenantRepository.create({
        name: 'Test Tenant',
        slug: 'test-tenant',
        plan: 'pro',
        tier: 'enterprise',
      });
      await tenantRepository.save(tenant);

      // First call - should cache
      await limitsService.getTenantLimits(tenant.id);

      // Verify Redis set was called
      expect(redisService.set).toHaveBeenCalledWith(
        `limits:tenant:${tenant.id}`,
        expect.any(String),
        60,
      );
    });

    it('should use cached limits on subsequent calls', async () => {
      // Create plan
      const plan = planRepository.create({
        id: 'pro',
        name: 'Pro',
        limits: {
          locations: 10,
          queries_per_month: 10000000,
          users: 10,
          policies: 20,
          custom_lists: 10,
        },
      });
      await planRepository.save(plan);

      // Create tenant
      const tenant = tenantRepository.create({
        name: 'Test Tenant',
        slug: 'test-tenant',
        plan: 'pro',
        tier: 'enterprise',
      });
      await tenantRepository.save(tenant);

      // First call
      const limits1 = await limitsService.getTenantLimits(tenant.id);

      // Mock cache hit for second call
      const cacheKey = `limits:tenant:${tenant.id}`;
      mockRedisCache.set(cacheKey, JSON.stringify(limits1));

      // Second call - should use cache
      const limits2 = await limitsService.getTenantLimits(tenant.id);

      expect(limits2).toEqual(limits1);
    });

    it('should invalidate all limit caches for tenant', async () => {
      const tenantId = 'test-tenant-id';

      await limitsService.invalidateLimitsCache(tenantId);

      // Should delete all related cache keys
      expect(redisService.del).toHaveBeenCalledWith(
        `limits:tenant:${tenantId}`,
      );
      expect(redisService.del).toHaveBeenCalledWith(
        `limits:locations:${tenantId}`,
      );
      expect(redisService.del).toHaveBeenCalledWith(
        `limits:clients:${tenantId}`,
      );
      expect(redisService.del).toHaveBeenCalledWith(
        `limits:family:${tenantId}`,
      );
    });
  });

  describe('getRemainingLocations', () => {
    it('should calculate remaining location slots correctly', async () => {
      // Create plan
      const plan = planRepository.create({
        id: 'pro',
        name: 'Pro',
        limits: {
          locations: 5,
          queries_per_month: 10000000,
          users: 10,
          policies: 20,
          custom_lists: 10,
        },
      });
      await planRepository.save(plan);

      // Create tenant
      const tenant = tenantRepository.create({
        name: 'Test Tenant',
        slug: 'test-tenant',
        plan: 'pro',
        tier: 'enterprise',
      });
      await tenantRepository.save(tenant);

      // Create 2 locations
      for (let i = 0; i < 2; i++) {
        const location = locationRepository.create({
          tenantId: tenant.id,
          name: `Location ${i}`,
          ipRange: `192.168.1.${i}/32`,
        });
        await locationRepository.save(location);
      }

      const remaining = await limitsService.getRemainingLocations(tenant.id);

      expect(remaining).toBe(3);
    });

    it('should return Infinity for unlimited plans', async () => {
      // Create unlimited plan
      const plan = planRepository.create({
        id: 'enterprise',
        name: 'Enterprise',
        limits: {
          locations: -1,
          queries_per_month: -1,
          users: -1,
          policies: -1,
          custom_lists: -1,
        },
      });
      await planRepository.save(plan);

      // Create tenant
      const tenant = tenantRepository.create({
        name: 'Enterprise Tenant',
        slug: 'enterprise-tenant',
        plan: 'enterprise',
        tier: 'enterprise',
      });
      await tenantRepository.save(tenant);

      const remaining = await limitsService.getRemainingLocations(tenant.id);

      expect(remaining).toBe(Infinity);
    });
  });

  describe('Tenant-specific overrides', () => {
    it('should apply tenant-specific limit overrides', async () => {
      // Create plan
      const plan = planRepository.create({
        id: 'pro',
        name: 'Pro',
        limits: {
          locations: 10,
          queries_per_month: 10000000,
          users: 10,
          policies: 20,
          custom_lists: 10,
        },
      });
      await planRepository.save(plan);

      // Create tenant with custom override
      const tenant = tenantRepository.create({
        name: 'VIP Tenant',
        slug: 'vip-tenant',
        plan: 'pro',
        tier: 'enterprise',
        settings: {
          limitOverrides: {
            locations: 50, // Override from 10 to 50
          },
        } as any,
      });
      await tenantRepository.save(tenant);

      const limits = await limitsService.getTenantLimits(tenant.id);

      expect(limits.locationLimit).toBe(50);
      expect(limits.tier).toBe('pro');
    });
  });

  describe('Error handling', () => {
    it('should throw NotFoundException for non-existent tenant', async () => {
      await expect(
        limitsService.getTenantLimits('non-existent-id'),
      ).rejects.toThrow('Tenant non-existent-id not found');
    });

    it('should provide helpful upgrade message in exception', async () => {
      // Create free plan
      const freePlan = planRepository.create({
        id: 'free',
        name: 'Free',
        limits: {
          locations: 1,
          queries_per_month: 100000,
          users: 1,
          policies: 1,
          custom_lists: 0,
        },
      });
      await planRepository.save(freePlan);

      // Create tenant
      const tenant = tenantRepository.create({
        name: 'Free Tenant',
        slug: 'free-tenant',
        plan: 'free',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      // Create location to hit limit
      const location = locationRepository.create({
        tenantId: tenant.id,
        name: 'Office',
        ipRange: '192.168.1.1/32',
      });
      await locationRepository.save(location);

      try {
        await limitsService.canCreateLocation(tenant.id);
        fail('Should have thrown LimitExceededException');
      } catch (error) {
        expect(error).toBeInstanceOf(LimitExceededException);
        expect(error.upgradeMessage).toContain('Upgrade');
        expect(error.tier).toBe('free');
      }
    });
  });
});
