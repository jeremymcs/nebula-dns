/**
 * Nebula DNS - Admin API Hooks
 * SWR hooks for admin authentication and data fetching
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import useSWR, { SWRConfiguration } from 'swr'

// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// Default SWR config with optimized caching (same as useApi.ts)
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
