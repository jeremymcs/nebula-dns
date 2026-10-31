/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Limits Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { LimitsService } from './limits.service';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Location } from '../locations/entities/location.entity';
import { FamilyMember } from '../family/entities/family-member.entity';
import { SubscriptionPlan } from '../subscriptions/entities/subscription-plan.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { RedisService } from '../redis/redis.service';
import { LimitExceededException } from './exceptions/limit-exceeded.exception';

describe('LimitsService', () => {
  let service: LimitsService;
  let tenantRepository: any;
  let locationRepository: any;
  let familyMemberRepository: any;
  let planRepository: any;
  let subscriptionRepository: any;
  let redisService: any;

  const mockTenantId = 'tenant-123';

  const mockTenant = {
    id: mockTenantId,
    name: 'Test Tenant',
    tier: 'enterprise',
    plan: 'starter',
    settings: {},
  };

  const mockPlan = {
    id: 'starter',
    name: 'Starter Plan',
    limits: {
      locations: 5,
      queries_per_month: 1000000,
      users: 5,
      policies: 10,
      custom_lists: 5,
    },
  };

  const mockSubscription = {
    id: 'sub-123',
    tenantId: mockTenantId,
    planId: 'starter',
    plan: mockPlan,
  };

  const mockTenantRepository = {
    findOne: jest.fn(),
    count: jest.fn(),
  };

  const mockLocationRepository = {
    count: jest.fn(),
  };

  const mockFamilyMemberRepository = {
    count: jest.fn(),
  };

  const mockPlanRepository = {
    findOne: jest.fn(),
  };

  const mockSubscriptionRepository = {
    findOne: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LimitsService,
        {
          provide: getRepositoryToken(Tenant),
          useValue: mockTenantRepository,
        },
        {
          provide: getRepositoryToken(Location),
          useValue: mockLocationRepository,
        },
        {
          provide: getRepositoryToken(FamilyMember),
          useValue: mockFamilyMemberRepository,
        },
        {
          provide: getRepositoryToken(SubscriptionPlan),
          useValue: mockPlanRepository,
        },
        {
          provide: getRepositoryToken(Subscription),
          useValue: mockSubscriptionRepository,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<LimitsService>(LimitsService);
    tenantRepository = module.get(getRepositoryToken(Tenant));
    locationRepository = module.get(getRepositoryToken(Location));
    familyMemberRepository = module.get(getRepositoryToken(FamilyMember));
    planRepository = module.get(getRepositoryToken(SubscriptionPlan));
    subscriptionRepository = module.get(getRepositoryToken(Subscription));
    redisService = module.get<RedisService>(RedisService);

    jest.clearAllMocks();
  });

  describe('canCreateLocation', () => {
    beforeEach(() => {
      // Reset cache misses
      mockRedisService.get.mockResolvedValue(null);
    });

    it('should return LimitCheckResult when below limit', async () => {
      mockTenantRepository.findOne.mockResolvedValue(mockTenant);
      mockSubscriptionRepository.findOne.mockResolvedValue(mockSubscription);
      mockLocationRepository.count.mockResolvedValue(2);

      const result = await service.canCreateLocation(mockTenantId);

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.remaining).toBe(3);
    });

    it('should throw LimitExceededException when at limit', async () => {
      mockTenantRepository.findOne.mockResolvedValue(mockTenant);
      mockSubscriptionRepository.findOne.mockResolvedValue(mockSubscription);
      mockLocationRepository.count.mockResolvedValue(5);

      await expect(service.canCreateLocation(mockTenantId)).rejects.toThrow(
        LimitExceededException,
      );
    });

    it('should throw LimitExceededException when over limit', async () => {
      mockTenantRepository.findOne.mockResolvedValue(mockTenant);
      mockSubscriptionRepository.findOne.mockResolvedValue(mockSubscription);
      mockLocationRepository.count.mockResolvedValue(7);

      await expect(service.canCreateLocation(mockTenantId)).rejects.toThrow(
        LimitExceededException,
      );
    });

    it('should allow creation with unlimited plan (null limit)', async () => {
      const unlimitedPlan = {
        ...mockPlan,
        limits: { ...mockPlan.limits, locations: -1 },
      };
      const unlimitedSubscription = {
        ...mockSubscription,
        plan: unlimitedPlan,
      };
      mockTenantRepository.findOne.mockResolvedValue(mockTenant);
      mockSubscriptionRepository.findOne.mockResolvedValue(
        unlimitedSubscription,
      );
      mockLocationRepository.count.mockResolvedValue(100);

      const result = await service.canCreateLocation(mockTenantId);

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(100);
      expect(result.limit).toBeNull();
      expect(result.remaining).toBeNull();
    });

    it('should throw NotFoundException when tenant not found', async () => {
      mockTenantRepository.findOne.mockResolvedValue(null);

      await expect(
        service.canCreateLocation('nonexistent-tenant'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return allowed=true when at zero locations with positive limit', async () => {
      mockTenantRepository.findOne.mockResolvedValue(mockTenant);
      mockSubscriptionRepository.findOne.mockResolvedValue(mockSubscription);
      mockLocationRepository.count.mockResolvedValue(0);

      const result = await service.canCreateLocation(mockTenantId);

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(0);
      expect(result.limit).toBe(5);
      expect(result.remaining).toBe(5);
    });

    it('should use cached limits when available', async () => {
      const cachedLimits = JSON.stringify({
        tier: 'starter',
        locationLimit: 5,
        clientLimit: null,
        familyMemberLimit: null,
        userLimit: 5,
        policyLimit: 10,
        customListLimit: 5,
        queriesPerMonth: 1000000,
      });
      mockRedisService.get.mockResolvedValueOnce(cachedLimits); // Tenant limits
      mockRedisService.get.mockResolvedValueOnce('2'); // Location count
      mockLocationRepository.count.mockResolvedValue(2);

      const result = await service.canCreateLocation(mockTenantId);

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(2);
      // Tenant repository should not be called when cache hit
      expect(mockTenantRepository.findOne).not.toHaveBeenCalled();
    });

    it('should fall back to plan table when no subscription exists', async () => {
      mockTenantRepository.findOne.mockResolvedValue(mockTenant);
      mockSubscriptionRepository.findOne.mockResolvedValue(null);
      mockPlanRepository.findOne.mockResolvedValue(mockPlan);
      mockLocationRepository.count.mockResolvedValue(2);

      const result = await service.canCreateLocation(mockTenantId);

      expect(result.allowed).toBe(true);
      expect(mockPlanRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'starter' },
      });
    });
  });

  describe('getRemainingLocations', () => {
    beforeEach(() => {
      mockRedisService.get.mockResolvedValue(null);
    });

    it('should return remaining locations count', async () => {
      mockTenantRepository.findOne.mockResolvedValue(mockTenant);
      mockSubscriptionRepository.findOne.mockResolvedValue(mockSubscription);
      mockLocationRepository.count.mockResolvedValue(2);

      const remaining = await service.getRemainingLocations(mockTenantId);

      expect(remaining).toBe(3);
    });

    it('should return Infinity for unlimited plans', async () => {
      const unlimitedPlan = {
        ...mockPlan,
        limits: { ...mockPlan.limits, locations: -1 },
      };
      const unlimitedSubscription = {
        ...mockSubscription,
        plan: unlimitedPlan,
      };
      mockTenantRepository.findOne.mockResolvedValue(mockTenant);
      mockSubscriptionRepository.findOne.mockResolvedValue(
        unlimitedSubscription,
      );

      const remaining = await service.getRemainingLocations(mockTenantId);

      expect(remaining).toBe(Infinity);
    });

    it('should return 0 when at or over limit', async () => {
      mockTenantRepository.findOne.mockResolvedValue(mockTenant);
      mockSubscriptionRepository.findOne.mockResolvedValue(mockSubscription);
      mockLocationRepository.count.mockResolvedValue(7);

      const remaining = await service.getRemainingLocations(mockTenantId);

      expect(remaining).toBe(0);
    });
  });

  describe('invalidateLimitsCache', () => {
    it('should delete all cache keys for a tenant', async () => {
      await service.invalidateLimitsCache(mockTenantId);

      expect(mockRedisService.del).toHaveBeenCalledTimes(5);
      expect(mockRedisService.del).toHaveBeenCalledWith(
        `limits:tenant:${mockTenantId}`,
      );
      expect(mockRedisService.del).toHaveBeenCalledWith(
        `limits:locations:${mockTenantId}`,
      );
      expect(mockRedisService.del).toHaveBeenCalledWith(
        `limits:clients:${mockTenantId}`,
      );
      expect(mockRedisService.del).toHaveBeenCalledWith(
        `limits:family:${mockTenantId}`,
      );
    });
  });

  describe('getTenantLimits', () => {
    beforeEach(() => {
      mockRedisService.get.mockResolvedValue(null);
    });

    it('should return tenant limits from subscription', async () => {
      mockTenantRepository.findOne.mockResolvedValue(mockTenant);
      mockSubscriptionRepository.findOne.mockResolvedValue(mockSubscription);

      const limits = await service.getTenantLimits(mockTenantId);

      expect(limits.tier).toBe('starter');
      expect(limits.locationLimit).toBe(5);
      expect(limits.userLimit).toBe(5);
    });

    it('should cache the limits result', async () => {
      mockTenantRepository.findOne.mockResolvedValue(mockTenant);
      mockSubscriptionRepository.findOne.mockResolvedValue(mockSubscription);

      await service.getTenantLimits(mockTenantId);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        `limits:tenant:${mockTenantId}`,
        expect.any(String),
        60,
      );
    });

    it('should use default free limits when no plan found', async () => {
      mockTenantRepository.findOne.mockResolvedValue({
        ...mockTenant,
        plan: null,
      });
      mockSubscriptionRepository.findOne.mockResolvedValue(null);
      mockPlanRepository.findOne.mockResolvedValue(null);

      const limits = await service.getTenantLimits(mockTenantId);

      expect(limits.locationLimit).toBe(1);
      expect(limits.queriesPerMonth).toBe(100000);
    });

    it('should apply tenant limit overrides from settings', async () => {
      const tenantWithOverrides = {
        ...mockTenant,
        settings: {
          limitOverrides: {
            locations: 50,
          },
        },
      };
      mockTenantRepository.findOne.mockResolvedValue(tenantWithOverrides);
      mockSubscriptionRepository.findOne.mockResolvedValue(mockSubscription);

      const limits = await service.getTenantLimits(mockTenantId);

      expect(limits.locationLimit).toBe(50); // Overridden
      expect(limits.userLimit).toBe(5); // From plan
    });
  });

  describe('canCreateClient', () => {
    const mockMspTenant = {
      ...mockTenant,
      tier: 'msp',
      partnerId: 'partner-123',
    };

    const mockMspPlan = {
      id: 'msp_professional',
      name: 'MSP Professional',
      limits: {
        locations: 100,
        queries_per_month: 50000000,
        users: 100,
        policies: 50,
        custom_lists: 100,
        clients: 25,
      },
    };

    const mockMspSubscription = {
      ...mockSubscription,
      planId: 'msp_professional',
      plan: mockMspPlan,
    };

    beforeEach(() => {
      mockRedisService.get.mockResolvedValue(null);
    });

    it('should allow client creation when under limit', async () => {
      mockTenantRepository.findOne.mockResolvedValue(mockMspTenant);
      mockSubscriptionRepository.findOne.mockResolvedValue(mockMspSubscription);
      mockTenantRepository.count.mockResolvedValue(10);

      const result = await service.canCreateClient(mockTenantId);

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(10);
      expect(result.limit).toBe(25);
      expect(result.remaining).toBe(15);
    });

    it('should throw LimitExceededException when at client limit', async () => {
      mockTenantRepository.findOne.mockResolvedValue(mockMspTenant);
      mockSubscriptionRepository.findOne.mockResolvedValue(mockMspSubscription);
      mockTenantRepository.count.mockResolvedValue(25);

      await expect(service.canCreateClient(mockTenantId)).rejects.toThrow(
        LimitExceededException,
      );
    });

    it('should return 0 clients for non-MSP tenants', async () => {
      mockTenantRepository.findOne.mockResolvedValue(mockTenant); // no partnerId
      mockSubscriptionRepository.findOne.mockResolvedValue(mockSubscription);

      const result = await service.canCreateClient(mockTenantId);

      expect(result.current).toBe(0);
    });
  });

  describe('canInviteFamilyMember', () => {
    const mockHomePlan = {
      id: 'home_plus',
      name: 'Home Plus',
      limits: {
        locations: 5,
        queries_per_month: 1000000,
        users: 1,
        policies: 3,
        custom_lists: 5,
        family_members: 10,
      },
    };

    const mockHomeSubscription = {
      ...mockSubscription,
      planId: 'home_plus',
      plan: mockHomePlan,
    };

    beforeEach(() => {
      mockRedisService.get.mockResolvedValue(null);
    });

    it('should allow family member invitation when under limit', async () => {
      mockTenantRepository.findOne.mockResolvedValue(mockTenant);
      mockSubscriptionRepository.findOne.mockResolvedValue(
        mockHomeSubscription,
      );
      mockFamilyMemberRepository.count.mockResolvedValue(5);

      const result = await service.canInviteFamilyMember(mockTenantId);

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(5);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(5);
    });

    it('should throw LimitExceededException when at family member limit', async () => {
      mockTenantRepository.findOne.mockResolvedValue(mockTenant);
      mockSubscriptionRepository.findOne.mockResolvedValue(
        mockHomeSubscription,
      );
      mockFamilyMemberRepository.count.mockResolvedValue(10);

      await expect(service.canInviteFamilyMember(mockTenantId)).rejects.toThrow(
        LimitExceededException,
      );
    });

    it('should allow unlimited family members when limit is null', async () => {
      const unlimitedHomePlan = {
        ...mockHomePlan,
        limits: { ...mockHomePlan.limits, family_members: -1 },
      };
      const unlimitedSubscription = {
        ...mockHomeSubscription,
        plan: unlimitedHomePlan,
      };
      mockTenantRepository.findOne.mockResolvedValue(mockTenant);
      mockSubscriptionRepository.findOne.mockResolvedValue(
        unlimitedSubscription,
      );
      mockFamilyMemberRepository.count.mockResolvedValue(100);

      const result = await service.canInviteFamilyMember(mockTenantId);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBeNull();
      expect(result.remaining).toBeNull();
    });
  });

  describe('getRemainingClients', () => {
    const mockMspTenant = {
      ...mockTenant,
      tier: 'msp',
      partnerId: 'partner-123',
    };

    const mockMspPlan = {
      id: 'msp_professional',
      name: 'MSP Professional',
      limits: {
        locations: 100,
        queries_per_month: 50000000,
        users: 100,
        policies: 50,
        custom_lists: 100,
        clients: 25,
      },
    };

    const mockMspSubscription = {
      ...mockSubscription,
      planId: 'msp_professional',
      plan: mockMspPlan,
    };

    beforeEach(() => {
      mockRedisService.get.mockResolvedValue(null);
    });

    it('should return correct remaining client count', async () => {
      mockTenantRepository.findOne.mockResolvedValue(mockMspTenant);
      mockSubscriptionRepository.findOne.mockResolvedValue(mockMspSubscription);
      mockTenantRepository.count.mockResolvedValue(20);

      const remaining = await service.getRemainingClients(mockTenantId);

      expect(remaining).toBe(5);
    });

    it('should return Infinity for unlimited client plans', async () => {
      const unlimitedMspPlan = {
        ...mockMspPlan,
        limits: { ...mockMspPlan.limits, clients: -1 },
      };
      const unlimitedSubscription = {
        ...mockMspSubscription,
        plan: unlimitedMspPlan,
      };
      mockTenantRepository.findOne.mockResolvedValue(mockMspTenant);
      mockSubscriptionRepository.findOne.mockResolvedValue(
        unlimitedSubscription,
      );

      const remaining = await service.getRemainingClients(mockTenantId);

      expect(remaining).toBe(Infinity);
    });
  });

  describe('getRemainingFamilyMembers', () => {
    const mockHomePlan = {
      id: 'home_plus',
      name: 'Home Plus',
      limits: {
        locations: 5,
        queries_per_month: 1000000,
        users: 1,
        policies: 3,
        custom_lists: 5,
        family_members: 10,
      },
    };

    const mockHomeSubscription = {
      ...mockSubscription,
      planId: 'home_plus',
      plan: mockHomePlan,
    };

    beforeEach(() => {
      mockRedisService.get.mockResolvedValue(null);
    });

    it('should return correct remaining family member count', async () => {
      mockTenantRepository.findOne.mockResolvedValue(mockTenant);
      mockSubscriptionRepository.findOne.mockResolvedValue(
        mockHomeSubscription,
      );
      mockFamilyMemberRepository.count.mockResolvedValue(6);

      const remaining = await service.getRemainingFamilyMembers(mockTenantId);

      expect(remaining).toBe(4);
    });

    it('should return Infinity for unlimited family member plans', async () => {
      const unlimitedHomePlan = {
        ...mockHomePlan,
        limits: { ...mockHomePlan.limits, family_members: -1 },
      };
      const unlimitedSubscription = {
        ...mockHomeSubscription,
        plan: unlimitedHomePlan,
      };
      mockTenantRepository.findOne.mockResolvedValue(mockTenant);
      mockSubscriptionRepository.findOne.mockResolvedValue(
        unlimitedSubscription,
      );

      const remaining = await service.getRemainingFamilyMembers(mockTenantId);

      expect(remaining).toBe(Infinity);
    });

    it('should return 0 when at or over family member limit', async () => {
      mockTenantRepository.findOne.mockResolvedValue(mockTenant);
      mockSubscriptionRepository.findOne.mockResolvedValue(
        mockHomeSubscription,
      );
      mockFamilyMemberRepository.count.mockResolvedValue(15);

      const remaining = await service.getRemainingFamilyMembers(mockTenantId);

      expect(remaining).toBe(0);
    });
  });

  describe('LimitExceededException details', () => {
    beforeEach(() => {
      mockRedisService.get.mockResolvedValue(null);
    });

    it('should include upgrade message and URL in exception', async () => {
      const freePlan = {
        id: 'free',
        name: 'Free',
        limits: {
          locations: 1,
          queries_per_month: 100000,
          users: 1,
          policies: 1,
          custom_lists: 0,
        },
      };
      const freeSubscription = {
        ...mockSubscription,
        planId: 'free',
        plan: freePlan,
      };
      mockTenantRepository.findOne.mockResolvedValue(mockTenant);
      mockSubscriptionRepository.findOne.mockResolvedValue(freeSubscription);
      mockLocationRepository.count.mockResolvedValue(1);

      try {
        await service.canCreateLocation(mockTenantId);
        fail('Expected LimitExceededException');
      } catch (error) {
        expect(error).toBeInstanceOf(LimitExceededException);
        const details = (error as LimitExceededException).getDetails();
        expect(details.resourceType).toBe('location');
        expect(details.current).toBe(1);
        expect(details.limit).toBe(1);
        expect(details.tier).toBe('free');
        expect(details.upgradeMessage).toContain('Upgrade');
        expect(details.upgradeUrl).toBe('/dashboard/settings/billing');
      }
    });
  });
});
