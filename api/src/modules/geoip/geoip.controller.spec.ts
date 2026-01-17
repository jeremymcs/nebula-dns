// Nebula DNS - GeoIP Controller Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { GeoIPController } from './geoip.controller';
import { GeoIPService, GeoLocation } from './geoip.service';
import { ClickHouseService } from '../clickhouse/clickhouse.service';
import { IpValidationPipe } from './pipes/ip-validation.pipe';
import { GeoIPStatus, RefreshResult } from './dto/geoip.dto';

describe('GeoIPController', () => {
  let controller: GeoIPController;
  let geoIPService: GeoIPService;
  let clickhouseService: ClickHouseService;
  let ipValidationPipe: IpValidationPipe;

  const mockGeoLocation: GeoLocation = {
    country: 'United States',
    countryCode: 'US',
    region: 'California',
    city: 'San Francisco',
    latitude: 37.7749,
    longitude: -122.4194,
    timezone: 'America/Los_Angeles',
    isp: 'Google LLC',
    org: 'Google',
  };

  const mockPrivateLocation: GeoLocation = {
    country: 'Local Network',
    countryCode: 'LO',
    region: '',
    city: 'Private',
    latitude: 0,
    longitude: 0,
    timezone: 'UTC',
  };

  const mockDatabaseStatus: GeoIPStatus = {
    databaseVersion: '2026.01.15',
    lastUpdate: '2026-01-15T00:00:00.000Z',
    recordCount: 3500000,
    databaseType: 'GeoLite2-City',
    isLoaded: true,
    databasePath: '/usr/share/GeoIP/GeoLite2-City.mmdb',
  };

  const mockRefreshResult: RefreshResult = {
    success: true,
    newVersion: '2026.01.16',
    previousVersion: '2026.01.15',
    recordsUpdated: 15000,
    refreshedAt: '2026-01-16T10:30:00.000Z',
  };

  const mockGeoIPService = {
    lookup: jest.fn(),
    getDatabaseStatus: jest.fn(),
    refreshDatabase: jest.fn(),
    getQueryLocations: jest.fn(),
  };

  const mockClickHouseService = {
    getClientIPStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeoIPController],
      providers: [
        {
          provide: GeoIPService,
          useValue: mockGeoIPService,
        },
        {
          provide: ClickHouseService,
          useValue: mockClickHouseService,
        },
      ],
    }).compile();

    controller = module.get<GeoIPController>(GeoIPController);
    geoIPService = module.get<GeoIPService>(GeoIPService);
    clickhouseService = module.get<ClickHouseService>(ClickHouseService);
    ipValidationPipe = new IpValidationPipe();

    jest.clearAllMocks();
  });

  describe('lookupIP', () => {
    it('should return geolocation data for a valid IPv4 address', async () => {
      mockGeoIPService.lookup.mockReturnValue(mockGeoLocation);

      const result = await controller.lookupIP('8.8.8.8');

      expect(geoIPService.lookup).toHaveBeenCalledWith('8.8.8.8');
      expect(result.ip).toBe('8.8.8.8');
      expect(result.data.country).toBe('United States');
      expect(result.data.countryCode).toBe('US');
      expect(result.data.city).toBe('San Francisco');
      expect(result.data.coordinates.latitude).toBe(37.7749);
      expect(result.data.coordinates.longitude).toBe(-122.4194);
      expect(result.timestamp).toBeDefined();
    });

    it('should return geolocation data for a valid IPv6 address', async () => {
      mockGeoIPService.lookup.mockReturnValue(mockGeoLocation);

      const result = await controller.lookupIP('2001:4860:4860::8888');

      expect(geoIPService.lookup).toHaveBeenCalledWith('2001:4860:4860::8888');
      expect(result.ip).toBe('2001:4860:4860::8888');
      expect(result.data.country).toBe('United States');
    });

    it('should return local network data for private IP addresses', async () => {
      mockGeoIPService.lookup.mockReturnValue(mockPrivateLocation);

      const result = await controller.lookupIP('192.168.1.1');

      expect(geoIPService.lookup).toHaveBeenCalledWith('192.168.1.1');
      expect(result.data.country).toBe('Local Network');
      expect(result.data.countryCode).toBe('LO');
      expect(result.data.city).toBe('Private');
    });

    it('should handle null lookup result gracefully', async () => {
      mockGeoIPService.lookup.mockReturnValue(null);

      const result = await controller.lookupIP('1.2.3.4');

      expect(result.data.country).toBe('Unknown');
      expect(result.data.countryCode).toBe('XX');
    });

    it('should include ISP and org when available', async () => {
      mockGeoIPService.lookup.mockReturnValue(mockGeoLocation);

      const result = await controller.lookupIP('8.8.8.8');

      expect(result.data.isp).toBe('Google LLC');
      expect(result.data.org).toBe('Google');
    });
  });

  describe('IpValidationPipe', () => {
    it('should pass valid IPv4 addresses', () => {
      const validIPv4s = [
        '8.8.8.8',
        '192.168.1.1',
        '10.0.0.1',
        '255.255.255.255',
        '0.0.0.0',
        '127.0.0.1',
      ];

      validIPv4s.forEach((ip) => {
        expect(() =>
          ipValidationPipe.transform(ip, { type: 'param' }),
        ).not.toThrow();
        expect(ipValidationPipe.transform(ip, { type: 'param' })).toBe(ip);
      });
    });

    it('should pass valid IPv6 addresses', () => {
      const validIPv6s = [
        '2001:4860:4860::8888',
        '::1',
        'fe80::1',
        '2001:db8:85a3:0000:0000:8a2e:0370:7334',
        '2001:db8:85a3::8a2e:370:7334',
      ];

      validIPv6s.forEach((ip) => {
        expect(() =>
          ipValidationPipe.transform(ip, { type: 'param' }),
        ).not.toThrow();
      });
    });

    it('should reject invalid IP addresses', () => {
      const invalidIPs = [
        'not-an-ip',
        '256.256.256.256',
        '192.168.1',
        '192.168.1.1.1',
        'google.com',
        '',
        '   ',
        '192.168.1.1/24',
      ];

      invalidIPs.forEach((ip) => {
        expect(() => ipValidationPipe.transform(ip, { type: 'param' })).toThrow(
          BadRequestException,
        );
      });
    });

    it('should throw BadRequestException with proper message for invalid IP', () => {
      expect(() =>
        ipValidationPipe.transform('invalid', { type: 'param' }),
      ).toThrow(
        'Invalid IP address format: invalid. Must be a valid IPv4 or IPv6 address.',
      );
    });

    it('should throw BadRequestException when IP is empty', () => {
      expect(() => ipValidationPipe.transform('', { type: 'param' })).toThrow(
        'IP address is required',
      );
    });

    it('should trim whitespace from IP addresses', () => {
      const result = ipValidationPipe.transform('  8.8.8.8  ', {
        type: 'param',
      });
      expect(result).toBe('8.8.8.8');
    });
  });

  describe('getStatus', () => {
    it('should return database status', async () => {
      mockGeoIPService.getDatabaseStatus.mockResolvedValue(mockDatabaseStatus);

      const result = await controller.getStatus();

      expect(geoIPService.getDatabaseStatus).toHaveBeenCalled();
      expect(result.databaseVersion).toBe('2026.01.15');
      expect(result.recordCount).toBe(3500000);
      expect(result.isLoaded).toBe(true);
      expect(result.databaseType).toBe('GeoLite2-City');
    });

    it('should return status when database is not loaded', async () => {
      const unloadedStatus: GeoIPStatus = {
        ...mockDatabaseStatus,
        isLoaded: false,
        databaseType: 'Mock Database',
      };
      mockGeoIPService.getDatabaseStatus.mockResolvedValue(unloadedStatus);

      const result = await controller.getStatus();

      expect(result.isLoaded).toBe(false);
      expect(result.databaseType).toBe('Mock Database');
    });
  });

  describe('refreshDatabase', () => {
    it('should refresh the database successfully', async () => {
      mockGeoIPService.refreshDatabase.mockResolvedValue(mockRefreshResult);

      const result = await controller.refreshDatabase();

      expect(geoIPService.refreshDatabase).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.newVersion).toBe('2026.01.16');
      expect(result.previousVersion).toBe('2026.01.15');
      expect(result.recordsUpdated).toBe(15000);
    });

    it('should handle refresh failure', async () => {
      const failedResult: RefreshResult = {
        success: false,
        newVersion: '2026.01.15',
        previousVersion: '2026.01.15',
        recordsUpdated: 0,
        refreshedAt: '2026-01-16T10:30:00.000Z',
        error: 'Failed to download database',
      };
      mockGeoIPService.refreshDatabase.mockResolvedValue(failedResult);

      const result = await controller.refreshDatabase();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to download database');
    });
  });

  describe('getQueryMap', () => {
    it('should return query map data with geolocation', async () => {
      const mockClientStats = [
        { clientIp: '8.8.8.8', queryCount: 1000, blockedCount: 50 },
        { clientIp: '1.1.1.1', queryCount: 500, blockedCount: 25 },
      ];

      const mockLocations = [
        {
          location: mockGeoLocation,
          queryCount: 1000,
          percentage: 66.67,
        },
        {
          location: { ...mockGeoLocation, city: 'Sydney', countryCode: 'AU' },
          queryCount: 500,
          percentage: 33.33,
        },
      ];

      mockClickHouseService.getClientIPStats.mockResolvedValue(mockClientStats);
      mockGeoIPService.getQueryLocations.mockResolvedValue(mockLocations);

      const result = await controller.getQueryMap('tenant-123', '24h');

      expect(clickhouseService.getClientIPStats).toHaveBeenCalledWith(
        'tenant-123',
        '24h',
      );
      expect(geoIPService.getQueryLocations).toHaveBeenCalled();
      expect(result.data).toHaveLength(2);
      expect(result.period).toBe('24h');
      expect(result.generatedAt).toBeDefined();
    });

    it('should use default period of 24h', async () => {
      mockClickHouseService.getClientIPStats.mockResolvedValue([]);
      mockGeoIPService.getQueryLocations.mockResolvedValue([]);

      const result = await controller.getQueryMap(
        'tenant-123',
        undefined as any,
      );

      // Default should be '24h' if undefined is passed
      expect(clickhouseService.getClientIPStats).toHaveBeenCalledWith(
        'tenant-123',
        '24h',
      );
    });

    it('should handle different periods', async () => {
      mockClickHouseService.getClientIPStats.mockResolvedValue([]);
      mockGeoIPService.getQueryLocations.mockResolvedValue([]);

      await controller.getQueryMap('tenant-123', '7d');
      expect(clickhouseService.getClientIPStats).toHaveBeenCalledWith(
        'tenant-123',
        '7d',
      );

      await controller.getQueryMap('tenant-123', '30d');
      expect(clickhouseService.getClientIPStats).toHaveBeenCalledWith(
        'tenant-123',
        '30d',
      );
    });
  });

  describe('lookupLegacy', () => {
    it('should return location data for legacy endpoint', async () => {
      mockGeoIPService.lookup.mockReturnValue(mockGeoLocation);

      const result = await controller.lookupLegacy('8.8.8.8');

      expect(geoIPService.lookup).toHaveBeenCalledWith('8.8.8.8');
      expect(result.data).toEqual(mockGeoLocation);
    });
  });

  describe('Edge Cases', () => {
    it('should handle lookups returning partial data', async () => {
      const partialLocation: GeoLocation = {
        country: 'Unknown',
        countryCode: 'XX',
        region: '',
        city: '',
        latitude: 0,
        longitude: 0,
        timezone: 'UTC',
      };
      mockGeoIPService.lookup.mockReturnValue(partialLocation);

      const result = await controller.lookupIP('1.2.3.4');

      expect(result.data.country).toBe('Unknown');
      expect(result.data.coordinates.latitude).toBe(0);
    });

    it('should handle empty client stats in query map', async () => {
      mockClickHouseService.getClientIPStats.mockResolvedValue([]);
      mockGeoIPService.getQueryLocations.mockResolvedValue([]);

      const result = await controller.getQueryMap('tenant-123', '24h');

      expect(result.data).toHaveLength(0);
    });

    it('should handle loopback IPv4 addresses', async () => {
      mockGeoIPService.lookup.mockReturnValue(mockPrivateLocation);

      const result = await controller.lookupIP('127.0.0.1');

      expect(result.data.country).toBe('Local Network');
    });

    it('should handle loopback IPv6 addresses', async () => {
      mockGeoIPService.lookup.mockReturnValue(mockPrivateLocation);

      const result = await controller.lookupIP('::1');

      expect(geoIPService.lookup).toHaveBeenCalledWith('::1');
    });
  });

  describe('Response Format', () => {
    it('should return correctly formatted lookup response', async () => {
      mockGeoIPService.lookup.mockReturnValue(mockGeoLocation);

      const result = await controller.lookupIP('8.8.8.8');

      // Verify response structure
      expect(result).toHaveProperty('ip');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('timestamp');

      // Verify data structure
      expect(result.data).toHaveProperty('country');
      expect(result.data).toHaveProperty('countryCode');
      expect(result.data).toHaveProperty('region');
      expect(result.data).toHaveProperty('city');
      expect(result.data).toHaveProperty('timezone');
      expect(result.data).toHaveProperty('coordinates');
      expect(result.data.coordinates).toHaveProperty('latitude');
      expect(result.data.coordinates).toHaveProperty('longitude');
    });

    it('should return ISO timestamp format', async () => {
      mockGeoIPService.lookup.mockReturnValue(mockGeoLocation);

      const result = await controller.lookupIP('8.8.8.8');

      // Verify ISO 8601 format
      expect(result.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });
  });
});
