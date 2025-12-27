/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Security Score - Gamified security posture scoring display
 */

'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { SecurityScoreData, SecurityGrade } from './types'

interface SecurityScoreProps {
  score: number
  data?: SecurityScoreData
  showDetails?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function SecurityScore({ score, data, showDetails = true, size = 'lg', className }: SecurityScoreProps) {
  const grade = useMemo((): SecurityGrade => {
    if (score >= 90) return { letter: 'A', label: 'Excellent', color: 'text-green-500', bgColor: 'bg-green-500' }
    if (score >= 80) return { letter: 'B', label: 'Good', color: 'text-blue-500', bgColor: 'bg-blue-500' }
    if (score >= 70) return { letter: 'C', label: 'Fair', color: 'text-amber-500', bgColor: 'bg-amber-500' }
    if (score >= 60) return { letter: 'D', label: 'Poor', color: 'text-orange-500', bgColor: 'bg-orange-500' }
    return { letter: 'F', label: 'Critical', color: 'text-red-500', bgColor: 'bg-red-500' }
  }, [score])

  const sizeClasses = {
    sm: { container: 'w-24 h-24', text: 'text-2xl', label: 'text-xs' },
    md: { container: 'w-36 h-36', text: 'text-4xl', label: 'text-sm' },
    lg: { container: 'w-48 h-48', text: 'text-5xl', label: 'text-base' },
  }

  const circumference = 2 * Math.PI * 45 // radius = 45
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className={clsx('flex flex-col items-center', className)}>
      {/* Score Circle */}
      <div className={clsx('relative', sizeClasses[size].container)}>
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-space-200 dark:text-space-700"
          />
          {/* Progress circle */}
          <motion.circle
            cx="50%"
            cy="50%"
            r="45%"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            className={grade.color}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{ strokeDasharray: circumference }}
          />
        </svg>

        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className={clsx('font-bold', sizeClasses[size].text, grade.color)}
          >
            {score}
          </motion.span>
          <span className={clsx('text-space-500', sizeClasses[size].label)}>out of 100</span>
        </div>
      </div>

      {/* Grade badge */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mt-4 flex items-center gap-2"
      >
        <span className={clsx('px-3 py-1 rounded-full text-white font-bold', grade.bgColor)}>
          {grade.letter}
        </span>
        <span className="text-space-600 dark:text-space-400 font-medium">{grade.label}</span>
      </motion.div>

      {/* Score breakdown */}
      {showDetails && data && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-6 w-full max-w-xs space-y-2"
        >
          {data.factors.map((factor, index) => (
            <div key={factor.id} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-space-600 dark:text-space-400">{factor.name}</span>
                  <span className="font-medium text-space-900 dark:text-white">{factor.score}/{factor.maxScore}</span>
                </div>
                <div className="h-2 rounded-full bg-space-200 dark:bg-space-700 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(factor.score / factor.maxScore) * 100}%` }}
                    transition={{ delay: 1 + index * 0.1, duration: 0.5 }}
                    className={clsx('h-full rounded-full', factor.score === factor.maxScore ? 'bg-green-500' : 'bg-nebula-500')}
                  />
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  )
}

