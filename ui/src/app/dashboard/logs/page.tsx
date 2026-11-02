/**
 * Flux Shield — Query Logs
 * Searchable, filterable history of DNS queries from ClickHouse.
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentMagnifyingGlassIcon,
  MagnifyingGlassIcon,
  SignalIcon,
} from '@heroicons/react/24/outline'
import { useLocations, useQueryLogs, type QueryLogRow } from '@/hooks/useApi'
import { exportArrayToCsv } from '@/lib/export'
import { ActionBadge, decisionLabel, formatLogTime, toClickHouseTime } from '@/components/logs/LogBits'

const PAGE_SIZE = 50

const ACTIONS = [
  { value: '', label: 'All' },
  { value: 'block', label: 'Blocked' },
  { value: 'allow', label: 'Allowed' },
  { value: 'rewrite', label: 'Rewritten' },
] as const

const RANGES = [
  { value: '1h', label: 'Last hour', ms: 60 * 60 * 1000 },
  { value: '24h', label: 'Last 24 hours', ms: 24 * 60 * 60 * 1000 },
  { value: '7d', label: 'Last 7 days', ms: 7 * 24 * 60 * 60 * 1000 },
  { value: '30d', label: 'Last 30 days', ms: 30 * 24 * 60 * 60 * 1000 },
] as const

type RangeValue = (typeof RANGES)[number]['value']

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function QueryLogsPage() {
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('')
  const [locationId, setLocationId] = useState('')
  const [range, setRange] = useState<RangeValue>('24h')
  // Offsets of each page visited, so "Previous" can walk back.
  const [cursors, setCursors] = useState<string[]>([])

  const domain = useDebounced(search.trim())
  const cursor = cursors[cursors.length - 1]

  // Re-anchor the time window only when the range changes, so paging stays stable.
  const dateFrom = useMemo(() => {
    const ms = RANGES.find((r) => r.value === range)?.ms ?? RANGES[1].ms
    return toClickHouseTime(new Date(Date.now() - ms))
  }, [range])

  useEffect(() => {
    setCursors([])
  }, [domain, action, locationId, range])

  const { data, error, isLoading } = useQueryLogs({
    limit: PAGE_SIZE,
    cursor,
    action: action || undefined,
    locationId: locationId || undefined,
    domain: domain || undefined,
    dateFrom,
  })
  const { data: locationsPage } = useLocations({ limit: 200 })

  const rows: QueryLogRow[] = data?.data ?? []
  const total = data?.total ?? 0
  const start = cursor ? Number(cursor) : 0
  const locations: Array<{ id: string; name: string }> = locationsPage?.data ?? []

  const handleExport = () => {
    exportArrayToCsv(
      rows.map((r) => ({
        time: r.timestamp,
        domain: r.domain,
        type: r.queryType ?? '',
        action: r.action,
        reason: decisionLabel(r),
        network: r.locationName ?? '',
        client_ip: r.clientIp ?? '',
        response_ms: r.responseTime ?? '',
        cached: r.cached ? 'yes' : 'no',
      })),
      `query-logs-${range}`,
    )
  }

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-ink dark:text-white">Query logs</h1>
          <p className="mt-1 text-[13.5px] text-txt dark:text-space-400">
            Every DNS lookup across your networks and roaming devices.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/logs/live" className="fs-btn">
            <SignalIcon className="h-4 w-4" />
            Live stream
          </Link>
          <button type="button" className="fs-btn" onClick={handleExport} disabled={rows.length === 0}>
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative flex-1 lg:max-w-sm">
          <span className="sr-only">Search by domain</span>
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mut" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by domain"
            className="fs-input !pl-9"
          />
        </label>
        <div className="fs-segment" role="tablist" aria-label="Decision">
          {ACTIONS.map((a) => (
            <button
              key={a.value || 'all'}
              type="button"
              role="tab"
              aria-selected={action === a.value}
              onClick={() => setAction(a.value)}
              className={action === a.value ? 'fs-segment-item-active' : 'fs-segment-item'}
            >
              {a.label}
            </button>
          ))}
        </div>
        <div className="flex gap-3 lg:ml-auto">
          <label className="flex-1">
            <span className="sr-only">Network</span>
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="fs-input pr-8">
              <option value="">All networks</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1">
            <span className="sr-only">Time range</span>
            <select value={range} onChange={(e) => setRange(e.target.value as RangeValue)} className="fs-input pr-8">
              {RANGES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="fs-table-wrap">
        <div className="overflow-x-auto">
          <table className="fs-table min-w-[860px]">
            <thead>
              <tr>
                <th>Time</th>
                <th>Domain</th>
                <th>Decision</th>
                <th>Reason</th>
                <th>Network</th>
                <th>Client</th>
                <th className="text-right">Response</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && rows.length === 0
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7}>
                        <div className="h-4 animate-pulse rounded bg-space-100 dark:bg-space-800" />
                      </td>
                    </tr>
                  ))
                : rows.map((r) => (
                    <tr key={r.id} className="hover:bg-space-50 dark:hover:bg-space-900/40">
                      <td className="whitespace-nowrap text-[13px] tabular-nums">{formatLogTime(r.timestamp)}</td>
                      <td className="max-w-[280px]">
                        <div className="truncate font-mono text-[13px] text-ink dark:text-white" title={r.domain}>
                          {r.domain}
                        </div>
                        {r.queryType && <div className="text-[12px] text-mut">{r.queryType}</div>}
                      </td>
                      <td>
                        <ActionBadge action={r.action} />
                      </td>
                      <td className="text-[13px] capitalize">{decisionLabel(r).replace(/_/g, ' ')}</td>
                      <td className="text-[13px]">{r.locationName || '—'}</td>
                      <td className="font-mono text-[12.5px]">{r.clientIp || '—'}</td>
                      <td className="whitespace-nowrap text-right text-[13px] tabular-nums">
                        {r.responseTime != null ? `${r.responseTime} ms` : '—'}
                        {r.cached && <span className="ml-1.5 text-[11px] text-mut">cached</span>}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!isLoading && rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 bg-white px-6 py-14 text-center dark:bg-space-900">
            <DocumentMagnifyingGlassIcon className="h-8 w-8 text-mut" />
            <p className="text-sm font-medium text-ink dark:text-white">
              {error ? 'Could not load query logs' : 'No queries match these filters'}
            </p>
            <p className="text-[13px] text-mut">
              {error ? 'Check your connection and try again.' : 'Try a wider time range or clear the search.'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {rows.length > 0 && (
        <div className="flex items-center justify-between text-[13px] text-txt dark:text-space-400">
          <span className="tabular-nums">
            {(start + 1).toLocaleString()}–{(start + rows.length).toLocaleString()} of {total.toLocaleString()}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="fs-btn"
              onClick={() => setCursors((c) => c.slice(0, -1))}
              disabled={cursors.length === 0}
              aria-label="Previous page"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="fs-btn"
              onClick={() => data?.pagination.cursor && setCursors((c) => [...c, data.pagination.cursor as string])}
              disabled={!data?.pagination.hasMore}
              aria-label="Next page"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
