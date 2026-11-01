'use client'

import { useState } from 'react'
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline'
import { Card, Badge, SkeletonTable, EmptyState } from '@/components/ui'
import { usePlatformAuditLogs } from '@/hooks/useApi'

export default function AuditExplorerPage() {
  const [source, setSource] = useState<'all' | 'admin' | 'tenant'>('all')
  const [tenantId, setTenantId] = useState('')
  const [action, setAction] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [cursor, setCursor] = useState<string | undefined>()

  const { data, isLoading, error } = usePlatformAuditLogs({
    source,
    tenantId: tenantId || undefined,
    action: action || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    limit: 50,
    cursor,
  })

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-space-900 dark:text-white">Audit log</h1>
        <p className="mt-2 text-space-500 dark:text-space-400">
          Platform admin activity and tenant audit events in one view.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select
          value={source}
          onChange={(e) => {
            setSource(e.target.value as typeof source)
            setCursor(undefined)
          }}
          className="rounded-lg border border-space-200 dark:border-space-700 bg-white dark:bg-space-900 px-3 py-2 text-sm"
        >
          <option value="all">All sources</option>
          <option value="admin">Admin activity</option>
          <option value="tenant">Tenant audit</option>
        </select>
        <input
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          placeholder="Tenant UUID filter"
          className="rounded-lg border border-space-200 dark:border-space-700 bg-white dark:bg-space-900 px-3 py-2 text-sm font-mono"
        />
        <input
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="Action contains…"
          className="rounded-lg border border-space-200 dark:border-space-700 bg-white dark:bg-space-900 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="rounded-lg border border-space-200 dark:border-space-700 bg-white dark:bg-space-900 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="rounded-lg border border-space-200 dark:border-space-700 bg-white dark:bg-space-900 px-3 py-2 text-sm"
        />
      </div>

      {error && (
        <Card variant="solid" padding="md" className="border-danger-200">
          <p className="text-danger-700">{error.message}</p>
        </Card>
      )}

      {isLoading && <SkeletonTable rows={10} cols={6} />}

      {!isLoading && data && data.data.length === 0 && (
        <EmptyState
          icon={<ClipboardDocumentListIcon className="h-12 w-12" />}
          title="No audit entries"
          description="Adjust filters or date range."
        />
      )}

      {!isLoading && data && data.data.length > 0 && (
        <Card variant="solid" padding="none">
          <div className="overflow-x-auto">
            <table className="table text-sm w-full">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">When</th>
                  <th className="table-header-cell">Source</th>
                  <th className="table-header-cell">Action</th>
                  <th className="table-header-cell">Actor</th>
                  <th className="table-header-cell">Tenant</th>
                  <th className="table-header-cell">IP</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {data.data.map((row) => (
                  <tr key={`${row.source}-${row.id}`} className="table-row">
                    <td className="table-cell whitespace-nowrap text-xs">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="table-cell">
                      <Badge size="sm">{row.source}</Badge>
                    </td>
                    <td className="table-cell font-mono text-xs">{row.action}</td>
                    <td className="table-cell text-xs">
                      {row.actorEmail || row.actorName || '—'}
                    </td>
                    <td className="table-cell text-xs">
                      {row.tenantName || row.tenantId?.slice(0, 8) || '—'}
                    </td>
                    <td className="table-cell text-xs font-mono">{row.ipAddress || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.pagination.hasMore && data.pagination.cursor && (
            <div className="p-4 border-t border-space-200 dark:border-space-700 text-center">
              <button
                type="button"
                className="text-sm text-primary-600 font-medium"
                onClick={() => setCursor(data.pagination.cursor || undefined)}
              >
                Load more
              </button>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
