// Nebula DNS - Admin Controller Tests
// Tests for admin authentication, MSP onboarding, and billing extension endpoints
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminHealthService } from './admin-health.service';
import { AdminBillingService } from './admin-billing.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminMfaService } from './admin-mfa.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { AdminRolesGuard } from './guards/admin-roles.guard';
import { ConfigService } from '@nestjs/config';
import {
  CreateMspTenantDto,
  MspTenantCreatedResponseDto,
} from './dto/msp-onboarding.dto';
import {
  ExtendTrialDto,
  ExtendGracePeriodDto,
  ExtensionResponseDto,
  SubscriptionStatusResponseDto,
  InvoiceListResponseDto,
  ApplyCreditDto,
  CreditAppliedResponseDto,
  ChangeTierDto,
  TierChangeResponseDto,
} from './dto/billing.dto';

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: jest.Mocked<AdminService>;
  let adminBillingService: jest.Mocked<AdminBillingService>;

  const mockAdminUser = {
    adminId: 'admin-uuid-1234',
    email: 'admin@nebula.local',
    name: 'Test Admin',
    mfaVerified: true,
    jti: 'session-jti-1234',
  };

  const mockMspCreatedResponse: MspTenantCreatedResponseDto = {
    id: 'tenant-uuid-1234',
    name: 'Acme Managed Services',
    slug: 'acme-managed-services',
    status: 'active',
    tier: 'msp',
    adminUserId: 'user-uuid-1234',
    adminEmail: 'admin@acme-msp.com',
    welcomeEmailSent: true,
    locationLimit: null,
    clientLimit: null,
    createdAt: '2026-01-18T12:00:00.000Z',
  };

  const mockRequest = {
    user: mockAdminUser,
    headers: {
      'user-agent': 'Test User Agent',
      'x-forwarded-for': '192.168.1.1',
      authorization: 'Bearer mock-token',
    },
    ip: '192.168.1.1',
  } as unknown as Request;

  const mockAdminService = {
    login: jest.fn(),
    logout: jest.fn(),
    findById: jest.fn(),
    revokeAllSessions: jest.fn(),
    searchTenants: jest.fn(),
    listMspTenants: jest.fn(),
    getMspDetail: jest.fn(),
    getMspClients: jest.fn(),
    startImpersonation: jest.fn(),
    endImpersonation: jest.fn(),
    createMspTenant: jest.fn(),
  };

  const mockAdminHealthService = {
    getSystemHealth: jest.fn(),
    getRecentErrors: jest.fn(),
    getQueryVolume: jest.fn(),
  };

  const mockAdminBillingService = {
    getSubscriptionStatus: jest.fn(),
    listInvoices: jest.fn(),
    streamInvoicePdf: jest.fn(),
    applyCredit: jest.fn(),
    changeTier: jest.fn(),
    extendTrial: jest.fn(),
    extendGracePeriod: jest.fn(),
  };

  const mockAdminDashboardService = {
    getStats: jest.fn(),
  };

  // Mock AdminAuthGuard to always pass
  const mockAdminAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: mockAdminService,
        },
        {
          provide: AdminHealthService,
          useValue: mockAdminHealthService,
        },
        {
          provide: AdminBillingService,
          useValue: mockAdminBillingService,
        },
        {
          provide: AdminDashboardService,
          useValue: mockAdminDashboardService,
        },
        {
          provide: AdminMfaService,
          useValue: {
            startEnrollment: jest.fn(),
            completeEnrollment: jest.fn(),
            verifyChallenge: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => null) },
        },
      ],
    })
      .overrideGuard(AdminAuthGuard)
      .useValue(mockAdminAuthGuard)
      .overrideGuard(AdminRolesGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<AdminController>(AdminController);
    adminService = module.get(AdminService);
    adminBillingService = module.get(AdminBillingService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createMspTenant', () => {
    const validDto: CreateMspTenantDto = {
      name: 'Acme Managed Services',
      adminEmail: 'admin@acme-msp.com',
    };

    it('should create MSP tenant successfully', async () => {
      mockAdminService.createMspTenant.mockResolvedValue(
        mockMspCreatedResponse,
      );

      const result = await controller.createMspTenant(validDto, mockRequest);

      expect(result).toEqual(mockMspCreatedResponse);
      expect(mockAdminService.createMspTenant).toHaveBeenCalledWith(
        validDto,
        mockAdminUser.adminId,
      );
    });

    it('should pass admin ID from request user', async () => {
      mockAdminService.createMspTenant.mockResolvedValue(
        mockMspCreatedResponse,
      );

      await controller.createMspTenant(validDto, mockRequest);

      expect(mockAdminService.createMspTenant).toHaveBeenCalledWith(
        expect.anything(),
        'admin-uuid-1234',
      );
    });

    it('should handle duplicate email error', async () => {
      mockAdminService.createMspTenant.mockRejectedValue(
        new ConflictException('Email address already in use'),
      );

      await expect(
        controller.createMspTenant(validDto, mockRequest),
      ).rejects.toThrow(ConflictException);
    });

    it('should handle validation errors from service', async () => {
      mockAdminService.createMspTenant.mockRejectedValue(
        new BadRequestException('Slug already in use'),
      );

      await expect(
        controller.createMspTenant(validDto, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept minimal required fields', async () => {
      const minimalDto: CreateMspTenantDto = {
        name: 'Test MSP',
        adminEmail: 'test@example.com',
      };

      mockAdminService.createMspTenant.mockResolvedValue({
        ...mockMspCreatedResponse,
        name: 'Test MSP',
        adminEmail: 'test@example.com',
      });

      const result = await controller.createMspTenant(minimalDto, mockRequest);

      expect(result.name).toBe('Test MSP');
      expect(mockAdminService.createMspTenant).toHaveBeenCalledWith(
        minimalDto,
        mockAdminUser.adminId,
      );
    });

    it('should accept all optional fields', async () => {
      const fullDto: CreateMspTenantDto = {
        name: 'Full MSP',
        slug: 'full-msp',
        adminEmail: 'admin@full-msp.com',
        adminName: 'John Smith',
        contactEmail: 'support@full-msp.com',
        contactPhone: '+1-555-123-4567',
        locationLimit: 100,
        clientLimit: 50,
      };

      mockAdminService.createMspTenant.mockResolvedValue({
        ...mockMspCreatedResponse,
        name: 'Full MSP',
        slug: 'full-msp',
        locationLimit: 100,
        clientLimit: 50,
      });

      const result = await controller.createMspTenant(fullDto, mockRequest);

      expect(result.slug).toBe('full-msp');
      expect(result.locationLimit).toBe(100);
      expect(result.clientLimit).toBe(50);
      expect(mockAdminService.createMspTenant).toHaveBeenCalledWith(
        fullDto,
        mockAdminUser.adminId,
      );
    });

    it('should return welcomeEmailSent status', async () => {
      const responseWithEmail: MspTenantCreatedResponseDto = {
        ...mockMspCreatedResponse,
        welcomeEmailSent: true,
      };
      mockAdminService.createMspTenant.mockResolvedValue(responseWithEmail);

      const result = await controller.createMspTenant(validDto, mockRequest);

      expect(result.welcomeEmailSent).toBe(true);
    });

    it('should handle email send failure gracefully', async () => {
      const responseNoEmail: MspTenantCreatedResponseDto = {
        ...mockMspCreatedResponse,
        welcomeEmailSent: false,
      };
      mockAdminService.createMspTenant.mockResolvedValue(responseNoEmail);

      const result = await controller.createMspTenant(validDto, mockRequest);

      expect(result.welcomeEmailSent).toBe(false);
      // Should still succeed even if email failed
      expect(result.id).toBeDefined();
    });
  });

  describe('extendTrial', () => {
    const tenantId = 'tenant-uuid-1234';
    const validDto: ExtendTrialDto = {
      days: 7,
      reason: 'Customer needs more time to evaluate',
      notifyTenant: true,
    };

    const mockExtensionResponse: ExtensionResponseDto = {
      newEndDate: '2026-02-08T00:00:00.000Z',
      daysAdded: 7,
      notificationSent: true,
      message: 'Trial extended by 7 days. New end date: 2/8/2026',
    };

    it('should extend trial successfully', async () => {
      mockAdminBillingService.extendTrial.mockResolvedValue(
        mockExtensionResponse,
      );

      const result = await controller.extendTrial(
        tenantId,
        validDto,
        mockRequest,
      );

      expect(result).toEqual(mockExtensionResponse);
      expect(mockAdminBillingService.extendTrial).toHaveBeenCalledWith(
        tenantId,
        validDto,
        mockAdminUser.adminId,
      );
    });

    it('should pass admin ID from request user', async () => {
      mockAdminBillingService.extendTrial.mockResolvedValue(
        mockExtensionResponse,
      );

      await controller.extendTrial(tenantId, validDto, mockRequest);

      expect(mockAdminBillingService.extendTrial).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'admin-uuid-1234',
      );
    });

    it('should throw NotFoundException for missing tenant', async () => {
      mockAdminBillingService.extendTrial.mockRejectedValue(
        new NotFoundException('Tenant not found'),
      );

      await expect(
        controller.extendTrial(tenantId, validDto, mockRequest),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when no active trial', async () => {
      mockAdminBillingService.extendTrial.mockRejectedValue(
        new BadRequestException('Tenant does not have an active trial'),
      );

      await expect(
        controller.extendTrial(tenantId, validDto, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('extendGracePeriod', () => {
    const tenantId = 'tenant-uuid-1234';
    const validDto: ExtendGracePeriodDto = {
      days: 14,
      reason: 'Customer payment processing delay',
      notifyTenant: true,
    };

    const mockExtensionResponse: ExtensionResponseDto = {
      newEndDate: '2026-02-15T00:00:00.000Z',
      daysAdded: 14,
      notificationSent: true,
      message: 'Grace period extended by 14 days. New end date: 2/15/2026',
    };

    it('should extend grace period successfully', async () => {
      mockAdminBillingService.extendGracePeriod.mockResolvedValue(
        mockExtensionResponse,
      );

      const result = await controller.extendGracePeriod(
        tenantId,
        validDto,
        mockRequest,
      );

      expect(result).toEqual(mockExtensionResponse);
      expect(mockAdminBillingService.extendGracePeriod).toHaveBeenCalledWith(
        tenantId,
        validDto,
        mockAdminUser.adminId,
      );
    });

    it('should pass admin ID from request user', async () => {
      mockAdminBillingService.extendGracePeriod.mockResolvedValue(
        mockExtensionResponse,
      );

      await controller.extendGracePeriod(tenantId, validDto, mockRequest);

      expect(mockAdminBillingService.extendGracePeriod).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'admin-uuid-1234',
      );
    });

    it('should throw NotFoundException for missing tenant', async () => {
      mockAdminBillingService.extendGracePeriod.mockRejectedValue(
        new NotFoundException('Tenant not found'),
      );

      await expect(
        controller.extendGracePeriod(tenantId, validDto, mockRequest),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when not in grace period', async () => {
      mockAdminBillingService.extendGracePeriod.mockRejectedValue(
        new BadRequestException('Tenant is not in grace period'),
      );

      await expect(
        controller.extendGracePeriod(tenantId, validDto, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSubscriptionStatus', () => {
    const tenantId = 'tenant-uuid-1234';

    const mockSubscriptionStatus: SubscriptionStatusResponseDto = {
      tenantId: 'tenant-uuid-1234',
      tenantName: 'Test Tenant',
      tier: 'enterprise',
      status: 'active',
      billingCycle: 'monthly',
      stripeCustomerId: 'cus_test123',
      stripeCustomerLink: 'https://dashboard.stripe.com/customers/cus_test123',
      billingEmail: 'billing@test.com',
      cancelAtPeriodEnd: false,
    };

    it('should return subscription status', async () => {
      mockAdminBillingService.getSubscriptionStatus.mockResolvedValue(
        mockSubscriptionStatus,
      );

      const result = await controller.getSubscriptionStatus(tenantId);

      expect(result).toEqual(mockSubscriptionStatus);
      expect(
        mockAdminBillingService.getSubscriptionStatus,
      ).toHaveBeenCalledWith(tenantId);
    });

    it('should throw NotFoundException for missing tenant', async () => {
      mockAdminBillingService.getSubscriptionStatus.mockRejectedValue(
        new NotFoundException('Tenant not found'),
      );

      await expect(controller.getSubscriptionStatus(tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listInvoices', () => {
    const tenantId = 'tenant-uuid-1234';

    const mockInvoiceResponse: InvoiceListResponseDto = {
      data: [
        {
          id: 'in_test1',
          number: 'INV-001',
          status: 'paid',
          amountDue: 9900,
          amountPaid: 9900,
          currency: 'usd',
          created: '2026-01-01T00:00:00.000Z',
          hasPdf: true,
        },
      ],
      pagination: {
        cursor: null,
        hasMore: false,
      },
    };

    it('should return invoices with pagination', async () => {
      mockAdminBillingService.listInvoices.mockResolvedValue(
        mockInvoiceResponse,
      );

      const result = await controller.listInvoices(tenantId, { limit: 20 });

      expect(result).toEqual(mockInvoiceResponse);
      expect(mockAdminBillingService.listInvoices).toHaveBeenCalledWith(
        tenantId,
        { limit: 20 },
      );
    });
  });

  describe('applyCredit', () => {
    const tenantId = 'tenant-uuid-1234';
    const creditDto: ApplyCreditDto = {
      amountCents: 1500,
      reason: 'Customer support credit',
    };

    const mockCreditResponse: CreditAppliedResponseDto = {
      transactionId: 'txn_abc123',
      newBalance: -1500,
      amountApplied: 1500,
      message: 'Successfully applied $15.00 credit to Test Tenant',
    };

    it('should apply credit successfully', async () => {
      mockAdminBillingService.applyCredit.mockResolvedValue(mockCreditResponse);

      const result = await controller.applyCredit(
        tenantId,
        creditDto,
        mockRequest,
      );

      expect(result).toEqual(mockCreditResponse);
      expect(mockAdminBillingService.applyCredit).toHaveBeenCalledWith(
        tenantId,
        creditDto,
        mockAdminUser.adminId,
      );
    });

    it('should throw NotFoundException for missing tenant', async () => {
      mockAdminBillingService.applyCredit.mockRejectedValue(
        new NotFoundException('Tenant not found'),
      );

      await expect(
        controller.applyCredit(tenantId, creditDto, mockRequest),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for tenant without billing', async () => {
      mockAdminBillingService.applyCredit.mockRejectedValue(
        new BadRequestException('Tenant does not have billing configured'),
      );

      await expect(
        controller.applyCredit(tenantId, creditDto, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('changeTier', () => {
    const tenantId = 'tenant-uuid-1234';
    const tierDto: ChangeTierDto = {
      newTier: 'msp',
      timing: 'immediate',
      reason: 'Upgrading to MSP tier',
    };

    const mockTierResponse: TierChangeResponseDto = {
      previousTier: 'enterprise',
      newTier: 'msp',
      effectiveAt: '2026-01-18T00:00:00.000Z',
      message: 'Successfully changed tier from enterprise to msp',
    };

    it('should change tier successfully', async () => {
      mockAdminBillingService.changeTier.mockResolvedValue(mockTierResponse);

      const result = await controller.changeTier(
        tenantId,
        tierDto,
        mockRequest,
      );

      expect(result).toEqual(mockTierResponse);
      expect(mockAdminBillingService.changeTier).toHaveBeenCalledWith(
        tenantId,
        tierDto,
        mockAdminUser.adminId,
      );
    });

    it('should throw NotFoundException for missing tenant', async () => {
      mockAdminBillingService.changeTier.mockRejectedValue(
        new NotFoundException('Tenant not found'),
      );

      await expect(
        controller.changeTier(tenantId, tierDto, mockRequest),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for missing subscription', async () => {
      mockAdminBillingService.changeTier.mockRejectedValue(
        new BadRequestException('Tenant does not have an active subscription'),
      );

      await expect(
        controller.changeTier(tenantId, tierDto, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
