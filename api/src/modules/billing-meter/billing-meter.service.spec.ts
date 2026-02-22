// Nebula DNS - Billing Meter Service Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingMeterService } from './billing-meter.service';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Location } from '../locations/entities/location.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UsageType } from './dto/usage-report.dto';

// Mock Stripe
const mockStripe = {
  billing: {
    meterEvents: {
      create: jest.fn(),
    },
  },
};

jest.mock('stripe', () => {
  const MockStripe = jest.fn().mockImplementation(() => mockStripe);
  return { default: MockStripe, __esModule: true };
});

describe('BillingMeterService', () => {
  let service: BillingMeterService;
  let subscriptionRepository: jest.Mocked<Repository<Subscription>>;
  let tenantRepository: jest.Mocked<Repository<Tenant>>;
  let locationRepository: jest.Mocked<Repository<Location>>;
  let auditLogsService: jest.Mocked<AuditLogsService>;

  const mockTenantId = 'tenant-123';
  const mockMspTenantId = 'msp-tenant-456';
  const mockStripeCustomerId = 'cus_123abc';
  const mockLocationMeterEventName = 'location_count';
  const mockClientMeterEventName = 'client_count';

  const mockSubscription: Partial<Subscription> = {
    id: 'subscription-1',
    tenantId: mockTenantId,
    stripeSubscriptionId: 'sub_123',
    stripeCustomerId: mockStripeCustomerId,
    status: 'active',
  };

  const mockTenant: Partial<Tenant> = {
    id: mockTenantId,
    name: 'Test Tenant',
    tier: 'enterprise',
  };

  const mockMspTenant: Partial<Tenant> = {
    id: mockMspTenantId,
    name: 'MSP Tenant',
    tier: 'msp',
  };

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingMeterService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                STRIPE_SECRET_KEY: 'sk_test_123',
                STRIPE_METER_EVENT_LOCATION: mockLocationMeterEventName,
                STRIPE_METER_EVENT_CLIENT: mockClientMeterEventName,
              };
              return config[key];
            }),
          },
        },
        {
          provide: getRepositoryToken(Subscription),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Tenant),
          useValue: {
            findOne: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Location),
          useValue: {
            count: jest.fn(),
          },
        },
        {
          provide: AuditLogsService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BillingMeterService>(BillingMeterService);
    subscriptionRepository = module.get(getRepositoryToken(Subscription));
    tenantRepository = module.get(getRepositoryToken(Tenant));
    locationRepository = module.get(getRepositoryToken(Location));
    auditLogsService = module.get(AuditLogsService);
  });

  describe('isConfigured', () => {
    it('should return true when Stripe is configured', () => {
      expect(service.isConfigured()).toBe(true);
    });
  });

  describe('reportLocationUsage', () => {
    it('should successfully report location usage to Stripe Billing Meter', async () => {
      const locationCount = 5;

      locationRepository.count.mockResolvedValue(locationCount);
      subscriptionRepository.findOne.mockResolvedValue(
        mockSubscription as Subscription,
      );

      mockStripe.billing.meterEvents.create.mockResolvedValue({
        identifier: 'meter_event_123',
        event_name: mockLocationMeterEventName,
      });

      const result = await service.reportLocationUsage(mockTenantId);

      expect(result.success).toBe(true);
      expect(result.quantity).toBe(locationCount);
      expect(result.usageRecordId).toBe('meter_event_123');

      expect(locationRepository.count).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
      });

      expect(mockStripe.billing.meterEvents.create).toHaveBeenCalledWith({
        event_name: mockLocationMeterEventName,
        payload: {
          stripe_customer_id: mockStripeCustomerId,
          value: locationCount.toString(),
        },
        timestamp: expect.any(Number),
      });

      expect(auditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockTenantId,
          resourceType: 'subscription',
          resourceName: 'location_usage_report',
        }),
      );
    });

    it('should skip reporting when no Stripe customer exists', async () => {
      const locationCount = 3;

      locationRepository.count.mockResolvedValue(locationCount);
      subscriptionRepository.findOne.mockResolvedValue(null);

      const result = await service.reportLocationUsage(mockTenantId);

      expect(result.success).toBe(true);
      expect(result.quantity).toBe(locationCount);
      expect(result.usageRecordId).toBeUndefined();

      expect(mockStripe.billing.meterEvents.create).not.toHaveBeenCalled();
    });

    it('should skip reporting when subscription has no stripeCustomerId', async () => {
      const locationCount = 3;
      const subscriptionWithoutStripe: Partial<Subscription> = {
        ...mockSubscription,
        stripeCustomerId: null as any,
      };

      locationRepository.count.mockResolvedValue(locationCount);
      subscriptionRepository.findOne.mockResolvedValue(
        subscriptionWithoutStripe as Subscription,
      );

      const result = await service.reportLocationUsage(mockTenantId);

      expect(result.success).toBe(true);
      expect(result.quantity).toBe(locationCount);
      expect(mockStripe.billing.meterEvents.create).not.toHaveBeenCalled();
    });

    it('should handle Stripe API errors with retry', async () => {
      const locationCount = 5;

      locationRepository.count.mockResolvedValue(locationCount);
      subscriptionRepository.findOne.mockResolvedValue(
        mockSubscription as Subscription,
      );

      // Fail twice, succeed on third attempt
      mockStripe.billing.meterEvents.create
        .mockRejectedValueOnce(new Error('Rate limited'))
        .mockRejectedValueOnce(new Error('Rate limited'))
        .mockResolvedValueOnce({
          identifier: 'meter_event_123',
          event_name: mockLocationMeterEventName,
        });

      const result = await service.reportLocationUsage(mockTenantId);

      expect(result.success).toBe(true);
      expect(mockStripe.billing.meterEvents.create).toHaveBeenCalledTimes(3);
    }, 15000); // Increased timeout for retry delays

    it('should fail after max retries', async () => {
      const locationCount = 5;

      locationRepository.count.mockResolvedValue(locationCount);
      subscriptionRepository.findOne.mockResolvedValue(
        mockSubscription as Subscription,
      );

      // Always fail
      mockStripe.billing.meterEvents.create.mockRejectedValue(
        new Error('Stripe unavailable'),
      );

      const result = await service.reportLocationUsage(mockTenantId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stripe unavailable');
      expect(mockStripe.billing.meterEvents.create).toHaveBeenCalledTimes(3);

      expect(auditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          newValue: expect.objectContaining({
            success: false,
            error: 'Stripe unavailable',
          }),
        }),
      );
    }, 15000);
  });

  describe('reportClientUsage', () => {
    it('should successfully report client usage to Stripe for MSP tenant', async () => {
      const clientCount = 10;

      tenantRepository.count.mockResolvedValue(clientCount);
      subscriptionRepository.findOne.mockResolvedValue({
        ...mockSubscription,
        tenantId: mockMspTenantId,
      } as Subscription);

      mockStripe.billing.meterEvents.create.mockResolvedValue({
        identifier: 'meter_event_456',
        event_name: mockClientMeterEventName,
      });

      const result = await service.reportClientUsage(mockMspTenantId);

      expect(result.success).toBe(true);
      expect(result.quantity).toBe(clientCount);
      expect(result.usageRecordId).toBe('meter_event_456');

      expect(tenantRepository.count).toHaveBeenCalledWith({
        where: { managedByMspId: mockMspTenantId },
      });

      expect(mockStripe.billing.meterEvents.create).toHaveBeenCalledWith({
        event_name: mockClientMeterEventName,
        payload: {
          stripe_customer_id: mockStripeCustomerId,
          value: clientCount.toString(),
        },
        timestamp: expect.any(Number),
      });

      expect(auditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockMspTenantId,
          resourceType: 'subscription',
          resourceName: 'client_usage_report',
        }),
      );
    });

    it('should skip reporting when no Stripe customer exists for MSP', async () => {
      const clientCount = 8;

      tenantRepository.count.mockResolvedValue(clientCount);
      subscriptionRepository.findOne.mockResolvedValue(null);

      const result = await service.reportClientUsage(mockMspTenantId);

      expect(result.success).toBe(true);
      expect(result.quantity).toBe(clientCount);
      expect(mockStripe.billing.meterEvents.create).not.toHaveBeenCalled();
    });
  });

  describe('getUsageSummary', () => {
    it('should return location usage summary for non-MSP tenant', async () => {
      const locationCount = 5;
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');

      locationRepository.count.mockResolvedValue(locationCount);
      tenantRepository.findOne.mockResolvedValue(mockTenant as Tenant);

      const result = await service.getUsageSummary(
        mockTenantId,
        startDate,
        endDate,
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(UsageType.LOCATION);
      expect(result[0].currentQuantity).toBe(locationCount);
      expect(result[0].periodStart).toEqual(startDate);
      expect(result[0].periodEnd).toEqual(endDate);
    });

    it('should return both location and client usage for MSP tenant', async () => {
      const locationCount = 3;
      const clientCount = 15;
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');

      locationRepository.count.mockResolvedValue(locationCount);
      tenantRepository.findOne.mockResolvedValue(mockMspTenant as Tenant);
      tenantRepository.count.mockResolvedValue(clientCount);

      const result = await service.getUsageSummary(
        mockMspTenantId,
        startDate,
        endDate,
      );

      expect(result).toHaveLength(2);

      const locationUsage = result.find((r) => r.type === UsageType.LOCATION);
      const clientUsage = result.find((r) => r.type === UsageType.CLIENT);

      expect(locationUsage?.currentQuantity).toBe(locationCount);
      expect(clientUsage?.currentQuantity).toBe(clientCount);
    });
  });

  describe('getCurrentMonthUsage', () => {
    it('should return current month usage for non-MSP tenant', async () => {
      const locationCount = 7;

      locationRepository.count.mockResolvedValue(locationCount);
      tenantRepository.findOne.mockResolvedValue(mockTenant as Tenant);

      const result = await service.getCurrentMonthUsage(mockTenantId);

      expect(result.tenantId).toBe(mockTenantId);
      expect(result.locationCount).toBe(locationCount);
      expect(result.clientCount).toBe(0);
      expect(result.month).toMatch(/^\d{4}-\d{2}$/);
    });

    it('should return current month usage including clients for MSP tenant', async () => {
      const locationCount = 2;
      const clientCount = 20;

      locationRepository.count.mockResolvedValue(locationCount);
      tenantRepository.findOne.mockResolvedValue(mockMspTenant as Tenant);
      tenantRepository.count.mockResolvedValue(clientCount);

      const result = await service.getCurrentMonthUsage(mockMspTenantId);

      expect(result.tenantId).toBe(mockMspTenantId);
      expect(result.locationCount).toBe(locationCount);
      expect(result.clientCount).toBe(clientCount);
    });
  });
});

describe('BillingMeterService (Stripe not configured)', () => {
  let service: BillingMeterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingMeterService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              // Return undefined for STRIPE_SECRET_KEY to simulate unconfigured Stripe
              if (key === 'STRIPE_SECRET_KEY') return undefined;
              return '';
            }),
          },
        },
        {
          provide: getRepositoryToken(Subscription),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Tenant),
          useValue: { findOne: jest.fn(), count: jest.fn() },
        },
        {
          provide: getRepositoryToken(Location),
          useValue: { count: jest.fn().mockResolvedValue(5) },
        },
        {
          provide: AuditLogsService,
          useValue: { log: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<BillingMeterService>(BillingMeterService);
  });

  it('should return false for isConfigured when Stripe is not set up', () => {
    expect(service.isConfigured()).toBe(false);
  });
});
