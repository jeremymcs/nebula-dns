// Nebula DNS - Admin Controller Tests
// Tests for admin authentication and MSP onboarding endpoints
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminHealthService } from './admin-health.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { CreateMspTenantDto, MspTenantCreatedResponseDto } from './dto/msp-onboarding.dto';

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: jest.Mocked<AdminService>;

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
      ],
    })
      .overrideGuard(AdminAuthGuard)
      .useValue(mockAdminAuthGuard)
      .compile();

    controller = module.get<AdminController>(AdminController);
    adminService = module.get(AdminService);

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
      mockAdminService.createMspTenant.mockResolvedValue(mockMspCreatedResponse);

      const result = await controller.createMspTenant(validDto, mockRequest);

      expect(result).toEqual(mockMspCreatedResponse);
      expect(mockAdminService.createMspTenant).toHaveBeenCalledWith(
        validDto,
        mockAdminUser.adminId,
      );
    });

    it('should pass admin ID from request user', async () => {
      mockAdminService.createMspTenant.mockResolvedValue(mockMspCreatedResponse);

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
});
