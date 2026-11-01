/**
 * Admin DNS Platform API helpers
 */
import { API_URL } from '@/lib/api';

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

export async function fetchPlatformConnection(): Promise<PlatformConnectionStatus | null> {
  const res = await fetch(`${API_URL}/admin/dns-management/connection`, {
    headers: authHeaders(),
  });
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to load connection');
  }
  const body = await res.json();
  return body ?? null;
}

export async function savePlatformConnection(input: {
  label: string;
  apiToken: string;
}): Promise<PlatformConnectionStatus> {
  const res = await fetch(`${API_URL}/admin/dns-management/connection`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to save connection');
  }
  return res.json();
}

export async function syncPlatformZones(): Promise<AdminZoneRow[]> {
  const res = await fetch(`${API_URL}/admin/dns-management/zones/sync`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Sync failed');
  }
  return res.json();
}

export async function listPlatformZones(): Promise<AdminZoneRow[]> {
  const res = await fetch(`${API_URL}/admin/dns-management/zones`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to list zones');
  }
  return res.json();
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
  const res = await fetch(
    `${API_URL}/admin/dns-management/zones/${encodeURIComponent(providerZoneId)}/assign`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Assign failed');
  }
  return res.json();
}

export async function createPlatformZone(body: {
  name: string;
  tenantId?: string;
}) {
  const res = await fetch(`${API_URL}/admin/dns-management/zones`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Create zone failed');
  }
  return res.json();
}
