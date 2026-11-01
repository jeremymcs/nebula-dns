/**
 * Enterprise dashboard — Design C layout with live report data
 */

'use client'

import { useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  useSummaryStats,
  useQueryTrends,
  useTopBlocked,
  useBlocksByCategory,
  useLocationStats,
  useQueryLogs,
  usePolicies,
  useLocations,
  useAgents,
} from '@/hooks/useApi'
import {
  QueryTrendsChart,
  CategoryBreakdownChart,
  TopBlockedList,
  ActivityFeed,
} from '@/components/dashboard'
import { DashboardKpi, DashboardKpiGrid } from '@/components/dashboard/DashboardKpi'
import clsx from 'clsx'

const PERIODS = ['24h', '7d', '30d'] as const
type Period = (typeof PERIODS)[number]

function formatNumber(n: number): string {
  return n.toLocaleString()
}

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function firstName(full?: string | null): string {
  if (!full) return 'there'
  return full.trim().split(/\s+/)[0] ?? 'there'
}

export function EnterpriseDashboardView() {
  const { user } = useAuth()
  const [period, setPeriod] = useState<Period>('24h')

  const { data: summary, isLoading: summaryLoading } = useSummaryStats(period)
  const { data: trends, isLoading: trendsLoading } = useQueryTrends(period)
  const { data: topBlocked, isLoading: topBlockedLoading } = useTopBlocked(period, 5)
  const { data: categories, isLoading: categoryLoading } = useBlocksByCategory(period)
  const { data: locations, isLoading: locationLoading } = useLocationStats(period)
  const { data: logsPage, isLoading: logsLoading } = useQueryLogs({ limit: 8 })
  const { data: policiesPage } = usePolicies()
  const { data: locationsPage } = useLocations({ limit: 200 })
  const { data: agentsPage } = useAgents()

  const trendChartData = useMemo(
    () =>
      (trends ?? []).map((row) => ({
        timestamp: row.timestamp,
        queries: row.total,
        blocked: row.blocked,
      })),
    [trends],
  )

  const activity = useMemo(() => {
    const page = logsPage as { data?: Array<Record<string, unknown>> } | undefined
    const rows = page?.data ?? []
    return rows.map((row: any, index: number) => {
      const action = String(row.action ?? row.decision ?? '').toLowerCase()
      let type: 'block' | 'allow' | 'threat' = 'allow'
      if (action.includes('block')) type = 'block'
      else if (action.includes('threat')) type = 'threat'
      return {
        id: row.id ?? `${row.domain}-${index}`,
        type,
        domain: row.domain ?? row.query ?? 'unknown',
        category: row.category ?? row.reason,
        location: row.locationName ?? row.location,
        timestamp: row.timestamp ?? row.createdAt ?? new Date().toISOString(),
      }
    })
  }, [logsPage])

  const locationCount = locationsPage?.data?.length ?? 0
  const policyCount = policiesPage?.data?.length ?? 0
  const agentCount = agentsPage?.data?.length ?? 0

  const healthyLocations = locations?.filter((l) => (l.blockRate ?? 0) >= 0).length ?? locationCount

  return (
    <div className="space-y-4 pb-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-ink">
            {greetingForHour(new Date().getHours())},{' '}
            <span className="font-serif italic text-[29px] text-primary-700">{firstName(user?.name)}</span>
          </h1>
          <p className="mt-1 text-[13.5px] text-mut">
            DNS security at a glance · {locationCount} location{locationCount === 1 ? '' : 's'} ·{' '}
            {agentCount} roaming agent{agentCount === 1 ? '' : 's'}
          </p>
        </div>
        <div className="fs-segment" role="tablist" aria-label="Time range">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={period === p}
              onClick={() => setPeriod(p)}
              className={period === p ? 'fs-segment-item-active' : 'fs-segment-item'}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <DashboardKpiGrid>
        <DashboardKpi
          label="Total queries"
          value={summaryLoading ? '—' : formatNumber(summary?.totalQueries ?? 0)}
          subtitle={`Last ${period}`}
          dot="blue"
        />
        <DashboardKpi
          label="Threats blocked"
          value={summaryLoading ? '—' : formatNumber(summary?.threatsBlocked ?? summary?.blockedQueries ?? 0)}
          subtitle={`Last ${period}`}
          dot="coral"
        />
        <DashboardKpi
          label="Policies active"
          value={String(policyCount)}
          subtitle="Across all locations"
          dot="navy"
        />
        <DashboardKpi
          label="Locations"
          value={String(locationCount)}
          subtitle={`${healthyLocations} protected · ${agentCount} roaming`}
          dot="green"
          delta={locationCount > 0 ? { text: 'monitored', tone: 'neutral' } : undefined}
        />
      </DashboardKpiGrid>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
        <QueryTrendsChart data={trendChartData} isLoading={trendsLoading} />
        <CategoryBreakdownChart data={categories ?? []} isLoading={categoryLoading} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.7fr]">
        <TopBlockedList data={topBlocked ?? []} isLoading={topBlockedLoading} />
        <ActivityFeed data={activity} isLoading={logsLoading} />
      </div>

      {locations && locations.length > 0 && (
        <div className="fs-card overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <h3 className="text-sm font-semibold tracking-tight text-ink">Locations</h3>
            <span className="text-xs text-mut">
              {locations.length} tracked · queries {period}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 border-t fs-hairline">
            {locations.slice(0, 7).map((loc, idx) => (
              <div
                key={loc.locationId ?? idx}
                className={clsx('px-4 py-3 border-t sm:border-t-0 sm:border-l fs-hairline', idx === 0 && 'border-l-0')}
              >
                <div className="flex items-center gap-2 text-sm font-medium text-ink">
                  <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
                  {loc.locationName}
                </div>
                <p className="mt-1 text-[11.5px] text-mut">
                  {formatNumber(loc.totalQueries ?? 0)} queries · {((loc.blockRate ?? 0) * 100).toFixed(1)}% blocked
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {locationLoading && !locations?.length && (
        <div className="fs-card h-24 skeleton" aria-hidden />
      )}
    </div>
  )
}
