/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Policy Diff - Visual diff between policy versions
 */

'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { PolicyVersion, PolicyDiff as DiffType, PolicyConfig } from './types'
import {
  PlusIcon,
  MinusIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/solid'

interface PolicyDiffProps {
  fromVersion: PolicyVersion
  toVersion: PolicyVersion
  className?: string
}

// Deep diff utility
function computeDiff(from: PolicyConfig, to: PolicyConfig, path = ''): DiffType[] {
  const diffs: DiffType[] = []

  const allKeys = Array.from(new Set([...Object.keys(from), ...Object.keys(to)]))

  for (const key of allKeys) {
    const currentPath = path ? `${path}.${key}` : key
    const fromVal = (from as unknown as Record<string, unknown>)[key]
    const toVal = (to as unknown as Record<string, unknown>)[key]

    if (fromVal === undefined) {
      diffs.push({ field: key, path: currentPath, oldValue: undefined, newValue: toVal, type: 'added' })
    } else if (toVal === undefined) {
      diffs.push({ field: key, path: currentPath, oldValue: fromVal, newValue: undefined, type: 'removed' })
    } else if (typeof fromVal === 'object' && typeof toVal === 'object' && !Array.isArray(fromVal)) {
      diffs.push(...computeDiff(fromVal as PolicyConfig, toVal as PolicyConfig, currentPath))
    } else if (JSON.stringify(fromVal) !== JSON.stringify(toVal)) {
      diffs.push({ field: key, path: currentPath, oldValue: fromVal, newValue: toVal, type: 'changed' })
    }
  }

  return diffs
}

export function PolicyDiff({ fromVersion, toVersion, className }: PolicyDiffProps) {
  const diffs = useMemo(() => {
    return computeDiff(fromVersion.config, toVersion.config)
  }, [fromVersion, toVersion])

  const formatValue = (value: unknown): string => {
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : '(empty)'
    }
    if (typeof value === 'boolean') {
      return value ? 'Enabled' : 'Disabled'
    }
    if (value === undefined || value === null) {
      return '(none)'
    }
    return String(value)
  }

  const getIcon = (type: DiffType['type']) => {
    switch (type) {
      case 'added':
        return <PlusIcon className="h-4 w-4 text-green-500" />
      case 'removed':
        return <MinusIcon className="h-4 w-4 text-red-500" />
      case 'changed':
        return <ArrowsRightLeftIcon className="h-4 w-4 text-amber-500" />
    }
  }

  const getRowColor = (type: DiffType['type']) => {
    switch (type) {
      case 'added':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      case 'removed':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      case 'changed':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
    }
  }

  if (diffs.length === 0) {
    return (
      <div className={clsx('bg-space-50 dark:bg-space-800 rounded-xl p-6 text-center', className)}>
        <p className="text-space-500">No differences between these versions</p>
      </div>
    )
  }

  return (
    <div className={clsx('bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 overflow-hidden', className)}>
      <div className="px-6 py-4 border-b border-space-200 dark:border-space-700 flex items-center justify-between">
        <h3 className="font-semibold text-space-900 dark:text-white">Changes</h3>
        <span className="text-sm text-space-500">
          v{fromVersion.version} → v{toVersion.version} • {diffs.length} changes
        </span>
      </div>

      <div className="divide-y divide-space-100 dark:divide-space-700">
        {diffs.map((diff, index) => (
          <motion.div
            key={diff.path}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={clsx('px-6 py-3 border-l-4', getRowColor(diff.type))}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{getIcon(diff.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-space-900 dark:text-white">{diff.path}</p>
                <div className="mt-1 text-sm">
                  {diff.type === 'added' && (
                    <span className="text-green-600 dark:text-green-400">+ {formatValue(diff.newValue)}</span>
                  )}
                  {diff.type === 'removed' && (
                    <span className="text-red-600 dark:text-red-400">- {formatValue(diff.oldValue)}</span>
                  )}
                  {diff.type === 'changed' && (
                    <div className="space-y-1">
                      <div className="text-red-600 dark:text-red-400">- {formatValue(diff.oldValue)}</div>
                      <div className="text-green-600 dark:text-green-400">+ {formatValue(diff.newValue)}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

