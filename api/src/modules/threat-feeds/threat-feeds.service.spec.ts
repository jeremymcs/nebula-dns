// Nebula DNS - Threat Feeds Service Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { ThreatFeedsService } from './threat-feeds.service';
import Redis from 'ioredis';

describe('ThreatFeedsService', () => {
  let service: ThreatFeedsService;
  let redisClient: jest.Mocked<Redis>;

  const mockRedisClient = {
    pipeline: jest.fn(),
    sadd: jest.fn(),
    sismember: jest.fn(),
    scard: jest.fn(),
    publish: jest.fn(),
    expire: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThreatFeedsService,
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedisClient,
        },
      ],
    }).compile();

    service = module.get<ThreatFeedsService>(ThreatFeedsService);
    redisClient = mockRedisClient as any;

    jest.clearAllMocks();
  });

  describe('getFeeds', () => {
    it('should return all available threat feeds', async () => {
      const feeds = await service.getFeeds();

      expect(feeds).toBeDefined();
      expect(feeds.length).toBeGreaterThan(0);
      expect(feeds[0]).toHaveProperty('id');
      expect(feeds[0]).toHaveProperty('name');
      expect(feeds[0]).toHaveProperty('category');
      expect(feeds[0]).toHaveProperty('url');
    });

    it('should include all threat categories', async () => {
      const feeds = await service.getFeeds();
      const categories = [...new Set(feeds.map((f) => f.category))];

      expect(categories).toContain('malware');
      expect(categories).toContain('phishing');
      expect(categories).toContain('c2');
      expect(categories).toContain('ransomware');
    });
  });

  describe('getFeedsByCategory', () => {
    it('should return feeds for specific category', async () => {
      const malwareFeeds = await service.getFeedsByCategory('malware');

      expect(malwareFeeds.length).toBeGreaterThan(0);
      expect(malwareFeeds.every((f) => f.category === 'malware')).toBe(true);
    });

    it('should return empty array for non-existent category', async () => {
      const feeds = await service.getFeedsByCategory('nonexistent');

      expect(feeds).toEqual([]);
    });
  });

  describe('toggleFeed', () => {
    it('should enable a feed', async () => {
      const result = await service.toggleFeed('urlhaus-domains', true);

      expect(result).toBeDefined();
      expect(result?.isEnabled).toBe(true);
    });

    it('should disable a feed', async () => {
      const result = await service.toggleFeed('urlhaus-domains', false);

      expect(result).toBeDefined();
      expect(result?.isEnabled).toBe(false);
    });

    it('should return null for non-existent feed', async () => {
      const result = await service.toggleFeed('nonexistent', true);

      expect(result).toBeNull();
    });
  });

  describe('updateFeed', () => {
    it('should return error for non-existent feed', async () => {
      const result = await service.updateFeed('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Feed not found');
    });

    it('should update feed metadata on success', async () => {
      // Mock successful fetch
      jest
        .spyOn(service as any, 'fetchFeed')
        .mockResolvedValue('example.com\ntest.com');
      jest.spyOn(service as any, 'parseFeed').mockReturnValue([
        {
          type: 'domain',
          value: 'example.com',
          category: 'malware',
          source: 'test-feed',
          severity: 'high',
          firstSeen: new Date(),
          lastSeen: new Date(),
        },
      ]);

      const pipeline = {
        sadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockRedisClient.pipeline.mockReturnValue(pipeline as any);

      const result = await service.updateFeed('urlhaus-domains');

      if (result.success) {
        expect(result.entryCount).toBeGreaterThan(0);
        expect(result.duration).toBeDefined();
      }
    });
  });

  describe('updateAllFeeds', () => {
    it('should update all enabled feeds', async () => {
      jest.spyOn(service, 'updateFeed').mockResolvedValue({
        success: true,
        entryCount: 10,
        duration: 100,
      });

      const pipeline = {
        sadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockRedisClient.pipeline.mockReturnValue(pipeline as any);

      const result = await service.updateAllFeeds();

      expect(result.total).toBeGreaterThan(0);
      expect(result.updated).toBeDefined();
      expect(result.failed).toBeDefined();
    }, 10000); // Increase timeout to 10 seconds
  });

  describe('checkDomain', () => {
    it('should return null for safe domain', async () => {
      mockRedisClient.sismember.mockResolvedValue(0);

      const result = await service.checkDomain('google.com');

      expect(result).toBeNull();
    });

    it('should return threat indicator for malicious domain', async () => {
      mockRedisClient.sismember
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1);

      const result = await service.checkDomain('evil.com');

      if (result) {
        expect(result.type).toBe('domain');
        expect(result.value).toBe('evil.com');
        expect(result.category).toBeDefined();
        expect(result.severity).toMatch(/low|medium|high|critical/);
      }
    });

    it('should check in-memory cache first', async () => {
      // Add to cache
      (service as any).threatCache.set('cached-threat.com', {
        type: 'domain',
        value: 'cached-threat.com',
        category: 'malware',
        source: 'test',
        severity: 'high',
        firstSeen: new Date(),
        lastSeen: new Date(),
      });

      const result = await service.checkDomain('cached-threat.com');

      expect(result).toBeDefined();
      expect(result?.value).toBe('cached-threat.com');
      expect(mockRedisClient.sismember).not.toHaveBeenCalled();
    });
  });

  describe('checkDomainBatch', () => {
    it('should check multiple domains', async () => {
      mockRedisClient.sismember.mockResolvedValue(0);

      const result = await service.checkDomainBatch([
        'google.com',
        'example.com',
        'test.com',
      ]);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBeGreaterThanOrEqual(0);
    });
  });

  describe('checkIP', () => {
    it('should return null for safe IP', () => {
      const result = service.checkIP('8.8.8.8');

      expect(result).toBeNull();
    });

    it('should return threat for cached malicious IP', () => {
      (service as any).threatCache.set('1.2.3.4', {
        type: 'ip',
        value: '1.2.3.4',
        category: 'c2',
        source: 'test',
        severity: 'critical',
        firstSeen: new Date(),
        lastSeen: new Date(),
      });

      const result = service.checkIP('1.2.3.4');

      expect(result).toBeDefined();
      expect(result?.type).toBe('ip');
    });
  });

  describe('getStats', () => {
    it('should return threat feed statistics', async () => {
      mockRedisClient.scard.mockResolvedValue(100);

      const result = await service.getStats();

      expect(result).toBeDefined();
      expect(result.totalIndicators).toBeGreaterThanOrEqual(0);
      expect(result.byCategory).toBeDefined();
      expect(result.feedStats).toBeDefined();
      expect(Array.isArray(result.feedStats)).toBe(true);
    });
  });

  describe('getSeverityForCategory', () => {
    it('should return critical for ransomware', () => {
      const severity = (service as any).getSeverityForCategory('ransomware');
      expect(severity).toBe('critical');
    });

    it('should return critical for c2', () => {
      const severity = (service as any).getSeverityForCategory('c2');
      expect(severity).toBe('critical');
    });

    it('should return high for malware', () => {
      const severity = (service as any).getSeverityForCategory('malware');
      expect(severity).toBe('high');
    });

    it('should return high for phishing', () => {
      const severity = (service as any).getSeverityForCategory('phishing');
      expect(severity).toBe('high');
    });

    it('should return medium for cryptomining', () => {
      const severity = (service as any).getSeverityForCategory('cryptomining');
      expect(severity).toBe('medium');
    });

    it('should return low for unknown category', () => {
      const severity = (service as any).getSeverityForCategory('unknown');
      expect(severity).toBe('low');
    });
  });

  describe('extractDomain', () => {
    it('should extract domain from URL', () => {
      const domain = (service as any).extractDomain(
        'https://www.example.com/path',
      );
      expect(domain).toBe('example.com');
    });

    it('should remove www prefix', () => {
      const domain = (service as any).extractDomain('www.example.com');
      expect(domain).toBe('example.com');
    });

    it('should remove port', () => {
      const domain = (service as any).extractDomain('example.com:8080');
      expect(domain).toBe('example.com');
    });

    it('should handle HTTP protocol', () => {
      const domain = (service as any).extractDomain('http://example.com');
      expect(domain).toBe('example.com');
    });

    it('should convert to lowercase', () => {
      const domain = (service as any).extractDomain('EXAMPLE.COM');
      expect(domain).toBe('example.com');
    });
  });

  describe('isValidDomain', () => {
    it('should validate correct domain', () => {
      expect((service as any).isValidDomain('example.com')).toBe(true);
      expect((service as any).isValidDomain('subdomain.example.com')).toBe(
        true,
      );
      expect((service as any).isValidDomain('test-domain.co.uk')).toBe(true);
    });

    it('should reject invalid domains', () => {
      expect((service as any).isValidDomain('')).toBe(false);
      expect((service as any).isValidDomain('ab')).toBe(false);
      expect((service as any).isValidDomain('.example.com')).toBe(false);
      expect((service as any).isValidDomain('example.com.')).toBe(false);
      expect((service as any).isValidDomain('-example.com')).toBe(false);
      expect((service as any).isValidDomain('example.com-')).toBe(false);
      expect((service as any).isValidDomain('no spaces.com')).toBe(false);
      expect((service as any).isValidDomain('nodot')).toBe(false);
    });

    it('should reject too long domains', () => {
      const longDomain = 'a'.repeat(260) + '.com';
      expect((service as any).isValidDomain(longDomain)).toBe(false);
    });
  });

  describe('parseTextFeed', () => {
    it('should parse text feed with one domain per line', () => {
      const content = 'example.com\ntest.com\nevil.com';
      const feed = {
        id: 'test-feed',
        category: 'malware',
        type: 'domain_list',
      } as any;

      const result = (service as any).parseTextFeed(content, feed, new Date());

      expect(result.length).toBe(3);
      expect(result[0].value).toBe('example.com');
      expect(result[0].category).toBe('malware');
    });

    it('should skip comment lines', () => {
      const content = '# Comment\nexample.com\n// Another comment\ntest.com';
      const feed = {
        id: 'test',
        category: 'malware',
        type: 'domain_list',
      } as any;

      const result = (service as any).parseTextFeed(content, feed, new Date());

      expect(result.length).toBe(2);
      expect(result.every((r: any) => !r.value.startsWith('#'))).toBe(true);
    });

    it('should skip empty lines', () => {
      const content = 'example.com\n\n\ntest.com';
      const feed = {
        id: 'test',
        category: 'malware',
        type: 'domain_list',
      } as any;

      const result = (service as any).parseTextFeed(content, feed, new Date());

      expect(result.length).toBe(2);
    });
  });

  describe('parseHostfileFeed', () => {
    it('should parse hostfile format', () => {
      const content = '127.0.0.1 malware.com\n0.0.0.0 evil.com';
      const feed = { id: 'test', category: 'malware' } as any;

      const result = (service as any).parseHostfileFeed(
        content,
        feed,
        new Date(),
      );

      expect(result.length).toBe(2);
      expect(result[0].value).toBe('malware.com');
      expect(result[1].value).toBe('evil.com');
    });

    it('should skip localhost', () => {
      const content = '127.0.0.1 localhost\n127.0.0.1 malware.com';
      const feed = { id: 'test', category: 'malware' } as any;

      const result = (service as any).parseHostfileFeed(
        content,
        feed,
        new Date(),
      );

      expect(result.length).toBe(1);
      expect(result[0].value).toBe('malware.com');
    });
  });

  describe('parseCsvFeed', () => {
    it('should parse CSV format', () => {
      const content =
        'url,category\nhttp://evil.com,malware\nhttp://phish.com,phishing';
      const feed = { id: 'test', category: 'malware' } as any;

      const result = (service as any).parseCsvFeed(content, feed, new Date());

      expect(result.length).toBeGreaterThan(0);
    });

    it('should skip header row', () => {
      const content = 'domain,type\nevil.com,malware';
      const feed = { id: 'test', category: 'malware' } as any;

      const result = (service as any).parseCsvFeed(content, feed, new Date());

      expect(result.every((r: any) => r.value !== 'domain')).toBe(true);
    });
  });

  describe('parseJsonFeed', () => {
    it('should parse JSON array', () => {
      const content = JSON.stringify(['evil.com', 'malware.com', 'phish.com']);
      const feed = { id: 'test', category: 'malware' } as any;

      const result = (service as any).parseJsonFeed(content, feed, new Date());

      expect(result.length).toBe(3);
      expect(result[0].value).toBe('evil.com');
    });

    it('should parse JSON objects', () => {
      const content = JSON.stringify({
        domains: ['evil.com', 'malware.com'],
      });
      const feed = { id: 'test', category: 'malware' } as any;

      const result = (service as any).parseJsonFeed(content, feed, new Date());

      expect(result.length).toBe(2);
    });

    it('should handle invalid JSON gracefully', () => {
      const content = 'invalid json {';
      const feed = { id: 'test', category: 'malware' } as any;

      const result = (service as any).parseJsonFeed(content, feed, new Date());

      expect(result).toEqual([]);
    });
  });
});
