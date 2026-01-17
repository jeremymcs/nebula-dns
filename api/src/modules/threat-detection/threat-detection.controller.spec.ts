// Nebula DNS - Threat Detection Controller Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ThreatDetectionController } from './threat-detection.controller';
import { ThreatDetectionService } from './threat-detection.service';
import {
  GetRecentThreatsDto,
  GetThreatStatsDto,
  AnalyzeDomainDto,
  ThreatDetectionStatusDto,
  PaginatedThreatsResponseDto,
  ThreatStatsDto,
  DomainAnalysisDto,
} from './dto/threat-detection.dto';

describe('ThreatDetectionController', () => {
  let controller: ThreatDetectionController;
  let service: ThreatDetectionService;

  const mockTenantId = 'tenant-123';

  const mockStatus: ThreatDetectionStatusDto = {
    enabled: true,
    feeds: [
      {
        id: 'dga-detection',
        name: 'DGA Detection Algorithm',
        enabled: true,
        lastUpdated: '2026-01-16T00:00:00.000Z',
        indicatorCount: 0,
      },
      {
        id: 'tunneling-detection',
        name: 'DNS Tunneling Detection',
        enabled: true,
        lastUpdated: '2026-01-16T00:00:00.000Z',
        indicatorCount: 0,
      },
      {
        id: 'c2-detection',
        name: 'C2 Communication Detection',
        enabled: true,
        lastUpdated: '2026-01-16T00:00:00.000Z',
        indicatorCount: 9,
      },
      {
        id: 'exfiltration-detection',
        name: 'Data Exfiltration Detection',
        enabled: true,
        lastUpdated: '2026-01-16T00:00:00.000Z',
        indicatorCount: 0,
      },
    ],
    totalThreatsTracked: 9,
    lastGlobalUpdate: '2026-01-16T00:00:00.000Z',
    threatsDetectedLast24h: 5,
  };

  const mockRecentThreats: PaginatedThreatsResponseDto = {
    data: [
      {
        id: 'threat_123_abc',
        tenantId: mockTenantId,
        type: 'dga',
        severity: 'high',
        domain: 'xkcd123abc.malware.xyz',
        clientIp: '192.168.1.100',
        locationId: 'loc-123',
        details: {
          entropy: 4.5,
          confidence: 0.85,
          reason: 'High entropy: 4.50; Long subdomain: 25 chars',
        },
        timestamp: '2026-01-16T10:00:00.000Z',
      },
      {
        id: 'threat_124_def',
        tenantId: mockTenantId,
        type: 'tunneling',
        severity: 'high',
        domain: 'aGVsbG8gd29ybGQgdGhpcyBpcyBhIHRlc3Q.tunnel.example.com',
        clientIp: '192.168.1.101',
        locationId: 'loc-123',
        details: {
          indicators: [
            'Unusually long subdomain',
            'Base64-like subdomain encoding',
          ],
          subdomainLength: 45,
        },
        timestamp: '2026-01-16T09:30:00.000Z',
      },
    ],
    nextCursor: null,
    total: 2,
  };

  const mockStats: ThreatStatsDto = {
    byCategory: [
      { category: 'dga', count: 10 },
      { category: 'tunneling', count: 5 },
      { category: 'c2', count: 3 },
      { category: 'exfiltration', count: 2 },
    ],
    bySeverity: [
      { severity: 'critical', count: 5 },
      { severity: 'high', count: 10 },
      { severity: 'medium', count: 4 },
      { severity: 'low', count: 1 },
    ],
    byDay: [
      { date: '2026-01-14', count: 5 },
      { date: '2026-01-15', count: 8 },
      { date: '2026-01-16', count: 7 },
    ],
    totalThreats: 20,
    periodStart: '2025-12-17T00:00:00.000Z',
    periodEnd: '2026-01-16T23:59:59.000Z',
  };

  const mockDomainAnalysis: DomainAnalysisDto = {
    domain: 'suspicious-domain.xyz',
    isThreat: true,
    confidence: 70,
    categories: ['dga'],
    severity: 'medium',
    sources: [
      {
        source: 'DGA Detection Algorithm',
        confidence: 70,
        lastSeen: '2026-01-16T12:00:00.000Z',
      },
      {
        source: 'C2 TLD Analysis',
        confidence: 30,
        lastSeen: '2026-01-16T12:00:00.000Z',
      },
    ],
    analysis: {
      entropy: 3.8,
      consonantRatio: 0.65,
      indicators: ['Suspicious TLD: .xyz'],
    },
    analyzedAt: '2026-01-16T12:00:00.000Z',
  };

  const mockThreatDetectionService = {
    getStatus: jest.fn(),
    getRecentThreats: jest.fn(),
    getStats: jest.fn(),
    analyzeDomain: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ThreatDetectionController],
      providers: [
        {
          provide: ThreatDetectionService,
          useValue: mockThreatDetectionService,
        },
      ],
    }).compile();

    controller = module.get<ThreatDetectionController>(
      ThreatDetectionController,
    );
    service = module.get<ThreatDetectionService>(ThreatDetectionService);

    jest.clearAllMocks();
  });

  describe('getStatus', () => {
    it('should return threat detection status', async () => {
      mockThreatDetectionService.getStatus.mockResolvedValue(mockStatus);

      const result = await controller.getStatus(mockTenantId);

      expect(service.getStatus).toHaveBeenCalledWith(mockTenantId);
      expect(result).toEqual(mockStatus);
      expect(result.enabled).toBe(true);
      expect(result.feeds).toHaveLength(4);
    });

    it('should return correct feed information', async () => {
      mockThreatDetectionService.getStatus.mockResolvedValue(mockStatus);

      const result = await controller.getStatus(mockTenantId);

      expect(result.feeds[0].id).toBe('dga-detection');
      expect(result.feeds[0].name).toBe('DGA Detection Algorithm');
      expect(result.feeds[0].enabled).toBe(true);
    });

    it('should return threats detected in last 24 hours', async () => {
      mockThreatDetectionService.getStatus.mockResolvedValue(mockStatus);

      const result = await controller.getStatus(mockTenantId);

      expect(result.threatsDetectedLast24h).toBe(5);
    });
  });

  describe('getRecentThreats', () => {
    it('should return paginated recent threats', async () => {
      mockThreatDetectionService.getRecentThreats.mockResolvedValue(
        mockRecentThreats,
      );

      const query: GetRecentThreatsDto = { limit: 50 };
      const result = await controller.getRecentThreats(mockTenantId, query);

      expect(service.getRecentThreats).toHaveBeenCalledWith(
        mockTenantId,
        query,
      );
      expect(result).toEqual(mockRecentThreats);
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter threats by severity', async () => {
      const filteredResponse: PaginatedThreatsResponseDto = {
        data: [mockRecentThreats.data[0]],
        nextCursor: null,
        total: 1,
      };
      mockThreatDetectionService.getRecentThreats.mockResolvedValue(
        filteredResponse,
      );

      const query: GetRecentThreatsDto = { severity: 'high' };
      const result = await controller.getRecentThreats(mockTenantId, query);

      expect(service.getRecentThreats).toHaveBeenCalledWith(
        mockTenantId,
        query,
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0].severity).toBe('high');
    });

    it('should filter threats by category', async () => {
      const filteredResponse: PaginatedThreatsResponseDto = {
        data: [mockRecentThreats.data[0]],
        nextCursor: null,
        total: 1,
      };
      mockThreatDetectionService.getRecentThreats.mockResolvedValue(
        filteredResponse,
      );

      const query: GetRecentThreatsDto = { category: 'dga' };
      const result = await controller.getRecentThreats(mockTenantId, query);

      expect(service.getRecentThreats).toHaveBeenCalledWith(
        mockTenantId,
        query,
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe('dga');
    });

    it('should filter threats by date range', async () => {
      mockThreatDetectionService.getRecentThreats.mockResolvedValue(
        mockRecentThreats,
      );

      const query: GetRecentThreatsDto = {
        startDate: '2026-01-15T00:00:00.000Z',
        endDate: '2026-01-16T23:59:59.000Z',
      };
      const result = await controller.getRecentThreats(mockTenantId, query);

      expect(service.getRecentThreats).toHaveBeenCalledWith(
        mockTenantId,
        query,
      );
      expect(result).toEqual(mockRecentThreats);
    });

    it('should handle pagination with cursor', async () => {
      const paginatedResponse: PaginatedThreatsResponseDto = {
        data: [mockRecentThreats.data[1]],
        nextCursor: null,
        total: 2,
      };
      mockThreatDetectionService.getRecentThreats.mockResolvedValue(
        paginatedResponse,
      );

      const query: GetRecentThreatsDto = {
        limit: 1,
        cursor: 'threat_123_abc',
      };
      const result = await controller.getRecentThreats(mockTenantId, query);

      expect(service.getRecentThreats).toHaveBeenCalledWith(
        mockTenantId,
        query,
      );
      expect(result.data).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
    });

    it('should return empty list when no threats found', async () => {
      const emptyResponse: PaginatedThreatsResponseDto = {
        data: [],
        nextCursor: null,
        total: 0,
      };
      mockThreatDetectionService.getRecentThreats.mockResolvedValue(
        emptyResponse,
      );

      const query: GetRecentThreatsDto = {};
      const result = await controller.getRecentThreats(mockTenantId, query);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return threat statistics', async () => {
      mockThreatDetectionService.getStats.mockResolvedValue(mockStats);

      const query: GetThreatStatsDto = {};
      const result = await controller.getStats(mockTenantId, query);

      expect(service.getStats).toHaveBeenCalledWith(mockTenantId, query);
      expect(result).toEqual(mockStats);
      expect(result.totalThreats).toBe(20);
    });

    it('should return stats grouped by category', async () => {
      mockThreatDetectionService.getStats.mockResolvedValue(mockStats);

      const query: GetThreatStatsDto = { groupBy: 'category' };
      const result = await controller.getStats(mockTenantId, query);

      expect(result.byCategory).toHaveLength(4);
      expect(result.byCategory[0].category).toBe('dga');
      expect(result.byCategory[0].count).toBe(10);
    });

    it('should return stats grouped by severity', async () => {
      mockThreatDetectionService.getStats.mockResolvedValue(mockStats);

      const query: GetThreatStatsDto = { groupBy: 'severity' };
      const result = await controller.getStats(mockTenantId, query);

      expect(result.bySeverity).toHaveLength(4);
      expect(result.bySeverity[0].severity).toBe('critical');
    });

    it('should return stats grouped by day', async () => {
      mockThreatDetectionService.getStats.mockResolvedValue(mockStats);

      const query: GetThreatStatsDto = { groupBy: 'day' };
      const result = await controller.getStats(mockTenantId, query);

      expect(result.byDay).toHaveLength(3);
      expect(result.byDay[0].date).toBe('2026-01-14');
    });

    it('should filter stats by date range', async () => {
      const filteredStats: ThreatStatsDto = {
        ...mockStats,
        totalThreats: 7,
        byDay: [{ date: '2026-01-16', count: 7 }],
      };
      mockThreatDetectionService.getStats.mockResolvedValue(filteredStats);

      const query: GetThreatStatsDto = {
        startDate: '2026-01-16T00:00:00.000Z',
        endDate: '2026-01-16T23:59:59.000Z',
      };
      const result = await controller.getStats(mockTenantId, query);

      expect(service.getStats).toHaveBeenCalledWith(mockTenantId, query);
      expect(result.totalThreats).toBe(7);
    });

    it('should return empty stats when no threats in period', async () => {
      const emptyStats: ThreatStatsDto = {
        byCategory: [],
        bySeverity: [],
        byDay: [],
        totalThreats: 0,
        periodStart: '2020-01-01T00:00:00.000Z',
        periodEnd: '2020-01-31T23:59:59.000Z',
      };
      mockThreatDetectionService.getStats.mockResolvedValue(emptyStats);

      const query: GetThreatStatsDto = {
        startDate: '2020-01-01T00:00:00.000Z',
        endDate: '2020-01-31T23:59:59.000Z',
      };
      const result = await controller.getStats(mockTenantId, query);

      expect(result.totalThreats).toBe(0);
      expect(result.byCategory).toHaveLength(0);
    });
  });

  describe('analyzeDomain', () => {
    it('should analyze a domain and return threat information', async () => {
      mockThreatDetectionService.analyzeDomain.mockResolvedValue(
        mockDomainAnalysis,
      );

      const body: AnalyzeDomainDto = { domain: 'suspicious-domain.xyz' };
      const result = await controller.analyzeDomain(mockTenantId, body);

      expect(service.analyzeDomain).toHaveBeenCalledWith(
        mockTenantId,
        body.domain,
      );
      expect(result).toEqual(mockDomainAnalysis);
      expect(result.isThreat).toBe(true);
      expect(result.confidence).toBe(70);
    });

    it('should return clean analysis for benign domain', async () => {
      const cleanAnalysis: DomainAnalysisDto = {
        domain: 'google.com',
        isThreat: false,
        confidence: 0,
        categories: [],
        severity: null,
        sources: [],
        analysis: {},
        analyzedAt: '2026-01-16T12:00:00.000Z',
      };
      mockThreatDetectionService.analyzeDomain.mockResolvedValue(cleanAnalysis);

      const body: AnalyzeDomainDto = { domain: 'google.com' };
      const result = await controller.analyzeDomain(mockTenantId, body);

      expect(result.isThreat).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.categories).toHaveLength(0);
      expect(result.severity).toBeNull();
    });

    it('should detect DGA domains', async () => {
      const dgaAnalysis: DomainAnalysisDto = {
        domain: 'xkcd123abcdefghij.malware.com',
        isThreat: true,
        confidence: 85,
        categories: ['dga'],
        severity: 'high',
        sources: [
          {
            source: 'DGA Detection Algorithm',
            confidence: 85,
            lastSeen: '2026-01-16T12:00:00.000Z',
          },
        ],
        analysis: {
          entropy: 4.5,
          consonantRatio: 0.75,
        },
        analyzedAt: '2026-01-16T12:00:00.000Z',
      };
      mockThreatDetectionService.analyzeDomain.mockResolvedValue(dgaAnalysis);

      const body: AnalyzeDomainDto = {
        domain: 'xkcd123abcdefghij.malware.com',
      };
      const result = await controller.analyzeDomain(mockTenantId, body);

      expect(result.categories).toContain('dga');
      expect(result.severity).toBe('high');
      expect(result.analysis.entropy).toBeGreaterThan(4);
    });

    it('should detect tunneling domains', async () => {
      const tunnelingAnalysis: DomainAnalysisDto = {
        domain: 'aGVsbG8gd29ybGQgdGhpcyBpcyBhIHRlc3Q.tunnel.example.com',
        isThreat: true,
        confidence: 80,
        categories: ['tunneling'],
        severity: 'high',
        sources: [
          {
            source: 'DNS Tunneling Detection',
            confidence: 80,
            lastSeen: '2026-01-16T12:00:00.000Z',
          },
        ],
        analysis: {
          subdomainLength: 45,
          indicators: [
            'Unusually long subdomain',
            'Base64-like subdomain encoding',
          ],
        },
        analyzedAt: '2026-01-16T12:00:00.000Z',
      };
      mockThreatDetectionService.analyzeDomain.mockResolvedValue(
        tunnelingAnalysis,
      );

      const body: AnalyzeDomainDto = {
        domain: 'aGVsbG8gd29ybGQgdGhpcyBpcyBhIHRlc3Q.tunnel.example.com',
      };
      const result = await controller.analyzeDomain(mockTenantId, body);

      expect(result.categories).toContain('tunneling');
      expect(result.analysis.indicators).toContain('Unusually long subdomain');
    });

    it('should detect domains with suspicious TLDs', async () => {
      const suspiciousAnalysis: DomainAnalysisDto = {
        domain: 'random-site.tk',
        isThreat: false,
        confidence: 30,
        categories: [],
        severity: null,
        sources: [
          {
            source: 'C2 TLD Analysis',
            confidence: 30,
            lastSeen: '2026-01-16T12:00:00.000Z',
          },
        ],
        analysis: {
          indicators: ['Suspicious TLD: .tk'],
        },
        analyzedAt: '2026-01-16T12:00:00.000Z',
      };
      mockThreatDetectionService.analyzeDomain.mockResolvedValue(
        suspiciousAnalysis,
      );

      const body: AnalyzeDomainDto = { domain: 'random-site.tk' };
      const result = await controller.analyzeDomain(mockTenantId, body);

      expect(result.confidence).toBe(30);
      expect(result.analysis.indicators).toContain('Suspicious TLD: .tk');
    });

    it('should handle domain analysis errors', async () => {
      mockThreatDetectionService.analyzeDomain.mockRejectedValue(
        new BadRequestException('Invalid domain format'),
      );

      const body: AnalyzeDomainDto = { domain: 'invalid..domain' };

      await expect(
        controller.analyzeDomain(mockTenantId, body),
      ).rejects.toThrow(BadRequestException);
    });

    it('should include multiple threat categories when applicable', async () => {
      const multiCategoryAnalysis: DomainAnalysisDto = {
        domain: 'abc123def456ghi789jkl.exfil.xyz',
        isThreat: true,
        confidence: 90,
        categories: ['dga', 'exfiltration'],
        severity: 'critical',
        sources: [
          {
            source: 'DGA Detection Algorithm',
            confidence: 75,
            lastSeen: '2026-01-16T12:00:00.000Z',
          },
          {
            source: 'Data Exfiltration Detection',
            confidence: 90,
            lastSeen: '2026-01-16T12:00:00.000Z',
          },
        ],
        analysis: {
          entropy: 4.2,
          indicators: ['Large subdomain data', 'Suspicious TLD: .xyz'],
        },
        analyzedAt: '2026-01-16T12:00:00.000Z',
      };
      mockThreatDetectionService.analyzeDomain.mockResolvedValue(
        multiCategoryAnalysis,
      );

      const body: AnalyzeDomainDto = {
        domain: 'abc123def456ghi789jkl.exfil.xyz',
      };
      const result = await controller.analyzeDomain(mockTenantId, body);

      expect(result.categories).toContain('dga');
      expect(result.categories).toContain('exfiltration');
      expect(result.severity).toBe('critical');
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const error = new Error('Service unavailable');
      mockThreatDetectionService.getStatus.mockRejectedValue(error);

      await expect(controller.getStatus(mockTenantId)).rejects.toThrow(
        'Service unavailable',
      );
    });

    it('should propagate validation errors', async () => {
      mockThreatDetectionService.analyzeDomain.mockRejectedValue(
        new BadRequestException('Domain is required'),
      );

      const body: AnalyzeDomainDto = { domain: '' } as AnalyzeDomainDto;

      await expect(
        controller.analyzeDomain(mockTenantId, body),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Response Format', () => {
    it('should return consistent timestamp format', async () => {
      mockThreatDetectionService.getRecentThreats.mockResolvedValue(
        mockRecentThreats,
      );

      const query: GetRecentThreatsDto = {};
      const result = await controller.getRecentThreats(mockTenantId, query);

      result.data.forEach((threat) => {
        expect(threat.timestamp).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        );
      });
    });

    it('should return correct data types in response', async () => {
      mockThreatDetectionService.analyzeDomain.mockResolvedValue(
        mockDomainAnalysis,
      );

      const body: AnalyzeDomainDto = { domain: 'test.xyz' };
      const result = await controller.analyzeDomain(mockTenantId, body);

      expect(typeof result.domain).toBe('string');
      expect(typeof result.isThreat).toBe('boolean');
      expect(typeof result.confidence).toBe('number');
      expect(Array.isArray(result.categories)).toBe(true);
      expect(Array.isArray(result.sources)).toBe(true);
    });
  });
});
