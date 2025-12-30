/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Trend Chart - Trend visualization component
 */

'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'
import { TrendData } from './types'
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
} from '@heroicons/react/24/solid'

interface TrendChartProps {
  trends: TrendData[]
  className?: string
}

export function TrendChart({ trends, className }: TrendChartProps) {
  const getTrendIcon = (trend: TrendData['trend']) => {
    switch (trend) {
      case 'up':
        return <ArrowTrendingUpIcon className="h-4 w-4" />
      case 'down':
        return <ArrowTrendingDownIcon className="h-4 w-4" />
      default:
        return <MinusIcon className="h-4 w-4" />
    }
  }

  const getTrendColor = (trend: TrendData['trend'], isPositive: boolean) => {
    if (trend === 'stable') return 'text-space-500'
    // For some metrics, down is good (threats, response time)
    const isGood = isPositive ? trend === 'up' : trend === 'down'
    return isGood ? 'text-success-500' : 'text-danger-500'
  }

  const formatValue = (value: number, label: string) => {
    if (label.includes('Time')) return `${value}ms`
    if (label.includes('Rate')) return `${value}%`
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toString()
  }

  // Determine if higher is better for each metric
  const isPositiveMetric = (label: string) => {
    return label.includes('Queries') || label.includes('Uptime')
  }

  return (
    <div className={clsx('bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-6', className)}>
      <h3 className="font-semibold text-space-900 dark:text-white mb-4">Weekly Trends</h3>

      <div className="grid grid-cols-2 gap-4">
        {trends.map((trend, index) => {
          const isPositive = isPositiveMetric(trend.label)
          const trendColor = getTrendColor(trend.trend, isPositive)

          return (
            <motion.div
              key={trend.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 bg-space-50 dark:bg-space-900 rounded-lg"
            >
              <p className="text-sm text-space-500 mb-1">{trend.label}</p>
              <div className="flex items-end justify-between">
                <p className="text-2xl font-bold text-space-900 dark:text-white">
                  {formatValue(trend.current, trend.label)}
                </p>
                <div className={clsx('flex items-center gap-1 text-sm', trendColor)}>
                  {getTrendIcon(trend.trend)}
                  <span>{Math.abs(trend.change).toFixed(1)}%</span>
                </div>
              </div>

              {/* Mini comparison bar */}
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-space-200 dark:bg-space-700 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                    className="h-full bg-nebula-500 rounded-full"
                  />
                </div>
                <span className="text-xs text-space-400">This week</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-space-200 dark:bg-space-700 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(trend.previous / trend.current) * 100}%` }}
                    transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                    className="h-full bg-space-400 rounded-full"
                  />
                </div>
                <span className="text-xs text-space-400">Last week</span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

