/**
 * Nebula DNS - Admin UI API Hooks
 * SWR hooks for admin authentication and data fetching
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import useSWR, { SWRConfiguration } from 'swr'
import { API_URL } from '@/lib/api'

// Default SWR config with optimized caching
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  errorRetryCount: 2,
  errorRetryInterval: 5000,
  dedupingInterval: 10000,
  focusThrottleInterval: 30000,
  keepPreviousData: true,
}

/**
 * Admin-specific fetcher that uses admin_token from localStorage
 * @param endpoint - API endpoint to fetch
 * @returns Parsed JSON response
 * @throws Error if not authenticated or request fails
 */
export async function adminFetcher<T>(endpoint: string): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null

  if (!token) {
    throw new Error('Admin authentication required')
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `Request failed (${res.status})`)
  }

  return res.json()
}

// ============================================
// MSP Listing Types
// ============================================

export interface MspTenant {
  id: string
  name: string
  status: 'active' | 'suspended' | 'cancelled'
  clientCount: number
  contactEmail?: string
}

export interface MspListingPagination {
  cursor: string | null
  hasMore: boolean
  total: number
}

export interface MspListingResponse {
  data: MspTenant[]
  pagination: MspListingPagination
}

// ============================================
// MSP Listing Hooks
// ============================================

export interface UseAdminMspListParams {
  q?: string
  status?: string
  limit?: number
  cursor?: string
}

/**
 * Fetch paginated list of MSP tenants with optional search and filters
 * @param params - Query parameters for search, status filter, and pagination
 * @returns SWR response with MSP listing data
 */
export function useAdminMspList(params?: UseAdminMspListParams) {
  const searchParams = new URLSearchParams()

  if (params?.q) searchParams.set('q', params.q)
  if (params?.status) searchParams.set('status', params.status)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.cursor) searchParams.set('cursor', params.cursor)

  const query = searchParams.toString()
  const endpoint = `/admin/msp/tenants${query ? `?${query}` : ''}`

  return useSWR<MspListingResponse>(
    endpoint,
    adminFetcher,
    defaultConfig
  )
}

// ============================================
// MSP Detail Types
// ============================================

export interface MspUsageMetrics {
  totalQueries: number
  blockedQueries: number
  threatsBlocked: number
  blockRate: number
  periodStart: string
  periodEnd: string
  isMockData: boolean
}

export interface MspDetailResponse {
  id: string
  name: string
  status: 'active' | 'suspended' | 'cancelled'
  contactEmail?: string
  tier: 'msp'
  clientCount: number
  locationCount: number
  userCount: number
  createdAt: string
  usage: MspUsageMetrics
}

// ============================================
// MSP Detail Hooks
// ============================================

export interface UseAdminMspDetailParams {
  period?: '24h' | '7d' | '30d' | '90d'
}

/**
 * Fetch detailed information about a specific MSP tenant
 * @param mspId - MSP tenant UUID
 * @param params - Optional query parameters including period for usage metrics
 * @returns SWR response with MSP detail data
 */
export function useAdminMspDetail(mspId: string, params?: UseAdminMspDetailParams) {
  const searchParams = new URLSearchParams()
  if (params?.period) searchParams.set('period', params.period)
  const query = searchParams.toString()
  const endpoint = `/admin/msp/tenants/${mspId}${query ? `?${query}` : ''}`

  return useSWR<MspDetailResponse>(endpoint, adminFetcher, defaultConfig)
}

// ============================================
// Impersonation Types and Functions
// ============================================

export interface StartImpersonationResponse {
  accessToken: string
  tenantId: string
  tenantName: string
  tenantTier: 'home' | 'enterprise' | 'msp'
  expiresIn: number
}

/**
 * Start an impersonation session for a target tenant
 * @param tenantId - Target tenant UUID to impersonate
 * @returns Impersonation token and tenant information
 * @throws Error if not authenticated or impersonation fails
 */
export async function startImpersonation(tenantId: string): Promise<StartImpersonationResponse> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
  if (!token) throw new Error('Admin authentication required')

  const res = await fetch(`${API_URL}/admin/impersonate/${tenantId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Impersonation failed' }))
    throw new Error(error.message || `Request failed (${res.status})`)
  }

  return res.json()
}

// ============================================
// MSP Client Types
// ============================================

export interface MspClient {
  id: string
  name: string
  status: 'active' | 'suspended' | 'cancelled'
  tier: 'home' | 'enterprise' | 'msp'
  contactEmail?: string
  locationCount: number
  userCount: number
  totalQueries: number
  blockedQueries: number
  createdAt: string
}

export interface MspClientListPagination {
  cursor: string | null
  hasMore: boolean
  total: number
}

export interface MspClientListResponse {
  data: MspClient[]
  pagination: MspClientListPagination
}

// ============================================
// MSP Client Hooks
// ============================================

export interface UseAdminMspClientsParams {
  q?: string
  status?: string
  limit?: number
  cursor?: string
  period?: '24h' | '7d' | '30d' | '90d'
}

/**
 * Fetch paginated list of clients for a specific MSP tenant
 * @param mspId - MSP tenant UUID
 * @param params - Query parameters for search, status filter, period, and pagination
 * @returns SWR response with client listing data
 */
export function useAdminMspClients(mspId: string, params?: UseAdminMspClientsParams) {
  const searchParams = new URLSearchParams()
  if (params?.q) searchParams.set('q', params.q)
  if (params?.status) searchParams.set('status', params.status)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.cursor) searchParams.set('cursor', params.cursor)
  if (params?.period) searchParams.set('period', params.period)
  const query = searchParams.toString()
  const endpoint = `/admin/msp/tenants/${mspId}/clients${query ? `?${query}` : ''}`

  return useSWR<MspClientListResponse>(endpoint, adminFetcher, defaultConfig)
}

// ============================================
// Tenant Search Types
// ============================================

export interface TenantSearchResult {
  id: string
  name: string
  status: 'active' | 'suspended' | 'cancelled'
  tier: 'home' | 'enterprise' | 'msp'
  matchedEmail?: string
}

export interface TenantSearchPagination {
  cursor: string | null
  hasMore: boolean
  total: number
}

export interface TenantSearchResponse {
  data: TenantSearchResult[]
  pagination: TenantSearchPagination
}

// ============================================
// Tenant Search Hooks
// ============================================

/**
 * Search tenants by name, email, or ID
 * Only fetches when query is at least 2 characters
 * @param query - Search query string
 * @param limit - Maximum results (default 8)
 * @returns SWR response with search results
 */
export function useAdminTenantSearch(query: string, limit: number = 8) {
  const searchParams = new URLSearchParams()
  searchParams.set('q', query)
  searchParams.set('limit', limit.toString())
  const queryString = searchParams.toString()

  // Only fetch if query is at least 2 characters
  const endpoint = query.length >= 2 ? `/admin/tenants/search?${queryString}` : null

  return useSWR<TenantSearchResponse>(
    endpoint,
    adminFetcher,
    {
      ...defaultConfig,
      revalidateOnFocus: false,
      keepPreviousData: false,
    }
  )
}

// ============================================
// System Health Types
// ============================================

export type ServiceHealthStatus = 'healthy' | 'degraded' | 'unhealthy'

export interface ServiceStatus {
  name: string
  status: ServiceHealthStatus
  latencyMs?: number
  error?: string
  lastChecked: string
}

export interface StorageStatus {
  clickhouse: {
    connected: boolean
    latencyMs?: number
    consecutiveFailures: number
    error?: string
  }
  redis: {
    connected: boolean
    latencyMs?: number
    error?: string
  }
}

export interface ErrorWindow {
  errorCount: number
  totalQueries: number
  errorRate: number
}

export interface ErrorRates {
  lastHour: ErrorWindow
  last24Hours: ErrorWindow
  isMockData: boolean
}

export interface QueryVolume {
  totalQueries: number
  blockedQueries: number
  allowedQueries: number
  period: '1h' | '24h'
  isMockData: boolean
}

export interface SystemHealthResponse {
  overallStatus: ServiceHealthStatus
  services: ServiceStatus[]
  storage: StorageStatus
  errorRates: ErrorRates
  queryVolume: QueryVolume
  timestamp: string
}

export interface RecentError {
  timestamp: string
  domain: string
  reason: string
  clientIp: string
  tenantId: string
}

// ============================================
// System Health Hooks
// ============================================

export interface UseAdminSystemHealthParams {
  period?: '1h' | '24h'
  refreshInterval?: number
  isPaused?: boolean
}

/**
 * Fetch system health status with auto-refresh support
 * @param params - Query parameters for period and refresh behavior
 * @returns SWR response with system health data
 */
export function useAdminSystemHealth(params?: UseAdminSystemHealthParams) {
  const period = params?.period || '24h'
  const refreshInterval = params?.refreshInterval ?? 30000
  const isPaused = params?.isPaused ?? false

  const endpoint = `/admin/system/health?period=${period}`

  return useSWR<SystemHealthResponse>(
    endpoint,
    adminFetcher,
    {
      ...defaultConfig,
      refreshInterval: isPaused ? 0 : refreshInterval,
    }
  )
}

export interface DashboardStatNumber {
  value: number
  available: boolean
}

export interface DashboardStatNullableNumber {
  value: number | null
  available: boolean
}

export interface AdminDashboardStatsResponse {
  mspCount: DashboardStatNumber
  mspPendingCount: DashboardStatNumber
  mspByStatus: { active: number; suspended: number; cancelled: number }
  tenantCount: {
    total: DashboardStatNumber
    byTier: { home: number; enterprise: number; msp: number }
    mspClients: DashboardStatNumber
  }
  activeTenants7d: DashboardStatNumber
  monthlyRevenueCents: DashboardStatNullableNumber
  prevMonthRevenueCents: DashboardStatNullableNumber
  billingEnabled: boolean
  demoTenantCount: DashboardStatNumber
  timestamp: string
}

/**
 * Fetch admin home dashboard aggregate stats
 */
export function useAdminDashboardStats() {
  return useSWR<AdminDashboardStatsResponse>(
    '/admin/dashboard/stats',
    adminFetcher,
    defaultConfig,
  )
}

/**
 * Fetch recent errors with auto-refresh support
 * @param limit - Maximum number of errors to fetch (1-100)
 * @param refreshInterval - Refresh interval in ms (0 to disable)
 * @param isPaused - Whether to pause auto-refresh
 * @returns SWR response with recent errors
 */
export function useAdminRecentErrors(
  limit: number = 25,
  refreshInterval: number = 30000,
  isPaused: boolean = false
) {
  const endpoint = `/admin/system/errors?limit=${Math.min(Math.max(limit, 1), 100)}`

  return useSWR<RecentError[]>(
    endpoint,
    adminFetcher,
    {
      ...defaultConfig,
      refreshInterval: isPaused ? 0 : refreshInterval,
    }
  )
}

// ============================================
// MSP Creation Types
// ============================================

export interface CreateMspTenantDto {
  name: string
  slug?: string
  adminEmail: string
  adminName?: string
  contactEmail?: string
  contactPhone?: string
  locationLimit?: number | null
  clientLimit?: number | null
}

export interface MspTenantCreatedResponse {
  id: string
  name: string
  slug: string
  status: 'active'
  tier: 'msp'
  adminUserId: string
  adminEmail: string
  welcomeEmailSent: boolean
  locationLimit: number | null
  clientLimit: number | null
  createdAt: string
}

// ============================================
// MSP Creation Functions
// ============================================

/**
 * Create a new MSP tenant with initial admin user
 * @param data - MSP tenant creation data
 * @returns Created MSP tenant details
 * @throws Error if not authenticated or creation fails
 */
export async function createMspTenant(data: CreateMspTenantDto): Promise<MspTenantCreatedResponse> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
  if (!token) throw new Error('Admin authentication required')

  const res = await fetch(`${API_URL}/admin/msp/tenants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `Request failed (${res.status})`)
  }

  return res.json()
}

// ============================================
// Admin User Management Types (re-exported from types)
// ============================================

import type {
  AdminListItem,
  AdminDetail,
  AdminInvitation,
  AdminActivityItem,
  AdminActivityAction,
  AdminStatus,
  ListAdminsResponse,
  ListInvitationsResponse,
  AdminActivityResponse,
  AdminListParams,
  InvitationListParams,
  AdminActivityParams,
  CreateAdminInvitationRequest,
  AcceptAdminInvitationRequest,
  SuspendAdminRequest,
  AdminMessageResponse,
  CreateInvitationResponse,
} from '@/types/admin-users'

export type {
  AdminListItem,
  AdminDetail,
  AdminInvitation,
  AdminActivityItem,
  AdminActivityAction,
  AdminStatus,
  ListAdminsResponse,
  ListInvitationsResponse,
  AdminActivityResponse,
  AdminListParams,
  InvitationListParams,
  AdminActivityParams,
  CreateAdminInvitationRequest,
  AcceptAdminInvitationRequest,
  SuspendAdminRequest,
  AdminMessageResponse,
  CreateInvitationResponse,
}

// ============================================
// Admin User Management Hooks
// ============================================

/**
 * Fetch paginated list of admin users with optional role and status filters
 * @param params - Query parameters for filtering and pagination
 * @returns SWR response with admin listing data
 */
export function useAdminUsers(params?: AdminListParams) {
  const searchParams = new URLSearchParams()

  if (params?.role) searchParams.set('role', params.role)
  if (params?.status) searchParams.set('status', params.status)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.cursor) searchParams.set('cursor', params.cursor)

  const query = searchParams.toString()
  const endpoint = `/admin/users${query ? `?${query}` : ''}`

  return useSWR<ListAdminsResponse>(endpoint, adminFetcher, defaultConfig)
}

/**
 * Fetch detailed information about a specific admin user
 * @param adminId - Admin UUID
 * @returns SWR response with admin detail data
 */
export function useAdminUserDetail(adminId: string | null) {
  const endpoint = adminId ? `/admin/users/${adminId}` : null

  return useSWR<AdminDetail>(endpoint, adminFetcher, defaultConfig)
}

/**
 * Fetch paginated list of admin invitations with optional status filter
 * @param params - Query parameters for filtering and pagination
 * @returns SWR response with invitation listing data
 */
export function useAdminInvitations(params?: InvitationListParams) {
  const searchParams = new URLSearchParams()

  if (params?.status) searchParams.set('status', params.status)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.cursor) searchParams.set('cursor', params.cursor)

  const query = searchParams.toString()
  const endpoint = `/admin/users/invites${query ? `?${query}` : ''}`

  return useSWR<ListInvitationsResponse>(endpoint, adminFetcher, defaultConfig)
}

/**
 * Fetch paginated list of admin activity logs with filters
 * @param params - Query parameters for filtering and pagination
 * @returns SWR response with activity log data
 */
export function useAdminActivity(params?: AdminActivityParams) {
  const searchParams = new URLSearchParams()

  if (params?.adminId) searchParams.set('adminId', params.adminId)
  if (params?.targetAdminId) searchParams.set('targetAdminId', params.targetAdminId)
  if (params?.action) searchParams.set('action', params.action)
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.cursor) searchParams.set('cursor', params.cursor)

  const query = searchParams.toString()
  const endpoint = `/admin/users/activity${query ? `?${query}` : ''}`

  return useSWR<AdminActivityResponse>(endpoint, adminFetcher, defaultConfig)
}

// ============================================
// Admin User Management Mutation Functions
// ============================================

/**
 * Invite a new admin user
 * @param data - Email and role for the new admin
 * @returns Created invitation with email status
 * @throws Error if not authenticated or invitation fails
 */
export async function inviteAdmin(
  data: CreateAdminInvitationRequest
): Promise<CreateInvitationResponse> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
  if (!token) throw new Error('Admin authentication required')

  const res = await fetch(`${API_URL}/admin/users/invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `Request failed (${res.status})`)
  }

  return res.json()
}

/**
 * Accept an admin invitation and create account
 * NOTE: This is a public endpoint - no authentication required
 * @param data - Token, name, and password for account creation
 * @returns Success message
 * @throws Error if token invalid or acceptance fails
 */
export async function acceptAdminInvitation(
  data: AcceptAdminInvitationRequest
): Promise<AdminMessageResponse> {
  // NO auth header - this is a public endpoint
  const res = await fetch(`${API_URL}/admin/users/invite/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `Request failed (${res.status})`)
  }

  return res.json()
}

/**
 * Revoke an admin invitation
 * @param invitationId - Invitation UUID to revoke
 * @returns Success message
 * @throws Error if not authenticated or revocation fails
 */
export async function revokeAdminInvitation(
  invitationId: string
): Promise<AdminMessageResponse> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
  if (!token) throw new Error('Admin authentication required')

  const res = await fetch(`${API_URL}/admin/users/invites/${invitationId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `Request failed (${res.status})`)
  }

  return res.json()
}

/**
 * Suspend an admin user
 * @param adminId - Admin UUID to suspend
 * @param reason - Optional reason for suspension
 * @returns Success message
 * @throws Error if not authenticated or suspension fails
 */
export async function suspendAdmin(
  adminId: string,
  reason?: string
): Promise<AdminMessageResponse> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
  if (!token) throw new Error('Admin authentication required')

  const body: SuspendAdminRequest = reason ? { reason } : {}

  const res = await fetch(`${API_URL}/admin/users/${adminId}/suspend`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `Request failed (${res.status})`)
  }

  return res.json()
}

/**
 * Reactivate a suspended admin user
 * @param adminId - Admin UUID to reactivate
 * @returns Success message
 * @throws Error if not authenticated or reactivation fails
 */
export async function reactivateAdmin(adminId: string): Promise<AdminMessageResponse> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
  if (!token) throw new Error('Admin authentication required')

  const res = await fetch(`${API_URL}/admin/users/${adminId}/reactivate`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `Request failed (${res.status})`)
  }

  return res.json()
}

/**
 * Reset MFA for an admin user
 * @param adminId - Admin UUID to reset MFA for
 * @returns Success message
 * @throws Error if not authenticated or reset fails
 */
export async function resetAdminMfa(adminId: string): Promise<AdminMessageResponse> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
  if (!token) throw new Error('Admin authentication required')

  const res = await fetch(`${API_URL}/admin/users/${adminId}/mfa/reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `Request failed (${res.status})`)
  }

  return res.json()
}
