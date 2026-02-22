// Nebula DNS - Usage Widget Component
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useUsageStats } from '@/hooks/useUsageStats'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

interface ProgressBarProps {
  value: number
  max: number
  label: string
  showUpgrade?: boolean
}

function ProgressBar({ value, max, label, showUpgrade }: ProgressBarProps) {
  const percentage = max > 0 ? (value / max) * 100 : 0

  // Color logic: green (<70%), yellow (70-90%), red (>90%)
  const getColor = () => {
    if (percentage >= 90) return 'danger'
    if (percentage >= 70) return 'warning'
    return 'success'
  }

  const color = getColor()
  const colorClasses = {
    success: {
      bg: 'bg-success-500',
      text: 'text-success-600 dark:text-success-400',
      icon: 'text-success-500'
    },
    warning: {
      bg: 'bg-warning-500',
      text: 'text-warning-600 dark:text-warning-400',
      icon: 'text-warning-500'
    },
    danger: {
      bg: 'bg-danger-500',
      text: 'text-danger-600 dark:text-danger-400',
      icon: 'text-danger-500'
    },
  }

  const classes = colorClasses[color]

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-space-700 dark:text-space-300">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className={clsx('font-semibold', classes.text)}>
            {value}/{max}
          </span>
          {percentage >= 90 && (
            <ExclamationTriangleIcon className={clsx('h-4 w-4', classes.icon)} />
          )}
          {percentage < 70 && (
            <CheckCircleIcon className={clsx('h-4 w-4', classes.icon)} />
          )}
        </div>
      </div>
      <div className="relative h-2.5 bg-space-100 dark:bg-space-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={clsx('h-full rounded-full transition-all duration-300', classes.bg)}
        />
      </div>
      <div className="flex justify-between text-xs text-space-500 dark:text-space-400">
        <span>{percentage.toFixed(0)}% used</span>
        {showUpgrade && percentage >= 80 && (
          <span className={classes.text}>Approaching limit</span>
        )}
      </div>
    </div>
  )
}

export function UsageWidget() {
  const router = useRouter()
  const { data: usageStats, isLoading, error } = useUsageStats()

  const handleNavigateToBilling = () => {
    router.push('/dashboard/billing')
  }

  if (isLoading) {
    return (
      <Card variant="glass" padding="md">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
              <ChartBarIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <div className="h-5 w-24 skeleton rounded mb-1" />
              <div className="h-4 w-32 skeleton rounded" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-12 skeleton rounded" />
            <div className="h-12 skeleton rounded" />
          </div>
        </div>
      </Card>
    )
  }

  if (error || !usageStats) {
    return (
      <Card variant="glass" padding="md">
        <div className="text-center py-6">
          <ExclamationTriangleIcon className="h-8 w-8 text-danger-500 mx-auto mb-2" />
          <p className="text-sm text-space-500 dark:text-space-400">
            Failed to load usage stats
          </p>
        </div>
      </Card>
    )
  }

  const { locations, clients, plan } = usageStats
  const showUpgradeButton =
    locations.percentage >= 80 ||
    (clients && clients.percentage >= 80)

  return (
    <Card
      variant="glass"
      padding="md"
      className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
      onClick={handleNavigateToBilling}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
              <ChartBarIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 className="font-semibold text-space-900 dark:text-white">
                Usage Overview
              </h3>
              <p className="text-sm text-space-500 dark:text-space-400">
                {plan.name} Plan
              </p>
            </div>
          </div>
          <ArrowTrendingUpIcon className="h-5 w-5 text-space-400" />
        </div>

        {/* Progress Bars */}
        <div className="space-y-4">
          <ProgressBar
            value={locations.current}
            max={locations.limit}
            label="Locations"
            showUpgrade={showUpgradeButton}
          />

          {clients && plan.tier === 'msp' && (
            <ProgressBar
              value={clients.current}
              max={clients.limit}
              label="Clients"
              showUpgrade={showUpgradeButton}
            />
          )}
        </div>

        {/* Upgrade Button */}
        {showUpgradeButton && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation()
                handleNavigateToBilling()
              }}
            >
              Upgrade Plan
            </Button>
          </motion.div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-space-200 dark:border-space-700">
          <p className="text-xs text-space-500 dark:text-space-400 text-center">
            Click for detailed breakdown
          </p>
        </div>
      </div>
    </Card>
  )
}
