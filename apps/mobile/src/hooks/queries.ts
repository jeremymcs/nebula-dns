import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';

export function useAdminStats() {
  const { api } = useAuth();
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.get<{ data: Record<string, unknown> }>('/admin/stats'),
  });
}

export function useAdminMsps(search: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ['admin', 'msps', search],
    queryFn: () =>
      api.get<{ data: Array<{ id: string; name: string; status?: string }> }>(
        `/admin/msp/tenants${search ? `?search=${encodeURIComponent(search)}` : ''}`,
      ),
  });
}

export function useAdminTenants(search: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ['admin', 'tenants', search],
    queryFn: () =>
      api.get<{ data: unknown[]; total?: number }>(
        `/admin/tenants?search=${encodeURIComponent(search)}&limit=50`,
      ),
    retry: false,
  });
}

export function useAdminHealth() {
  const { api } = useAuth();
  return useQuery({
    queryKey: ['admin', 'health'],
    queryFn: () => api.get<Record<string, unknown>>('/admin/system/health'),
  });
}

export function useAdminCertificates() {
  const { api } = useAuth();
  return useQuery({
    queryKey: ['admin', 'certificates'],
    queryFn: () =>
      api.get<{ data: Array<{ name: string; expiresAt?: string; daysRemaining?: number }> }>(
        '/admin/system/certificates',
      ),
    retry: false,
  });
}

export function useAdminAudit(search: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ['admin', 'audit', search],
    queryFn: () =>
      api.get<{ data: Array<{ id: string; action: string; createdAt: string }> }>(
        `/admin/audit/logs?limit=50${search ? `&search=${encodeURIComponent(search)}` : ''}`,
      ),
    retry: false,
  });
}

export function useAdminSessions() {
  const { api } = useAuth();
  return useQuery({
    queryKey: ['admin', 'sessions'],
    queryFn: () =>
      api.get<{ data: Array<{ id: string; deviceInfo?: string; lastActiveAt?: string; current?: boolean }> }>(
        '/admin/sessions',
      ),
  });
}

export function useMspClients(search: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ['msp', 'clients', search],
    queryFn: () =>
      api.get<{ data: Array<{ id: string; name: string; status?: string }> }>(
        `/msp/clients${search ? `?search=${encodeURIComponent(search)}` : ''}`,
      ),
  });
}

export function useAgents() {
  const { api } = useAuth();
  return useQuery({
    queryKey: ['agents'],
    queryFn: () =>
      api.get<{ data: Array<{ id: string; name: string; status?: string; lastSeenAt?: string }> }>(
        '/agents',
      ),
  });
}

export function usePolicies() {
  const { api } = useAuth();
  return useQuery({
    queryKey: ['policies'],
    queryFn: () =>
      api.get<{ data: Array<{ id: string; name: string; enabled?: boolean }> }>('/policies'),
  });
}

export function useLists() {
  const { api } = useAuth();
  return useQuery({
    queryKey: ['lists'],
    queryFn: () =>
      api.get<{ data: Array<{ id: string; name: string; type?: string }> }>('/lists'),
  });
}

export function useQueryLogs(search: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ['reports', 'logs', search],
    queryFn: () =>
      api.get<{ data: unknown[] }>(
        `/reports/logs?limit=50${search ? `&domain=${encodeURIComponent(search)}` : ''}`,
      ),
    enabled: search.length >= 2,
  });
}

export function useDnsZones() {
  const { api } = useAuth();
  return useQuery({
    queryKey: ['dns', 'zones'],
    queryFn: () =>
      api.get<{ data: Array<{ id: string; name: string; status?: string }> }>(
        '/dns-management/zones',
      ),
    retry: false,
  });
}

export function useMobileDevices(mode: 'admin' | 'tenant') {
  const { api } = useAuth();
  const path = mode === 'admin' ? '/admin/mobile/devices' : '/auth/mobile/devices';
  return useQuery({
    queryKey: ['mobile', 'devices', mode],
    queryFn: () =>
      api.get<{ data: Array<{ id: string; deviceName?: string; platform: string }> }>(path),
  });
}

export function useNotificationPrefs(mode: 'admin' | 'tenant') {
  const { api } = useAuth();
  const path =
    mode === 'admin' ? '/admin/notifications/preferences' : '/notifications/preferences';
  return useQuery({
    queryKey: ['notifications', 'preferences', mode],
    queryFn: () => api.get<{ data: Array<{ channel: string; enabled: boolean }> }>(path),
  });
}
