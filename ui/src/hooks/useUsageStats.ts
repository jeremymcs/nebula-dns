// Nebula DNS - Usage Statistics Hook
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import useSWR, { SWRConfiguration } from 'swr'
import { ApiError, API_URL } from '@/lib/api'

const fetcher = async <T>(endpoint: string): Promise<T> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  const res = await fetch(`${API_URL}${endpoint}`, {
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

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  errorRetryCount: 2,
  errorRetryInterval: 5000,
  dedupingInterval: 10000,
  focusThrottleInterval: 30000,
  keepPreviousData: true,
}

// Usage statistics types
export interface UsageStats {
  locations: {
    current: number
    limit: number
    percentage: number
  }
  clients?: {
    current: number
    limit: number
    percentage: number
  }
  billingPeriod: {
    start: string
    end: string
  }
  plan: {
    name: string
    tier: 'free' | 'home' | 'enterprise' | 'msp'
  }
}

export interface UsageHistoryItem {
  date: string
  locations: number
  clients?: number
  policies: number
  queries: number
}

export interface UsageBreakdownLocation {
  id: string
  name: string
  createdAt: string
  policyId: string
  policyName: string
  status: 'active' | 'inactive'
}

export interface UsageBreakdownClient {
  id: string
  name: string
  createdAt: string
  locationCount: number
  status: string
}

export interface UsageBreakdown {
  locations?: UsageBreakdownLocation[]
  clients?: UsageBreakdownClient[]
  projectedMonthlyCost: number
  currentPeriodCost: number
}

// Hooks
export function useUsageStats() {
  return useSWR<UsageStats>(
    '/api/v1/limits/usage',
    fetcher,
    {
      ...defaultConfig,
      refreshInterval: 60000, // Refresh every minute
    }
  )
}

export function useUsageHistory(months: number = 6) {
  return useSWR<UsageHistoryItem[]>(
    `/api/v1/limits/usage/history?months=${months}`,
    fetcher,
    defaultConfig
  )
}

export function useUsageBreakdown() {
  return useSWR<UsageBreakdown>(
    '/api/v1/limits/usage/breakdown',
    fetcher,
    defaultConfig
  )
}

// Export function for CSV download
export async function downloadUsageReport(): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  const res = await fetch(`${API_URL}/api/v1/limits/usage/export`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!res.ok) {
    throw new Error('Failed to download usage report')
  }

  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `usage-report-${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}
