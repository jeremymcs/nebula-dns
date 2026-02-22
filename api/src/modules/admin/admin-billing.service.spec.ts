// Nebula DNS - Admin Billing Service Tests
// Unit tests for subscription status, invoice, credit, and tier change operations
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminBillingService } from './admin-billing.service';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { PaymentsService } from '../payments/payments.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { TrialsService } from '../trials/trials.service';
import { SubscriptionLapseService } from '../subscription-lapse/subscription-lapse.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EmailService } from '../email/email.service';

describe('AdminBillingService', () => {
  let service: AdminBillingService;
  let tenantRepository: jest.Mocked<any>;
  let subscriptionRepository: jest.Mocked<any>;
  let paymentsService: jest.Mocked<PaymentsService>;
  let subscriptionsService: jest.Mocked<SubscriptionsService>;
  let trialsService: jest.Mocked<TrialsService>;
  let subscriptionLapseService: jest.Mocked<SubscriptionLapseService>;
  let auditLogsService: jest.Mocked<AuditLogsService>;

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
    planId: 'enterprise',
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        STRIPE_PRICE_HOME_MONTHLY: 'price_home_monthly',
        STRIPE_PRICE_HOME_YEARLY: 'price_home_yearly',
        STRIPE_PRICE_ENTERPRISE_MONTHLY: 'price_enterprise_monthly',
        STRIPE_PRICE_ENTERPRISE_YEARLY: 'price_enterprise_yearly',
        STRIPE_PRICE_MSP_MONTHLY: 'price_msp_monthly',
        STRIPE_PRICE_MSP_YEARLY: 'price_msp_yearly',
      };
      return config[key] || '';
    }),
  };

  beforeEach(async () => {
    tenantRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    subscriptionRepository = {
      update: jest.fn(),
    };

    paymentsService = {
      isConfigured: jest.fn().mockReturnValue(true),
      getDefaultPaymentMethod: jest.fn(),
      listInvoices: jest.fn(),
      getInvoicePdfWithValidation: jest.fn(),
      applyCredit: jest.fn(),
      changeSubscriptionPlan: jest.fn(),
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

    auditLogsService = {
      log: jest.fn(),
    } as any;

    const mockEmailService = {
      sendWelcomeEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminBillingService,
        {
          provide: getRepositoryToken(Tenant),
          useValue: tenantRepository,
        },
        {
          provide: getRepositoryToken(Subscription),
          useValue: subscriptionRepository,
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
        {
          provide: AuditLogsService,
          useValue: auditLogsService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
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
      subscriptionsService.getSubscription.mockResolvedValue(
        mockSubscription as any,
      );
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
      subscriptionsService.getSubscription.mockResolvedValue(
        mockSubscription as any,
      );
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
      subscriptionsService.getSubscription.mockResolvedValue(
        mockSubscription as any,
      );
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
      subscriptionsService.getSubscription.mockResolvedValue(
        mockSubscription as any,
      );
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
      subscriptionsService.getSubscription.mockResolvedValue(
        mockSubscription as any,
      );
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
      subscriptionsService.getSubscription.mockResolvedValue(
        mockSubscription as any,
      );
      paymentsService.listInvoices.mockResolvedValue({
        invoices: [],
        hasMore: false,
      });

      await service.listInvoices('tenant-123', {
        limit: 10,
        cursor: 'in_previous',
      });

      expect(paymentsService.listInvoices).toHaveBeenCalledWith('cus_test123', {
        limit: 10,
        startingAfter: 'in_previous',
      });
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

  describe('applyCredit', () => {
    const adminId = 'admin-123';
    const creditDto = {
      amountCents: 1500, // $15.00
      reason: 'Customer support credit for service issue',
    };

    it('should apply credit successfully with audit logging', async () => {
      tenantRepository.findOne.mockResolvedValue(mockTenant);
      subscriptionsService.getSubscription.mockResolvedValue(
        mockSubscription as any,
      );
      paymentsService.applyCredit.mockResolvedValue({
        id: 'txn_abc123',
        ending_balance: -1500,
      } as any);
      auditLogsService.log.mockResolvedValue({} as any);

      const result = await service.applyCredit(
        'tenant-123',
        creditDto,
        adminId,
      );

      expect(result.transactionId).toBe('txn_abc123');
      expect(result.newBalance).toBe(-1500);
      expect(result.amountApplied).toBe(1500);
      expect(result.message).toContain('$15.00');

      // Verify audit log was called
      expect(auditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-123',
          action: 'billing_credit_applied',
          resourceType: 'subscription',
          newValue: expect.objectContaining({
            amountCents: 1500,
            transactionId: 'txn_abc123',
            adminId,
          }),
        }),
      );
    });

    it('should log warning for large credits (over $500)', async () => {
      const largeCreditDto = {
        amountCents: 60000, // $600.00
        reason: 'Enterprise adjustment',
      };

      tenantRepository.findOne.mockResolvedValue(mockTenant);
      subscriptionsService.getSubscription.mockResolvedValue(
        mockSubscription as any,
      );
      paymentsService.applyCredit.mockResolvedValue({
        id: 'txn_large',
        ending_balance: -60000,
      } as any);
      auditLogsService.log.mockResolvedValue({} as any);

      // Spy on logger warn
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      const result = await service.applyCredit(
        'tenant-123',
        largeCreditDto,
        adminId,
      );

      // Should still succeed
      expect(result.transactionId).toBe('txn_large');
      expect(result.amountApplied).toBe(60000);

      // Should have logged warning
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Large credit being applied'),
      );
    });

    it('should throw BadRequestException for tenant without billing', async () => {
      tenantRepository.findOne.mockResolvedValue(mockTenant);
      subscriptionsService.getSubscription.mockResolvedValue({
        ...mockSubscription,
        stripeCustomerId: null,
      } as any);

      await expect(
        service.applyCredit('tenant-123', creditDto, adminId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for missing tenant', async () => {
      tenantRepository.findOne.mockResolvedValue(null);

      await expect(
        service.applyCredit('non-existent', creditDto, adminId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('changeTier', () => {
    const adminId = 'admin-123';

    it('should change tier with immediate timing successfully', async () => {
      const changeTierDto = {
        newTier: 'msp' as const,
        timing: 'immediate' as const,
        reason: 'Upgrading to MSP tier for multi-client management',
      };

      tenantRepository.findOne.mockResolvedValue({ ...mockTenant });
      tenantRepository.save.mockResolvedValue({
        ...mockTenant,
        tier: 'msp',
      });
      subscriptionsService.getSubscription.mockResolvedValue(
        mockSubscription as any,
      );
      paymentsService.changeSubscriptionPlan.mockResolvedValue({
        id: 'sub_test123',
        status: 'active',
      } as any);
      subscriptionRepository.update.mockResolvedValue({} as any);
      auditLogsService.log.mockResolvedValue({} as any);

      const result = await service.changeTier(
        'tenant-123',
        changeTierDto,
        adminId,
      );

      expect(result.previousTier).toBe('enterprise');
      expect(result.newTier).toBe('msp');
      expect(result.message).toContain('applied immediately');

      // Verify Stripe was called with correct price
      expect(paymentsService.changeSubscriptionPlan).toHaveBeenCalledWith(
        'sub_test123',
        'price_msp_monthly',
        'immediate',
      );

      // Verify local subscription was updated
      expect(subscriptionRepository.update).toHaveBeenCalledWith(
        { tenantId: 'tenant-123' },
        { planId: 'msp' },
      );

      // Verify audit log
      expect(auditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'billing_tier_changed',
          oldValue: { tier: 'enterprise' },
          newValue: expect.objectContaining({
            tier: 'msp',
            timing: 'immediate',
          }),
        }),
      );
    });

    it('should change tier with end_of_period timing successfully', async () => {
      const changeTierDto = {
        newTier: 'home' as const,
        timing: 'end_of_period' as const,
        reason: 'Downgrading to home tier',
      };

      tenantRepository.findOne.mockResolvedValue({ ...mockTenant });
      tenantRepository.save.mockResolvedValue({
        ...mockTenant,
        tier: 'home',
      });
      subscriptionsService.getSubscription.mockResolvedValue(
        mockSubscription as any,
      );
      paymentsService.changeSubscriptionPlan.mockResolvedValue({
        id: 'sub_test123',
        status: 'active',
      } as any);
      auditLogsService.log.mockResolvedValue({} as any);

      const result = await service.changeTier(
        'tenant-123',
        changeTierDto,
        adminId,
      );

      expect(result.previousTier).toBe('enterprise');
      expect(result.newTier).toBe('home');
      expect(result.message).toContain('end of billing period');

      // Verify Stripe was called
      expect(paymentsService.changeSubscriptionPlan).toHaveBeenCalledWith(
        'sub_test123',
        'price_home_monthly',
        'end_of_period',
      );

      // Should NOT update local subscription for end_of_period
      expect(subscriptionRepository.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for missing subscription', async () => {
      const changeTierDto = {
        newTier: 'msp' as const,
        timing: 'immediate' as const,
        reason: 'Upgrading to MSP',
      };

      tenantRepository.findOne.mockResolvedValue(mockTenant);
      subscriptionsService.getSubscription.mockResolvedValue({
        ...mockSubscription,
        stripeSubscriptionId: null,
      } as any);

      await expect(
        service.changeTier('tenant-123', changeTierDto, adminId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for missing tenant', async () => {
      const changeTierDto = {
        newTier: 'msp' as const,
        timing: 'immediate' as const,
        reason: 'Upgrading',
      };

      tenantRepository.findOne.mockResolvedValue(null);

      await expect(
        service.changeTier('non-existent', changeTierDto, adminId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('extendTrial', () => {
    const adminId = 'admin-123';
    const trialExtendDto = {
      days: 7,
      reason: 'Customer needs more evaluation time',
      notifyTenant: true,
    };

    beforeEach(() => {
      // Add extendTrialPeriod to paymentsService mock
      (paymentsService as any).extendTrialPeriod = jest.fn();
    });

    it('should extend trial successfully with notification', async () => {
      const trialEnd = new Date('2026-02-01');
      const newTrialEnd = new Date('2026-02-08');

      tenantRepository.findOne.mockResolvedValue(mockTenant);
      trialsService.getTrialStatus.mockResolvedValue({
        hasActiveTrial: true,
        trialTier: 'msp',
        originalTier: 'enterprise',
        endsAt: trialEnd,
        daysRemaining: 14,
        status: 'active',
        availableTrials: [],
      });
      subscriptionsService.getSubscription.mockResolvedValue(
        mockSubscription as any,
      );
      (paymentsService as any).extendTrialPeriod.mockResolvedValue({
        trial_end: Math.floor(newTrialEnd.getTime() / 1000),
      });
      auditLogsService.log.mockResolvedValue({} as any);

      const result = await service.extendTrial(
        'tenant-123',
        trialExtendDto,
        adminId,
      );

      expect(result.daysAdded).toBe(7);
      expect(result.notificationSent).toBe(true);
      expect(result.message).toContain('7 days');

      // Verify Stripe was called
      expect((paymentsService as any).extendTrialPeriod).toHaveBeenCalledWith(
        'sub_test123',
        7,
      );

      // Verify audit log
      expect(auditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-123',
          action: 'billing_trial_extended',
          metadata: expect.objectContaining({
            adminId,
            daysAdded: 7,
            notificationSent: true,
          }),
        }),
      );
    });

    it('should extend trial without notification when notifyTenant is false', async () => {
      const trialEnd = new Date('2026-02-01');
      const newTrialEnd = new Date('2026-02-08');

      tenantRepository.findOne.mockResolvedValue(mockTenant);
      trialsService.getTrialStatus.mockResolvedValue({
        hasActiveTrial: true,
        trialTier: 'msp',
        originalTier: 'enterprise',
        endsAt: trialEnd,
        daysRemaining: 14,
        status: 'active',
        availableTrials: [],
      });
      subscriptionsService.getSubscription.mockResolvedValue(
        mockSubscription as any,
      );
      (paymentsService as any).extendTrialPeriod.mockResolvedValue({
        trial_end: Math.floor(newTrialEnd.getTime() / 1000),
      });
      auditLogsService.log.mockResolvedValue({} as any);

      const result = await service.extendTrial(
        'tenant-123',
        { ...trialExtendDto, notifyTenant: false },
        adminId,
      );

      expect(result.notificationSent).toBe(false);
    });

    it('should throw BadRequestException for tenant without active trial', async () => {
      tenantRepository.findOne.mockResolvedValue(mockTenant);
      trialsService.getTrialStatus.mockResolvedValue({
        hasActiveTrial: false,
        availableTrials: ['msp'],
      });

      await expect(
        service.extendTrial('tenant-123', trialExtendDto, adminId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for tenant without Stripe subscription', async () => {
      tenantRepository.findOne.mockResolvedValue(mockTenant);
      trialsService.getTrialStatus.mockResolvedValue({
        hasActiveTrial: true,
        trialTier: 'msp',
        originalTier: 'enterprise',
        endsAt: new Date(),
        daysRemaining: 14,
        status: 'active',
        availableTrials: [],
      });
      subscriptionsService.getSubscription.mockResolvedValue({
        ...mockSubscription,
        stripeSubscriptionId: null,
      } as any);

      await expect(
        service.extendTrial('tenant-123', trialExtendDto, adminId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for missing tenant', async () => {
      tenantRepository.findOne.mockResolvedValue(null);

      await expect(
        service.extendTrial('non-existent', trialExtendDto, adminId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('extendGracePeriod', () => {
    const adminId = 'admin-123';
    const graceExtendDto = {
      days: 7,
      reason: 'Customer payment processing delay',
      notifyTenant: true,
    };

    beforeEach(() => {
      // Add extendGracePeriod to subscriptionLapseService mock
      (subscriptionLapseService as any).extendGracePeriod = jest.fn();
    });

    it('should extend grace period successfully with notification', async () => {
      tenantRepository.findOne.mockResolvedValue(mockTenant);
      subscriptionLapseService.getGracePeriodInfo.mockResolvedValue({
        tenantId: 'tenant-123',
        tenantName: 'Test Tenant',
        subscriptionStatus: 'grace',
        graceStartDate: new Date(),
        daysRemaining: 10,
      });
      (subscriptionLapseService as any).extendGracePeriod.mockResolvedValue(
        undefined,
      );
      auditLogsService.log.mockResolvedValue({} as any);

      const result = await service.extendGracePeriod(
        'tenant-123',
        graceExtendDto,
        adminId,
      );

      expect(result.daysAdded).toBe(7);
      expect(result.notificationSent).toBe(true);
      expect(result.message).toContain('7 days');

      // Verify subscription lapse service was called
      expect(
        (subscriptionLapseService as any).extendGracePeriod,
      ).toHaveBeenCalledWith('tenant-123', 7, adminId);

      // Verify audit log
      expect(auditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-123',
          action: 'billing_grace_extended',
          metadata: expect.objectContaining({
            adminId,
            daysAdded: 7,
            notificationSent: true,
          }),
        }),
      );
    });

    it('should extend grace period without notification when notifyTenant is false', async () => {
      tenantRepository.findOne.mockResolvedValue(mockTenant);
      subscriptionLapseService.getGracePeriodInfo.mockResolvedValue({
        tenantId: 'tenant-123',
        tenantName: 'Test Tenant',
        subscriptionStatus: 'grace',
        graceStartDate: new Date(),
        daysRemaining: 10,
      });
      (subscriptionLapseService as any).extendGracePeriod.mockResolvedValue(
        undefined,
      );
      auditLogsService.log.mockResolvedValue({} as any);

      const result = await service.extendGracePeriod(
        'tenant-123',
        { ...graceExtendDto, notifyTenant: false },
        adminId,
      );

      expect(result.notificationSent).toBe(false);
    });

    it('should throw BadRequestException for tenant not in grace period', async () => {
      tenantRepository.findOne.mockResolvedValue(mockTenant);
      subscriptionLapseService.getGracePeriodInfo.mockResolvedValue({
        tenantId: 'tenant-123',
        tenantName: 'Test Tenant',
        subscriptionStatus: 'active',
        graceStartDate: null,
        daysRemaining: null,
      });

      await expect(
        service.extendGracePeriod('tenant-123', graceExtendDto, adminId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for missing tenant', async () => {
      tenantRepository.findOne.mockResolvedValue(null);

      await expect(
        service.extendGracePeriod('non-existent', graceExtendDto, adminId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
