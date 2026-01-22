/**
 * Nebula DNS - Admin Users Table Component
 * Displays admin user listing with role badges, status, and MFA status
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { UserIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Badge, EmptyState, Skeleton } from '@/components/ui'
import { AdminRoleBadge } from '@/components/rbac/AdminRoleBadge'
import type { AdminListItem, AdminStatus } from '@/types/admin-users'

export interface AdminUsersTableProps {
  admins: AdminListItem[]
  isLoading: boolean
  onRowClick: (adminId: string) => void
}

/**
 * Get badge variant based on admin status
 */
function getStatusVariant(status: AdminStatus): 'success' | 'danger' | 'warning' {
  switch (status) {
    case 'active':
      return 'success'
    case 'suspended':
      return 'danger'
    case 'pending_mfa':
      return 'warning'
    default:
      return 'success'
  }
}

/**
 * Get display label for admin status
 */
function getStatusLabel(status: AdminStatus): string {
  switch (status) {
    case 'active':
      return 'Active'
    case 'suspended':
      return 'Suspended'
    case 'pending_mfa':
      return 'Pending MFA'
    default:
      return status
  }
}

/**
 * Format a date string to relative time (e.g., "5 minutes ago", "2 days ago")
 */
function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return 'Never'

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)

  if (diffSecs < 60) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`
  if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

/**
 * Format a date string to readable date format
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Get initials from a name string
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

/**
 * Skeleton row for loading state
 */
function SkeletonRow() {
  return (
    <tr className="table-row">
      <td className="table-cell">
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="space-y-2">
            <Skeleton variant="text" width={120} height={14} />
            <Skeleton variant="text" width={160} height={12} />
          </div>
        </div>
      </td>
      <td className="table-cell">
        <Skeleton variant="rounded" width={80} height={24} />
      </td>
      <td className="table-cell">
        <Skeleton variant="rounded" width={70} height={24} />
      </td>
      <td className="table-cell">
        <Skeleton variant="circular" width={20} height={20} />
      </td>
      <td className="table-cell">
        <Skeleton variant="text" width={100} height={14} />
      </td>
      <td className="table-cell">
        <Skeleton variant="text" width={80} height={14} />
      </td>
    </tr>
  )
}

export function AdminUsersTable({ admins, isLoading, onRowClick }: AdminUsersTableProps) {
  // Loading state: render skeleton rows
  if (isLoading) {
    return (
      <div className="table-container border border-space-200 dark:border-space-700 rounded-xl overflow-hidden">
        <table className="table">
          <thead className="table-header">
            <tr>
              <th className="table-header-cell">Admin</th>
              <th className="table-header-cell">Role</th>
              <th className="table-header-cell">Status</th>
              <th className="table-header-cell">MFA</th>
              <th className="table-header-cell">Last Login</th>
              <th className="table-header-cell">Created</th>
            </tr>
          </thead>
          <tbody className="table-body">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Empty state: no admins
  if (admins.length === 0) {
    return (
      <div className="border border-space-200 dark:border-space-700 rounded-xl p-8">
        <EmptyState
          icon={<UserIcon className="h-12 w-12" />}
          title="No admin users found"
          description="There are no admin users matching your current filters."
        />
      </div>
    )
  }

  // Table with admin rows
  return (
    <div className="table-container border border-space-200 dark:border-space-700 rounded-xl overflow-hidden">
      <table className="table">
        <thead className="table-header">
          <tr>
            <th className="table-header-cell">Admin</th>
            <th className="table-header-cell">Role</th>
            <th className="table-header-cell">Status</th>
            <th className="table-header-cell">MFA</th>
            <th className="table-header-cell">Last Login</th>
            <th className="table-header-cell">Created</th>
          </tr>
        </thead>
        <tbody className="table-body">
          {admins.map((admin) => (
            <tr
              key={admin.id}
              onClick={() => onRowClick(admin.id)}
              className="table-row cursor-pointer hover:bg-space-50 dark:hover:bg-space-800/50 transition-colors"
            >
              {/* Admin (Avatar + Name + Email) */}
              <td className="table-cell">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                      {getInitials(admin.name)}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-space-900 dark:text-white">
                      {admin.name}
                    </div>
                    <div className="text-xs text-space-500 dark:text-space-400">{admin.email}</div>
                  </div>
                </div>
              </td>

              {/* Role */}
              <td className="table-cell">
                <AdminRoleBadge role={admin.role} size="sm" />
              </td>

              {/* Status */}
              <td className="table-cell">
                <Badge variant={getStatusVariant(admin.status)} size="sm">
                  {getStatusLabel(admin.status)}
                </Badge>
              </td>

              {/* MFA Status */}
              <td className="table-cell">
                {admin.mfaSetupComplete ? (
                  <CheckCircleIcon className="h-5 w-5 text-success-500" aria-label="MFA enabled" />
                ) : (
                  <XMarkIcon className="h-5 w-5 text-space-400" aria-label="MFA not enabled" />
                )}
              </td>

              {/* Last Login */}
              <td className="table-cell text-sm text-space-600 dark:text-space-400">
                {formatTimeAgo(admin.lastLoginAt)}
              </td>

              {/* Created */}
              <td className="table-cell text-sm text-space-500 dark:text-space-400">
                {formatDate(admin.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
