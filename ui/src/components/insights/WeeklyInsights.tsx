/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Weekly Insights - AI-generated weekly summary
 */

'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'
import { WeeklyInsight } from './types'
import {
  SparklesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'

interface WeeklyInsightsProps {
  insight: WeeklyInsight
  className?: string
}

export function WeeklyInsights({ insight, className }: WeeklyInsightsProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getHighlightIcon = (type: string) => {
    switch (type) {
      case 'positive':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />
    }
  }

  const getHighlightBg = (type: string) => {
    switch (type) {
      case 'positive':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    }
  }

  return (
    <div className={clsx('bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 overflow-hidden', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-space-200 dark:border-space-700 bg-gradient-to-r from-nebula-500/10 to-purple-500/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-nebula-500/20">
            <SparklesIcon className="h-5 w-5 text-nebula-500" />
          </div>
          <div>
            <h3 className="font-semibold text-space-900 dark:text-white">Weekly Insights</h3>
            <p className="text-sm text-space-500">
              {formatDate(insight.weekStart)} - {formatDate(insight.weekEnd)}
            </p>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      <div className="px-6 py-4 border-b border-space-200 dark:border-space-700">
        <p className="text-space-700 dark:text-space-300 leading-relaxed">{insight.summary}</p>
      </div>

      {/* Highlights */}
      <div className="px-6 py-4 border-b border-space-200 dark:border-space-700">
        <h4 className="font-medium text-space-900 dark:text-white mb-3">Key Highlights</h4>
        <div className="space-y-3">
          {insight.highlights.map((highlight, index) => (
            <motion.div
              key={highlight.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={clsx('p-3 rounded-lg border', getHighlightBg(highlight.type))}
            >
              <div className="flex items-start gap-3">
                {getHighlightIcon(highlight.type)}
                <div className="flex-1">
                  <p className="font-medium text-space-900 dark:text-white">{highlight.title}</p>
                  <p className="text-sm text-space-500 mt-1">{highlight.description}</p>
                </div>
                {highlight.metric && (
                  <div className="text-right">
                    <p className="font-bold text-space-900 dark:text-white">
                      {highlight.metric.value.toLocaleString()}
                    </p>
                    <p className={clsx('text-xs flex items-center gap-1', highlight.metric.change > 0 ? 'text-red-500' : 'text-green-500')}>
                      {highlight.metric.change > 0 ? <ArrowTrendingUpIcon className="h-3 w-3" /> : <ArrowTrendingDownIcon className="h-3 w-3" />}
                      {Math.abs(highlight.metric.change)}%
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="px-6 py-4">
        <h4 className="font-medium text-space-900 dark:text-white mb-3">Recommendations</h4>
        <div className="space-y-2">
          {insight.recommendations.map((rec) => (
            <div key={rec.id} className="flex items-center justify-between p-3 bg-space-50 dark:bg-space-900 rounded-lg">
              <div className="flex items-center gap-3">
                <span className={clsx(
                  'w-2 h-2 rounded-full',
                  rec.priority === 'high' ? 'bg-red-500' : rec.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                )} />
                <span className="text-sm text-space-700 dark:text-space-300">{rec.title}</span>
              </div>
              {rec.action && (
                <a href={rec.action.href} className="text-sm text-nebula-500 hover:text-nebula-600 flex items-center gap-1">
                  {rec.action.label}
                  <ArrowRightIcon className="h-3 w-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

