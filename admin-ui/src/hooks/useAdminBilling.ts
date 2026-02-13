/**
 * Nebula DNS - Admin Billing Hooks
 * SWR hooks for admin billing API endpoints
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
async function adminFetcher<T>(endpoint: string): Promise<T> {
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
// Subscription Status Types
// ============================================

export interface SubscriptionStatus {
  tenantId: string
  tenantName: string
  tier: 'home' | 'enterprise' | 'msp'
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'paused'
  billingCycle: 'monthly' | 'yearly'
  currentPeriodEnd?: string
  stripeCustomerId?: string
  stripeCustomerLink?: string
  billingEmail?: string
  paymentMethodLast4?: string
  cancelAtPeriodEnd: boolean
  trialEnd?: string
  gracePeriod?: {
    startDate: string
    daysRemaining: number
  }
  creditBalance?: number
}

// ============================================
// Invoice Types
// ============================================

export interface Invoice {
  id: string
  number: string
  status: string
  amountDue: number
  amountPaid: number
  currency: string
  created: string
  dueDate?: string
  paidAt?: string
  hasPdf: boolean
}

export interface InvoiceListPagination {
  cursor: string | null
  hasMore: boolean
}

export interface InvoiceListResponse {
  data: Invoice[]
  pagination: InvoiceListPagination
}

// ============================================
// Payment Method Types
// ============================================

export interface PaymentMethod {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
  isDefault: boolean
  created: string
}

export interface PaymentMethodListResponse {
  data: PaymentMethod[]
  total: number
}

// ============================================
// Credit Response Types
// ============================================

export interface CreditAppliedResponse {
  transactionId: string
  newBalance: number
  amountApplied: number
  message: string
}

// ============================================
// Tier Change Types
// ============================================

export interface TierChangeResponse {
  previousTier: string
  newTier: string
  effectiveAt: string
  prorationAmount?: number
  message: string
}

// ============================================
// Extension Types
// ============================================

export interface ExtensionResponse {
  newEndDate: string
  daysAdded: number
  notificationSent: boolean
  message: string
}

// ============================================
// SetupIntent Types
// ============================================

export interface CreateSetupIntentResponse {
  clientSecret: string
}

// ============================================
// Subscription Status Hook
// ============================================

/**
 * Fetch subscription status for a tenant
 * @param tenantId - Tenant UUID
 * @returns SWR response with subscription status
 */
export function useAdminSubscriptionStatus(tenantId: string) {
  const endpoint = `/admin/tenants/${tenantId}/billing/subscription`

  return useSWR<SubscriptionStatus>(
    tenantId ? endpoint : null,
    adminFetcher,
    defaultConfig
  )
}

// ============================================
// Invoice Hooks
// ============================================

export interface UseAdminInvoicesParams {
  limit?: number
  cursor?: string
}

/**
 * Fetch paginated list of invoices for a tenant
 * @param tenantId - Tenant UUID
 * @param params - Query parameters for pagination
 * @returns SWR response with invoice list
 */
export function useAdminInvoices(tenantId: string, params?: UseAdminInvoicesParams) {
  const searchParams = new URLSearchParams()
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.cursor) searchParams.set('cursor', params.cursor)
  const query = searchParams.toString()
  const endpoint = `/admin/tenants/${tenantId}/billing/invoices${query ? `?${query}` : ''}`

  return useSWR<InvoiceListResponse>(
    tenantId ? endpoint : null,
    adminFetcher,
    defaultConfig
  )
}

// ============================================
// Payment Method Hooks
// ============================================

/**
 * Fetch list of payment methods for a tenant
 * @param tenantId - Tenant UUID
 * @returns SWR response with payment method list
 */
export function useAdminPaymentMethods(tenantId: string) {
  const endpoint = `/admin/tenants/${tenantId}/billing/payment-methods`

  return useSWR<PaymentMethodListResponse>(
    tenantId ? endpoint : null,
    adminFetcher,
    defaultConfig
  )
}

// ============================================
// Billing Request Helper (for mutations)
// ============================================

/**
 * Make a POST/PATCH/DELETE request to billing endpoints
 * @param method - HTTP method
 * @param endpoint - API endpoint (relative to API_URL)
 * @param body - Request body (optional)
 * @returns Parsed JSON response
 * @throws Error if not authenticated or request fails
 */
export async function adminBillingRequest<T>(
  method: 'POST' | 'PATCH' | 'DELETE',
  endpoint: string,
  body?: unknown
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
  if (!token) throw new Error('Admin authentication required')

  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `Request failed (${res.status})`)
  }

  return res.json()
}
