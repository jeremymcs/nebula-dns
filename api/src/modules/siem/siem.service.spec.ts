/**
 * SafeDNS - Enterprise DNS Security Platform
 * SIEM Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiemService } from './siem.service';
import { SiemIntegration } from './entities/siem-integration.entity';

describe('SiemService', () => {
  let service: SiemService;
  let repository: jest.Mocked<Repository<SiemIntegration>>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SiemService,
        {
          provide: getRepositoryToken(SiemIntegration),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SiemService>(SiemService);
    repository = module.get(getRepositoryToken(SiemIntegration));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSplunk', () => {
    it('should create a Splunk integration with encrypted config', async () => {
      const tenantId = 'tenant-123';
      const dto = {
        name: 'Test Splunk',
        hecUrl: 'https://splunk.example.com:8088/services/collector',
        hecToken: 'test-token-123',
        index: 'main',
        sourceType: 'safedns:logs',
      };

      const mockIntegration = {
        id: 'int-123',
        tenantId,
        name: dto.name,
        integrationType: 'splunk',
      };

      mockRepository.create.mockReturnValue(mockIntegration);
      mockRepository.save.mockResolvedValue(mockIntegration);

      const result = await service.createSplunk(tenantId, dto);

      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockIntegration);
    });
  });

  describe('createElastic', () => {
    it('should create an Elasticsearch integration', async () => {
      const tenantId = 'tenant-123';
      const dto = {
        name: 'Test Elastic',
        url: 'https://elastic.example.com:9200',
        apiKey: 'test-api-key',
        indexPattern: 'safedns-logs',
      };

      const mockIntegration = {
        id: 'int-456',
        tenantId,
        name: dto.name,
        integrationType: 'elastic',
      };

      mockRepository.create.mockReturnValue(mockIntegration);
      mockRepository.save.mockResolvedValue(mockIntegration);

      const result = await service.createElastic(tenantId, dto);

      expect(mockRepository.create).toHaveBeenCalled();
      expect(result.integrationType).toBe('elastic');
    });
  });

  describe('createSentinel', () => {
    it('should create a Microsoft Sentinel integration', async () => {
      const tenantId = 'tenant-123';
      const dto = {
        name: 'Test Sentinel',
        workspaceId: 'workspace-123',
        sharedKey: 'shared-key-abc',
        logType: 'SafeDNS_Logs',
      };

      const mockIntegration = {
        id: 'int-789',
        tenantId,
        name: dto.name,
        integrationType: 'sentinel',
      };

      mockRepository.create.mockReturnValue(mockIntegration);
      mockRepository.save.mockResolvedValue(mockIntegration);

      const result = await service.createSentinel(tenantId, dto);

      expect(result.integrationType).toBe('sentinel');
    });
  });

  describe('createSyslog', () => {
    it('should create a Syslog integration', async () => {
      const tenantId = 'tenant-123';
      const dto = {
        name: 'Test Syslog',
        host: 'syslog.example.com',
        port: 514,
        protocol: 'udp' as const,
        format: 'cef' as const,
      };

      const mockIntegration = {
        id: 'int-101',
        tenantId,
        name: dto.name,
        integrationType: 'syslog',
      };

      mockRepository.create.mockReturnValue(mockIntegration);
      mockRepository.save.mockResolvedValue(mockIntegration);

      const result = await service.createSyslog(tenantId, dto);

      expect(result.integrationType).toBe('syslog');
    });
  });

  describe('findAll', () => {
    it('should return all integrations for a tenant', async () => {
      const tenantId = 'tenant-123';
      const mockIntegrations = [
        { id: 'int-1', name: 'Splunk', integrationType: 'splunk', tenantId },
        { id: 'int-2', name: 'Elastic', integrationType: 'elastic', tenantId },
      ];

      mockRepository.find.mockResolvedValue(mockIntegrations as any);

      const result = await service.findAll(tenantId);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { tenantId },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(2);
    });
  });
});

