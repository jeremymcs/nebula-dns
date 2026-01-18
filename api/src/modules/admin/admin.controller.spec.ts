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
import { AdminAuthGuard } from './guards/admin-auth.guard';
import {
  CreateMspTenantDto,
  MspTenantCreatedResponseDto,
} from './dto/msp-onboarding.dto';
import {
  ExtendTrialDto,
  ExtendGracePeriodDto,
  ExtensionResponseDto,
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
      ],
    })
      .overrideGuard(AdminAuthGuard)
      .useValue(mockAdminAuthGuard)
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
});
