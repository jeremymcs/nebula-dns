// Nebula DNS - Redis Integration Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService, CacheInvalidationMessage } from './redis.service';

/**
 * Redis Integration Tests
 *
 * Uses Redis container via Testcontainers (started in globalSetup).
 * The REDIS_URL environment variable is set by the global setup.
 * The tests use database 15 (TEST_DB) to isolate test data.
 */
describe('Redis Integration Tests', () => {
  let redisService: RedisService;
  let redisClient: Redis;
  const TEST_DB = 15; // Use a separate database for testing
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:4379'; // Use docker-compose port

  beforeAll(async () => {
    // Create a test Redis client for verification
    redisClient = new Redis(redisUrl);
    await redisClient.select(TEST_DB);

    // Create RedisService with test configuration
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'REDIS_URL') return redisUrl;
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    redisService = module.get<RedisService>(RedisService);

    // Switch service to test database
    await redisService.getClient().select(TEST_DB);

    // Wait for connection
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    if (redisService) {
      await redisService.onModuleDestroy();
    }
    if (redisClient) {
      await redisClient.quit();
    }
  });

  beforeEach(async () => {
    // Clean up Redis between tests
    await redisClient.flushdb();
  });

  describe('Policy Cache Operations', () => {
    const locationId = 'location-123';
    const mockPolicy = {
      locationId,
      tenantId: 'tenant-123',
      blockCategories: ['malware', 'phishing'],
      allowDomains: ['example.com'],
      blockDomains: ['evil.com'],
    };

    it('should store compiled policy correctly', async () => {
      await redisService.storeCompiledPolicy(locationId, mockPolicy, 3600);

      const key = `policy:compiled:${locationId}`;
      const stored = await redisClient.get(key);
      expect(stored).toBeDefined();
      expect(JSON.parse(stored!)).toEqual(mockPolicy);
    });

    it('should retrieve compiled policy correctly', async () => {
      await redisService.storeCompiledPolicy(locationId, mockPolicy);

      const retrieved = await redisService.getCompiledPolicy(locationId);
      expect(retrieved).toEqual(mockPolicy);
    });

    it('should return null for non-existent policy', async () => {
      const retrieved = await redisService.getCompiledPolicy('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should respect policy TTL and expire correctly', async () => {
      // Store with 2 second TTL
      await redisService.storeCompiledPolicy(locationId, mockPolicy, 2);

      // Should exist immediately
      let retrieved = await redisService.getCompiledPolicy(locationId);
      expect(retrieved).toEqual(mockPolicy);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // Should be expired
      retrieved = await redisService.getCompiledPolicy(locationId);
      expect(retrieved).toBeNull();
    }, 10000);

    it('should invalidate policy and publish message', async () => {
      const messages: string[] = [];
      const subscriber = new Redis(redisUrl);
      await subscriber.select(TEST_DB);

      // Subscribe to invalidation channel
      await subscriber.subscribe('nebula:invalidate');
      subscriber.on('message', (channel, message) => {
        messages.push(message);
      });

      // Wait for subscription to be established
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Invalidate policy
      await redisService.invalidatePolicy(locationId);

      // Wait for message propagation
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(messages.length).toBeGreaterThan(0);
      const invalidationMsg: CacheInvalidationMessage = JSON.parse(
        messages[messages.length - 1],
      );
      expect(invalidationMsg.type).toBe('policy');
      expect(invalidationMsg.locationId).toBe(locationId);

      await subscriber.quit();
    }, 10000);

    it('should handle concurrent access to same policy', async () => {
      const operations = Array.from({ length: 10 }, (_, i) => ({
        ...mockPolicy,
        version: i,
      }));

      // Store concurrently
      await Promise.all(
        operations.map((op, i) =>
          redisService.storeCompiledPolicy(`location-${i}`, op),
        ),
      );

      // Retrieve concurrently
      const results = await Promise.all(
        operations.map((_, i) =>
          redisService.getCompiledPolicy(`location-${i}`),
        ),
      );

      // All should be stored correctly
      results.forEach((result, i) => {
        expect(result).toEqual(operations[i]);
      });
    });
  });

  describe('Token Cache Operations', () => {
    const tokenHash = 'hash-abc123';
    const tokenInfo = {
      userId: 'user-123',
      tenantId: 'tenant-123',
      roles: ['admin'],
      createdAt: new Date().toISOString(),
    };

    it('should store token with TTL', async () => {
      await redisService.storeToken(tokenHash, tokenInfo, 3600);

      const key = `token:${tokenHash}`;
      const stored = await redisClient.get(key);
      expect(stored).toBeDefined();
      expect(JSON.parse(stored!)).toEqual(tokenInfo);

      const ttl = await redisClient.ttl(key);
      expect(ttl).toBeGreaterThan(3500);
      expect(ttl).toBeLessThanOrEqual(3600);
    });

    it('should retrieve valid token', async () => {
      await redisService.storeToken(tokenHash, tokenInfo);

      const retrieved = await redisService.getToken(tokenHash);
      expect(retrieved).toEqual(tokenInfo);
    });

    it('should return null for non-existent token', async () => {
      const retrieved = await redisService.getToken('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should return null for expired token', async () => {
      // Store with 1 second TTL
      await redisService.storeToken(tokenHash, tokenInfo, 1);

      // Should exist immediately
      let retrieved = await redisService.getToken(tokenHash);
      expect(retrieved).toEqual(tokenInfo);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Should be expired
      retrieved = await redisService.getToken(tokenHash);
      expect(retrieved).toBeNull();
    }, 10000);

    it('should delete token and publish invalidation', async () => {
      await redisService.storeToken(tokenHash, tokenInfo);

      const messages: string[] = [];
      const subscriber = new Redis(redisUrl);
      await subscriber.select(TEST_DB);

      await subscriber.subscribe('nebula:invalidate');
      subscriber.on('message', (channel, message) => {
        messages.push(message);
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      await redisService.deleteToken(tokenHash);

      // Token should be deleted
      const retrieved = await redisService.getToken(tokenHash);
      expect(retrieved).toBeNull();

      // Wait for message
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(messages.length).toBeGreaterThan(0);
      const invalidationMsg: CacheInvalidationMessage = JSON.parse(
        messages[messages.length - 1],
      );
      expect(invalidationMsg.type).toBe('token');
      expect(invalidationMsg.token).toBe(tokenHash);

      await subscriber.quit();
    }, 10000);
  });

  describe('Pub/Sub Operations', () => {
    it('should publish and receive messages on channel', async () => {
      const testChannel = 'test:channel';
      const testMessage = 'Hello, Redis!';
      const receivedMessages: string[] = [];

      const subscriber = new Redis(redisUrl);
      await subscriber.subscribe(testChannel);

      subscriber.on('message', (channel, message) => {
        if (channel === testChannel) {
          receivedMessages.push(message);
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      await redisService.publish(testChannel, testMessage);

      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(receivedMessages).toContain(testMessage);

      await subscriber.quit();
    }, 10000);

    it('should handle multiple subscribers receiving same message', async () => {
      const testChannel = 'test:broadcast';
      const testMessage = JSON.stringify({ event: 'test', data: 'value' });

      const subscriber1 = new Redis(redisUrl);
      const subscriber2 = new Redis(redisUrl);
      const subscriber3 = new Redis(redisUrl);

      const messages1: string[] = [];
      const messages2: string[] = [];
      const messages3: string[] = [];

      await subscriber1.subscribe(testChannel);
      await subscriber2.subscribe(testChannel);
      await subscriber3.subscribe(testChannel);

      subscriber1.on('message', (_, msg) => messages1.push(msg));
      subscriber2.on('message', (_, msg) => messages2.push(msg));
      subscriber3.on('message', (_, msg) => messages3.push(msg));

      await new Promise((resolve) => setTimeout(resolve, 500));

      await redisService.publish(testChannel, testMessage);

      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(messages1).toContain(testMessage);
      expect(messages2).toContain(testMessage);
      expect(messages3).toContain(testMessage);

      await subscriber1.quit();
      await subscriber2.quit();
      await subscriber3.quit();
    }, 10000);

    it('should handle list invalidation messages', async () => {
      const tenantId = 'tenant-123';
      const locationId = 'location-456';
      const receivedMessages: CacheInvalidationMessage[] = [];

      const subscriber = new Redis(redisUrl);
      await subscriber.select(TEST_DB);
      await subscriber.subscribe('nebula:invalidate');

      subscriber.on('message', (channel, message) => {
        try {
          receivedMessages.push(JSON.parse(message));
        } catch (err) {
          // Ignore invalid JSON messages from other tests
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      await redisService.invalidateList(tenantId, locationId);

      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(receivedMessages.length).toBeGreaterThan(0);

      // Find the list invalidation message (might not be first due to other messages)
      const listInvalidation = receivedMessages.find(
        (msg) => msg.type === 'list' && msg.tenantId === tenantId,
      );
      expect(listInvalidation).toBeDefined();
      expect(listInvalidation).toMatchObject({
        type: 'list',
        tenantId,
        locationId,
      });

      await subscriber.quit();
    }, 10000);
  });

  describe('Hash Operations', () => {
    const hashKey = 'test:hash';

    it('should set and get hash field', async () => {
      await redisService.hset(hashKey, 'field1', 'value1');

      const value = await redisService.hget(hashKey, 'field1');
      expect(value).toBe('value1');
    });

    it('should get all hash fields', async () => {
      await redisService.hset(hashKey, 'field1', 'value1');
      await redisService.hset(hashKey, 'field2', 'value2');
      await redisService.hset(hashKey, 'field3', 'value3');

      const allFields = await redisService.hgetall(hashKey);
      expect(allFields).toEqual({
        field1: 'value1',
        field2: 'value2',
        field3: 'value3',
      });
    });

    it('should delete hash field', async () => {
      await redisService.hset(hashKey, 'field1', 'value1');
      await redisService.hset(hashKey, 'field2', 'value2');

      await redisService.hdel(hashKey, 'field1');

      const value1 = await redisService.hget(hashKey, 'field1');
      const value2 = await redisService.hget(hashKey, 'field2');

      expect(value1).toBeNull();
      expect(value2).toBe('value2');
    });
  });

  describe('IP Range Operations', () => {
    const locationId = 'location-789';
    const ipRangeMapping = {
      tenant_id: 'tenant-123',
      location_id: locationId,
      ip_range: '192.168.1.0/24',
      rate_limit: 1000,
    };

    it('should store IP range mapping', async () => {
      await redisService.storeIPRange(locationId, ipRangeMapping);

      const key = `ip_range:${locationId}`;
      const stored = await redisClient.get(key);
      expect(stored).toBeDefined();
      expect(JSON.parse(stored!)).toEqual(ipRangeMapping);
    });

    it('should publish invalidation when storing IP range', async () => {
      const messages: CacheInvalidationMessage[] = [];
      const subscriber = new Redis(redisUrl);
      await subscriber.select(TEST_DB);

      await subscriber.subscribe('nebula:invalidate');
      subscriber.on('message', (channel, message) => {
        try {
          messages.push(JSON.parse(message));
        } catch (err) {
          // Ignore invalid JSON
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      await redisService.storeIPRange(locationId, ipRangeMapping);

      await new Promise((resolve) => setTimeout(resolve, 500));

      const ipRangeInvalidations = messages.filter(
        (msg) => msg.type === 'ip_ranges',
      );
      expect(ipRangeInvalidations.length).toBeGreaterThan(0);

      await subscriber.quit();
    }, 10000);

    it('should delete IP range mapping', async () => {
      await redisService.storeIPRange(locationId, ipRangeMapping);

      await redisService.deleteIPRange(locationId);

      const key = `ip_range:${locationId}`;
      const stored = await redisClient.get(key);
      expect(stored).toBeNull();
    });

    it('should get all IP range mappings', async () => {
      const mappings = [
        {
          tenant_id: 'tenant-1',
          location_id: 'loc-1',
          ip_range: '10.0.1.0/24',
          rate_limit: 500,
        },
        {
          tenant_id: 'tenant-2',
          location_id: 'loc-2',
          ip_range: '10.0.2.0/24',
          rate_limit: 1000,
        },
        {
          tenant_id: 'tenant-3',
          location_id: 'loc-3',
          ip_range: '10.0.3.0/24',
          rate_limit: 1500,
        },
      ];

      for (const mapping of mappings) {
        await redisService.storeIPRange(mapping.location_id, mapping);
      }

      const allMappings = await redisService.getAllIPRanges();
      expect(allMappings).toHaveLength(3);
      expect(allMappings).toEqual(expect.arrayContaining(mappings));
    });

    it('should return empty array when no IP ranges exist', async () => {
      const allMappings = await redisService.getAllIPRanges();
      expect(allMappings).toEqual([]);
    });
  });

  describe('Connection and Error Handling', () => {
    it('should handle get operation on non-existent key', async () => {
      const value = await redisService.get('non-existent-key');
      expect(value).toBeNull();
    });

    it('should handle concurrent operations without errors', async () => {
      const operations = Array.from({ length: 50 }, (_, i) => ({
        key: `key-${i}`,
        value: `value-${i}`,
      }));

      // Mix of set and get operations
      const promises = operations.flatMap((op) => [
        redisService.set(op.key, op.value),
        redisService.get(op.key),
      ]);

      await expect(Promise.all(promises)).resolves.toBeDefined();
    });

    it('should provide access to underlying Redis client', () => {
      const client = redisService.getClient();
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(Redis);
    });
  });

  describe('Performance Tests', () => {
    it('should handle batch policy operations efficiently', async () => {
      const batchSize = 100;
      const policies = Array.from({ length: batchSize }, (_, i) => ({
        locationId: `location-${i}`,
        policy: {
          tenantId: `tenant-${i}`,
          blockCategories: ['malware'],
        },
      }));

      const startTime = Date.now();

      await Promise.all(
        policies.map((p) =>
          redisService.storeCompiledPolicy(p.locationId, p.policy),
        ),
      );

      const storeTime = Date.now() - startTime;

      const retrieveStartTime = Date.now();

      const results = await Promise.all(
        policies.map((p) => redisService.getCompiledPolicy(p.locationId)),
      );

      const retrieveTime = Date.now() - retrieveStartTime;

      // All policies should be stored and retrieved
      expect(results.filter((r) => r !== null)).toHaveLength(batchSize);

      // Performance assertions (should be fast)
      expect(storeTime).toBeLessThan(5000); // 5 seconds for 100 stores
      expect(retrieveTime).toBeLessThan(5000); // 5 seconds for 100 retrieves
    }, 15000);

    it('should handle high-throughput token operations', async () => {
      const tokenCount = 200;
      const tokens = Array.from({ length: tokenCount }, (_, i) => ({
        hash: `token-hash-${i}`,
        info: { userId: `user-${i}`, role: 'user' },
      }));

      const startTime = Date.now();

      // Store tokens
      await Promise.all(
        tokens.map((t) => redisService.storeToken(t.hash, t.info, 3600)),
      );

      // Retrieve tokens
      const results = await Promise.all(
        tokens.map((t) => redisService.getToken(t.hash)),
      );

      const totalTime = Date.now() - startTime;

      expect(results.filter((r) => r !== null)).toHaveLength(tokenCount);
      expect(totalTime).toBeLessThan(10000); // 10 seconds for 200 operations
    }, 20000);

    it('should handle rapid pub/sub messages', async () => {
      const messageCount = 50;
      const receivedMessages: string[] = [];

      const subscriber = new Redis(redisUrl);
      await subscriber.subscribe('test:performance');

      subscriber.on('message', (channel, message) => {
        receivedMessages.push(message);
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      const startTime = Date.now();

      for (let i = 0; i < messageCount; i++) {
        await redisService.publish('test:performance', `message-${i}`);
      }

      // Wait for all messages to be received
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const totalTime = Date.now() - startTime;

      expect(receivedMessages.length).toBe(messageCount);
      expect(totalTime).toBeLessThan(5000); // Should be fast

      await subscriber.quit();
    }, 15000);
  });

  describe('Data Integrity Tests', () => {
    it('should preserve complex nested objects in policy cache', async () => {
      const complexPolicy = {
        locationId: 'loc-complex',
        tenantId: 'tenant-complex',
        config: {
          blockCategories: ['malware', 'phishing', 'adult'],
          allowDomains: ['example.com', 'test.com'],
          blockDomains: ['evil.com'],
          schedules: [
            {
              name: 'Business Hours',
              days: ['mon', 'tue', 'wed', 'thu', 'fri'],
              startTime: '09:00',
              endTime: '17:00',
              timezone: 'America/New_York',
            },
          ],
          safesearch: {
            enabled: true,
            services: ['google', 'bing', 'youtube'],
          },
        },
      };

      await redisService.storeCompiledPolicy('loc-complex', complexPolicy);
      const retrieved = await redisService.getCompiledPolicy('loc-complex');

      expect(retrieved).toEqual(complexPolicy);
    });

    it('should handle special characters in keys and values', async () => {
      const specialKey = 'key:with:colons:and-dashes_underscores';
      const specialValue = JSON.stringify({
        text: 'Special chars: !@#$%^&*()[]{}|\\;:",.<>?/~`',
        unicode: '🚀 Unicode ✓ characters',
      });

      await redisService.set(specialKey, specialValue);
      const retrieved = await redisService.get(specialKey);

      expect(retrieved).toBe(specialValue);
    });
  });
});
