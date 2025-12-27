/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Network Status Widget - Live status indicators for protection zones
 */

'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  SignalIcon,
} from '@heroicons/react/24/solid'

interface Zone {
  id: string
  name: string
  status: 'healthy' | 'warning' | 'critical' | 'offline'
  queryRate: number
  blockRate: number
  lastSeen?: string
}

interface NetworkStatusProps {
  zones?: Zone[]
  className?: string
}

const demoZones: Zone[] = [
  { id: '1', name: 'Headquarters', status: 'healthy', queryRate: 1250, blockRate: 2.3 },
  { id: '2', name: 'Remote Workers', status: 'healthy', queryRate: 890, blockRate: 1.8 },
  { id: '3', name: 'Guest WiFi', status: 'warning', queryRate: 340, blockRate: 8.5 },
  { id: '4', name: 'IoT Devices', status: 'healthy', queryRate: 120, blockRate: 0.5 },
  { id: '5', name: 'Branch Office', status: 'critical', queryRate: 0, blockRate: 0 },
]

export function NetworkStatus({ zones = demoZones, className }: NetworkStatusProps) {
  const getStatusIcon = (status: Zone['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
      case 'critical':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      case 'offline':
        return <SignalIcon className="h-5 w-5 text-space-500" />
    }
  }

  const getStatusBg = (status: Zone['status']) => {
    switch (status) {
      case 'healthy': return 'bg-green-500/10 border-green-500/20'
      case 'warning': return 'bg-amber-500/10 border-amber-500/20'
      case 'critical': return 'bg-red-500/10 border-red-500/20'
      case 'offline': return 'bg-space-500/10 border-space-500/20'
    }
  }

  const healthyCount = zones.filter(z => z.status === 'healthy').length
  const warningCount = zones.filter(z => z.status === 'warning').length
  const criticalCount = zones.filter(z => z.status === 'critical').length

  return (
    <div className={clsx('bg-white dark:bg-space-900 rounded-xl border border-space-200 dark:border-space-800 overflow-hidden', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-space-200 dark:border-space-800">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-space-900 dark:text-white">Network Status</h3>
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {healthyCount} Healthy
            </span>
            {warningCount > 0 && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                {warningCount} Warning
              </span>
            )}
            {criticalCount > 0 && (
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                {criticalCount} Critical
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Zone list */}
      <div className="divide-y divide-space-100 dark:divide-space-800">
        {zones.map((zone, index) => (
          <motion.div
            key={zone.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="px-6 py-3 flex items-center justify-between hover:bg-space-50 dark:hover:bg-space-800/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className={clsx('p-2 rounded-lg border', getStatusBg(zone.status))}>
                {getStatusIcon(zone.status)}
              </div>
              <div>
                <p className="font-medium text-space-900 dark:text-white">{zone.name}</p>
                <p className="text-sm text-space-500">
                  {zone.queryRate.toLocaleString()} queries/min
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={clsx(
                'text-sm font-medium',
                zone.blockRate > 5 ? 'text-amber-600 dark:text-amber-400' : 'text-space-600 dark:text-space-400'
              )}>
                {zone.blockRate}% blocked
              </p>
              <p className="text-xs text-space-400">Last 5 min</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

