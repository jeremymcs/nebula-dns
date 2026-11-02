/**
 * Flux Shield — shared pieces for the Query Logs and Live Stream pages
 */

import clsx from 'clsx'
import type { QueryLogRow } from '@/hooks/useApi'

const ACTION_STYLES: Record<QueryLogRow['action'], { label: string; className: string }> = {
  block: {
    label: 'Blocked',
    className: 'bg-accent-100 text-accent-800 dark:bg-accent-900/40 dark:text-accent-200',
  },
  allow: {
    label: 'Allowed',
    className: 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200',
  },
  rewrite: {
    label: 'Rewritten',
    className: 'bg-space-100 text-space-700 dark:bg-space-800 dark:text-space-300',
  },
}

export function ActionBadge({ action }: { action: QueryLogRow['action'] }) {
  const style = ACTION_STYLES[action] ?? ACTION_STYLES.allow
  return (
    <span
      className={clsx(
        'inline-flex w-[76px] justify-center rounded-md px-2 py-0.5 text-[11.5px] font-semibold',
        style.className,
      )}
    >
      {style.label}
    </span>
  )
}

/** Category, threat or reason — whichever explains the decision best. */
export function decisionLabel(row: QueryLogRow): string {
  return row.threatType || row.category || row.reason || '—'
}

export function formatLogTime(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function formatClockTime(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

/** ClickHouse DateTime64 params want "YYYY-MM-DD HH:MM:SS" (UTC). */
export function toClickHouseTime(d: Date): string {
  return d.toISOString().slice(0, 19).replace('T', ' ')
}
