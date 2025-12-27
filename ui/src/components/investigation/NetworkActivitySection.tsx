/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Network Activity Section - Query history and client activity
 */

'use client'

import clsx from 'clsx'
import { NetworkActivity } from './types'
import {
  ChartBarIcon,
  UserGroupIcon,
  ClockIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline'

interface NetworkActivitySectionProps {
  activity: NetworkActivity | null
  className?: string
}

export function NetworkActivitySection({ activity, className }: NetworkActivitySectionProps) {
  if (!activity) return null

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className={clsx('space-y-4', className)}>
      <h4 className="font-semibold text-space-900 dark:text-white">Network Activity</h4>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-space-50 dark:bg-space-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-space-500 mb-1">
            <ChartBarIcon className="h-4 w-4" />
            <span className="text-xs">Total Queries</span>
          </div>
          <p className="text-xl font-bold text-space-900 dark:text-white">
            {activity.totalQueries.toLocaleString()}
          </p>
        </div>
        <div className="bg-space-50 dark:bg-space-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-space-500 mb-1">
            <UserGroupIcon className="h-4 w-4" />
            <span className="text-xs">Unique Clients</span>
          </div>
          <p className="text-xl font-bold text-space-900 dark:text-white">
            {activity.uniqueClients}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-space-50 dark:bg-space-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <ClockIcon className="h-4 w-4 text-nebula-500" />
          <h5 className="font-medium text-space-700 dark:text-space-300">Timeline</h5>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-space-500">First Seen</span>
            <span className="text-space-900 dark:text-white">{formatDate(activity.firstSeen)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-space-500">Last Seen</span>
            <span className="text-space-900 dark:text-white">{formatDate(activity.lastSeen)}</span>
          </div>
        </div>
      </div>

      {/* Top clients */}
      <div className="bg-space-50 dark:bg-space-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <ComputerDesktopIcon className="h-4 w-4 text-nebula-500" />
          <h5 className="font-medium text-space-700 dark:text-space-300">Top Clients</h5>
        </div>
        <div className="space-y-2">
          {activity.topClients.map((client, index) => (
            <div key={client.ip} className="flex items-center gap-3">
              <span className="text-xs text-space-400 w-4">{index + 1}.</span>
              <span className="flex-1 font-mono text-sm text-space-900 dark:text-white">{client.ip}</span>
              <span className="text-sm text-space-500">{client.queries} queries</span>
            </div>
          ))}
        </div>
      </div>

      {/* Zones */}
      <div className="flex flex-wrap gap-2">
        {activity.zones.map((zone) => (
          <span
            key={zone}
            className="px-2 py-1 text-xs rounded-full bg-nebula-500/10 text-nebula-600 dark:text-nebula-400"
          >
            {zone}
          </span>
        ))}
      </div>
    </div>
  )
}

