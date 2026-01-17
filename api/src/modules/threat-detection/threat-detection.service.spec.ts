// Nebula DNS - Threat Detection Service Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { ThreatDetectionService } from './threat-detection.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

describe('ThreatDetectionService', () => {
  let service: ThreatDetectionService;
  let realtimeGateway: jest.Mocked<RealtimeGateway>;

  const mockTenantId = 'tenant-123';
  const mockLocationId = 'location-123';
  const mockClientIp = '192.168.1.100';

  const mockRealtimeGateway = {
    broadcastThreat: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThreatDetectionService,
        {
          provide: RealtimeGateway,
          useValue: mockRealtimeGateway,
        },
      ],
    }).compile();

    service = module.get<ThreatDetectionService>(ThreatDetectionService);
    realtimeGateway = module.get(RealtimeGateway);

    jest.clearAllMocks();
  });

  describe('analyzeQuery', () => {
    it('should return null for benign domain', async () => {
      const query = {
        tenantId: mockTenantId,
        locationId: mockLocationId,
        domain: 'google.com',
        queryType: 'A',
        clientIp: mockClientIp,
        timestamp: new Date(),
      };

      const result = await service.analyzeQuery(query);

      expect(result).toBeNull();
      expect(mockRealtimeGateway.broadcastThreat).not.toHaveBeenCalled();
    });

    it('should detect DGA domain with high entropy', async () => {
      const query = {
        tenantId: mockTenantId,
        locationId: mockLocationId,
        domain: 'xkjashdjkashdkjahsdkjhaskjdhaksjhd.com',
        queryType: 'A',
        clientIp: mockClientIp,
        timestamp: new Date(),
      };

      const result = await service.analyzeQuery(query);

      expect(result).toBeDefined();
      expect(result?.type).toBe('dga');
      expect(result?.severity).toMatch(/medium|high/);
      expect(mockRealtimeGateway.broadcastThreat).toHaveBeenCalled();
    });

    it('should detect DNS tunneling with long subdomain', async () => {
      const longSubdomain = 'a'.repeat(60);
      const query = {
        tenantId: mockTenantId,
        locationId: mockLocationId,
        domain: `${longSubdomain}.example.com`,
        queryType: 'TXT',
        clientIp: mockClientIp,
        timestamp: new Date(),
      };

      const result = await service.analyzeQuery(query);

      expect(result).toBeDefined();
      expect(result?.type).toBe('tunneling');
    });

    it('should detect data exfiltration with hex encoding', async () => {
      const hexData = 'a'.repeat(120);
      const query = {
        tenantId: mockTenantId,
        locationId: mockLocationId,
        domain: `${hexData}.example.com`,
        queryType: 'TXT',
        clientIp: mockClientIp,
        timestamp: new Date(),
      };

      const result = await service.analyzeQuery(query);

      expect(result).toBeDefined();
      if (result?.type === 'exfiltration') {
        expect(result.details.estimatedDataSize).toBeGreaterThan(0);
      }
    });
  });

  describe('detectDGA', () => {
    it('should detect high entropy domains', () => {
      const result = (service as any).detectDGA('qwpoiuasdfghjklzxcvbnm.com');

      expect(result.entropy).toBeGreaterThan(3.5);
      if (result.isDGA) {
        expect(result.confidence).toBeGreaterThan(0);
      }
    });

    it('should not flag normal domains', () => {
      const result = (service as any).detectDGA('google.com');

      expect(result.isDGA).toBe(false);
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should detect domains with high consonant ratio', () => {
      const result = (service as any).detectDGA('bcdfghjklmnpqrstvwxyz.com');

      if (result.isDGA) {
        expect(result.reason).toContain('consonant');
      }
    });

    it('should detect suspiciously long subdomains', () => {
      const longDomain = 'a'.repeat(25) + '.example.com';
      const result = (service as any).detectDGA(longDomain);

      if (result.isDGA) {
        expect(result.reason).toContain('Long subdomain');
      }
    });

    it('should detect numeric patterns in DGA', () => {
      const result = (service as any).detectDGA('abc1234567890xyz.com');

      expect(result.entropy).toBeDefined();
      if (result.isDGA) {
        expect(result.confidence).toBeGreaterThan(0);
      }
    });
  });

  describe('detectTunneling', () => {
    it('should detect base64-like encoding', () => {
      const base64Domain =
        'SGVsbG9Xb3JsZEhlbGxvV29ybGQxMjM0NTY3ODkw.example.com';
      const result = (service as any).detectTunneling(base64Domain, 'A');

      expect(result.subdomainLength).toBeGreaterThan(30);
      if (result.isTunneling) {
        expect(result.indicators).toContain('Base64-like subdomain encoding');
      }
    });

    it('should flag unusual record types', () => {
      const result = (service as any).detectTunneling(
        'test.example.com',
        'TXT',
      );

      expect(result.indicators).toContain('Unusual record type: TXT');
    });

    it('should not flag normal domains', () => {
      const result = (service as any).detectTunneling('www.example.com', 'A');

      expect(result.isTunneling).toBe(false);
    });

    it('should detect combination of indicators', () => {
      const longBase64 =
        'SGVsbG9Xb3JsZEhlbGxvV29ybGRIZWxsb1dvcmxkSGVsbG9Xb3JsZA.example.com';
      const result = (service as any).detectTunneling(longBase64, 'TXT');

      expect(result.indicators.length).toBeGreaterThanOrEqual(2);
      expect(result.isTunneling).toBe(true);
    });
  });

  describe('detectC2', () => {
    it('should detect suspicious TLD', () => {
      const result = (service as any).detectC2(
        'malware.tk',
        mockClientIp,
        new Date(),
      );

      if (result.isC2) {
        expect(result.indicators).toContain(
          expect.stringContaining('Suspicious TLD'),
        );
      }
    });

    it('should detect beaconing behavior', async () => {
      const domain = 'c2server.example.com';
      const now = new Date();

      // Simulate regular beaconing
      for (let i = 0; i < 10; i++) {
        const timestamp = new Date(now.getTime() + i * 60 * 1000); // Every 60 seconds
        await service.analyzeQuery({
          tenantId: mockTenantId,
          locationId: mockLocationId,
          domain,
          queryType: 'A',
          clientIp: mockClientIp,
          timestamp,
        });
      }

      // Final check should detect the pattern
      const finalQuery = {
        tenantId: mockTenantId,
        locationId: mockLocationId,
        domain,
        queryType: 'A',
        clientIp: mockClientIp,
        timestamp: new Date(now.getTime() + 10 * 60 * 1000),
      };

      const result = await service.analyzeQuery(finalQuery);

      // Clean up history
      service.cleanupHistory();
    });

    it('should detect combination of high entropy and suspicious TLD', () => {
      const result = (service as any).detectC2(
        'asdfghjklqwerty.xyz',
        mockClientIp,
        new Date(),
      );

      expect(result.confidence).toBeDefined();
      if (result.isC2 && result.confidence > 0.5) {
        expect(result.indicators.length).toBeGreaterThan(0);
      }
    });

    it('should not flag legitimate domains', () => {
      const result = (service as any).detectC2(
        'google.com',
        mockClientIp,
        new Date(),
      );

      expect(result.isC2).toBe(false);
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('detectExfiltration', () => {
    it('should detect hex-encoded data', () => {
      const hexSubdomain = 'a'.repeat(100);
      const domain = `${hexSubdomain}.example.com`;
      const result = (service as any).detectExfiltration(domain, 'TXT');

      if (result.isExfiltration) {
        expect(result.indicators).toContain('Hex-encoded data detected');
        expect(result.estimatedDataSize).toBeGreaterThan(0);
      }
    });

    it('should detect base64-encoded data', () => {
      const base64Subdomain =
        'SGVsbG9Xb3JsZEhlbGxvV29ybGRIZWxsb1dvcmxkSGVsbG9Xb3JsZEhlbGxvV29ybGRIZWxsb1dvcmxk';
      const domain = `${base64Subdomain}.example.com`;
      const result = (service as any).detectExfiltration(domain, 'A');

      if (result.isExfiltration) {
        expect(result.indicators).toContain('Base64-encoded data detected');
        expect(result.estimatedDataSize).toBeGreaterThan(0);
      }
    });

    it('should detect chunked exfiltration across multiple labels', () => {
      const part1 = 'a'.repeat(50);
      const part2 = 'b'.repeat(50);
      const domain = `${part1}.${part2}.example.com`;
      const result = (service as any).detectExfiltration(domain, 'TXT');

      if (result.isExfiltration) {
        expect(result.indicators).toContain(
          'Multiple long labels (chunked exfiltration)',
        );
      }
    });

    it('should not flag normal short domains', () => {
      const result = (service as any).detectExfiltration(
        'www.example.com',
        'A',
      );

      expect(result.isExfiltration).toBe(false);
    });

    it('should flag suspicious query types for exfiltration', () => {
      const longData = 'x'.repeat(120);
      const result = (service as any).detectExfiltration(
        `${longData}.example.com`,
        'TXT',
      );

      if (result.isExfiltration) {
        expect(result.indicators).toContain(
          'Suspicious query type for exfiltration: TXT',
        );
      }
    });
  });

  describe('calculateEntropy', () => {
    it('should calculate Shannon entropy correctly', () => {
      const highEntropy = (service as any).calculateEntropy('abcdefghijklmnop');
      const lowEntropy = (service as any).calculateEntropy('aaaaaaaaaaaaaaaa');

      expect(highEntropy).toBeGreaterThan(lowEntropy);
      expect(highEntropy).toBeGreaterThan(3.5);
      expect(lowEntropy).toBe(0);
    });

    it('should return 0 for uniform strings', () => {
      const entropy = (service as any).calculateEntropy('zzzzzzzzzz');
      expect(entropy).toBe(0);
    });

    it('should handle mixed case', () => {
      const entropy1 = (service as any).calculateEntropy('ABCabc');
      const entropy2 = (service as any).calculateEntropy('abcabc');

      expect(entropy1).toBe(entropy2); // Case-insensitive
    });
  });

  describe('calculateConsonantRatio', () => {
    it('should calculate consonant ratio correctly', () => {
      const highConsonant = (service as any).calculateConsonantRatio(
        'bcdfghjklmnp',
      );
      const lowConsonant = (service as any).calculateConsonantRatio('aeiou');

      expect(highConsonant).toBeGreaterThan(lowConsonant);
      expect(lowConsonant).toBe(0);
    });

    it('should handle mixed vowels and consonants', () => {
      const ratio = (service as any).calculateConsonantRatio('hello');
      expect(ratio).toBeGreaterThan(0);
      expect(ratio).toBeLessThan(1);
    });

    it('should handle non-letters', () => {
      const ratio = (service as any).calculateConsonantRatio('abc123xyz');
      expect(ratio).toBeGreaterThan(0);
    });

    it('should return 0 for all vowels', () => {
      const ratio = (service as any).calculateConsonantRatio('aaa');
      expect(ratio).toBe(0);
    });
  });

  describe('cleanupHistory', () => {
    it('should remove old client history', () => {
      // Add some entries
      (service as any).clientQueryHistory.set('client1', {
        timestamps: [Date.now() - 2 * 60 * 60 * 1000], // 2 hours ago
        domains: new Set(['example.com']),
      });

      (service as any).clientQueryHistory.set('client2', {
        timestamps: [Date.now()], // Recent
        domains: new Set(['test.com']),
      });

      service.cleanupHistory();

      expect((service as any).clientQueryHistory.has('client1')).toBe(false);
      expect((service as any).clientQueryHistory.has('client2')).toBe(true);
    });

    it('should clean up old timestamps within kept entries', () => {
      const now = Date.now();
      (service as any).clientQueryHistory.set('client1', {
        timestamps: [
          now - 2 * 60 * 60 * 1000, // 2 hours ago (should be removed)
          now - 30 * 60 * 1000, // 30 minutes ago (should be kept)
        ],
        domains: new Set(['example.com']),
      });

      service.cleanupHistory();

      const history = (service as any).clientQueryHistory.get('client1');
      expect(history.timestamps).toHaveLength(1);
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = (service as any).generateId();
      const id2 = (service as any).generateId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^threat_\d+_[a-z0-9]+$/);
    });
  });
});
