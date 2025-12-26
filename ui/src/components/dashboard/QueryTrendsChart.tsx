/**
 * Nebula DNS - Query Trends Chart Component
 * Area chart for query volume over time
 */

'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardHeader } from '@/components/ui'

interface QueryDataPoint {
  timestamp: string
  queries: number
  blocked: number
}

interface QueryTrendsChartProps {
  data: QueryDataPoint[]
  isLoading?: boolean
}

// Custom tooltip
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null

  return (
    <div className="bg-white dark:bg-space-800 px-4 py-3 rounded-xl shadow-xl ring-1 ring-space-200 dark:ring-space-700">
      <p className="text-xs text-space-500 dark:text-space-400 mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm font-medium text-space-700 dark:text-space-300">
            {entry.name}: {entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

export function QueryTrendsChart({ data, isLoading }: QueryTrendsChartProps) {
  const formattedData = useMemo(() => {
    return data.map(d => ({
      ...d,
      name: new Date(d.timestamp).toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric' 
      }),
    }))
  }, [data])

  if (isLoading) {
    return (
      <Card padding="md">
        <CardHeader title="Query Trends" subtitle="Loading..." />
        <div className="h-64 skeleton rounded-xl" />
      </Card>
    )
  }

  return (
    <Card padding="md">
      <CardHeader 
        title="Query Trends" 
        subtitle="Total queries vs blocked over time"
      />
      <div className="h-72 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="queriesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="blockedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false}
              stroke="currentColor"
              className="text-space-200 dark:text-space-700"
            />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              className="text-space-500"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}
              className="text-space-500"
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="queries"
              name="Total Queries"
              stroke="#9333ea"
              strokeWidth={2}
              fill="url(#queriesGradient)"
            />
            <Area
              type="monotone"
              dataKey="blocked"
              name="Blocked"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#blockedGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

