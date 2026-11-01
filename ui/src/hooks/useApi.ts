/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * API Hooks using SWR for data fetching
 */

import useSWR, { SWRConfiguration } from 'swr'
import { ApiError, API_URL } from '@/lib/api'

// Generic fetcher that handles auth
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

// Default SWR config with optimized caching
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,        // Don't refetch when window regains focus
  revalidateOnReconnect: true,     // Refetch when network reconnects
  errorRetryCount: 2,              // Retry failed requests twice
  errorRetryInterval: 5000,        // Wait 5s between retries
  dedupingInterval: 10000,         // Dedupe identical requests within 10s
  focusThrottleInterval: 30000,    // Throttle focus revalidations to every 30s
  keepPreviousData: true,          // Keep showing previous data while fetching new
}

// Longer cache for data that changes less frequently
const staticDataConfig: SWRConfiguration = {
  ...defaultConfig,
  dedupingInterval: 60000,         // 1 minute deduping for static data
  revalidateOnMount: false,        // Don't refetch if data exists
  revalidateIfStale: true,         // Revalidate stale data in background
}

// Real-time data config for frequently changing data
const realtimeConfig: SWRConfiguration = {
  ...defaultConfig,
  refreshInterval: 30000,          // Auto-refresh every 30s
  dedupingInterval: 5000,          // Shorter deduping for real-time data
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

interface ThreatTrendItem {
  date: string
  count: number
}

interface ThreatData {
  threats: any[]
  heatmap: any[]
  trends: ThreatTrendItem[]
}

export function useThreatTrends(period: string = '7d') {
  return useSWR<ThreatData>(
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

export interface QueryLogRow {
  id: string
  timestamp: string
  locationId?: string
  locationName?: string
  domain: string
  queryType?: string
  clientIp?: string
  action: 'allow' | 'block' | 'rewrite'
  reason?: string
  category?: string
  responseTime?: number
  cached?: boolean
  threatType?: string
  policyId?: string
}

export interface QueryLogsPage {
  data: QueryLogRow[]
  total: number
  pagination: { cursor: string | null; hasMore: boolean }
}

export function useQueryLogs(params?: {
  cursor?: string
  limit?: number
  action?: string
  locationId?: string
  domain?: string
  dateFrom?: string
}, config?: SWRConfiguration) {
  const searchParams = new URLSearchParams()
  if (params?.cursor) searchParams.set('cursor', params.cursor)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.action) searchParams.set('action', params.action)
  if (params?.locationId) searchParams.set('locationId', params.locationId)
  if (params?.domain) searchParams.set('domain', params.domain)
  if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom)

  const query = searchParams.toString()
  return useSWR<QueryLogsPage>(
    `/reports/logs${query ? `?${query}` : ''}`,
    fetcher,
    { ...defaultConfig, ...config }
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

export function useLocations(params?: { cursor?: string; limit?: number }) {
  const searchParams = new URLSearchParams()
  if (params?.cursor) searchParams.set('cursor', params.cursor)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  const query = searchParams.toString()
  return useSWR<PaginatedResponse<any>>(
    `/locations${query ? `?${query}` : ''}`,
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

export function useUsers(params?: { cursor?: string; limit?: number }) {
  const searchParams = new URLSearchParams()
  if (params?.cursor) searchParams.set('cursor', params.cursor)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  const query = searchParams.toString()
  return useSWR<PaginatedResponse<any>>(
    `/users${query ? `?${query}` : ''}`,
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
  return useSWR<{ data: any[] }>(
    '/agents',
    fetcher,
    defaultConfig
  )
}

export function useAgentStats() {
  return useSWR<{ data: any }>(
    '/agents/stats',
    fetcher,
    defaultConfig
  )
}

export function useAgentVersions() {
  return useSWR<{ data: Record<string, any> }>(
    '/agents/versions',
    fetcher,
    { ...defaultConfig, revalidateOnMount: true }
  )
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
  return useSWR<{ data: any }>('/sso/config', fetcher, defaultConfig)
}

// ============================================
// AI Insights Hooks
// ============================================

export function useInsights(period?: string) {
  return useSWR<any>(
    `/reports/insights${period ? `?period=${period}` : ''}`,
    fetcher,
    defaultConfig
  )
}

// ============================================
// Security Score Hooks
// ============================================

export function useSecurityScore() {
  return useSWR<any>(
    '/reports/security-score',
    fetcher,
    defaultConfig
  )
}

// ============================================
// Playbooks Hooks
// ============================================

export function usePlaybooks() {
  return useSWR<{ data: any[] }>(
    '/playbooks',
    fetcher,
    defaultConfig
  )
}

// ============================================
// Policy Templates Hooks
// ============================================

export function usePolicyTemplates() {
  return useSWR<{ data: any[] }>(
    '/policy-templates',
    fetcher,
    defaultConfig
  )
}

// ============================================
// Session Hooks
// ============================================

export function useSessions() {
  return useSWR<{ data: any[] }>(
    '/auth/sessions',
    fetcher,
    defaultConfig
  )
}

// ============================================
// Audit Logs Hooks
// ============================================

export function useAuditLogs(params?: { cursor?: string; limit?: number; action?: string; resourceType?: string }) {
  const searchParams = new URLSearchParams()
  if (params?.cursor) searchParams.set('cursor', params.cursor)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.action) searchParams.set('action', params.action)
  if (params?.resourceType) searchParams.set('resourceType', params.resourceType)
  const query = searchParams.toString()
  return useSWR<PaginatedResponse<any>>(
    `/audit-logs${query ? `?${query}` : ''}`,
    fetcher,
    defaultConfig
  )
}

// ============================================
// Threat Data Hooks (for Mission Control)
// ============================================

export function useThreatData(period?: string) {
  return useSWR<any>(
    `/reports/threats${period ? `?period=${period}` : ''}`,
    fetcher,
    defaultConfig
  )
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
// Data Status Hooks
// ============================================

interface DataStatus {
  clickhouseConnected: boolean
  usingMockData: boolean
  lastConnectionAttempt: string | null
  consecutiveFailures: number
}

export function useDataStatus() {
  return useSWR<DataStatus>(
    '/reports/data-status',
    fetcher,
    {
      ...defaultConfig,
      refreshInterval: 60000, // Refresh every minute
    }
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

// ============================================
// MSP Templates Hooks
// ============================================

export interface MspTemplateConfig {
  blockCategories: string[]
  warnCategories?: string[]
  threatBlocking: {
    enabled: boolean
    feeds: string[]
  }
  safesearch: {
    enabled: boolean
    services: string[]
    settings?: {
      google?: 'off' | 'moderate' | 'strict'
      bing?: 'off' | 'moderate' | 'strict'
      youtube?: 'off' | 'moderate' | 'strict'
      duckduckgo?: 'off' | 'moderate' | 'strict'
    }
  }
  schedules?: any[]
  policyName?: string
  policyDescription?: string
}

export interface MspTemplate {
  id: string
  partnerId: string
  name: string
  description?: string
  config: MspTemplateConfig
  version: number
  isDefault: boolean
  category?: string
  tags: string[]
  deployedTo: number
  createdAt: string
  updatedAt: string
}

export interface MspTemplateDeployment {
  id: string
  templateId: string
  tenantId: string
  deployedBy: string
  templateVersion: number
  deploymentMode: 'new_tenant' | 'overlay'
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  policiesCreated: number
  createdAt: string
}

export interface DeploymentResult {
  success: boolean
  totalTenants: number
  successfulDeployments: number
  failedDeployments: number
  results: Array<{
    tenantId: string
    status: 'success' | 'failed'
    policyId?: string
    error?: string
  }>
}

export function useMspTemplates() {
  return useSWR<{ templates: MspTemplate[] }>(
    '/msp/templates',
    fetcher,
    defaultConfig
  )
}

export function useMspTemplate(templateId: string | null) {
  return useSWR<MspTemplate>(
    templateId ? `/msp/templates/${templateId}` : null,
    fetcher,
    defaultConfig
  )
}

export function useMspTemplateDeployments(templateId: string | null, limit?: number) {
  const queryString = limit ? `?limit=${limit}` : ''
  return useSWR<{ deployments: MspTemplateDeployment[] }>(
    templateId ? `/msp/templates/${templateId}/deployments${queryString}` : null,
    fetcher,
    defaultConfig
  )
}

// ============================================
// MSP Template Version Hooks (US-034, US-035, US-036)
// ============================================

export interface MspTemplateVersion {
  id: string
  templateId: string
  version: number
  config: MspTemplateConfig
  createdBy?: string
  createdByName?: string
  changelog?: string
  isRollback: boolean
  rollbackFromVersion?: number
  createdAt: string
}

export interface MspTemplateVersionList {
  versions: MspTemplateVersion[]
  currentVersion: number
  totalVersions: number
}

export interface ClientUsingTemplate {
  clientId: string
  clientName: string
  clientSlug: string
  appliedVersion: number
  isLatestVersion: boolean
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  policyId?: string
  appliedAt: string
}

export interface ClientsUsingTemplateResponse {
  clients: ClientUsingTemplate[]
  totalClients: number
  clientsOnLatest: number
  clientsOutdated: number
}

export interface ApplyJobResponse {
  jobId: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  totalClients: number
  processedClients: number
  successCount: number
  failedCount: number
  results?: Array<{
    clientId: string
    clientName: string
    status: 'pending' | 'success' | 'failed'
    error?: string
    policyId?: string
  }>
  startedAt?: string
  completedAt?: string
}

export interface ConfigDiff {
  templateId: string
  fromVersion: number
  toVersion: number
  diff: {
    added: Record<string, any>
    removed: Record<string, any>
    changed: Record<string, { from: any; to: any }>
  }
  summary: string
}

export function useMspTemplateVersions(templateId: string | null) {
  return useSWR<MspTemplateVersionList>(
    templateId ? `/msp/templates/${templateId}/versions` : null,
    fetcher,
    defaultConfig
  )
}

export function useMspTemplateVersion(templateId: string | null, versionId: string | null) {
  return useSWR<MspTemplateVersion>(
    templateId && versionId ? `/msp/templates/${templateId}/versions/${versionId}` : null,
    fetcher,
    defaultConfig
  )
}

export function useMspTemplateVersionDiff(templateId: string | null, versionNumber: number | null) {
  return useSWR<ConfigDiff>(
    templateId && versionNumber ? `/msp/templates/${templateId}/versions/${versionNumber}/diff` : null,
    fetcher,
    defaultConfig
  )
}

export function useMspTemplateClients(templateId: string | null) {
  return useSWR<ClientsUsingTemplateResponse>(
    templateId ? `/msp/templates/${templateId}/clients` : null,
    fetcher,
    defaultConfig
  )
}

export function useMspApplyJobStatus(templateId: string | null, jobId: string | null) {
  return useSWR<ApplyJobResponse>(
    templateId && jobId ? `/msp/templates/${templateId}/apply/${jobId}` : null,
    fetcher,
    { ...defaultConfig, refreshInterval: 2000 } // Poll every 2 seconds
  )
}

// ============================================
// Family Hooks
// ============================================

export function useFamilyMembers() {
  return useSWR<PaginatedResponse<any>>(
    '/family/members',
    fetcher,
    defaultConfig
  )
}

export function useFamilyMember(id: string | null) {
  return useSWR<{ data: any }>(
    id ? `/family/members/${id}` : null,
    fetcher,
    defaultConfig
  )
}

// Family Overview (US-030, US-031)
export function useFamilyOverview() {
  return useSWR<{
    data: {
      members: any[]
      pendingInvitations: any[]
      totalMembers: number
      maxMembers: number
      remainingSlots: number
    }
  }>(
    '/family/overview',
    fetcher,
    defaultConfig
  )
}

export function useFamilyUsers() {
  return useSWR<{ data: any[]; total: number }>(
    '/family/users',
    fetcher,
    defaultConfig
  )
}

export function useFamilyInvitations() {
  return useSWR<{ data: any[]; total: number }>(
    '/family/invitations',
    fetcher,
    defaultConfig
  )
}

// ============================================
// Onboarding Hooks
// ============================================

export function useOnboardingProgress() {
  return useSWR<{ data: any }>(
    '/onboarding/progress',
    fetcher,
    defaultConfig
  )
}

// ============================================
// Trial Hooks (US-032, US-033)
// ============================================

export interface TrialStatusData {
  hasActiveTrial: boolean
  trialTier?: 'home' | 'enterprise' | 'msp'
  originalTier?: 'home' | 'enterprise' | 'msp'
  startedAt?: string
  endsAt?: string
  daysRemaining?: number
  status?: 'active' | 'converted' | 'expired' | 'cancelled'
  availableTrials?: ('home' | 'enterprise' | 'msp')[]
}

export interface TrialHistoryItem {
  id: string
  trialTier: 'home' | 'enterprise' | 'msp'
  originalTier: 'home' | 'enterprise' | 'msp'
  startedAt: string
  endsAt: string
  status: 'active' | 'converted' | 'expired' | 'cancelled'
  endedAt?: string | null
  convertedAt?: string | null
}

export function useTrialStatus() {
  return useSWR<{ data: TrialStatusData }>(
    '/trials/status',
    fetcher,
    defaultConfig
  )
}

export function useTrialHistory() {
  return useSWR<{ data: TrialHistoryItem[] }>(
    '/trials/history',
    fetcher,
    defaultConfig
  )
}
