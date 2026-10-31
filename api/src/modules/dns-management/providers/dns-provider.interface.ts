import { DnsProvisioningModel } from '../enums/dns-provisioning-model.enum';

export interface DnsProviderZone {
  providerZoneId: string;
  name: string;
  status: string;
  nameServers: string[];
}

export interface DnsProviderRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied?: boolean;
  priority?: number;
}

export interface RecordListQuery {
  type?: string;
  name?: string;
  page?: number;
  perPage?: number;
}

export interface CreateRecordInput {
  type: string;
  name: string;
  content: string;
  ttl?: number;
  proxied?: boolean;
  priority?: number;
}

export interface UpdateRecordInput {
  type?: string;
  name?: string;
  content?: string;
  ttl?: number;
  proxied?: boolean;
  priority?: number;
}

export interface DnsProviderCredentials {
  model: DnsProvisioningModel;
  connectionId: string;
  apiToken: string;
}

export interface TokenVerifyResult {
  status: 'active' | 'invalid';
  accountId?: string;
  scopes?: string[];
}

export interface DnsProvider {
  verifyToken(apiToken: string): Promise<TokenVerifyResult>;
  listAccountZones(apiToken: string): Promise<DnsProviderZone[]>;
  createZone(
    apiToken: string,
    input: { name: string; accountId?: string },
  ): Promise<DnsProviderZone>;
  listRecords(
    apiToken: string,
    providerZoneId: string,
    query?: RecordListQuery,
  ): Promise<DnsProviderRecord[]>;
  createRecord(
    apiToken: string,
    providerZoneId: string,
    input: CreateRecordInput,
  ): Promise<DnsProviderRecord>;
  updateRecord(
    apiToken: string,
    providerZoneId: string,
    recordId: string,
    input: UpdateRecordInput,
  ): Promise<DnsProviderRecord>;
  deleteRecord(
    apiToken: string,
    providerZoneId: string,
    recordId: string,
  ): Promise<void>;
}

export const DNS_PROVIDER = Symbol('DNS_PROVIDER');
