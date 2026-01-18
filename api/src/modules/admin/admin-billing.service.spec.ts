// Nebula DNS - Admin Billing Service Tests
// Unit tests for subscription status and invoice operations
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { AdminBillingService } from './admin-billing.service';
import { Tenant } from '../tenants/entities/tenant.entity';
import { PaymentsService } from '../payments/payments.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { TrialsService } from '../trials/trials.service';
import { SubscriptionLapseService } from '../subscription-lapse/subscription-lapse.service';

describe('AdminBillingService', () => {
  let service: AdminBillingService;
  let tenantRepository: jest.Mocked<any>;
  let paymentsService: jest.Mocked<PaymentsService>;
  let subscriptionsService: jest.Mocked<SubscriptionsService>;
  let trialsService: jest.Mocked<TrialsService>;
  let subscriptionLapseService: jest.Mocked<SubscriptionLapseService>;

  const mockTenant: Partial<Tenant> = {
    id: 'tenant-123',
    name: 'Test Tenant',
    tier: 'enterprise',
    status: 'active',
    contactEmail: 'billing@test.com',
  };

  const mockSubscription = {
    tenantId: 'tenant-123',
    status: 'active',
    billingCycle: 'monthly',
    stripeCustomerId: 'cus_test123',
    stripeSubscriptionId: 'sub_test123',
    currentPeriodEnd: new Date('2026-02-18'),
    cancelAtPeriodEnd: false,
  };

  beforeEach(async () => {
    tenantRepository = {
      findOne: jest.fn(),
    };

    paymentsService = {
      isConfigured: jest.fn().mockReturnValue(true),
      getDefaultPaymentMethod: jest.fn(),
      listInvoices: jest.fn(),
      getInvoicePdfWithValidation: jest.fn(),
    } as any;

    subscriptionsService = {
      getSubscription: jest.fn(),
    } as any;

    trialsService = {
      getTrialStatus: jest.fn(),
    } as any;

    subscriptionLapseService = {
      getGracePeriodInfo: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminBillingService,
        {
          provide: getRepositoryToken(Tenant),
          useValue: tenantRepository,
        },
        {
          provide: PaymentsService,
          useValue: paymentsService,
        },
        {
          provide: SubscriptionsService,
          useValue: subscriptionsService,
        },
        {
          provide: TrialsService,
          useValue: trialsService,
        },
        {
          provide: SubscriptionLapseService,
          useValue: subscriptionLapseService,
        },
      ],
    }).compile();

    service = module.get<AdminBillingService>(AdminBillingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSubscriptionStatus', () => {
    it('should return combined subscription data for a tenant', async () => {
      tenantRepository.findOne.mockResolvedValue(mockTenant);
      subscriptionsService.getSubscription.mockResolvedValue(mockSubscription as any);
      trialsService.getTrialStatus.mockResolvedValue({
        hasActiveTrial: false,
        availableTrials: [],
      });
      subscriptionLapseService.getGracePeriodInfo.mockResolvedValue({
        tenantId: 'tenant-123',
        tenantName: 'Test Tenant',
        subscriptionStatus: 'active',
        graceStartDate: null,
        daysRemaining: null,
      });
      paymentsService.getDefaultPaymentMethod.mockResolvedValue({
        card: { last4: '4242' },
      } as any);

      const result = await service.getSubscriptionStatus('tenant-123');

      expect(result.tenantId).toBe('tenant-123');
      expect(result.tenantName).toBe('Test Tenant');
      expect(result.tier).toBe('enterprise');
      expect(result.status).toBe('active');
      expect(result.billingCycle).toBe('monthly');
      expect(result.stripeCustomerId).toBe('cus_test123');
      expect(result.stripeCustomerLink).toBe(
        'https://dashboard.stripe.com/customers/cus_test123',
      );
      expect(result.billingEmail).toBe('billing@test.com');
      expect(result.paymentMethodLast4).toBe('4242');
      expect(result.cancelAtPeriodEnd).toBe(false);
    });

    it('should throw NotFoundException for missing tenant', async () => {
      tenantRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getSubscriptionStatus('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include trial info when tenant has active trial', async () => {
      const trialEnd = new Date('2026-02-01');
      tenantRepository.findOne.mockResolvedValue(mockTenant);
      subscriptionsService.getSubscription.mockResolvedValue(mockSubscription as any);
      trialsService.getTrialStatus.mockResolvedValue({
        hasActiveTrial: true,
        trialTier: 'msp',
        originalTier: 'enterprise',
        endsAt: trialEnd,
        daysRemaining: 14,
        status: 'active',
        availableTrials: [],
      });
      subscriptionLapseService.getGracePeriodInfo.mockResolvedValue({
        tenantId: 'tenant-123',
        tenantName: 'Test Tenant',
        subscriptionStatus: 'active',
        graceStartDate: null,
        daysRemaining: null,
      });

      const result = await service.getSubscriptionStatus('tenant-123');

      expect(result.trialEnd).toBe(trialEnd.toISOString());
    });

    it('should include grace period info when tenant is in grace period', async () => {
      const graceStart = new Date('2026-01-10');
      tenantRepository.findOne.mockResolvedValue(mockTenant);
      subscriptionsService.getSubscription.mockResolvedValue(mockSubscription as any);
      trialsService.getTrialStatus.mockResolvedValue({
        hasActiveTrial: false,
        availableTrials: [],
      });
      subscriptionLapseService.getGracePeriodInfo.mockResolvedValue({
        tenantId: 'tenant-123',
        tenantName: 'Test Tenant',
        subscriptionStatus: 'grace',
        graceStartDate: graceStart,
        daysRemaining: 22,
      });

      const result = await service.getSubscriptionStatus('tenant-123');

      expect(result.gracePeriod).toBeDefined();
      expect(result.gracePeriod?.startDate).toBe(graceStart.toISOString());
      expect(result.gracePeriod?.daysRemaining).toBe(22);
    });

    it('should handle payment method fetch failure gracefully', async () => {
      tenantRepository.findOne.mockResolvedValue(mockTenant);
      subscriptionsService.getSubscription.mockResolvedValue(mockSubscription as any);
      trialsService.getTrialStatus.mockResolvedValue({
        hasActiveTrial: false,
        availableTrials: [],
      });
      subscriptionLapseService.getGracePeriodInfo.mockResolvedValue({
        tenantId: 'tenant-123',
        tenantName: 'Test Tenant',
        subscriptionStatus: 'active',
        graceStartDate: null,
        daysRemaining: null,
      });
      paymentsService.getDefaultPaymentMethod.mockRejectedValue(
        new Error('Stripe error'),
      );

      const result = await service.getSubscriptionStatus('tenant-123');

      // Should still return result without payment method
      expect(result.tenantId).toBe('tenant-123');
      expect(result.paymentMethodLast4).toBeUndefined();
    });
  });

  describe('listInvoices', () => {
    it('should return mapped invoices with pagination', async () => {
      subscriptionsService.getSubscription.mockResolvedValue(mockSubscription as any);
      paymentsService.listInvoices.mockResolvedValue({
        invoices: [
          {
            id: 'in_test1',
            number: 'INV-001',
            status: 'paid',
            amount_due: 9900,
            amount_paid: 9900,
            currency: 'usd',
            created: Math.floor(new Date('2026-01-01').getTime() / 1000),
            due_date: Math.floor(new Date('2026-01-15').getTime() / 1000),
            status_transitions: {
              paid_at: Math.floor(new Date('2026-01-10').getTime() / 1000),
            },
            invoice_pdf: 'https://stripe.com/pdf/in_test1',
          },
        ] as any,
        hasMore: false,
      });

      const result = await service.listInvoices('tenant-123', { limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('in_test1');
      expect(result.data[0].number).toBe('INV-001');
      expect(result.data[0].status).toBe('paid');
      expect(result.data[0].amountDue).toBe(9900);
      expect(result.data[0].amountPaid).toBe(9900);
      expect(result.data[0].hasPdf).toBe(true);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should return empty for tenant without billing', async () => {
      subscriptionsService.getSubscription.mockResolvedValue({
        ...mockSubscription,
        stripeCustomerId: null,
      } as any);

      const result = await service.listInvoices('tenant-123', {});

      expect(result.data).toHaveLength(0);
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.cursor).toBeNull();
    });

    it('should pass cursor for pagination', async () => {
      subscriptionsService.getSubscription.mockResolvedValue(mockSubscription as any);
      paymentsService.listInvoices.mockResolvedValue({
        invoices: [],
        hasMore: false,
      });

      await service.listInvoices('tenant-123', {
        limit: 10,
        cursor: 'in_previous',
      });

      expect(paymentsService.listInvoices).toHaveBeenCalledWith(
        'cus_test123',
        { limit: 10, startingAfter: 'in_previous' },
      );
    });
  });

  describe('streamInvoicePdf', () => {
    it('should throw NotFoundException when tenant has no billing', async () => {
      subscriptionsService.getSubscription.mockResolvedValue({
        ...mockSubscription,
        stripeCustomerId: null,
      } as any);

      const mockResponse = {} as any;

      await expect(
        service.streamInvoicePdf('tenant-123', 'in_test1', mockResponse),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
