/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Policy Timeline - Version history timeline visualization
 */

'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'
import { PolicyVersion } from './types'
import {
  PlusCircleIcon,
  PencilSquareIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/react/24/solid'

interface PolicyTimelineProps {
  versions: PolicyVersion[]
  currentVersion: number
  selectedVersion?: number
  onSelectVersion: (version: PolicyVersion) => void
  onRollback?: (version: PolicyVersion) => void
  className?: string
}

export function PolicyTimeline({
  versions,
  currentVersion,
  selectedVersion,
  onSelectVersion,
  onRollback,
  className,
}: PolicyTimelineProps) {
  const getChangeIcon = (version: PolicyVersion) => {
    if (version.version === 1) return PlusCircleIcon
    if (version.changelog?.toLowerCase().includes('rollback')) return ArrowUturnLeftIcon
    return PencilSquareIcon
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Sort versions by version number descending (newest first)
  const sortedVersions = [...versions].sort((a, b) => b.version - a.version)

  return (
    <div className={clsx('bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 overflow-hidden', className)}>
      <div className="px-4 py-3 border-b border-space-200 dark:border-space-700">
        <h3 className="font-semibold text-space-900 dark:text-white">Version History</h3>
        <p className="text-sm text-space-500 mt-0.5">
          {versions.length} version{versions.length !== 1 ? 's' : ''} • Current: v{currentVersion}
        </p>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {sortedVersions.map((version, index) => {
          const Icon = getChangeIcon(version)
          const isSelected = selectedVersion === version.version
          const isCurrent = version.version === currentVersion

          return (
            <motion.div
              key={version.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={clsx(
                'flex items-start gap-3 px-4 py-3 border-b border-space-100 dark:border-space-700/50 last:border-0 cursor-pointer transition-colors',
                isSelected
                  ? 'bg-primary-50 dark:bg-primary-900/20'
                  : 'hover:bg-space-50 dark:hover:bg-space-700/50'
              )}
              onClick={() => onSelectVersion(version)}
            >
              {/* Icon */}
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                isCurrent ? 'bg-success-500' : 'bg-space-200 dark:bg-space-600'
              )}>
                <Icon className={clsx('h-4 w-4', isCurrent ? 'text-white' : 'text-space-600 dark:text-space-300')} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-space-900 dark:text-white">v{version.version}</span>
                  {isCurrent && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-success-500 text-white rounded">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-sm text-space-600 dark:text-space-400 truncate">
                  {version.changelog || 'No changelog'}
                </p>
                <p className="text-xs text-space-400 mt-1">
                  {formatDate(version.createdAt)} at {formatTime(version.createdAt)}
                </p>
              </div>

              {/* Rollback button */}
              {!isCurrent && onRollback && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRollback(version)
                  }}
                  className="px-2 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded transition-colors"
                >
                  Rollback
                </button>
              )}
            </motion.div>
          )
        })}

        {versions.length === 0 && (
          <div className="px-4 py-8 text-center text-space-500">
            No version history available
          </div>
        )}
      </div>
    </div>
  )
}

