// Nebula DNS - Audit Logs Service Unit Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { createHash } from 'crypto';
import { AuditLogsService } from './audit-logs.service';
import {
  AuditLog,
  AuditAction,
  AuditResourceType,
} from './entities/audit-log.entity';

describe('AuditLogsService', () => {
  let service: AuditLogsService;
  let repository: jest.Mocked<Repository<AuditLog>>;
  let dataSource: jest.Mocked<DataSource>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';

  const mockAuditLogRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const mockEntityManager = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn((callback) => callback(mockEntityManager)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<AuditLogsService>(AuditLogsService);
    repository = module.get(getRepositoryToken(AuditLog));
    dataSource = module.get(DataSource);

    jest.clearAllMocks();
    mockAuditLogRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  describe('Hash Chain Generation', () => {
    describe('calculateRecordHash', () => {
      it('should generate consistent SHA256 hash', () => {
        const previousHash = 'abc123';
        const action = 'create';
        const resourceType = 'policy';
        const resourceId = 'res-001';
        const timestamp = '2024-01-01T12:00:00.000Z';
        const userId = 'user-123';

        const hash1 = service.calculateRecordHash(
          previousHash,
          action,
          resourceType,
          resourceId,
          timestamp,
          userId,
        );

        const hash2 = service.calculateRecordHash(
          previousHash,
          action,
          resourceType,
          resourceId,
          timestamp,
          userId,
        );

        expect(hash1).toBe(hash2);
        expect(hash1).toHaveLength(64); // SHA256 hex = 64 chars
      });

      it('should generate different hash for different inputs', () => {
        const baseParams = {
          previousHash: 'abc123',
          action: 'create',
          resourceType: 'policy',
          resourceId: 'res-001',
          timestamp: '2024-01-01T12:00:00.000Z',
          userId: 'user-123',
        };

        const hash1 = service.calculateRecordHash(
          baseParams.previousHash,
          baseParams.action,
          baseParams.resourceType,
          baseParams.resourceId,
          baseParams.timestamp,
          baseParams.userId,
        );

        // Change action
        const hash2 = service.calculateRecordHash(
          baseParams.previousHash,
          'update',
          baseParams.resourceType,
          baseParams.resourceId,
          baseParams.timestamp,
          baseParams.userId,
        );

        expect(hash1).not.toBe(hash2);
      });

      it('should handle null previousHash (genesis record)', () => {
        const hash = service.calculateRecordHash(
          null,
          'create',
          'policy',
          'res-001',
          '2024-01-01T12:00:00.000Z',
          'user-123',
        );

        expect(hash).toHaveLength(64);
        expect(hash).toMatch(/^[a-f0-9]+$/);
      });

      it('should produce expected hash format', () => {
        const hash = service.calculateRecordHash(
          null,
          'create',
          'policy',
          'res-001',
          '2024-01-01T12:00:00.000Z',
          'user-123',
        );

        // Verify it's a valid hex string
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      });

      it('should match manual SHA256 calculation', () => {
        const previousHash = 'prevhash123';
        const action = 'update';
        const resourceType = 'user';
        const resourceId = 'user-456';
        const timestamp = '2024-06-15T10:30:00.000Z';
        const userId = 'admin-789';

        const data = `${previousHash}|${action}|${resourceType}|${resourceId}|${timestamp}|${userId}`;
        const expectedHash = createHash('sha256').update(data).digest('hex');

        const actualHash = service.calculateRecordHash(
          previousHash,
          action,
          resourceType,
          resourceId,
          timestamp,
          userId,
        );

        expect(actualHash).toBe(expectedHash);
      });
    });

    describe('verifyRecordHash', () => {
      it('should return true for valid record hash', () => {
        const previousHash = 'abc123';
        const timestamp = new Date('2024-01-01T12:00:00.000Z');

        const expectedHash = service.calculateRecordHash(
          previousHash,
          'create',
          'policy',
          'res-001',
          timestamp.toISOString(),
          'user-123',
        );

        const mockLog: AuditLog = {
          id: 'log-001',
          tenantId: mockTenantId,
          userId: 'user-123',
          action: 'create' as AuditAction,
          resourceType: 'policy' as AuditResourceType,
          resourceId: 'res-001',
          resourceName: null,
          oldValue: null,
          newValue: null,
          ipAddress: null,
          userAgent: null,
          metadata: null,
          previousHash,
          recordHash: expectedHash,
          createdAt: timestamp,
          tenant: null as any,
          user: null as any,
        };

        const isValid = service.verifyRecordHash(mockLog, previousHash);
        expect(isValid).toBe(true);
      });

      it('should return false for tampered record', () => {
        const timestamp = new Date('2024-01-01T12:00:00.000Z');

        const mockLog: AuditLog = {
          id: 'log-001',
          tenantId: mockTenantId,
          userId: 'user-123',
          action: 'create' as AuditAction,
          resourceType: 'policy' as AuditResourceType,
          resourceId: 'res-001',
          resourceName: null,
          oldValue: null,
          newValue: null,
          ipAddress: null,
          userAgent: null,
          metadata: null,
          previousHash: 'abc123',
          recordHash: 'tampered-hash-value',
          createdAt: timestamp,
          tenant: null as any,
          user: null as any,
        };

        const isValid = service.verifyRecordHash(mockLog, 'abc123');
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Hash Chain Logging', () => {
    describe('log', () => {
      it('should create audit log with hash chain', async () => {
        const previousLog = {
          recordHash: 'previous-hash-123',
        };

        mockEntityManager.findOne.mockResolvedValue(previousLog);
        mockEntityManager.create.mockImplementation((_, data) => data);
        mockEntityManager.save.mockImplementation((_, data) =>
          Promise.resolve({ id: 'log-001', ...data }),
        );

        const dto = {
          tenantId: mockTenantId,
          userId: mockUserId,
          action: 'create' as AuditAction,
          resourceType: 'policy' as AuditResourceType,
          resourceId: 'res-001',
        };

        const result = await service.log(dto);

        expect(result.previousHash).toBe('previous-hash-123');
        expect(result.recordHash).toHaveLength(64);
        expect(mockEntityManager.findOne).toHaveBeenCalledWith(
          AuditLog,
          expect.objectContaining({
            where: { tenantId: mockTenantId },
            order: { createdAt: 'DESC' },
          }),
        );
      });

      it('should handle genesis record (no previous log)', async () => {
        mockEntityManager.findOne.mockResolvedValue(null);
        mockEntityManager.create.mockImplementation((_, data) => data);
        mockEntityManager.save.mockImplementation((_, data) =>
          Promise.resolve({ id: 'log-001', ...data }),
        );

        const dto = {
          tenantId: mockTenantId,
          userId: mockUserId,
          action: 'create' as AuditAction,
          resourceType: 'tenant' as AuditResourceType,
        };

        const result = await service.log(dto);

        expect(result.previousHash).toBeNull();
        expect(result.recordHash).toHaveLength(64);
      });

      it('should use transaction for atomic operation', async () => {
        mockEntityManager.findOne.mockResolvedValue(null);
        mockEntityManager.create.mockImplementation((_, data) => data);
        mockEntityManager.save.mockImplementation((_, data) =>
          Promise.resolve({ id: 'log-001', ...data }),
        );

        const dto = {
          tenantId: mockTenantId,
          action: 'login' as AuditAction,
          resourceType: 'user' as AuditResourceType,
        };

        await service.log(dto);

        expect(mockDataSource.transaction).toHaveBeenCalled();
      });
    });
  });

  describe('Hash Chain Verification', () => {
    describe('verifyIntegrity', () => {
      it('should return valid for empty audit log', async () => {
        mockQueryBuilder.getMany.mockResolvedValue([]);

        const result = await service.verifyIntegrity(mockTenantId);

        expect(result.valid).toBe(true);
        expect(result.totalRecords).toBe(0);
        expect(result.verifiedRecords).toBe(0);
      });

      it('should verify valid hash chain', async () => {
        const timestamp1 = new Date('2024-01-01T10:00:00.000Z');
        const timestamp2 = new Date('2024-01-01T11:00:00.000Z');
        const timestamp3 = new Date('2024-01-01T12:00:00.000Z');

        // Build a valid chain
        const hash1 = service.calculateRecordHash(
          null,
          'create',
          'policy',
          'res-001',
          timestamp1.toISOString(),
          'user-123',
        );

        const hash2 = service.calculateRecordHash(
          hash1,
          'update',
          'policy',
          'res-001',
          timestamp2.toISOString(),
          'user-123',
        );

        const hash3 = service.calculateRecordHash(
          hash2,
          'delete',
          'policy',
          'res-001',
          timestamp3.toISOString(),
          'user-123',
        );

        const mockLogs: Partial<AuditLog>[] = [
          {
            id: 'log-001',
            tenantId: mockTenantId,
            userId: 'user-123',
            action: 'create' as AuditAction,
            resourceType: 'policy' as AuditResourceType,
            resourceId: 'res-001',
            previousHash: null,
            recordHash: hash1,
            createdAt: timestamp1,
          },
          {
            id: 'log-002',
            tenantId: mockTenantId,
            userId: 'user-123',
            action: 'update' as AuditAction,
            resourceType: 'policy' as AuditResourceType,
            resourceId: 'res-001',
            previousHash: hash1,
            recordHash: hash2,
            createdAt: timestamp2,
          },
          {
            id: 'log-003',
            tenantId: mockTenantId,
            userId: 'user-123',
            action: 'delete' as AuditAction,
            resourceType: 'policy' as AuditResourceType,
            resourceId: 'res-001',
            previousHash: hash2,
            recordHash: hash3,
            createdAt: timestamp3,
          },
        ];

        mockQueryBuilder.getMany.mockResolvedValue(mockLogs);

        const result = await service.verifyIntegrity(mockTenantId);

        expect(result.valid).toBe(true);
        expect(result.totalRecords).toBe(3);
        expect(result.verifiedRecords).toBe(3);
        expect(result.firstRecordId).toBe('log-001');
        expect(result.lastRecordId).toBe('log-003');
      });

      it('should detect broken chain link', async () => {
        const timestamp1 = new Date('2024-01-01T10:00:00.000Z');
        const timestamp2 = new Date('2024-01-01T11:00:00.000Z');

        const hash1 = service.calculateRecordHash(
          null,
          'create',
          'policy',
          'res-001',
          timestamp1.toISOString(),
          'user-123',
        );

        const mockLogs: Partial<AuditLog>[] = [
          {
            id: 'log-001',
            tenantId: mockTenantId,
            userId: 'user-123',
            action: 'create' as AuditAction,
            resourceType: 'policy' as AuditResourceType,
            resourceId: 'res-001',
            previousHash: null,
            recordHash: hash1,
            createdAt: timestamp1,
          },
          {
            id: 'log-002',
            tenantId: mockTenantId,
            userId: 'user-123',
            action: 'update' as AuditAction,
            resourceType: 'policy' as AuditResourceType,
            resourceId: 'res-001',
            previousHash: 'wrong-previous-hash', // Broken chain!
            recordHash: 'some-hash',
            createdAt: timestamp2,
          },
        ];

        mockQueryBuilder.getMany.mockResolvedValue(mockLogs);

        const result = await service.verifyIntegrity(mockTenantId);

        expect(result.valid).toBe(false);
        expect(result.verifiedRecords).toBe(1);
        expect(result.brokenAt).toBeDefined();
        expect(result.brokenAt?.id).toBe('log-002');
        expect(result.brokenAt?.expectedHash).toBe(hash1);
        expect(result.brokenAt?.actualHash).toBe('wrong-previous-hash');
      });

      it('should detect tampered record hash', async () => {
        const timestamp1 = new Date('2024-01-01T10:00:00.000Z');
        const timestamp2 = new Date('2024-01-01T11:00:00.000Z');

        const hash1 = service.calculateRecordHash(
          null,
          'create',
          'policy',
          'res-001',
          timestamp1.toISOString(),
          'user-123',
        );

        const mockLogs: Partial<AuditLog>[] = [
          {
            id: 'log-001',
            tenantId: mockTenantId,
            userId: 'user-123',
            action: 'create' as AuditAction,
            resourceType: 'policy' as AuditResourceType,
            resourceId: 'res-001',
            previousHash: null,
            recordHash: hash1,
            createdAt: timestamp1,
          },
          {
            id: 'log-002',
            tenantId: mockTenantId,
            userId: 'user-123',
            action: 'update' as AuditAction,
            resourceType: 'policy' as AuditResourceType,
            resourceId: 'res-001',
            previousHash: hash1,
            recordHash: 'tampered-record-hash', // Record was modified!
            createdAt: timestamp2,
          },
        ];

        mockQueryBuilder.getMany.mockResolvedValue(mockLogs);

        const result = await service.verifyIntegrity(mockTenantId);

        expect(result.valid).toBe(false);
        expect(result.verifiedRecords).toBe(1);
        expect(result.brokenAt?.id).toBe('log-002');
      });

      it('should handle range verification with startId and endId', async () => {
        const timestamp = new Date('2024-01-01T10:00:00.000Z');

        const mockStartLog = {
          id: 'start-id',
          tenantId: mockTenantId,
          createdAt: timestamp,
        };

        mockAuditLogRepository.findOne.mockResolvedValue(
          mockStartLog as AuditLog,
        );
        mockQueryBuilder.getMany.mockResolvedValue([]);

        await service.verifyIntegrity(mockTenantId, 'start-id', 'end-id');

        expect(mockAuditLogRepository.findOne).toHaveBeenCalledWith({
          where: { id: 'start-id', tenantId: mockTenantId },
        });
        expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
      });
    });
  });

  describe('Query Operations', () => {
    describe('findAll', () => {
      it('should return paginated audit logs', async () => {
        const mockLogs = [
          {
            id: 'log-001',
            tenantId: mockTenantId,
            action: 'create',
            resourceType: 'policy',
            createdAt: new Date(),
            previousHash: null,
            recordHash: 'hash-001',
          },
        ];

        mockAuditLogRepository.findAndCount.mockResolvedValue([mockLogs, 1]);

        const result = await service.findAll(mockTenantId, { limit: 50 });

        expect(result.data).toHaveLength(1);
        expect(result.data[0].recordHash).toBe('hash-001');
        expect(result.hasMore).toBe(false);
      });
    });
  });

  describe('Export Operations', () => {
    describe('export', () => {
      it('should export audit logs with hash fields in JSON', async () => {
        const mockLogs = [
          {
            id: 'log-001',
            tenantId: mockTenantId,
            action: 'create',
            resourceType: 'policy',
            createdAt: new Date('2024-01-01'),
            previousHash: null,
            recordHash: 'hash-001',
          },
        ];

        mockAuditLogRepository.find.mockResolvedValue(mockLogs as AuditLog[]);

        const result = await service.export(mockTenantId, 'json');

        expect(result.contentType).toBe('application/json');
        const data = JSON.parse(result.data);
        expect(data[0].recordHash).toBe('hash-001');
        expect(data[0].previousHash).toBeNull();
      });

      it('should export audit logs in CSV format with hash fields', async () => {
        const mockLogs = [
          {
            id: 'log-001',
            tenantId: mockTenantId,
            action: 'create',
            resourceType: 'policy',
            resourceId: 'res-001',
            resourceName: 'Test Policy',
            ipAddress: '192.168.1.1',
            createdAt: new Date('2024-01-01'),
            previousHash: null,
            recordHash: 'hash-001',
          },
        ];

        mockAuditLogRepository.find.mockResolvedValue(mockLogs as AuditLog[]);

        const result = await service.export(mockTenantId, 'csv');

        expect(result.contentType).toBe('text/csv');
        expect(result.data).toContain('Timestamp');
        expect(result.data).toContain('Action');
        // Verify hash fields are included for integrity verification
        expect(result.data).toContain('Previous Hash');
        expect(result.data).toContain('Record Hash');
        expect(result.data).toContain('hash-001');
      });
    });
  });
});
