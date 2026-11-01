/**
 * Flux Shield — Live Stream
 * Near-real-time feed of DNS queries. Polls the query log API every few
 * seconds and keeps a rolling buffer of the newest entries.
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import { PauseIcon, PlayIcon, TrashIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { useQueryLogs, type QueryLogRow } from '@/hooks/useApi'
import { ActionBadge, decisionLabel, formatClockTime } from '@/components/logs/LogBits'

const POLL_MS = 3000
const BUFFER_SIZE = 200

const FILTERS = [
  { value: '', label: 'Everything' },
  { value: 'block', label: 'Blocked only' },
] as const

export default function LiveStreamPage() {
  const [paused, setPaused] = useState(false)
  const [filter, setFilter] = useState('')
  const [rows, setRows] = useState<QueryLogRow[]>([])
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set())
  const [stats, setStats] = useState({ seen: 0, blocked: 0 })
  const seen = useRef<Set<string>>(new Set())

  const { data, error } = useQueryLogs(
    { limit: 50, action: filter || undefined },
    { refreshInterval: paused ? 0 : POLL_MS, dedupingInterval: 1000, revalidateOnFocus: true },
  )

  // Reset the buffer when the filter changes.
  useEffect(() => {
    seen.current = new Set()
    setRows([])
    setStats({ seen: 0, blocked: 0 })
  }, [filter])

  useEffect(() => {
    if (!data?.data || paused) return
    const incoming = data.data.filter((r) => !seen.current.has(r.id))
    if (incoming.length === 0) return
    incoming.forEach((r) => seen.current.add(r.id))
    setRows((prev) => [...incoming, ...prev].slice(0, BUFFER_SIZE))
    setFreshIds(new Set(incoming.map((r) => r.id)))
    setStats((s) => ({
      seen: s.seen + incoming.length,
      blocked: s.blocked + incoming.filter((r) => r.action === 'block').length,
    }))
  }, [data, paused])

  const live = !paused && !error

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-[26px] font-semibold tracking-tight text-ink dark:text-white">
            Live stream
            <span
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium',
                live
                  ? 'bg-success-50 text-success-700 dark:bg-success-900/40 dark:text-success-300'
                  : 'bg-space-100 text-space-600 dark:bg-space-800 dark:text-space-300',
              )}
            >
              <span className={clsx('h-1.5 w-1.5 rounded-full', live ? 'bg-success-500 animate-pulse' : 'bg-space-400')} />
              {error ? 'Disconnected' : paused ? 'Paused' : 'Live'}
            </span>
          </h1>
          <p className="mt-1 text-[13.5px] text-txt dark:text-space-400">
            DNS queries as they happen. Updates every {POLL_MS / 1000} seconds.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="fs-segment" role="tablist" aria-label="Show">
            {FILTERS.map((f) => (
              <button
                key={f.value || 'all'}
                type="button"
                role="tab"
                aria-selected={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={filter === f.value ? 'fs-segment-item-active' : 'fs-segment-item'}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button type="button" className="fs-btn" onClick={() => setPaused((p) => !p)}>
            {paused ? <PlayIcon className="h-4 w-4" /> : <PauseIcon className="h-4 w-4" />}
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button
            type="button"
            className="fs-btn"
            onClick={() => {
              setRows([])
              setStats({ seen: 0, blocked: 0 })
            }}
            aria-label="Clear stream"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="fs-card p-5">
          <p className="text-[13px] font-medium text-txt dark:text-space-400">Queries this session</p>
          <p className="mt-2 text-[28px] font-semibold leading-none tabular-nums text-ink dark:text-white">
            {stats.seen.toLocaleString()}
          </p>
        </div>
        <div className="fs-card p-5">
          <p className="text-[13px] font-medium text-txt dark:text-space-400">Blocked this session</p>
          <p className="mt-2 text-[28px] font-semibold leading-none tabular-nums text-ink dark:text-white">
            {stats.blocked.toLocaleString()}
          </p>
        </div>
        <div className="fs-card p-5">
          <p className="text-[13px] font-medium text-txt dark:text-space-400">Block rate</p>
          <p className="mt-2 text-[28px] font-semibold leading-none tabular-nums text-ink dark:text-white">
            {stats.seen ? `${((stats.blocked / stats.seen) * 100).toFixed(1)}%` : '—'}
          </p>
        </div>
      </div>

      <div className="fs-card overflow-hidden">
        <div className="flex items-center justify-between border-b fs-hairline px-5 py-3">
          <h2 className="text-[15px] font-semibold text-ink dark:text-white">Newest first</h2>
          <Link href="/dashboard/logs" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary-700 hover:text-primary-500 dark:text-primary-300">
            <DocumentTextIcon className="h-4 w-4" />
            Search full history
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary-500" />
            <p className="text-sm font-medium text-ink dark:text-white">
              {error ? 'Could not reach the query log service' : paused ? 'Stream paused' : 'Waiting for queries…'}
            </p>
            <p className="text-[13px] text-mut">
              {error ? 'We will keep retrying in the background.' : 'New lookups will appear here as devices make them.'}
            </p>
          </div>
        ) : (
          <ul className="max-h-[640px] divide-y divide-[var(--fs-line)] overflow-y-auto" aria-live="polite">
            {rows.map((r) => (
              <li
                key={r.id}
                className={clsx(
                  'flex items-center gap-4 px-5 py-2.5 transition-colors duration-700',
                  freshIds.has(r.id) && 'bg-primary-50/60 dark:bg-primary-900/20',
                )}
              >
                <span className="w-20 shrink-0 font-mono text-[12px] tabular-nums text-mut">{formatClockTime(r.timestamp)}</span>
                <ActionBadge action={r.action} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-[13px] text-ink dark:text-white" title={r.domain}>
                    {r.domain}
                  </span>
                  <span className="block truncate text-[12px] text-mut">
                    {[r.locationName, r.clientIp].filter(Boolean).join(' · ') || '—'}
                  </span>
                </span>
                <span className="hidden w-40 shrink-0 truncate text-right text-[12.5px] capitalize text-txt dark:text-space-400 md:block">
                  {r.action === 'block' ? decisionLabel(r).replace(/_/g, ' ') : r.queryType ?? ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
