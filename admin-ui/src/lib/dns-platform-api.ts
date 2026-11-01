/**
 * Admin DNS Platform API helpers
 */
import { API_URL } from '@/lib/api';
import { fetchJson } from '@/lib/http-json';

function authHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  if (!token) {
    throw new Error('Admin authentication required');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export interface PlatformConnectionStatus {
  id: string;
  label: string;
  provider: string;
  purpose: string;
  status: string;
  verifiedAt: string | null;
  tokenFingerprint: string;
  accountId?: string;
  inventorySyncedAt?: string;
}

export interface AdminZoneRow {
  providerZoneId: string;
  zoneName: string;
  status: string;
  nameServers: string[];
  assignmentId?: string;
  tenantId?: string;
  tenantName?: string;
}

type ConnectionEnvelope = {
  connection: PlatformConnectionStatus | null;
};

export async function fetchPlatformConnection(): Promise<PlatformConnectionStatus | null> {
  const body = await fetchJson<ConnectionEnvelope>(
    `${API_URL}/admin/dns-management/connection`,
    { headers: authHeaders() },
    { fallback: { connection: null } },
  );
  return body.connection ?? null;
}

export async function savePlatformConnection(input: {
  label: string;
  apiToken: string;
  accountId?: string;
}): Promise<PlatformConnectionStatus> {
  return fetchJson<PlatformConnectionStatus>(
    `${API_URL}/admin/dns-management/connection`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(input),
    },
  );
}

export async function discoverPlatformAccounts(apiToken: string): Promise<
  Array<{ id: string; name: string }>
> {
  return fetchJson<Array<{ id: string; name: string }>>(
    `${API_URL}/admin/dns-management/connection/discover-accounts`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ apiToken }),
    },
    { fallback: [] },
  );
}

export async function syncPlatformZones(): Promise<AdminZoneRow[]> {
  return fetchJson<AdminZoneRow[]>(
    `${API_URL}/admin/dns-management/zones/sync`,
    {
      method: 'POST',
      headers: authHeaders(),
    },
    { fallback: [] },
  );
}

export async function listPlatformZones(): Promise<AdminZoneRow[]> {
  return fetchJson<AdminZoneRow[]>(
    `${API_URL}/admin/dns-management/zones`,
    { headers: authHeaders() },
    { fallback: [] },
  );
}

export interface CreatePlatformZoneResult {
  providerZoneId: string;
  zoneName: string;
  status: string;
  nameServers: string[];
  assignmentId?: string;
  tenantId?: string;
}

export async function assignZone(
  providerZoneId: string,
  body: {
    tenantId: string;
    canEditRecords?: boolean;
    canToggleProxy?: boolean;
    canDeleteRecords?: boolean;
  },
) {
  return fetchJson<unknown>(
    `${API_URL}/admin/dns-management/zones/${encodeURIComponent(providerZoneId)}/assign`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    },
  );
}

export async function createPlatformZone(body: {
  name: string;
  tenantId?: string;
}): Promise<CreatePlatformZoneResult> {
  return fetchJson<CreatePlatformZoneResult>(
    `${API_URL}/admin/dns-management/zones`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    },
  );
}
