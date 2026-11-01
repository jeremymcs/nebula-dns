// Nebula DNS - Threat Feeds Service Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ThreatFeedsService } from './threat-feeds.service';
import { RedisService } from '../redis/redis.service';
import { threatSetKey } from './redis-threat-keys';

describe('ThreatFeedsService', () => {
  let service: ThreatFeedsService;
  const mockRedisClient = {
    pipeline: jest.fn(),
    sadd: jest.fn(),
    sismember: jest.fn(),
    scard: jest.fn(),
    publish: jest.fn(),
    expire: jest.fn(),
    del: jest.fn(),
    rename: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
  };

  const mockRedisService = {
    getClient: () => mockRedisClient,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThreatFeedsService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<ThreatFeedsService>(ThreatFeedsService);
    jest.clearAllMocks();
    mockRedisClient.rename.mockResolvedValue('OK');
    mockRedisClient.del.mockResolvedValue(1);
    mockRedisClient.sadd.mockResolvedValue(1);
    mockRedisClient.expire.mockResolvedValue(1);
  });

  describe('getFeeds', () => {
    it('should return maintained threat feeds only', async () => {
      const feeds = await service.getFeeds();
      const ids = feeds.map((f) => f.id);

      expect(ids).toContain('urlhaus-malware-filter');
      expect(ids).toContain('openphish');
      expect(ids).not.toContain('abuse-ssl-blacklist');
      expect(ids).not.toContain('feodotracker');
    });

    it('should include core threat categories', async () => {
      const feeds = await service.getFeeds();
      const categories = [...new Set(feeds.map((f) => f.category))];

      expect(categories).toContain('malware');
      expect(categories).toContain('phishing');
      expect(categories).toContain('botnet');
    });
  });

  describe('updateFeed', () => {
    it('should return error for non-existent feed', async () => {
      const result = await service.updateFeed('nonexistent');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Feed not found');
    });

    it('should rebuild Redis set with nebula:threats prefix', async () => {
      jest
        .spyOn(service as any, 'fetchFeed')
        .mockResolvedValue('127.0.0.1 evil.test\n');
      jest.spyOn(service as any, 'parseFeed').mockReturnValue([
        {
          type: 'domain',
          value: 'evil.test',
          category: 'malware',
          source: 'test-feed',
          severity: 'high',
          firstSeen: new Date(),
          lastSeen: new Date(),
        },
      ]);

      const result = await service.updateFeed('urlhaus-malware-filter');
      expect(result.success).toBe(true);
      expect(mockRedisClient.sadd).toHaveBeenCalled();
      expect(mockRedisClient.rename).toHaveBeenCalledWith(
        threatSetKey('malware') + ':staging',
        threatSetKey('malware'),
      );
    });
  });

  describe('checkDomain', () => {
    it('should return null for safe domain', async () => {
      mockRedisClient.sismember.mockResolvedValue(0);
      const result = await service.checkDomain('google.com');
      expect(result).toBeNull();
    });

    it('should check in-memory cache first', async () => {
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
      expect(result?.value).toBe('cached-threat.com');
      expect(mockRedisClient.sismember).not.toHaveBeenCalled();
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
    });
  });

  describe('isValidDomain', () => {
    it('should validate correct domain', () => {
      expect((service as any).isValidDomain('example.com')).toBe(true);
    });
  });
});
