/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Playbook List - Display and manage playbooks
 */

'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'
import { Playbook } from './types'
import {
  PlayIcon,
  PauseIcon,
  PencilIcon,
  BoltIcon,
  ClockIcon,
  CheckBadgeIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

interface PlaybookListProps {
  playbooks: Playbook[]
  onToggle: (id: string, enabled: boolean) => void
  onEdit: (playbook: Playbook) => void
  onRun: (playbook: Playbook) => void
  runningIds?: Set<string>
  className?: string
}

export function PlaybookList({ playbooks, onToggle, onEdit, onRun, runningIds, className }: PlaybookListProps) {
  const getTriggerLabel = (type: string) => {
    switch (type) {
      case 'threat_detected':
        return 'Threat Detected'
      case 'threshold_exceeded':
        return 'Threshold Exceeded'
      case 'pattern_match':
        return 'Pattern Match'
      case 'manual':
        return 'Manual'
      default:
        return type
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className={clsx('space-y-4', className)}>
      {playbooks.map((playbook, index) => (
        <motion.div
          key={playbook.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className={clsx(
            'bg-white dark:bg-space-800 rounded-xl border p-4',
            playbook.isEnabled
              ? 'border-green-200 dark:border-green-800'
              : 'border-space-200 dark:border-space-700'
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {/* Status indicator */}
              <div
                className={clsx(
                  'p-3 rounded-xl',
                  playbook.isEnabled ? 'bg-success-500/10' : 'bg-space-100 dark:bg-space-700'
                )}
              >
                <BoltIcon
                  className={clsx('h-6 w-6', playbook.isEnabled ? 'text-success-500' : 'text-space-400')}
                />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-space-900 dark:text-white">{playbook.name}</h3>
                  {playbook.isBuiltIn && (
                    <CheckBadgeIcon className="h-4 w-4 text-primary-500" title="Built-in Playbook" />
                  )}
                  <span
                    className={clsx(
                      'px-2 py-0.5 text-xs rounded-full',
                      playbook.isEnabled
                        ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400'
                        : 'bg-space-100 dark:bg-space-700 text-space-500'
                    )}
                  >
                    {playbook.isEnabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <p className="text-sm text-space-500 mt-1">{playbook.description}</p>

                {/* Trigger info */}
                <div className="flex items-center gap-4 mt-3 text-sm">
                  <span className="flex items-center gap-1 text-space-500">
                    <BoltIcon className="h-4 w-4" />
                    {getTriggerLabel(playbook.trigger.type)}
                  </span>
                  <span className="flex items-center gap-1 text-space-500">
                    <ClockIcon className="h-4 w-4" />
                    Last: {formatDate(playbook.lastTriggered)}
                  </span>
                  <span className="text-space-400">{playbook.triggerCount} executions</span>
                </div>

                {/* Steps preview */}
                <div className="flex items-center gap-2 mt-3">
                  {playbook.steps.slice(0, 4).map((step, i) => (
                    <span
                      key={step.id}
                      className="px-2 py-1 text-xs bg-space-100 dark:bg-space-700 text-space-600 dark:text-space-400 rounded"
                    >
                      {i + 1}. {step.name}
                    </span>
                  ))}
                  {playbook.steps.length > 4 && (
                    <span className="text-xs text-space-400">+{playbook.steps.length - 4} more</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {runningIds?.has(playbook.id) ? (
                <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30" title="Running...">
                  <ArrowPathIcon className="h-5 w-5 text-primary-500 animate-spin" />
                </div>
              ) : (
                <button
                  onClick={() => onRun(playbook)}
                  className="p-2 hover:bg-space-100 dark:hover:bg-space-700 rounded-lg text-space-500 hover:text-primary-500"
                  title="Run manually"
                >
                  <PlayIcon className="h-5 w-5" />
                </button>
              )}
              <button
                onClick={() => onEdit(playbook)}
                className="p-2 hover:bg-space-100 dark:hover:bg-space-700 rounded-lg text-space-500 hover:text-primary-500"
                title="Edit"
              >
                <PencilIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => onToggle(playbook.id, !playbook.isEnabled)}
                className={clsx(
                  'p-2 rounded-lg',
                  playbook.isEnabled
                    ? 'bg-success-100 dark:bg-success-900/30 text-success-600 hover:bg-success-200'
                    : 'bg-space-100 dark:bg-space-700 text-space-500 hover:bg-space-200'
                )}
                title={playbook.isEnabled ? 'Disable' : 'Enable'}
              >
                {playbook.isEnabled ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

