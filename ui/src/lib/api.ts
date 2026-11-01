// API_URL is server-side only (no NEXT_PUBLIC_ prefix). On the client, we
// route through the Next.js /backend proxy (see next.config.js rewrites) so
// the browser never needs to reach the API directly.
export const API_URL =
  typeof window === 'undefined'
    ? process.env.API_URL || 'http://localhost:4010'
    : '/backend'

export const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4011'
export const ADMIN_UI_URL = process.env.ADMIN_UI_URL || process.env.NEXT_PUBLIC_ADMIN_UI_URL || 'http://localhost:4012'

interface RequestOptions extends RequestInit {
  token?: string
}

class ApiError extends Error {
  status: number
  
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  } else if (typeof window !== 'undefined') {
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      headers['Authorization'] = `Bearer ${storedToken}`
    }
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw new ApiError(error.message || 'Request failed', response.status)
  }
  
  if (response.status === 204) {
    return {} as T
  }
  
  return response.json()
}

export const api = {
  // Generic HTTP methods for custom endpoints
  get: <T = any>(endpoint: string) => request<T>(endpoint),

  post: <T = any>(endpoint: string, data?: any) =>
    request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T = any>(endpoint: string, data?: any) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = any>(endpoint: string, data?: any) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = any>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),

  // Auth
  login: (email: string, password: string) =>
    request<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  regenerateBackupCodes: () =>
    request<{ backupCodes: string[] }>('/mfa/backup-codes', { method: 'POST' }),

  // Policies
  getPolicies: (cursor?: string) =>
    request<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>(
      `/policies${cursor ? `?cursor=${cursor}` : ''}`
    ),

  getPolicy: (id: string) => request<any>(`/policies/${id}`),

  createPolicy: (data: any) =>
    request<any>('/policies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updatePolicy: (id: string, data: any) =>
    request<any>(`/policies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getPolicyVersions: (id: string) =>
    request<any[]>(`/policies/${id}/versions`),

  getPolicyVersion: (id: string, versionId: string) =>
    request<any>(`/policies/${id}/versions/${versionId}`),

  rollbackPolicy: (id: string, versionId: string) =>
    request<any>(`/policies/${id}/rollback`, {
      method: 'POST',
      body: JSON.stringify({ versionId }),
    }),
  
  // Locations
  getLocations: (cursor?: string) =>
    request<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>(
      `/locations${cursor ? `?cursor=${cursor}` : ''}`
    ),
  
  getLocation: (id: string) => request<any>(`/locations/${id}`),
  
  createLocation: (data: any) =>
    request<any>('/locations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateLocation: (id: string, data: { name?: string; description?: string; policyId?: string; status?: 'active' | 'inactive'; settings?: Record<string, any> }) =>
    request<any>(`/locations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  createLocationToken: (locationId: string, data: any) =>
    request<{ token: string; tokenId: string; expiresAt: string | null }>(
      `/locations/${locationId}/tokens`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  getLocationTokens: (locationId: string) =>
    request<{ data: Array<{ id: string; label: string; createdAt: string; expiresAt: string | null; lastUsedAt: string | null }> }>(
      `/locations/${locationId}/tokens`
    ),

  revokeLocationToken: (locationId: string, tokenId: string) =>
    request<void>(`/locations/${locationId}/tokens/${tokenId}`, {
      method: 'DELETE',
    }),

  // Lists
  getLists: (type?: 'allowlist' | 'blocklist') =>
    request<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>(
      `/lists${type ? `?type=${type}` : ''}`
    ),
  
  createList: (data: { name: string; description?: string; type: 'allowlist' | 'blocklist' }) =>
    request<any>('/lists', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  getListEntries: (listId: string, cursor?: string) =>
    request<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>(
      `/lists/${listId}/entries${cursor ? `?cursor=${cursor}` : ''}`
    ),
  
  addListEntry: (listId: string, data: { domain: string; comment?: string }) =>
    request<any>(`/lists/${listId}/entries`, {
      method: 'POST',
      body: JSON.stringify({ entries: [data] }),
    }),
  
  bulkAddListEntries: (listId: string, domains: string[]) =>
    request<{ added: number; skipped: number }>(`/lists/${listId}/entries`, {
      method: 'POST',
      body: JSON.stringify({ entries: domains.map(domain => ({ domain })) }),
    }),
  
  addListEntries: (listId: string, entries: any[]) =>
    request<{ added: number; skipped: number }>(`/lists/${listId}/entries`, {
      method: 'POST',
      body: JSON.stringify({ entries }),
    }),
  
  // Reports
  getSummary: (period: string = '7d') =>
    request<any>(`/reports/summary?period=${period}`),
  
  getTopBlocked: (period: string = '7d', limit: number = 10) =>
    request<any[]>(`/reports/top-blocked?period=${period}&limit=${limit}`),
  
  getBlocksByCategory: (period: string = '7d') =>
    request<any[]>(`/reports/blocks-by-category?period=${period}`),
  
  // Users
  getUsers: (cursor?: string) =>
    request<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>(
      `/users${cursor ? `?cursor=${cursor}` : ''}`
    ),
  
  createUser: (data: any) =>
    request<any>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateUser: (id: string, data: any) =>
    request<any>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteUser: (id: string) =>
    request<void>(`/users/${id}`, { method: 'DELETE' }),

  suspendUser: (id: string) =>
    request<void>(`/users/${id}/suspend`, { method: 'POST' }),

  reactivateUser: (id: string) =>
    request<void>(`/users/${id}/reactivate`, { method: 'POST' }),

  adminResetPassword: (id: string) =>
    request<{ temporaryPassword: string }>(`/users/${id}/reset-password`, { method: 'POST' }),

  // Query Logs
  getQueryLogs: (params?: {
    cursor?: string
    limit?: number
    action?: string
    locationId?: string
    domain?: string
    dateFrom?: string
    dateTo?: string
    queryType?: string
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.cursor) searchParams.set('cursor', params.cursor)
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.action) searchParams.set('action', params.action)
    if (params?.locationId) searchParams.set('locationId', params.locationId)
    if (params?.domain) searchParams.set('domain', params.domain)
    if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom)
    if (params?.dateTo) searchParams.set('dateTo', params.dateTo)
    if (params?.queryType) searchParams.set('queryType', params.queryType)
    const query = searchParams.toString()
    return request<{ 
      data: any[]
      pagination: { cursor: string | null; hasMore: boolean }
      total: number
    }>(`/reports/logs${query ? `?${query}` : ''}`)
  },

  // MFA
  getMfaStatus: () => request<{ enabled: boolean; backupCodesRemaining: number }>('/mfa/status'),
  
  setupMfa: () => request<{ secret: string; qrCode: string }>('/mfa/setup', { method: 'POST' }),
  
  verifyMfa: (code: string) =>
    request<{ backupCodes: string[] }>('/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  
  disableMfa: (password: string, code: string) =>
    request<void>('/mfa/disable', {
      method: 'POST',
      body: JSON.stringify({ password, code }),
    }),

  // SSO
  getSsoConfig: () => request<any>('/sso/config'),
  
  configureSaml: (data: any) =>
    request<any>('/sso/saml/configure', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  configureOidc: (data: any) =>
    request<any>('/sso/oidc/configure', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  testSsoConnection: (type: 'saml' | 'oidc') =>
    request<{ success: boolean; error?: string }>(`/sso/${type}/test`, { method: 'POST' }),

  // Agents
  getAgents: (cursor?: string) =>
    request<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>(
      `/agents${cursor ? `?cursor=${cursor}` : ''}`
    ),
  
  getAgentStats: () => request<any>('/agents/stats'),
  
  getAgentVersions: () => request<any[]>('/agents/versions'),
  
  generateAgentDownloadLink: (platform: string, locationId?: string) =>
    request<{ downloadUrl: string; token: string; expiresAt: string }>('/agents/download-link', {
      method: 'POST',
      body: JSON.stringify({ platform, locationId }),
    }),

  // Block Pages
  getBlockPages: () =>
    request<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>('/block-pages'),
  
  createBlockPage: (data: any) =>
    request<any>('/block-pages', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  updateBlockPage: (id: string, data: any) =>
    request<any>(`/block-pages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  
  getAccessRequests: () =>
    request<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>('/block-pages/access-requests'),
  
  reviewAccessRequest: (
    id: string,
    status: 'approved' | 'denied',
    options?: { reviewNote?: string; expiresInHours?: number; addToAllowList?: boolean },
  ) =>
    request<any>(`/block-pages/access-requests/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ status, ...options }),
    }),

  getShieldCaMetadata: () => request<{ data: any }>('/shield-ca/metadata'),

  shieldCaDownloadUrl: (path: string) => `/backend${path}`,

  // API Keys
  getApiKeys: () =>
    request<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>('/api-keys'),
  
  createApiKey: (data: { name: string; scopes: string[]; expiresAt?: string; rateLimit?: number }) =>
    request<{ key: string; keyId: string; name: string }>('/api-keys', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  revokeApiKey: (id: string) =>
    request<void>(`/api-keys/${id}/revoke`, { method: 'POST' }),

  // Team Invitations
  getInvitations: () =>
    request<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>('/invitations'),
  
  sendInvitation: (data: { email: string; role: string; message?: string }) =>
    request<any>('/invitations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  resendInvitation: (id: string) =>
    request<void>(`/invitations/${id}/resend`, { method: 'POST' }),
  
  revokeInvitation: (id: string) =>
    request<void>(`/invitations/${id}`, { method: 'DELETE' }),

  // SIEM Integrations
  getSiemIntegrations: () =>
    request<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>('/siem'),
  
  createSiemIntegration: (type: string, data: any) =>
    request<any>(`/siem/${type}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  testSiemIntegration: (id: string) =>
    request<{ success: boolean; message: string }>(`/siem/${id}/test`, { method: 'POST' }),

  updateSiemIntegration: (id: string, data: any) =>
    request<any>(`/siem/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteSiemIntegration: (id: string) =>
    request<void>(`/siem/${id}`, { method: 'DELETE' }),

  // Webhooks
  getWebhooks: () =>
    request<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>('/webhooks'),
  
  getWebhookEvents: () => request<string[]>('/webhooks/events'),
  
  createWebhook: (data: { url: string; events: string[]; secret?: string; headers?: Record<string, string> }) =>
    request<any>('/webhooks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  testWebhook: (id: string) =>
    request<{ success: boolean; statusCode: number }>(`/webhooks/${id}/test`, { method: 'POST' }),

  updateWebhook: (id: string, data: { url?: string; events?: string[]; secret?: string; isEnabled?: boolean }) =>
    request<any>(`/webhooks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteWebhook: (id: string) =>
    request<void>(`/webhooks/${id}`, { method: 'DELETE' }),

  // Scheduled Reports
  getScheduledReports: () =>
    request<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>('/scheduled-reports'),

  createScheduledReport: (data: any) =>
    request<any>('/scheduled-reports', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  runScheduledReport: (id: string) =>
    request<void>(`/scheduled-reports/${id}/run`, { method: 'POST' }),

  // Audit Logs
  getAuditLogs: (params?: { cursor?: string; limit?: number; action?: string; resourceType?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.cursor) searchParams.set('cursor', params.cursor)
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.action) searchParams.set('action', params.action)
    if (params?.resourceType) searchParams.set('resourceType', params.resourceType)
    const query = searchParams.toString()
    return request<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>(`/audit-logs${query ? `?${query}` : ''}`)
  },

  // Sessions
  getSessions: () =>
    request<{ data: any[] }>('/auth/sessions'),

  revokeSession: (sessionId: string) =>
    request<void>(`/auth/sessions/${sessionId}`, { method: 'DELETE' }),

  revokeAllSessions: () =>
    request<void>('/auth/sessions', { method: 'DELETE' }),

  // Insights (AI-generated security insights)
  getInsights: (period?: string) =>
    request<any>(`/reports/insights${period ? `?period=${period}` : ''}`),

  // Security Score
  getSecurityScore: () =>
    request<any>('/reports/security-score'),

  // Threat data for mission control
  getThreatData: (period?: string) =>
    request<any>(`/reports/threats${period ? `?period=${period}` : ''}`),

  getQueryTrends: (period?: string) =>
    request<any>(`/reports/trends${period ? `?period=${period}` : ''}`),

  // Investigation
  investigateDomain: (domain: string) =>
    request<any>(`/reports/investigate?domain=${encodeURIComponent(domain)}`),

  // Playbooks
  getPlaybooks: () =>
    request<{ data: any[] }>('/playbooks'),

  createPlaybook: (data: any) =>
    request<any>('/playbooks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updatePlaybook: (id: string, data: any) =>
    request<any>(`/playbooks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deletePlaybook: (id: string) =>
    request<void>(`/playbooks/${id}`, { method: 'DELETE' }),

  runPlaybook: (id: string) =>
    request<any>(`/playbooks/${id}/run`, { method: 'POST' }),

  // Policy Templates
  getPolicyTemplates: () =>
    request<{ data: any[] }>('/policy-templates'),

  getPolicyTemplate: (id: string) =>
    request<any>(`/policy-templates/${id}`),

  // Subscriptions
  getSubscription: () => request<any>('/subscriptions/current'),

  getPlans: () => request<{ data: any[] }>('/plans'),

  // Tenant/Organization Settings
  updateTenant: (data: any) =>
    request<any>('/tenants/current', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // MSP
  getMspClients: () =>
    request<{ clients: any[] }>('/msp/clients'),

  getMspClient: (id: string) =>
    request<any>(`/msp/clients/${id}`),

  createMspClient: (data: {
    name: string;
    slug?: string;
    plan?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    industry?: string;
    companySize?: string;
  }) =>
    request<any>('/msp/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateMspClient: (id: string, data: {
    name?: string;
    plan?: string;
    status?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    industry?: string;
    companySize?: string;
  }) =>
    request<any>(`/msp/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteMspClient: (id: string) =>
    request<void>(`/msp/clients/${id}`, { method: 'DELETE' }),

  switchOrganization: (orgId: string) =>
    request<{ accessToken: string; refreshToken: string; user: any }>('/msp/switch', {
      method: 'POST',
      body: JSON.stringify({ organizationId: orgId }),
    }),

  // MSP Billing
  getMspBillingOverview: () =>
    request<{
      partnerId: string;
      status: string;
      queryBalance: number;
      totalPurchased: number;
      totalUsed: number;
      currentOverage: number;
      overageRate: number;
      alertThreshold: number | null;
      autoPurchaseEnabled: boolean;
      billingPeriodStart: string | null;
      billingPeriodEnd: string | null;
      usageThisMonth: number;
      estimatedCost: number;
    }>('/msp/billing/overview'),

  updateMspBillingSettings: (data: {
    overageRate?: number;
    alertThreshold?: number | null;
    autoPurchaseThreshold?: number | null;
    autoPurchaseBundleId?: string | null;
  }) =>
    request<any>('/msp/billing/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getMspBundles: () =>
    request<{
      id: string;
      name: string;
      description: string;
      queryCount: string;
      price: string;
      pricePerMillion: string;
      validityDays: number;
      isActive: boolean;
    }[]>('/msp/billing/bundles'),

  purchaseMspBundle: (bundleId: string, paymentMethodId?: string) =>
    request<any>('/msp/billing/bundles/purchase', {
      method: 'POST',
      body: JSON.stringify({ bundleId, paymentMethodId }),
    }),

  getMspPurchases: (params?: { page?: number; limit?: number }) =>
    request<{ purchases: any[]; total: number }>(`/msp/billing/purchases${params ? `?page=${params.page || 1}&limit=${params.limit || 10}` : ''}`),

  getMspUsage: (params?: { startDate?: string; endDate?: string }) =>
    request<{ usageByDate: any[]; totalQueries: number; totalBlocked: number }>('/msp/billing/usage', {
      ...(params && { body: JSON.stringify(params) }),
    }),

  getMspUsageByTenant: (params?: { startDate?: string; endDate?: string }) =>
    request<{ usageByTenant: any[] }>(`/msp/billing/usage/by-tenant${params ? `?startDate=${params.startDate || ''}&endDate=${params.endDate || ''}` : ''}`),

  getMspRealTimeUsage: () =>
    request<{
      todayQueries: number;
      todayBlocked: number;
      todayThreats: number;
      lastHourQueries: number;
      byTenant: { tenantId: string; tenantName: string; queries: number }[];
    }>('/msp/billing/usage/realtime'),

  getMspInvoices: (params?: { page?: number; limit?: number }) =>
    request<{ invoices: any[]; total: number }>(`/msp/billing/invoices${params ? `?page=${params.page || 1}&limit=${params.limit || 10}` : ''}`),

  getMspInvoice: (id: string) =>
    request<any>(`/msp/billing/invoices/${id}`),

  // Client-specific operations (per-client view)
  getClientZones: (clientId: string) =>
    request<{ zones: any[] }>(`/msp/clients/${clientId}/zones`),

  createClientZone: (clientId: string, data: { name: string; type: string; ipAddresses?: string[] }) =>
    request<any>(`/msp/clients/${clientId}/zones`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateClientZone: (clientId: string, zoneId: string, data: { name?: string; status?: string }) =>
    request<any>(`/msp/clients/${clientId}/zones/${zoneId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteClientZone: (clientId: string, zoneId: string) =>
    request<void>(`/msp/clients/${clientId}/zones/${zoneId}`, { method: 'DELETE' }),

  getClientPolicies: (clientId: string) =>
    request<{ policies: any[] }>(`/msp/clients/${clientId}/policies`),

  createClientPolicy: (clientId: string, data: { name: string; description?: string; enabled?: boolean }) =>
    request<any>(`/msp/clients/${clientId}/policies`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateClientPolicy: (clientId: string, policyId: string, data: { name?: string; enabled?: boolean }) =>
    request<any>(`/msp/clients/${clientId}/policies/${policyId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteClientPolicy: (clientId: string, policyId: string) =>
    request<void>(`/msp/clients/${clientId}/policies/${policyId}`, { method: 'DELETE' }),

  getClientUsers: (clientId: string) =>
    request<{ users: any[] }>(`/msp/clients/${clientId}/users`),

  inviteClientUser: (clientId: string, data: { email: string; role: string; name?: string }) =>
    request<any>(`/msp/clients/${clientId}/users/invite`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateClientUser: (clientId: string, userId: string, data: { role?: string }) =>
    request<any>(`/msp/clients/${clientId}/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  removeClientUser: (clientId: string, userId: string) =>
    request<void>(`/msp/clients/${clientId}/users/${userId}`, { method: 'DELETE' }),

  getClientStats: (clientId: string) =>
    request<any>(`/msp/clients/${clientId}/stats`),

  getClientQueryLogs: (clientId: string, params?: { limit?: number; offset?: number }) =>
    request<{ logs: any[] }>(`/msp/clients/${clientId}/logs${params ? `?limit=${params.limit || 50}` : ''}`),

  // MSP Templates
  getMspTemplates: () =>
    request<{ templates: any[] }>('/msp/templates'),

  getMspTemplate: (id: string) =>
    request<any>(`/msp/templates/${id}`),

  createMspTemplate: (data: {
    name: string;
    description?: string;
    config: any;
    isDefault?: boolean;
    category?: string;
    tags?: string[];
  }) =>
    request<any>('/msp/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateMspTemplate: (id: string, data: {
    name?: string;
    description?: string;
    config?: any;
    isDefault?: boolean;
    category?: string;
    tags?: string[];
  }) =>
    request<any>(`/msp/templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteMspTemplate: (id: string) =>
    request<void>(`/msp/templates/${id}`, { method: 'DELETE' }),

  deployMspTemplate: (templateId: string, data: {
    tenantIds: string[];
    mode?: 'new_tenant' | 'overlay';
  }) =>
    request<{
      success: boolean;
      totalTenants: number;
      successfulDeployments: number;
      failedDeployments: number;
      results: Array<{
        tenantId: string;
        status: 'success' | 'failed';
        policyId?: string;
        error?: string;
      }>;
    }>(`/msp/templates/${templateId}/deploy`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMspTemplateDeployments: (templateId: string, limit?: number) =>
    request<{ deployments: any[] }>(`/msp/templates/${templateId}/deployments${limit ? `?limit=${limit}` : ''}`),

  // Family
  getFamilyMembers: () =>
    request<{ data: any[] }>('/family/members'),

  getFamilyMember: (id: string) =>
    request<{ data: any }>(`/family/members/${id}`),

  createFamilyMember: (data: { name: string; avatar: string; role: 'parent' | 'teen' | 'child'; restrictions?: any }) =>
    request<{ data: any }>('/family/members', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateFamilyMember: (id: string, data: { name?: string; avatar?: string; role?: string; restrictions?: any }) =>
    request<{ data: any }>(`/family/members/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteFamilyMember: (id: string) =>
    request<{ message: string }>(`/family/members/${id}`, { method: 'DELETE' }),

  assignDeviceToMember: (memberId: string, data: { deviceId?: string; name: string; type: string }) =>
    request<{ data: any }>(`/family/members/${memberId}/devices`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  removeDeviceFromMember: (memberId: string, deviceId: string) =>
    request<{ data: any }>(`/family/members/${memberId}/devices/${deviceId}`, { method: 'DELETE' }),

  // Family Invitations (US-030, US-031)
  getFamilyOverview: () =>
    request<{
      data: {
        members: any[];
        pendingInvitations: any[];
        totalMembers: number;
        maxMembers: number;
        remainingSlots: number;
      };
    }>('/family/overview'),

  getFamilyUsers: () =>
    request<{ data: any[]; total: number }>('/family/users'),

  getFamilyInvitations: () =>
    request<{ data: any[]; total: number }>('/family/invitations'),

  createFamilyInvitation: (data: { email: string; displayName?: string }) =>
    request<{ data: any; sent: boolean }>('/family/invitations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  cancelFamilyInvitation: (id: string) =>
    request<{ message: string }>(`/family/invitations/${id}`, { method: 'DELETE' }),

  resendFamilyInvitation: (id: string) =>
    request<{ sent: boolean }>(`/family/invitations/${id}/resend`, { method: 'POST' }),

  removeFamilyMember: (id: string) =>
    request<{ message: string }>(`/family/users/${id}`, { method: 'DELETE' }),

  // Public family invitation endpoints (no auth required)
  getFamilyInvitationInfo: (token: string) =>
    request<{
      data: {
        tenantName: string;
        email: string;
        displayName: string | null;
        invitedByName: string;
        expiresAt: string;
        isExpired: boolean;
      };
    }>(`/family/invitations/info/${token}`),

  acceptFamilyInvitation: (data: { token: string; name: string; password: string }) =>
    request<{ message: string; tenantName: string }>('/family/invitations/accept', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Trials (US-032, US-033)
  getTrialStatus: () =>
    request<{
      data: {
        hasActiveTrial: boolean;
        trialTier?: 'home' | 'enterprise' | 'msp';
        originalTier?: 'home' | 'enterprise' | 'msp';
        startedAt?: string;
        endsAt?: string;
        daysRemaining?: number;
        status?: 'active' | 'converted' | 'expired' | 'cancelled';
        availableTrials?: ('home' | 'enterprise' | 'msp')[];
      };
    }>('/trials/status'),

  startTrial: (tier: 'home' | 'enterprise' | 'msp', billingCycle?: 'monthly' | 'yearly') =>
    request<{
      success: boolean;
      trialTier: 'home' | 'enterprise' | 'msp';
      endsAt: string;
      trialDays: number;
      message?: string;
    }>('/trials/start', {
      method: 'POST',
      body: JSON.stringify({ tier, billingCycle }),
    }),

  convertTrial: (billingCycle?: 'monthly' | 'yearly') =>
    request<{
      success: boolean;
      checkoutUrl?: string;
      sessionId?: string;
      message?: string;
    }>('/trials/convert', {
      method: 'POST',
      body: JSON.stringify({ billingCycle }),
    }),

  cancelTrial: () =>
    request<{ success: boolean; message: string }>('/trials/cancel', { method: 'DELETE' }),

  getTrialHistory: () =>
    request<{
      data: Array<{
        id: string;
        trialTier: 'home' | 'enterprise' | 'msp';
        originalTier: 'home' | 'enterprise' | 'msp';
        startedAt: string;
        endsAt: string;
        status: 'active' | 'converted' | 'expired' | 'cancelled';
        endedAt?: string | null;
        convertedAt?: string | null;
      }>;
    }>('/trials/history'),
}

export { ApiError }
