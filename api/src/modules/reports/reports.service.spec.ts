// Nebula DNS - Reports Service Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ReportsService } from './reports.service';
import { ClickHouseService } from '../clickhouse/clickhouse.service';
import { UsersService } from '../users/users.service';
import { PoliciesService } from '../policies/policies.service';
import { LocationsService } from '../locations/locations.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let clickhouseService: jest.Mocked<ClickHouseService>;
  let usersService: jest.Mocked<UsersService>;
  let policiesService: jest.Mocked<PoliciesService>;
  let locationsService: jest.Mocked<LocationsService>;

  const mockTenantId = 'tenant-123';

  const mockClickHouseService = {
    getSummaryStats: jest.fn(),
    getTopBlocked: jest.fn(),
    getBlocksByCategory: jest.fn(),
    getThreatTrends: jest.fn(),
    getLocationStats: jest.fn(),
    getQueryLogs: jest.fn(),
    getQueryTrends: jest.fn(),
    getHeatmapData: jest.fn(),
    getConnectionStatus: jest.fn(),
  };

  const mockUsersService = {
    findAll: jest.fn(),
  };

  const mockPoliciesService = {
    findAll: jest.fn(),
  };

  const mockLocationsService = {
    findAll: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: ClickHouseService,
          useValue: mockClickHouseService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: PoliciesService,
          useValue: mockPoliciesService,
        },
        {
          provide: LocationsService,
          useValue: mockLocationsService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    clickhouseService = module.get(ClickHouseService);
    usersService = module.get(UsersService);
    policiesService = module.get(PoliciesService);
    locationsService = module.get(LocationsService);

    jest.clearAllMocks();
  });

  describe('getSummary', () => {
    it('should return summary statistics', async () => {
      mockClickHouseService.getSummaryStats.mockResolvedValue({
        totalQueries: 10000,
        blockedQueries: 500,
        blockRate: '5.0',
        threatsBlocked: 150,
        avgResponseTime: 12,
        cacheHitRate: '85.5',
        uniqueClients: 25,
      });

      const result = await service.getSummary(mockTenantId, { period: '7d' });

      expect(result.totalQueries).toBe(10000);
      expect(result.blockedQueries).toBe(500);
      expect(result.allowedQueries).toBe(9500);
      expect(result.blockRate).toBe(5.0);
      expect(result.threatsBlocked).toBe(150);
      expect(result.avgResponseTime).toBe(12);
      expect(result.cacheHitRate).toBe(85.5);
    });

    it('should handle different time periods', async () => {
      mockClickHouseService.getSummaryStats.mockResolvedValue({
        totalQueries: 1000,
        blockedQueries: 50,
        blockRate: '5.0',
        threatsBlocked: 10,
        avgResponseTime: 15,
        cacheHitRate: '80.0',
        uniqueClients: 10,
      });

      await service.getSummary(mockTenantId, { period: '24h' });

      expect(mockClickHouseService.getSummaryStats).toHaveBeenCalledWith(
        mockTenantId,
        '24h',
      );
    });
  });

  describe('getTopBlocked', () => {
    it('should return top blocked domains', async () => {
      mockClickHouseService.getTopBlocked.mockResolvedValue([
        { domain: 'malware.com', count: '100', category: 'malware' },
        { domain: 'phishing.com', count: '50', category: 'phishing' },
      ]);

      const result = await service.getTopBlocked(mockTenantId, {
        period: '7d',
      });

      expect(result).toHaveLength(2);
      expect(result[0].domain).toBe('malware.com');
      expect(result[0].count).toBe(100);
      expect(result[0].category).toBe('malware');
    });

    it('should respect limit parameter', async () => {
      mockClickHouseService.getTopBlocked.mockResolvedValue([]);

      await service.getTopBlocked(mockTenantId, { period: '7d', limit: 5 });

      expect(mockClickHouseService.getTopBlocked).toHaveBeenCalledWith(
        mockTenantId,
        '7d',
        5,
      );
    });
  });

  describe('getBlocksByCategory', () => {
    it('should return category statistics', async () => {
      mockClickHouseService.getBlocksByCategory.mockResolvedValue([
        { category: 'malware', count: 100, percentage: 50 },
        { category: 'phishing', count: 50, percentage: 25 },
        { category: 'adult', count: 50, percentage: 25 },
      ]);

      const result = await service.getBlocksByCategory(mockTenantId, {
        period: '7d',
      });

      expect(result).toHaveLength(3);
      expect(result[0].category).toBe('malware');
      expect(result[0].count).toBe(100);
    });
  });

  describe('getThreatTrends', () => {
    it('should return threat trends and heatmap data', async () => {
      mockClickHouseService.getThreatTrends.mockResolvedValue([
        { hour: '2024-01-01T00:00:00Z', threat_count: '50' },
        { hour: '2024-01-01T01:00:00Z', threat_count: '75' },
      ]);

      mockClickHouseService.getTopBlocked.mockResolvedValue([
        { domain: 'malware.com', count: '100', category: 'malware' },
      ]);

      mockClickHouseService.getHeatmapData.mockResolvedValue([
        { hour: 0, day: 0, value: 50 },
        { hour: 1, day: 0, value: 75 },
      ]);

      const result = await service.getThreatTrends(mockTenantId, {
        period: '7d',
      });

      expect(result.threats).toBeDefined();
      expect(result.heatmap).toBeDefined();
      expect(result.trends).toBeDefined();
      expect(result.threats[0].domain).toBe('malware.com');
    });

    it('should generate mock data when no real data available', async () => {
      mockClickHouseService.getThreatTrends.mockResolvedValue([]);
      mockClickHouseService.getTopBlocked.mockResolvedValue([]);
      mockClickHouseService.getHeatmapData.mockResolvedValue([]);

      const result = await service.getThreatTrends(mockTenantId, {
        period: '7d',
      });

      expect(result.trends).toBeDefined();
      expect(result.trends.length).toBeGreaterThan(0);
      expect(result.heatmap).toBeDefined();
    });
  });

  describe('getLocationStats', () => {
    it('should return statistics by location', async () => {
      mockClickHouseService.getLocationStats.mockResolvedValue([
        {
          locationId: 'loc-1',
          locationName: 'Office',
          totalQueries: 5000,
          blockedQueries: 250,
          blockRate: 5.0,
        },
        {
          locationId: 'loc-2',
          locationName: 'Remote',
          totalQueries: 3000,
          blockedQueries: 150,
          blockRate: 5.0,
        },
      ]);

      const result = await service.getLocationStats(mockTenantId, {
        period: '7d',
      });

      expect(result).toHaveLength(2);
      expect(result[0].locationName).toBe('Office');
      expect(result[0].totalQueries).toBe(5000);
    });
  });

  describe('getQueryLogs', () => {
    it('should return paginated query logs', async () => {
      mockClickHouseService.getQueryLogs.mockResolvedValue({
        data: [
          {
            id: 'log-1',
            domain: 'example.com',
            action: 'allow',
            timestamp: new Date(),
          },
        ],
        pagination: { cursor: null, hasMore: false },
        total: 1,
      });

      const result = await service.getQueryLogs(mockTenantId, { limit: 50 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should pass filter parameters to ClickHouse', async () => {
      mockClickHouseService.getQueryLogs.mockResolvedValue({
        data: [],
        pagination: { cursor: null, hasMore: false },
        total: 0,
      });

      await service.getQueryLogs(mockTenantId, {
        domain: 'example.com',
        action: 'block',
        locationId: 'loc-123',
      });

      expect(mockClickHouseService.getQueryLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockTenantId,
          domain: 'example.com',
          action: 'block',
          locationId: 'loc-123',
        }),
      );
    });
  });

  describe('getQueryTrends', () => {
    it('should return query trends over time', async () => {
      mockClickHouseService.getQueryTrends.mockResolvedValue([
        {
          timestamp: '2024-01-01T00:00:00Z',
          total: 1000,
          allowed: 950,
          blocked: 50,
        },
        {
          timestamp: '2024-01-01T01:00:00Z',
          total: 1200,
          allowed: 1140,
          blocked: 60,
        },
      ]);

      const result = await service.getQueryTrends(mockTenantId, {
        period: '7d',
      });

      expect(result).toHaveLength(2);
      expect(result[0].total).toBe(1000);
      expect(result[0].blocked).toBe(50);
    });
  });

  describe('getInsights', () => {
    it('should generate insights with highlights and recommendations', async () => {
      mockClickHouseService.getSummaryStats
        .mockResolvedValueOnce({
          totalQueries: 10000,
          blockedQueries: 500,
          blockRate: '5.0',
          threatsBlocked: 150,
          avgResponseTime: 12,
          cacheHitRate: '85.5',
          uniqueClients: 25,
        })
        .mockResolvedValueOnce({
          totalQueries: 8000,
          blockedQueries: 600,
          blockRate: '7.5',
          threatsBlocked: 200,
          avgResponseTime: 15,
          cacheHitRate: '80.0',
          uniqueClients: 20,
        });

      mockClickHouseService.getTopBlocked.mockResolvedValue([
        { domain: 'malware.com', count: '100', category: 'malware' },
      ]);

      const result = await service.getInsights(mockTenantId, { period: '7d' });

      expect(result.summary).toBeDefined();
      expect(result.highlights).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.trends).toBeDefined();
      expect(result.highlights.length).toBeGreaterThan(0);
    });

    it('should recommend policy review when block rate is high', async () => {
      mockClickHouseService.getSummaryStats.mockResolvedValue({
        totalQueries: 10000,
        blockedQueries: 1500,
        blockRate: '15.0',
        threatsBlocked: 100,
        avgResponseTime: 12,
        cacheHitRate: '85.5',
        uniqueClients: 25,
      });

      mockClickHouseService.getTopBlocked.mockResolvedValue([]);

      const result = await service.getInsights(mockTenantId, { period: '7d' });

      const reviewRecommendation = result.recommendations.find(
        (r: any) => r.id === 'review-policies',
      );
      expect(reviewRecommendation).toBeDefined();
      expect(reviewRecommendation?.priority).toBe('high');
    });
  });

  describe('getSecurityScore', () => {
    it('should calculate security score from multiple factors', async () => {
      mockClickHouseService.getSummaryStats.mockResolvedValue({
        totalQueries: 10000,
        blockedQueries: 500,
        blockRate: '5.0',
        threatsBlocked: 150,
        avgResponseTime: 12,
        cacheHitRate: '85.5',
        uniqueClients: 25,
      });

      mockUsersService.findAll.mockResolvedValue({
        data: [
          { id: 'user-1', mfaEnabled: true },
          { id: 'user-2', mfaEnabled: true },
        ],
        total: 2,
      });

      mockPoliciesService.findAll.mockResolvedValue({
        data: [
          {
            id: 'policy-1',
            isActive: true,
            threatCategories: ['malware', 'phishing'],
          },
        ],
        total: 1,
      });

      mockLocationsService.findAll.mockResolvedValue({
        data: [
          { id: 'loc-1', isActive: true, policyId: 'policy-1' },
          { id: 'loc-2', isActive: true, policyId: 'policy-1' },
        ],
        total: 2,
      });

      const result = await service.getSecurityScore(mockTenantId);

      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.grade).toMatch(/[A-F]/);
      expect(result.factors).toBeDefined();
      expect(result.achievements).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should give full MFA score when all users have MFA', async () => {
      mockClickHouseService.getSummaryStats.mockResolvedValue({
        totalQueries: 10000,
        blockedQueries: 500,
        blockRate: '5.0',
        threatsBlocked: 150,
        avgResponseTime: 12,
        cacheHitRate: '85.5',
        uniqueClients: 25,
      });

      mockUsersService.findAll.mockResolvedValue({
        data: [
          { id: 'user-1', mfaEnabled: true },
          { id: 'user-2', mfaEnabled: true },
        ],
        total: 2,
      });

      mockPoliciesService.findAll.mockResolvedValue({ data: [], total: 0 });
      mockLocationsService.findAll.mockResolvedValue({ data: [], total: 0 });

      const result = await service.getSecurityScore(mockTenantId);

      const mfaFactor = result.factors.find((f: any) => f.id === 'mfa');
      expect(mfaFactor?.score).toBe(15);
      expect(mfaFactor?.status).toBe('good');
    });

    it('should recommend MFA when adoption is low', async () => {
      mockClickHouseService.getSummaryStats.mockResolvedValue({
        totalQueries: 0,
        blockedQueries: 0,
        blockRate: '0',
        threatsBlocked: 0,
        avgResponseTime: 0,
        cacheHitRate: '0',
        uniqueClients: 0,
      });

      mockUsersService.findAll.mockResolvedValue({
        data: [
          { id: 'user-1', mfaEnabled: false },
          { id: 'user-2', mfaEnabled: false },
        ],
        total: 2,
      });

      mockPoliciesService.findAll.mockResolvedValue({ data: [], total: 0 });
      mockLocationsService.findAll.mockResolvedValue({ data: [], total: 0 });

      const result = await service.getSecurityScore(mockTenantId);

      const mfaRecommendation = result.recommendations.find(
        (r: any) => r.id === 'mfa',
      );
      expect(mfaRecommendation).toBeDefined();
      expect(mfaRecommendation?.priority).toBe('high');
    });
  });

  describe('investigateDomain', () => {
    it('should return domain investigation results', async () => {
      mockClickHouseService.getQueryLogs.mockResolvedValue({
        data: [
          {
            id: 'log-1',
            domain: 'suspicious.com',
            action: 'block',
            timestamp: new Date('2024-01-01'),
          },
          {
            id: 'log-2',
            domain: 'suspicious.com',
            action: 'block',
            timestamp: new Date('2024-01-02'),
          },
        ],
        pagination: { cursor: null, hasMore: false },
        total: 2,
      });

      const result = await service.investigateDomain(
        mockTenantId,
        'suspicious.com',
      );

      expect(result.domain).toBe('suspicious.com');
      expect(result.queryCount).toBe(2);
      expect(result.firstSeen).toBeDefined();
      expect(result.lastSeen).toBeDefined();
      expect(result.actions).toBeDefined();
    });
  });

  describe('getDataStatus', () => {
    it('should return ClickHouse connection status', () => {
      mockClickHouseService.getConnectionStatus.mockReturnValue({
        connected: true,
        usingMockData: false,
      });

      const result = service.getDataStatus();

      expect(result.source).toBe('clickhouse');
      expect(result.connected).toBe(true);
      expect(result.usingMockData).toBe(false);
    });

    it('should indicate when using mock data', () => {
      mockClickHouseService.getConnectionStatus.mockReturnValue({
        connected: false,
        usingMockData: true,
      });

      const result = service.getDataStatus();

      expect(result.source).toBe('mock');
      expect(result.connected).toBe(false);
      expect(result.usingMockData).toBe(true);
    });
  });

  describe('getDateRange', () => {
    it('should calculate date range for 24h period', () => {
      const result = (service as any).getDateRange({ period: '24h' });

      expect(result.startDate).toBeDefined();
      expect(result.endDate).toBeDefined();

      const start = new Date(result.startDate);
      const end = new Date(result.endDate);
      const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeCloseTo(24, 0);
    });

    it('should calculate date range for 7d period', () => {
      const result = (service as any).getDateRange({ period: '7d' });

      const start = new Date(result.startDate);
      const end = new Date(result.endDate);
      const diffDays =
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeCloseTo(7, 0);
    });

    it('should use custom date range when provided', () => {
      const startDate = '2024-01-01T00:00:00Z';
      const endDate = '2024-01-31T23:59:59Z';

      const result = (service as any).getDateRange({
        period: 'custom',
        startDate,
        endDate,
      });

      expect(result.startDate).toBe(new Date(startDate).toISOString());
      expect(result.endDate).toBe(new Date(endDate).toISOString());
    });
  });
});
