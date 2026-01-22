/**
 * Nebula DNS - Activity Log Table Component
 * Timeline-style display for admin activity entries
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'
import {
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  UserPlusIcon,
  UserMinusIcon,
  ShieldExclamationIcon,
  KeyIcon,
  PencilSquareIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import type { AdminActivityItem, AdminActivityAction } from '@/types/admin-users'

export interface ActivityLogTableProps {
  activities: AdminActivityItem[]
  isLoading: boolean
  hasMore: boolean
  onLoadMore: () => void
}

/**
 * Get icon component for the given action type
 */
function getActionIcon(action: AdminActivityAction) {
  switch (action) {
    case 'admin_login':
      return ArrowRightOnRectangleIcon
    case 'admin_logout':
      return ArrowLeftOnRectangleIcon
    case 'admin_login_failed':
      return ExclamationTriangleIcon
    case 'admin_invited':
      return EnvelopeIcon
    case 'admin_created':
      return UserPlusIcon
    case 'admin_suspended':
      return NoSymbolIcon
    case 'admin_reactivated':
      return CheckCircleIcon
    case 'admin_role_changed':
      return PencilSquareIcon
    case 'admin_mfa_reset':
      return ShieldExclamationIcon
    case 'admin_deleted':
      return UserMinusIcon
    case 'admin_password_changed':
      return KeyIcon
    case 'invite_revoked':
      return NoSymbolIcon
    default:
      return ArrowRightOnRectangleIcon
  }
}

/**
 * Get color category for the given action type
 * Auth (login, logout, failed): accent
 * Positive (created, reactivated): success
 * Negative (suspended, deleted, revoked): danger
 * Neutral (mfa reset, role changed, invited): warning
 */
function getActionCategory(action: AdminActivityAction): 'accent' | 'success' | 'danger' | 'warning' {
  switch (action) {
    case 'admin_login':
    case 'admin_logout':
    case 'admin_login_failed':
      return 'accent'
    case 'admin_created':
    case 'admin_reactivated':
      return 'success'
    case 'admin_suspended':
    case 'admin_deleted':
    case 'invite_revoked':
      return 'danger'
    case 'admin_invited':
    case 'admin_mfa_reset':
    case 'admin_role_changed':
    case 'admin_password_changed':
      return 'warning'
    default:
      return 'accent'
  }
}

/**
 * Get icon background styles based on action category
 */
function getIconStyles(category: 'accent' | 'success' | 'danger' | 'warning') {
  switch (category) {
    case 'accent':
      return 'bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400'
    case 'success':
      return 'bg-success-100 dark:bg-success-900/30 text-success-600 dark:text-success-400'
    case 'danger':
      return 'bg-danger-100 dark:bg-danger-900/30 text-danger-600 dark:text-danger-400'
    case 'warning':
      return 'bg-warning-100 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400'
  }
}

/**
 * Get action description text
 */
function getActionDescription(action: AdminActivityAction, targetEmail: string | null): string {
  switch (action) {
    case 'admin_login':
      return 'logged in'
    case 'admin_logout':
      return 'logged out'
    case 'admin_login_failed':
      return 'failed to log in'
    case 'admin_invited':
      return targetEmail ? `invited ${targetEmail}` : 'invited a new admin'
    case 'admin_created':
      return 'accepted invitation'
    case 'admin_suspended':
      return targetEmail ? `suspended ${targetEmail}` : 'suspended an admin'
    case 'admin_reactivated':
      return targetEmail ? `reactivated ${targetEmail}` : 'reactivated an admin'
    case 'admin_role_changed':
      return targetEmail ? `changed role of ${targetEmail}` : 'changed an admin role'
    case 'admin_mfa_reset':
      return targetEmail ? `reset MFA for ${targetEmail}` : 'reset MFA for an admin'
    case 'admin_deleted':
      return targetEmail ? `deleted ${targetEmail}` : 'deleted an admin'
    case 'admin_password_changed':
      return 'changed password'
    case 'invite_revoked':
      return targetEmail ? `revoked invitation for ${targetEmail}` : 'revoked an invitation'
    default:
      return 'performed an action'
  }
}

/**
 * Skeleton loader for activity items
 */
function ActivitySkeleton() {
  return (
    <div className="flex gap-4 animate-pulse">
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-space-200 dark:bg-space-700" />
      </div>
      <div className="flex-1 min-w-0 pt-1">
        <div className="h-4 bg-space-200 dark:bg-space-700 rounded w-3/4 mb-2" />
        <div className="h-3 bg-space-200 dark:bg-space-700 rounded w-1/4" />
      </div>
    </div>
  )
}

/**
 * Activity log table with timeline-style layout
 */
export function ActivityLogTable({
  activities,
  isLoading,
  hasMore,
  onLoadMore,
}: ActivityLogTableProps) {
  // Show skeleton loading state
  if (isLoading && activities.length === 0) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <ActivitySkeleton key={i} />
        ))}
      </div>
    )
  }

  // Show empty state
  if (!isLoading && activities.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-space-100 dark:bg-space-700 mb-4">
          <ArrowRightOnRectangleIcon className="w-6 h-6 text-space-400" />
        </div>
        <p className="text-space-500 dark:text-space-400">No activity recorded</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Timeline vertical line */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-space-200 dark:bg-space-700" />

      <div className="space-y-6">
        {activities.map((activity, index) => {
          const Icon = getActionIcon(activity.action)
          const category = getActionCategory(activity.action)
          const iconStyles = getIconStyles(category)
          const description = getActionDescription(activity.action, activity.targetAdminEmail)

          return (
            <div key={activity.id} className="relative flex gap-4">
              {/* Icon with colored background */}
              <div
                className={clsx(
                  'relative z-10 flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full ring-4 ring-white dark:ring-space-800',
                  iconStyles
                )}
              >
                <Icon className="w-5 h-5" />
              </div>

              {/* Activity content */}
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-sm text-space-900 dark:text-white">
                  <span className="font-medium">{activity.adminName}</span>
                  <span className="text-space-600 dark:text-space-400"> {description}</span>
                </p>

                <div className="flex items-center gap-3 mt-1 text-xs text-space-500 dark:text-space-400">
                  <span>
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </span>
                  {activity.ipAddress && (
                    <>
                      <span className="text-space-300 dark:text-space-600">|</span>
                      <span className="font-mono">{activity.ipAddress}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Load more button */}
      {hasMore && (
        <div className="mt-6 text-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={onLoadMore}
            isLoading={isLoading}
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  )
}
