/**
 * Nebula DNS - Alert Configuration Card Component
 * Displays an alert integration with status and action controls
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useState } from 'react'
import clsx from 'clsx'
import {
  ChatBubbleLeftRightIcon,
  BellAlertIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Modal'
import { TestAlertButton } from './TestAlertButton'
import type { AlertConfigResponse } from '@/types/alerting'

export interface AlertConfigCardProps {
  config: AlertConfigResponse
  onEdit: (config: AlertConfigResponse) => void
  onTest: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onToggle: (id: string, enabled: boolean) => Promise<void>
  isTestingId: string | null
}

/**
 * Format relative time from ISO timestamp
 */
function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

/**
 * Provider icon and styling configuration
 */
const providerConfig = {
  slack: {
    icon: ChatBubbleLeftRightIcon,
    iconBg: 'bg-[#4A154B]/10 dark:bg-[#4A154B]/20',
    iconColor: 'text-[#4A154B] dark:text-[#E01E5A]',
    label: 'Slack Webhook',
  },
  pagerduty: {
    icon: BellAlertIcon,
    iconBg: 'bg-[#06AC38]/10 dark:bg-[#06AC38]/20',
    iconColor: 'text-[#06AC38]',
    label: 'PagerDuty',
  },
}

export function AlertConfigCard({
  config,
  onEdit,
  onTest,
  onDelete,
  onToggle,
  isTestingId,
}: AlertConfigCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isToggling, setIsToggling] = useState(false)

  const provider = providerConfig[config.providerType]
  const Icon = provider.icon
  const isTesting = isTestingId === config.id

  const handleToggle = async () => {
    setIsToggling(true)
    try {
      await onToggle(config.id, !config.isEnabled)
    } finally {
      setIsToggling(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete(config.id)
      setIsDeleteDialogOpen(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Card variant="glass" padding="md">
        <div className="flex items-start gap-4">
          {/* Provider Icon */}
          <div
            className={clsx(
              'flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center',
              provider.iconBg
            )}
          >
            <Icon className={clsx('w-6 h-6', provider.iconColor)} />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              {/* Name and Provider */}
              <div className="min-w-0">
                <h3 className="font-medium text-space-900 dark:text-white truncate">
                  {config.name}
                </h3>
                <p className="text-sm text-space-500 dark:text-space-400">
                  {provider.label}
                </p>
              </div>

              {/* Status and Error Badges */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge
                  variant={config.isEnabled ? 'success' : 'neutral'}
                  dot
                >
                  {config.isEnabled ? 'Active' : 'Disabled'}
                </Badge>
                {config.errorCount > 0 && (
                  <Badge variant="warning">
                    {config.errorCount} {config.errorCount === 1 ? 'error' : 'errors'}
                  </Badge>
                )}
              </div>
            </div>

            {/* Last Sent Info */}
            <div className="mt-2 text-sm text-space-500 dark:text-space-400">
              Last sent:{' '}
              {config.lastSentAt ? formatRelativeTime(config.lastSentAt) : 'Never sent'}
            </div>

            {/* Error Display */}
            {config.lastError && (
              <div className="mt-3 p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
                <p className="text-sm text-danger-700 dark:text-danger-300">
                  Last error: {config.lastError}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 pt-4 border-t border-space-200 dark:border-space-700 flex items-center justify-between">
          {/* Toggle Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={config.isEnabled}
            disabled={isToggling}
            onClick={handleToggle}
            className={clsx(
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
              'transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              'dark:focus:ring-offset-space-800',
              config.isEnabled ? 'bg-primary-600' : 'bg-space-300 dark:bg-space-600',
              isToggling && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span className="sr-only">
              {config.isEnabled ? 'Disable' : 'Enable'} alert configuration
            </span>
            <span
              className={clsx(
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0',
                'transition duration-200 ease-in-out',
                config.isEnabled ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </button>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <TestAlertButton
              configId={config.id}
              configName={config.name}
              isTesting={isTesting}
              onTest={onTest}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(config)}
              leftIcon={<PencilIcon className="w-4 h-4" />}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-danger-600 hover:text-danger-700 dark:text-danger-400 dark:hover:text-danger-300"
              leftIcon={<TrashIcon className="w-4 h-4" />}
            >
              Delete
            </Button>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete Alert Configuration"
        message={`Are you sure you want to delete "${config.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  )
}
