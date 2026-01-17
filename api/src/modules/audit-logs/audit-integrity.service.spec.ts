// Nebula DNS - Audit Integrity Service Unit Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditIntegrityService } from './audit-integrity.service';
import { AuditLogsService } from './audit-logs.service';
import { AuditLog } from './entities/audit-log.entity';
import { Tenant } from '../tenants/entities/tenant.entity';

describe('AuditIntegrityService', () => {
  let service: AuditIntegrityService;
  let auditLogsService: jest.Mocked<AuditLogsService>;
  let auditLogRepository: jest.Mocked<Repository<AuditLog>>;
  let tenantRepository: jest.Mocked<Repository<Tenant>>;

  const mockTenants = [
    { id: 'tenant-001', name: 'Acme Corp' },
    { id: 'tenant-002', name: 'Globex Inc' },
    { id: 'tenant-003', name: 'Initech' },
  ];

  const mockAuditLogsService = {
    verifyIntegrity: jest.fn(),
    calculateRecordHash: jest.fn(),
  };

  const mockAuditLogRepository = {
    count: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockTenantRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditIntegrityService,
        {
          provide: AuditLogsService,
          useValue: mockAuditLogsService,
        },
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogRepository,
        },
        {
          provide: getRepositoryToken(Tenant),
          useValue: mockTenantRepository,
        },
      ],
    }).compile();

    service = module.get<AuditIntegrityService>(AuditIntegrityService);
    auditLogsService = module.get(AuditLogsService);
    auditLogRepository = module.get(getRepositoryToken(AuditLog));
    tenantRepository = module.get(getRepositoryToken(Tenant));

    jest.clearAllMocks();
  });

  describe('verifyAllTenants', () => {
    it('should verify all tenants and return summary', async () => {
      mockTenantRepository.find.mockResolvedValue(mockTenants as Tenant[]);
      mockAuditLogsService.verifyIntegrity.mockResolvedValue({
        valid: true,
        totalRecords: 100,
        verifiedRecords: 100,
      });

      const result = await service.verifyAllTenants();

      expect(result.totalTenants).toBe(3);
      expect(result.tenantsChecked).toBe(3);
      expect(result.tenantsWithValidChain).toBe(3);
      expect(result.tenantsWithBrokenChain).toBe(0);
      expect(result.totalRecordsVerified).toBe(300); // 100 * 3
      expect(result.results).toHaveLength(3);
    });

    it('should identify tenants with broken chains', async () => {
      mockTenantRepository.find.mockResolvedValue(mockTenants as Tenant[]);

      // First tenant valid, second tenant broken, third tenant valid
      mockAuditLogsService.verifyIntegrity
        .mockResolvedValueOnce({
          valid: true,
          totalRecords: 50,
          verifiedRecords: 50,
        })
        .mockResolvedValueOnce({
          valid: false,
          totalRecords: 75,
          verifiedRecords: 30,
          brokenAt: {
            id: 'log-broken',
            expectedHash: 'expected-hash',
            actualHash: 'actual-hash',
          },
        })
        .mockResolvedValueOnce({
          valid: true,
          totalRecords: 25,
          verifiedRecords: 25,
        });

      const result = await service.verifyAllTenants();

      expect(result.tenantsWithValidChain).toBe(2);
      expect(result.tenantsWithBrokenChain).toBe(1);
      expect(result.totalRecordsVerified).toBe(105); // 50 + 30 + 25

      const brokenTenant = result.results.find((r) => !r.valid);
      expect(brokenTenant).toBeDefined();
      expect(brokenTenant?.tenantId).toBe('tenant-002');
      expect(brokenTenant?.brokenAt?.id).toBe('log-broken');
    });

    it('should handle empty tenant list', async () => {
      mockTenantRepository.find.mockResolvedValue([]);

      const result = await service.verifyAllTenants();

      expect(result.totalTenants).toBe(0);
      expect(result.tenantsChecked).toBe(0);
      expect(result.totalRecordsVerified).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it('should record check duration for each tenant', async () => {
      mockTenantRepository.find.mockResolvedValue([mockTenants[0]] as Tenant[]);
      mockAuditLogsService.verifyIntegrity.mockResolvedValue({
        valid: true,
        totalRecords: 100,
        verifiedRecords: 100,
      });

      const result = await service.verifyAllTenants();

      expect(result.results[0].checkDuration).toBeDefined();
      expect(result.results[0].checkDuration).toBeGreaterThanOrEqual(0);
      expect(result.results[0].checkedAt).toBeInstanceOf(Date);
    });
  });

  describe('verifyTenantChain', () => {
    it('should verify specific tenant chain', async () => {
      mockTenantRepository.findOne.mockResolvedValue(mockTenants[0] as Tenant);
      mockAuditLogsService.verifyIntegrity.mockResolvedValue({
        valid: true,
        totalRecords: 150,
        verifiedRecords: 150,
      });

      const result = await service.verifyTenantChain('tenant-001');

      expect(result.tenantId).toBe('tenant-001');
      expect(result.tenantName).toBe('Acme Corp');
      expect(result.valid).toBe(true);
      expect(result.totalRecords).toBe(150);
      expect(result.verifiedRecords).toBe(150);
    });

    it('should pass startId and endId to verifyIntegrity', async () => {
      mockTenantRepository.findOne.mockResolvedValue(mockTenants[0] as Tenant);
      mockAuditLogsService.verifyIntegrity.mockResolvedValue({
        valid: true,
        totalRecords: 50,
        verifiedRecords: 50,
      });

      await service.verifyTenantChain('tenant-001', 'start-id', 'end-id');

      expect(mockAuditLogsService.verifyIntegrity).toHaveBeenCalledWith(
        'tenant-001',
        'start-id',
        'end-id',
      );
    });

    it('should handle tenant not found', async () => {
      mockTenantRepository.findOne.mockResolvedValue(null);
      mockAuditLogsService.verifyIntegrity.mockResolvedValue({
        valid: true,
        totalRecords: 0,
        verifiedRecords: 0,
      });

      const result = await service.verifyTenantChain('unknown-tenant');

      expect(result.tenantName).toBeUndefined();
      expect(result.tenantId).toBe('unknown-tenant');
    });

    it('should include broken chain details in result', async () => {
      mockTenantRepository.findOne.mockResolvedValue(mockTenants[0] as Tenant);
      mockAuditLogsService.verifyIntegrity.mockResolvedValue({
        valid: false,
        totalRecords: 100,
        verifiedRecords: 45,
        brokenAt: {
          id: 'log-46',
          expectedHash: 'expected',
          actualHash: 'actual',
        },
      });

      const result = await service.verifyTenantChain('tenant-001');

      expect(result.valid).toBe(false);
      expect(result.brokenAt).toBeDefined();
      expect(result.brokenAt?.id).toBe('log-46');
    });
  });

  describe('getLastVerificationReport', () => {
    it('should return null when no verification has run', () => {
      const report = service.getLastVerificationReport();
      expect(report).toBeNull();
    });

    it('should return last verification report after daily check', async () => {
      mockTenantRepository.find.mockResolvedValue(mockTenants as Tenant[]);
      mockAuditLogsService.verifyIntegrity.mockResolvedValue({
        valid: true,
        totalRecords: 100,
        verifiedRecords: 100,
      });

      await service.runDailyIntegrityCheck();

      const report = service.getLastVerificationReport();

      expect(report).not.toBeNull();
      expect(report?.totalTenants).toBe(3);
      expect(report?.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('getAuditLogStats', () => {
    it('should return audit log statistics', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { tenantId: 'tenant-001', count: '150' },
          { tenantId: 'tenant-002', count: '75' },
        ]),
      };

      mockAuditLogRepository.count.mockResolvedValue(225);
      mockAuditLogRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );
      mockAuditLogRepository.findOne
        .mockResolvedValueOnce({
          createdAt: new Date('2024-01-01'),
        } as AuditLog)
        .mockResolvedValueOnce({
          createdAt: new Date('2024-06-15'),
        } as AuditLog);

      const stats = await service.getAuditLogStats();

      expect(stats.totalRecords).toBe(225);
      expect(stats.recordsByTenant).toHaveLength(2);
      expect(stats.recordsByTenant[0].count).toBe(150);
      expect(stats.oldestRecord).toEqual(new Date('2024-01-01'));
      expect(stats.newestRecord).toEqual(new Date('2024-06-15'));
    });

    it('should handle empty audit logs', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      mockAuditLogRepository.count.mockResolvedValue(0);
      mockAuditLogRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );
      mockAuditLogRepository.findOne.mockResolvedValue(null);

      const stats = await service.getAuditLogStats();

      expect(stats.totalRecords).toBe(0);
      expect(stats.recordsByTenant).toHaveLength(0);
      expect(stats.oldestRecord).toBeNull();
      expect(stats.newestRecord).toBeNull();
    });
  });

  describe('runDailyIntegrityCheck', () => {
    it('should log success message when all chains are valid', async () => {
      mockTenantRepository.find.mockResolvedValue(mockTenants as Tenant[]);
      mockAuditLogsService.verifyIntegrity.mockResolvedValue({
        valid: true,
        totalRecords: 100,
        verifiedRecords: 100,
      });

      // Spy on logger
      const logSpy = jest.spyOn(service['logger'], 'log');

      await service.runDailyIntegrityCheck();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Daily integrity check completed successfully'),
      );
    });

    it('should log error and emit alert when chains are broken', async () => {
      mockTenantRepository.find.mockResolvedValue(mockTenants as Tenant[]);
      mockAuditLogsService.verifyIntegrity
        .mockResolvedValueOnce({
          valid: true,
          totalRecords: 50,
          verifiedRecords: 50,
        })
        .mockResolvedValueOnce({
          valid: false,
          totalRecords: 75,
          verifiedRecords: 30,
          brokenAt: {
            id: 'log-broken',
            expectedHash: 'expected',
            actualHash: 'actual',
          },
        })
        .mockResolvedValueOnce({
          valid: true,
          totalRecords: 25,
          verifiedRecords: 25,
        });

      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.runDailyIntegrityCheck();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('AUDIT INTEGRITY ALERT'),
      );
    });

    it('should handle errors gracefully', async () => {
      mockTenantRepository.find.mockRejectedValue(new Error('Database error'));

      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.runDailyIntegrityCheck();

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to complete daily integrity check',
        expect.any(Error),
      );
    });
  });

  describe('Module Initialization', () => {
    it('should log initialization message on module init', () => {
      const logSpy = jest.spyOn(service['logger'], 'log');

      service.onModuleInit();

      expect(logSpy).toHaveBeenCalledWith(
        'Audit Integrity Service initialized',
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Daily hash chain verification scheduled'),
      );
    });
  });
});
