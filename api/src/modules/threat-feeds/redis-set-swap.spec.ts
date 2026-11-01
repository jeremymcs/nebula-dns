import Redis from 'ioredis';
import { swapRedisSet } from './redis-set-swap';
import { threatSetKey, threatStagingKey } from './redis-threat-keys';

describe('redis-set-swap', () => {
  it('uses nebula:threats live and staging keys', async () => {
    const redis = {
      del: jest.fn().mockResolvedValue(1),
      sadd: jest.fn().mockResolvedValue(1),
      rename: jest.fn().mockResolvedValue('OK'),
      expire: jest.fn().mockResolvedValue(1),
    } as unknown as Redis;

    await swapRedisSet(
      redis,
      threatSetKey('malware'),
      threatStagingKey('malware'),
      ['evil.example.com'],
      3600,
    );

    expect(redis.sadd).toHaveBeenCalledWith(
      threatStagingKey('malware'),
      'evil.example.com',
    );
    expect(redis.rename).toHaveBeenCalledWith(
      threatStagingKey('malware'),
      threatSetKey('malware'),
    );
  });
});
