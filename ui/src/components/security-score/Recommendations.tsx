/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Recommendations - Actionable security improvement suggestions
 */

'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'
import { SecurityFactor } from './types'
import {
  LightBulbIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline'

interface RecommendationsProps {
  factors: SecurityFactor[]
  onAction?: (factorId: string) => void
  className?: string
}

export function Recommendations({ factors, onAction, className }: RecommendationsProps) {
  // Filter to only factors with recommendations (not at max score)
  const recommendations = factors.filter(f => f.recommendation && f.score < f.maxScore)
  
  // Sort by potential point gain
  const sortedRecommendations = [...recommendations].sort(
    (a, b) => (b.maxScore - b.score) - (a.maxScore - a.score)
  )

  if (sortedRecommendations.length === 0) {
    return (
      <div className={clsx('bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-6 text-center', className)}>
        <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-3" />
        <h3 className="font-semibold text-green-800 dark:text-green-200 mb-1">Perfect Score!</h3>
        <p className="text-sm text-green-600 dark:text-green-400">
          All security recommendations have been implemented.
        </p>
      </div>
    )
  }

  return (
    <div className={clsx('bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 overflow-hidden', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-space-200 dark:border-space-700 flex items-center gap-3">
        <LightBulbIcon className="h-5 w-5 text-amber-500" />
        <h3 className="font-semibold text-space-900 dark:text-white">Improve Your Score</h3>
      </div>

      {/* Recommendations list */}
      <div className="divide-y divide-space-100 dark:divide-space-700">
        {sortedRecommendations.map((factor, index) => {
          const pointsToGain = factor.maxScore - factor.score

          return (
            <motion.div
              key={factor.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="px-6 py-4 hover:bg-space-50 dark:hover:bg-space-700/50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-nebula-500/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-nebula-500">+{pointsToGain}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-space-900 dark:text-white">{factor.name}</h4>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-space-100 dark:bg-space-700 text-space-500">
                      {factor.score}/{factor.maxScore} pts
                    </span>
                  </div>
                  <p className="text-sm text-space-500 mb-2">{factor.recommendation}</p>

                  <button
                    onClick={() => onAction?.(factor.id)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-nebula-500 hover:text-nebula-600 transition-colors"
                  >
                    <PlusCircleIcon className="h-4 w-4" />
                    Fix Now
                    <ArrowRightIcon className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="px-6 py-4 bg-space-50 dark:bg-space-900 border-t border-space-200 dark:border-space-700">
        <p className="text-sm text-space-500">
          Complete all recommendations to gain{' '}
          <span className="font-bold text-nebula-500">
            +{sortedRecommendations.reduce((sum, f) => sum + (f.maxScore - f.score), 0)} points
          </span>
        </p>
      </div>
    </div>
  )
}

