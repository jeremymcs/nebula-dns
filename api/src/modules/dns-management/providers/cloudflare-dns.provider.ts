// Nebula DNS - Cloudflare DNS Provider
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net

import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  CreateRecordInput,
  DnsProvider,
  DnsProviderRecord,
  DnsProviderZone,
  RecordListQuery,
  TokenVerifyResult,
  UpdateRecordInput,
} from './dns-provider.interface';
import { CfFairQueueService } from '../queue/cf-fair-queue.service';

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

interface CloudflareResponse<T> {
  success: boolean;
  errors?: Array<{ code: number; message: string }>;
  result: T;
  result_info?: {
    page: number;
    per_page: number;
    total_count: number;
  };
}

@Injectable()
export class CloudflareDnsProvider implements DnsProvider {
  private readonly logger = new Logger(CloudflareDnsProvider.name);

  constructor(private readonly fairQueue: CfFairQueueService) {}

  async verifyToken(apiToken: string): Promise<TokenVerifyResult> {
    const data = await this.request<{ status: string; id?: string }>(
      apiToken,
      '/user/tokens/verify',
      { method: 'GET' },
      'admin',
    );

    if (data.status !== 'active') {
      return { status: 'invalid' };
    }

    return {
      status: 'active',
      accountId: data.id,
      scopes: [],
    };
  }

  async listAccountZones(apiToken: string): Promise<DnsProviderZone[]> {
    const zones: DnsProviderZone[] = [];
    let page = 1;
    const perPage = 50;

    while (true) {
      const result = await this.request<
        Array<{
          id: string;
          name: string;
          status: string;
          name_servers?: string[];
        }>
      >(
        apiToken,
        `/zones?page=${page}&per_page=${perPage}`,
        { method: 'GET' },
        'admin',
      );

      for (const zone of result) {
        zones.push({
          providerZoneId: zone.id,
          name: zone.name,
          status: zone.status,
          nameServers: zone.name_servers ?? [],
        });
      }

      if (result.length < perPage) {
        break;
      }
      page += 1;
    }

    return zones;
  }

  async createZone(
    apiToken: string,
    input: { name: string; accountId?: string },
  ): Promise<DnsProviderZone> {
    const body: Record<string, unknown> = {
      name: input.name,
      jump_start: false,
    };
    if (input.accountId) {
      body.account = { id: input.accountId };
    }

    const zone = await this.request<{
      id: string;
      name: string;
      status: string;
      name_servers?: string[];
    }>(
      apiToken,
      '/zones',
      { method: 'POST', body: JSON.stringify(body) },
      'admin',
    );

    return {
      providerZoneId: zone.id,
      name: zone.name,
      status: zone.status,
      nameServers: zone.name_servers ?? [],
    };
  }

  async listRecords(
    apiToken: string,
    providerZoneId: string,
    query?: RecordListQuery,
  ): Promise<DnsProviderRecord[]> {
    const params = new URLSearchParams();
    if (query?.type) {
      params.set('type', query.type);
    }
    if (query?.name) {
      params.set('name', query.name);
    }
    params.set('page', String(query?.page ?? 1));
    params.set('per_page', String(query?.perPage ?? 100));

    const records = await this.request<
      Array<{
        id: string;
        type: string;
        name: string;
        content: string;
        ttl: number;
        proxied?: boolean;
        priority?: number;
      }>
    >(
      apiToken,
      `/zones/${encodeURIComponent(providerZoneId)}/dns_records?${params.toString()}`,
      { method: 'GET' },
      'tenant',
    );

    return records.map((record) => ({
      id: record.id,
      type: record.type,
      name: record.name,
      content: record.content,
      ttl: record.ttl,
      proxied: record.proxied,
      priority: record.priority,
    }));
  }

  async createRecord(
    apiToken: string,
    providerZoneId: string,
    input: CreateRecordInput,
  ): Promise<DnsProviderRecord> {
    const record = await this.request<{
      id: string;
      type: string;
      name: string;
      content: string;
      ttl: number;
      proxied?: boolean;
      priority?: number;
    }>(
      apiToken,
      `/zones/${encodeURIComponent(providerZoneId)}/dns_records`,
      { method: 'POST', body: JSON.stringify(input) },
      'tenant',
    );

    return {
      id: record.id,
      type: record.type,
      name: record.name,
      content: record.content,
      ttl: record.ttl,
      proxied: record.proxied,
      priority: record.priority,
    };
  }

  async updateRecord(
    apiToken: string,
    providerZoneId: string,
    recordId: string,
    input: UpdateRecordInput,
  ): Promise<DnsProviderRecord> {
    const record = await this.request<{
      id: string;
      type: string;
      name: string;
      content: string;
      ttl: number;
      proxied?: boolean;
      priority?: number;
    }>(
      apiToken,
      `/zones/${encodeURIComponent(providerZoneId)}/dns_records/${encodeURIComponent(recordId)}`,
      { method: 'PATCH', body: JSON.stringify(input) },
      'tenant',
    );

    return {
      id: record.id,
      type: record.type,
      name: record.name,
      content: record.content,
      ttl: record.ttl,
      proxied: record.proxied,
      priority: record.priority,
    };
  }

  async deleteRecord(
    apiToken: string,
    providerZoneId: string,
    recordId: string,
  ): Promise<void> {
    await this.request<unknown>(
      apiToken,
      `/zones/${encodeURIComponent(providerZoneId)}/dns_records/${encodeURIComponent(recordId)}`,
      { method: 'DELETE' },
      'tenant',
    );
  }

  private async request<T>(
    apiToken: string,
    path: string,
    init: RequestInit,
    lane: 'admin' | 'tenant',
  ): Promise<T> {
    if (!path.startsWith('/')) {
      throw new BadRequestException('Invalid Cloudflare API path');
    }

    const url = `${CF_API_BASE}${path}`;
    if (!url.startsWith(CF_API_BASE)) {
      throw new BadRequestException('Invalid Cloudflare API URL');
    }

    return this.fairQueue.runPlatform(lane, async () => {
      const response = await fetch(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
          ...(init.headers as Record<string, string>),
        },
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') ?? '60';
        throw new BadGatewayException({
          message: 'Cloudflare rate limit exceeded',
          retryAfter,
        });
      }

      const payload = (await response.json()) as CloudflareResponse<T>;

      if (!response.ok || !payload.success) {
        const message =
          payload.errors?.map((e) => e.message).join('; ') ||
          `Cloudflare API error (${response.status})`;
        this.logger.warn(`Cloudflare request failed: ${message}`);
        throw new BadRequestException(message);
      }

      return payload.result;
    });
  }
}
