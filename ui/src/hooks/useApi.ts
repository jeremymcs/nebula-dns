/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * API Hooks using SWR for data fetching
 */

import useSWR, { SWRConfiguration } from 'swr'
import { ApiError } from '@/lib/api'

// Generic fetcher that handles auth
const fetcher = async <T>(endpoint: string): Promise<T> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new ApiError(error.message, res.status)
  }

  return res.json()
}

// Default SWR config
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  errorRetryCount: 2,
  dedupingInterval: 5000,
}

// Types
interface SummaryStats {
  totalQueries: number
  blockedQueries: number
  allowedQueries: number
  blockRate: number
  threatsBlocked: number
  avgResponseTime: number
  cacheHitRate: number
}

interface TopBlockedItem {
  domain: string
  category: string
  count: number
  lastBlocked: string
}

interface CategoryStats {
  category: string
  count: number
  percentage: number
}

interface LocationStats {
  locationId: string
  locationName: string
  totalQueries: number
  blockedQueries: number
  blockRate: number
}

interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    cursor: string | null
    hasMore: boolean
  }
}

// ============================================
// Dashboard / Reports Hooks
// ============================================

export function useSummaryStats(period: string = '7d') {
  return useSWR<SummaryStats>(
    `/reports/summary?period=${period}`,
    fetcher,
    defaultConfig
  )
}

export function useTopBlocked(period: string = '7d', limit: number = 10) {
  return useSWR<TopBlockedItem[]>(
    `/reports/top-blocked?period=${period}&limit=${limit}`,
    fetcher,
    defaultConfig
  )
}

export function useBlocksByCategory(period: string = '7d') {
  return useSWR<CategoryStats[]>(
    `/reports/blocks-by-category?period=${period}`,
    fetcher,
    defaultConfig
  )
}

export function useThreatTrends(period: string = '7d') {
  return useSWR(
    `/reports/threats?period=${period}`,
    fetcher,
    defaultConfig
  )
}

export interface QueryTrend {
  timestamp: string
  total: number
  allowed: number
  blocked: number
}

export function useQueryTrends(period: string = '7d') {
  return useSWR<QueryTrend[]>(
    `/reports/trends?period=${period}`,
    fetcher,
    defaultConfig
  )
}

export function useLocationStats(period: string = '7d') {
  return useSWR<LocationStats[]>(
    `/reports/locations?period=${period}`,
    fetcher,
    defaultConfig
  )
}

export function useQueryLogs(params?: {
  cursor?: string
  limit?: number
  action?: string
  locationId?: string
  domain?: string
}) {
  const searchParams = new URLSearchParams()
  if (params?.cursor) searchParams.set('cursor', params.cursor)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.action) searchParams.set('action', params.action)
  if (params?.locationId) searchParams.set('locationId', params.locationId)
  if (params?.domain) searchParams.set('domain', params.domain)
  
  const query = searchParams.toString()
  return useSWR(
    `/reports/logs${query ? `?${query}` : ''}`,
    fetcher,
    defaultConfig
  )
}

// ============================================
// Policies Hooks
// ============================================

export function usePolicies() {
  return useSWR<PaginatedResponse<any>>(
    '/policies',
    fetcher,
    defaultConfig
  )
}

export function usePolicy(id: string | null) {
  return useSWR(
    id ? `/policies/${id}` : null,
    fetcher,
    defaultConfig
  )
}

// ============================================
// Locations Hooks
// ============================================

export function useLocations() {
  return useSWR<PaginatedResponse<any>>(
    '/locations',
    fetcher,
    defaultConfig
  )
}

export function useLocation(id: string | null) {
  return useSWR(
    id ? `/locations/${id}` : null,
    fetcher,
    defaultConfig
  )
}

// ============================================
// Lists Hooks
// ============================================

export function useLists(type?: 'allowlist' | 'blocklist') {
  return useSWR<PaginatedResponse<any>>(
    `/lists${type ? `?type=${type}` : ''}`,
    fetcher,
    defaultConfig
  )
}

export function useList(id: string | null) {
  return useSWR(
    id ? `/lists/${id}` : null,
    fetcher,
    defaultConfig
  )
}

export function useListEntries(listId: string | null) {
  return useSWR<PaginatedResponse<any>>(
    listId ? `/lists/${listId}/entries` : null,
    fetcher,
    defaultConfig
  )
}

// ============================================
// Users Hooks
// ============================================

export function useUsers() {
  return useSWR<PaginatedResponse<any>>(
    '/users',
    fetcher,
    defaultConfig
  )
}

export function useUser(id: string | null) {
  return useSWR(
    id ? `/users/${id}` : null,
    fetcher,
    defaultConfig
  )
}

// ============================================
// Agents Hooks
// ============================================

export function useAgents() {
  return useSWR<PaginatedResponse<any>>(
    '/agents',
    fetcher,
    defaultConfig
  )
}

export function useAgentStats() {
  return useSWR('/agents/stats', fetcher, defaultConfig)
}

export function useAgentVersions() {
  return useSWR('/agents/versions', fetcher, { ...defaultConfig, revalidateOnMount: true })
}

// ============================================
// Block Pages Hooks
// ============================================

export function useBlockPages() {
  return useSWR<PaginatedResponse<any>>(
    '/block-pages',
    fetcher,
    defaultConfig
  )
}

export function useAccessRequests() {
  return useSWR<PaginatedResponse<any>>(
    '/block-pages/access-requests',
    fetcher,
    defaultConfig
  )
}

// ============================================
// Settings Hooks
// ============================================

export function useApiKeys() {
  return useSWR<PaginatedResponse<any>>(
    '/api-keys',
    fetcher,
    defaultConfig
  )
}

export function useInvitations() {
  return useSWR<PaginatedResponse<any>>(
    '/invitations',
    fetcher,
    defaultConfig
  )
}

export function useSiemIntegrations() {
  return useSWR<PaginatedResponse<any>>(
    '/siem',
    fetcher,
    defaultConfig
  )
}

export function useWebhooks() {
  return useSWR<PaginatedResponse<any>>(
    '/webhooks',
    fetcher,
    defaultConfig
  )
}

export function useMfaStatus() {
  return useSWR('/mfa/status', fetcher, defaultConfig)
}

export function useSsoConfig() {
  return useSWR('/sso/config', fetcher, defaultConfig)
}

export function useSubscription() {
  return useSWR('/subscriptions/current', fetcher, defaultConfig)
}

export function useTenant() {
  return useSWR('/tenants/current', fetcher, defaultConfig)
}

// ============================================
// Scheduled Reports Hooks
// ============================================

export function useScheduledReports() {
  return useSWR<PaginatedResponse<any>>(
    '/scheduled-reports',
    fetcher,
    defaultConfig
  )
}

// ============================================
// MSP Hooks
// ============================================

interface ClientOrganization {
  id: string
  name: string
  slug: string
  status: string
  plan: string
  locationCount: number
  userCount: number
  policyCount: number
  createdAt: string
  contactEmail?: string
  contactPhone?: string
  address?: string
  industry?: string
  companySize?: string
}

export function useMspClients() {
  return useSWR<{ clients: ClientOrganization[] }>(
    '/msp/clients',
    fetcher,
    defaultConfig
  )
}

export function useMspClient(clientId: string | null) {
  return useSWR<ClientOrganization>(
    clientId ? `/msp/clients/${clientId}` : null,
    fetcher,
    defaultConfig
  )
}

// Client-specific data hooks for per-client views
export function useClientZones(clientId: string | null) {
  return useSWR<{ zones: any[] }>(
    clientId ? `/msp/clients/${clientId}/zones` : null,
    fetcher,
    defaultConfig
  )
}

export function useClientPolicies(clientId: string | null) {
  return useSWR<{ policies: any[] }>(
    clientId ? `/msp/clients/${clientId}/policies` : null,
    fetcher,
    defaultConfig
  )
}

export function useClientUsers(clientId: string | null) {
  return useSWR<{ users: any[] }>(
    clientId ? `/msp/clients/${clientId}/users` : null,
    fetcher,
    defaultConfig
  )
}

export function useClientStats(clientId: string | null) {
  return useSWR<{
    totalQueries: number
    blockedQueries: number
    allowedQueries: number
    threatsBlocked: number
    activeZones: number
    activeUsers: number
    activePolicies: number
  }>(
    clientId ? `/msp/clients/${clientId}/stats` : null,
    fetcher,
    defaultConfig
  )
}

export function useClientQueryLogs(clientId: string | null, params?: { limit?: number }) {
  const queryString = params ? `?limit=${params.limit || 50}` : ''
  return useSWR<{ logs: any[] }>(
    clientId ? `/msp/clients/${clientId}/logs${queryString}` : null,
    fetcher,
    defaultConfig
  )
}

// ============================================
// MSP Billing Hooks
// ============================================

export function useMspBillingOverview() {
  return useSWR<{
    partnerId: string
    status: string
    queryBalance: number
    totalPurchased: number
    totalUsed: number
    currentOverage: number
    overageRate: number
    alertThreshold: number | null
    autoPurchaseEnabled: boolean
    billingPeriodStart: string | null
    billingPeriodEnd: string | null
    usageThisMonth: number
    estimatedCost: number
  }>(
    '/msp/billing/overview',
    fetcher,
    defaultConfig
  )
}

export function useMspBundles() {
  return useSWR<{
    id: string
    name: string
    description: string
    queryCount: string
    price: string
    pricePerMillion: string
    validityDays: number
    isActive: boolean
  }[]>(
    '/msp/billing/bundles',
    fetcher,
    defaultConfig
  )
}

export function useMspRealTimeUsage() {
  return useSWR<{
    todayQueries: number
    todayBlocked: number
    todayThreats: number
    lastHourQueries: number
    byTenant: { tenantId: string; tenantName: string; queries: number }[]
  }>(
    '/msp/billing/usage/realtime',
    fetcher,
    { ...defaultConfig, refreshInterval: 30000 } // Refresh every 30 seconds
  )
}

export function useMspUsageSummary(params?: { startDate?: string; endDate?: string; groupBy?: 'day' | 'week' | 'month' }) {
  const queryParams = new URLSearchParams()
  if (params?.startDate) queryParams.set('startDate', params.startDate)
  if (params?.endDate) queryParams.set('endDate', params.endDate)
  if (params?.groupBy) queryParams.set('groupBy', params.groupBy)
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : ''

  return useSWR<{
    date: string
    queryCount: number
    blockedCount: number
    allowedCount: number
    threatCount: number
  }[]>(
    `/msp/billing/usage${queryString}`,
    fetcher,
    defaultConfig
  )
}

export function useMspInvoices(params?: { limit?: number; offset?: number }) {
  const queryParams = new URLSearchParams()
  if (params?.limit) queryParams.set('limit', params.limit.toString())
  if (params?.offset) queryParams.set('offset', params.offset.toString())
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : ''

  return useSWR<{ invoices: any[]; total: number }>(
    `/msp/billing/invoices${queryString}`,
    fetcher,
    defaultConfig
  )
}

export function useMspPurchases(params?: { limit?: number; offset?: number }) {
  const queryParams = new URLSearchParams()
  if (params?.limit) queryParams.set('limit', params.limit.toString())
  if (params?.offset) queryParams.set('offset', params.offset.toString())
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : ''

  return useSWR<{ purchases: any[]; total: number }>(
    `/msp/billing/purchases${queryString}`,
    fetcher,
    defaultConfig
  )
}
