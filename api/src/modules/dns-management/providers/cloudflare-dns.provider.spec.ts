// Nebula DNS - Cloudflare DNS Provider unit tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net

import { Test, TestingModule } from '@nestjs/testing';
import { CloudflareDnsProvider } from './cloudflare-dns.provider';
import { CfFairQueueService } from '../queue/cf-fair-queue.service';

describe('CloudflareDnsProvider', () => {
  let provider: CloudflareDnsProvider;
  const fetchMock = jest.fn();

  beforeEach(async () => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudflareDnsProvider,
        {
          provide: CfFairQueueService,
          useValue: {
            runPlatform: (_lane: string, fn: () => Promise<unknown>) => fn(),
          },
        },
      ],
    }).compile();

    provider = module.get(CloudflareDnsProvider);
  });

  it('verifyToken calls Cloudflare verify endpoint', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({
        success: true,
        result: { status: 'active', id: 'acct-1' },
      }),
    });

    const result = await provider.verifyToken('test-token');

    expect(result.status).toBe('active');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.cloudflare.com/client/v4/user/tokens/verify',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    );
  });

  it('listAccountZones maps zone payloads', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({
        success: true,
        result: [
          {
            id: 'zone-abc',
            name: 'example.com',
            status: 'active',
            name_servers: ['ns1.cloudflare.com'],
          },
        ],
      }),
    });

    const zones = await provider.listAccountZones('token');
    expect(zones).toHaveLength(1);
    expect(zones[0]).toMatchObject({
      providerZoneId: 'zone-abc',
      name: 'example.com',
      nameServers: ['ns1.cloudflare.com'],
    });
  });

  it('listRecords maps DNS record payloads', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({
        success: true,
        result: [
          {
            id: 'rec-1',
            type: 'A',
            name: 'www.example.com',
            content: '192.0.2.1',
            ttl: 300,
            proxied: true,
          },
        ],
      }),
    });

    const records = await provider.listRecords('token', 'zone-abc');
    expect(records[0].content).toBe('192.0.2.1');
  });
});
