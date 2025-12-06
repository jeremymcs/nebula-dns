/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * API Hooks using SWR for data fetching
 */

import useSWR, { SWRConfiguration } from 'swr'
import { api, ApiError } from '@/lib/api'

// Generic fetcher that handles auth
const fetcher = async <T>(endpoint: string): Promise<T> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${endpoint}`, {
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

// ============================================
// Dashboard / Reports Hooks
// ============================================

export function useSummaryStats(period: string = '7d') {
  return useSWR(
    `/reports/summary?period=${period}`,
    fetcher,
    defaultConfig
  )
}

export function useTopBlocked(period: string = '7d', limit: number = 10) {
  return useSWR(
    `/reports/top-blocked?period=${period}&limit=${limit}`,
    fetcher,
    defaultConfig
  )
}

export function useBlocksByCategory(period: string = '7d') {
  return useSWR(
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

export function useLocationStats(period: string = '7d') {
  return useSWR(
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
  return useSWR<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>(
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
  return useSWR<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>(
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
  return useSWR<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>(
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
  return useSWR(
    listId ? `/lists/${listId}/entries` : null,
    fetcher,
    defaultConfig
  )
}

// ============================================
// Users Hooks
// ============================================

export function useUsers() {
  return useSWR<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>(
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
  return useSWR<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>(
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
  return useSWR<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>(
    '/block-pages',
    fetcher,
    defaultConfig
  )
}

export function useAccessRequests() {
  return useSWR<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>(
    '/block-pages/access-requests',
    fetcher,
    defaultConfig
  )
}

// ============================================
// Settings Hooks
// ============================================

export function useApiKeys() {
  return useSWR<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>(
    '/api-keys',
    fetcher,
    defaultConfig
  )
}

export function useInvitations() {
  return useSWR<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>(
    '/invitations',
    fetcher,
    defaultConfig
  )
}

export function useSiemIntegrations() {
  return useSWR<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>(
    '/siem',
    fetcher,
    defaultConfig
  )
}

export function useWebhooks() {
  return useSWR<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>(
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
  return useSWR<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>(
    '/scheduled-reports',
    fetcher,
    defaultConfig
  )
}
