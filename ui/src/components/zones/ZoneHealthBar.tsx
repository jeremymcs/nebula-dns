/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Zone Health Bar - Summary bar showing overall zone health
 */

'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { Zone, ZoneHealth } from './types'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  SignalSlashIcon,
} from '@heroicons/react/24/solid'

interface ZoneHealthBarProps {
  zones: Zone[]
  className?: string
}

export function ZoneHealthBar({ zones, className }: ZoneHealthBarProps) {
  const healthCounts = useMemo(() => {
    const counts: Record<ZoneHealth, number> = {
      healthy: 0,
      warning: 0,
      critical: 0,
      offline: 0,
    }
    zones.forEach((zone) => {
      counts[zone.health]++
    })
    return counts
  }, [zones])

  const totalZones = zones.length

  const healthItems: Array<{
    health: ZoneHealth
    label: string
    icon: React.ComponentType<{ className?: string }>
    color: string
    bgColor: string
  }> = [
    {
      health: 'healthy',
      label: 'Healthy',
      icon: CheckCircleIcon,
      color: 'text-success-600 dark:text-success-400',
      bgColor: 'bg-success-500',
    },
    {
      health: 'warning',
      label: 'Warning',
      icon: ExclamationTriangleIcon,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500',
    },
    {
      health: 'critical',
      label: 'Critical',
      icon: XCircleIcon,
      color: 'text-danger-600 dark:text-danger-400',
      bgColor: 'bg-danger-500',
    },
    {
      health: 'offline',
      label: 'Offline',
      icon: SignalSlashIcon,
      color: 'text-space-500',
      bgColor: 'bg-space-400',
    },
  ]

  return (
    <div className={clsx('bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-space-900 dark:text-white">Zone Health Overview</h3>
        <span className="text-sm text-space-500">{totalZones} total zones</span>
      </div>

      {/* Health bar */}
      <div className="h-3 rounded-full bg-space-100 dark:bg-space-700 overflow-hidden flex mb-4">
        {healthItems.map((item) => {
          const percentage = (healthCounts[item.health] / totalZones) * 100
          if (percentage === 0) return null
          return (
            <motion.div
              key={item.health}
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className={clsx('h-full', item.bgColor)}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {healthItems.map((item) => {
          const count = healthCounts[item.health]
          if (count === 0) return null
          return (
            <div key={item.health} className="flex items-center gap-2">
              <item.icon className={clsx('h-5 w-5', item.color)} />
              <span className="text-sm text-space-600 dark:text-space-400">
                <span className="font-medium text-space-900 dark:text-white">{count}</span> {item.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

