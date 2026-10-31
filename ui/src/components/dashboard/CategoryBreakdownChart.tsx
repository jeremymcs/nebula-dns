/**
 * Nebula DNS - Category Breakdown Chart Component
 * Donut/Pie chart for blocked categories
 */

'use client'

import { useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'
import { Card, CardHeader } from '@/components/ui'

interface CategoryData {
  category: string
  count: number
}

interface CategoryBreakdownChartProps {
  data: CategoryData[]
  isLoading?: boolean
}

import { FLUX_CHART_COLORS } from '@/lib/chart-colors'

// Color palette for categories
const COLORS = [...FLUX_CHART_COLORS]

// Custom tooltip
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null

  const data = payload[0]
  return (
    <div className="bg-white dark:bg-space-800 px-4 py-3 rounded-xl shadow-xl ring-1 ring-space-200 dark:ring-space-700">
      <div className="flex items-center gap-2">
        <div 
          className="w-3 h-3 rounded-full" 
          style={{ backgroundColor: data.payload.fill }}
        />
        <span className="font-medium text-space-900 dark:text-white">
          {data.name}
        </span>
      </div>
      <p className="mt-1 text-sm text-space-500 dark:text-space-400">
        {data.value.toLocaleString()} blocks ({data.payload.percent}%)
      </p>
    </div>
  )
}

// Custom legend
function CustomLegend({ payload }: any) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
      {payload?.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-1.5">
          <div 
            className="w-2.5 h-2.5 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-space-600 dark:text-space-400">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function CategoryBreakdownChart({ data, isLoading }: CategoryBreakdownChartProps) {
  const chartData = useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.count, 0)
    return data.map((d, i) => ({
      name: d.category,
      value: d.count,
      percent: total > 0 ? ((d.count / total) * 100).toFixed(1) : 0,
      fill: COLORS[i % COLORS.length],
    }))
  }, [data])

  if (isLoading) {
    return (
      <Card padding="md">
        <CardHeader title="Categories Blocked" subtitle="Loading..." />
        <div className="h-64 flex items-center justify-center">
          <div className="w-40 h-40 skeleton rounded-full" />
        </div>
      </Card>
    )
  }

  return (
    <Card padding="md">
      <CardHeader 
        title="Categories Blocked" 
        subtitle="Distribution of blocked content"
      />
      <div className="h-72 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

