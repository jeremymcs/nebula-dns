// Nebula DNS - Usage History Chart Component
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { useMemo } from 'react'
import { useUsageHistory } from '@/hooks/useUsageStats'
import { Card, CardHeader } from '@/components/ui/Card'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="bg-white dark:bg-space-800 border border-space-200 dark:border-space-700 rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium text-space-900 dark:text-white mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-space-600 dark:text-space-300">{entry.name}:</span>
          <span className="font-medium text-space-900 dark:text-white">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export function UsageChart() {
  const { data: history, isLoading, error, mutate } = useUsageHistory(6)

  const chartData = useMemo(() => {
    if (!history) return []

    return history.map((item) => ({
      date: new Date(item.date).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      }),
      Locations: item.locations,
      Clients: item.clients || 0,
      Policies: item.policies,
      'Queries (M)': Math.round(item.queries / 1000000),
    }))
  }, [history])

  if (isLoading) {
    return (
      <Card variant="glass" padding="md">
        <CardHeader title="Usage History" subtitle="Last 6 months" />
        <div className="h-80 skeleton rounded-xl" />
      </Card>
    )
  }

  if (error) {
    return (
      <Card variant="glass" padding="md">
        <CardHeader title="Usage History" subtitle="Last 6 months" />
        <div className="flex flex-col items-center justify-center h-80 text-center">
          <p className="text-space-500 dark:text-space-400 mb-4">
            Failed to load usage history
          </p>
          <button
            onClick={() => mutate()}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Retry
          </button>
        </div>
      </Card>
    )
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card variant="glass" padding="md">
        <CardHeader title="Usage History" subtitle="Last 6 months" />
        <div className="flex items-center justify-center h-80">
          <p className="text-space-500 dark:text-space-400">
            No usage history available
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card variant="glass" padding="md">
      <CardHeader title="Usage History" subtitle="Last 6 months" />
      <div className="mt-4">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-space-200 dark:stroke-space-700" />
            <XAxis
              dataKey="date"
              className="text-xs text-space-600 dark:text-space-400"
              stroke="currentColor"
            />
            <YAxis
              className="text-xs text-space-600 dark:text-space-400"
              stroke="currentColor"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                paddingTop: '20px',
              }}
              iconType="line"
            />
            <Line
              type="monotone"
              dataKey="Locations"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="Clients"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ fill: '#8b5cf6', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="Policies"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="Queries (M)"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: '#f59e0b', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
