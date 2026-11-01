/**
 * Nebula DNS - Category Breakdown Chart Component
 * Design C — proportion stack + category rows (matches Flux Shield dashboard spec)
 */

'use client'

import { useMemo } from 'react'
import { Card, CardHeader } from '@/components/ui'
import { FLUX_CHART_COLORS } from '@/lib/chart-colors'

interface CategoryData {
  category: string
  count: number
}

interface CategoryBreakdownChartProps {
  data: CategoryData[]
  isLoading?: boolean
}

export function CategoryBreakdownChart({ data, isLoading }: CategoryBreakdownChartProps) {
  const { rows, total } = useMemo(() => {
    const totalCount = data.reduce((sum, d) => sum + d.count, 0)
    const rows = data.map((d, i) => ({
      name: d.category,
      count: d.count,
      percent: totalCount > 0 ? (d.count / totalCount) * 100 : 0,
      color: FLUX_CHART_COLORS[i % FLUX_CHART_COLORS.length],
    }))
    return { rows, total: totalCount }
  }, [data])

  if (isLoading) {
    return (
      <Card padding="md">
        <CardHeader title="Categories blocked" subtitle="Loading..." />
        <div className="mt-4 h-32 skeleton rounded-lg" />
      </Card>
    )
  }

  if (rows.length === 0 || total === 0) {
    return (
      <Card padding="md">
        <CardHeader title="Categories blocked" subtitle="No blocks in this period" />
        <p className="py-10 text-center text-sm text-mut">No category data yet.</p>
      </Card>
    )
  }

  return (
    <Card padding="md" className="overflow-visible">
      <CardHeader
        title="Categories blocked"
        subtitle={total.toLocaleString() + ' total'}
      />
      <div className="mx-1 mt-4 flex h-2 gap-0.5 overflow-hidden rounded">
        {rows.map((row) => (
          <div
            key={row.name}
            style={{
              flex: row.percent,
              backgroundColor: row.color,
              minWidth: row.percent > 0 ? '4px' : undefined,
            }}
            title={`${row.name} ${row.percent.toFixed(1)}%`}
          />
        ))}
      </div>
      <div className="mt-3 space-y-0 divide-y divide-[var(--fs-line)]">
        {rows.slice(0, 6).map((row) => (
          <div
            key={row.name}
            className="grid grid-cols-[1fr_auto_3.5rem] items-center gap-2.5 py-2.5 first:pt-1"
          >
            <span className="flex min-w-0 items-center gap-2 text-sm text-[var(--fs-txt)]">
              <span
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: row.color }}
              />
              <span className="truncate">{row.name}</span>
            </span>
            <span className="font-mono text-[11.5px] text-mut">{row.percent.toFixed(1)}%</span>
            <span className="text-right text-sm font-medium tabular-nums text-ink">
              {row.count.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}
