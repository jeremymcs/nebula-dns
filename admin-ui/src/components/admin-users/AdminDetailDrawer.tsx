/**
 * Nebula DNS - Admin Detail Drawer Component
 * Drawer for viewing admin profiles and performing management actions
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useState, useCallback } from 'react'
import { format } from 'date-fns'
import clsx from 'clsx'
import {
  NoSymbolIcon,
  CheckCircleIcon,
  ShieldExclamationIcon,
  UserCircleIcon,
  ClockIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { AdminRoleBadge } from '@/components/rbac/AdminRoleBadge'
import { ActivityLogTable } from './ActivityLogTable'
import { useToast } from '@/components/Toast'
import {
  useAdminUserDetail,
  useAdminActivity,
  suspendAdmin,
  reactivateAdmin,
  resetAdminMfa,
} from '@/hooks/useApi'
import type { AdminStatus } from '@/types/admin-users'

export interface AdminDetailDrawerProps {
  adminId: string | null
  onClose: () => void
  onUpdate: () => void
}

/**
 * Get status badge styles based on admin status
 */
function getStatusBadgeStyles(status: AdminStatus) {
  switch (status) {
    case 'active':
      return 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400'
    case 'suspended':
      return 'bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400'
    case 'pending_mfa':
      return 'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400'
    default:
      return 'bg-space-100 dark:bg-space-700 text-space-600 dark:text-space-400'
  }
}

/**
 * Get human-readable status label
 */
function getStatusLabel(status: AdminStatus) {
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
 * Get initials from name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Profile skeleton loader
 */
function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-space-200 dark:bg-space-700" />
        <div className="flex-1">
          <div className="h-6 bg-space-200 dark:bg-space-700 rounded w-48 mb-2" />
          <div className="h-4 bg-space-200 dark:bg-space-700 rounded w-64 mb-3" />
          <div className="flex gap-2">
            <div className="h-6 bg-space-200 dark:bg-space-700 rounded w-20" />
            <div className="h-6 bg-space-200 dark:bg-space-700 rounded w-16" />
          </div>
        </div>
      </div>
      <div className="mt-6 space-y-4">
        <div className="h-4 bg-space-200 dark:bg-space-700 rounded w-32" />
        <div className="h-4 bg-space-200 dark:bg-space-700 rounded w-40" />
        <div className="h-4 bg-space-200 dark:bg-space-700 rounded w-36" />
      </div>
    </div>
  )
}

/**
 * Admin detail drawer with profile display and management actions
 */
export function AdminDetailDrawer({
  adminId,
  onClose,
  onUpdate,
}: AdminDetailDrawerProps) {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState('profile')
  const [activityLimit, setActivityLimit] = useState(20)

  // Confirmation dialog states
  const [showSuspendDialog, setShowSuspendDialog] = useState(false)
  const [showReactivateDialog, setShowReactivateDialog] = useState(false)
  const [showResetMfaDialog, setShowResetMfaDialog] = useState(false)

  // Action loading states
  const [isSuspending, setIsSuspending] = useState(false)
  const [isReactivating, setIsReactivating] = useState(false)
  const [isResettingMfa, setIsResettingMfa] = useState(false)

  // Fetch admin detail
  const {
    data: admin,
    isLoading: isLoadingAdmin,
    error: adminError,
    mutate: mutateAdmin,
  } = useAdminUserDetail(adminId)

  // Fetch activity for the admin
  const {
    data: activityData,
    isLoading: isLoadingActivity,
    mutate: mutateActivity,
  } = useAdminActivity(adminId ? { targetAdminId: adminId, limit: activityLimit } : undefined)

  const isOpen = adminId !== null

  // Handle suspend action
  const handleSuspend = useCallback(async () => {
    if (!adminId) return

    setIsSuspending(true)
    try {
      await suspendAdmin(adminId)
      showToast('success', 'Admin Suspended', 'The admin account has been suspended.')
      setShowSuspendDialog(false)
      mutateAdmin()
      mutateActivity()
      onUpdate()
    } catch (error) {
      showToast('error', 'Suspend Failed', error instanceof Error ? error.message : 'Failed to suspend admin')
    } finally {
      setIsSuspending(false)
    }
  }, [adminId, showToast, mutateAdmin, mutateActivity, onUpdate])

  // Handle reactivate action
  const handleReactivate = useCallback(async () => {
    if (!adminId) return

    setIsReactivating(true)
    try {
      await reactivateAdmin(adminId)
      showToast('success', 'Admin Reactivated', 'The admin account has been reactivated.')
      setShowReactivateDialog(false)
      mutateAdmin()
      mutateActivity()
      onUpdate()
    } catch (error) {
      showToast('error', 'Reactivate Failed', error instanceof Error ? error.message : 'Failed to reactivate admin')
    } finally {
      setIsReactivating(false)
    }
  }, [adminId, showToast, mutateAdmin, mutateActivity, onUpdate])

  // Handle reset MFA action
  const handleResetMfa = useCallback(async () => {
    if (!adminId) return

    setIsResettingMfa(true)
    try {
      await resetAdminMfa(adminId)
      showToast('success', 'MFA Reset', 'MFA has been reset for this admin. They will need to set up MFA again.')
      setShowResetMfaDialog(false)
      mutateAdmin()
      mutateActivity()
      onUpdate()
    } catch (error) {
      showToast('error', 'Reset MFA Failed', error instanceof Error ? error.message : 'Failed to reset MFA')
    } finally {
      setIsResettingMfa(false)
    }
  }, [adminId, showToast, mutateAdmin, mutateActivity, onUpdate])

  // Handle load more activity
  const handleLoadMoreActivity = useCallback(() => {
    setActivityLimit((prev) => prev + 20)
  }, [])

  // Reset state when closing
  const handleClose = useCallback(() => {
    setActiveTab('profile')
    setActivityLimit(20)
    onClose()
  }, [onClose])

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'activity', label: 'Activity' },
  ]

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Admin Details"
        size="xl"
      >
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="underline"
          className="mb-6"
        />

        {activeTab === 'profile' && (
          <>
            {isLoadingAdmin ? (
              <ProfileSkeleton />
            ) : adminError ? (
              <div className="text-center py-8">
                <p className="text-danger-600 dark:text-danger-400">
                  Failed to load admin details: {adminError.message}
                </p>
              </div>
            ) : admin ? (
              <div className="space-y-6">
                {/* Profile Header */}
                <div className="flex items-start gap-4">
                  {/* Avatar with initials */}
                  <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                    <span className="text-xl font-bold text-white">
                      {getInitials(admin.name)}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold text-space-900 dark:text-white truncate">
                      {admin.name}
                    </h3>
                    <p className="text-sm text-space-500 dark:text-space-400 truncate">
                      {admin.email}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <AdminRoleBadge role={admin.role} />
                      <span
                        className={clsx(
                          'inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full',
                          getStatusBadgeStyles(admin.status)
                        )}
                      >
                        {getStatusLabel(admin.status)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Profile Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 text-sm">
                    <ClockIcon className="w-5 h-5 text-space-400" />
                    <div>
                      <p className="text-space-500 dark:text-space-400">Last Login</p>
                      <p className="text-space-900 dark:text-white">
                        {admin.lastLoginAt
                          ? format(new Date(admin.lastLoginAt), 'PPp')
                          : 'Never'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <CalendarDaysIcon className="w-5 h-5 text-space-400" />
                    <div>
                      <p className="text-space-500 dark:text-space-400">Created</p>
                      <p className="text-space-900 dark:text-white">
                        {format(new Date(admin.createdAt), 'PP')}
                      </p>
                    </div>
                  </div>

                  {admin.invitedByAdminEmail && (
                    <div className="flex items-center gap-3 text-sm sm:col-span-2">
                      <EnvelopeIcon className="w-5 h-5 text-space-400" />
                      <div>
                        <p className="text-space-500 dark:text-space-400">Invited By</p>
                        <p className="text-space-900 dark:text-white">
                          {admin.invitedByAdminEmail}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-sm">
                    <ShieldExclamationIcon className="w-5 h-5 text-space-400" />
                    <div>
                      <p className="text-space-500 dark:text-space-400">MFA Status</p>
                      <p className="text-space-900 dark:text-white">
                        {admin.mfaSetupComplete ? 'Configured' : 'Not Configured'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-space-200 dark:border-space-700">
                  <h4 className="text-sm font-medium text-space-700 dark:text-space-300 mb-3">
                    Actions
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {admin.status !== 'suspended' ? (
                      <Button
                        variant="danger"
                        size="sm"
                        leftIcon={<NoSymbolIcon className="w-4 h-4" />}
                        onClick={() => setShowSuspendDialog(true)}
                      >
                        Suspend Admin
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<CheckCircleIcon className="w-4 h-4" />}
                        onClick={() => setShowReactivateDialog(true)}
                      >
                        Reactivate Admin
                      </Button>
                    )}

                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<ShieldExclamationIcon className="w-4 h-4" />}
                      onClick={() => setShowResetMfaDialog(true)}
                    >
                      Reset MFA
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}

        {activeTab === 'activity' && (
          <div className="min-h-[300px]">
            <ActivityLogTable
              activities={activityData?.data ?? []}
              isLoading={isLoadingActivity}
              hasMore={activityData?.pagination.hasMore ?? false}
              onLoadMore={handleLoadMoreActivity}
            />
          </div>
        )}
      </Modal>

      {/* Suspend Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showSuspendDialog}
        onClose={() => setShowSuspendDialog(false)}
        onConfirm={handleSuspend}
        title="Suspend Admin"
        message={`Are you sure you want to suspend ${admin?.name}? They will no longer be able to access the admin dashboard.`}
        confirmText="Suspend"
        cancelText="Cancel"
        variant="danger"
        isLoading={isSuspending}
      />

      {/* Reactivate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showReactivateDialog}
        onClose={() => setShowReactivateDialog(false)}
        onConfirm={handleReactivate}
        title="Reactivate Admin"
        message={`Are you sure you want to reactivate ${admin?.name}? They will be able to access the admin dashboard again.`}
        confirmText="Reactivate"
        cancelText="Cancel"
        variant="success"
        isLoading={isReactivating}
      />

      {/* Reset MFA Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showResetMfaDialog}
        onClose={() => setShowResetMfaDialog(false)}
        onConfirm={handleResetMfa}
        title="Reset MFA"
        message={`Are you sure you want to reset MFA for ${admin?.name}? They will need to set up two-factor authentication again on their next login.`}
        confirmText="Reset MFA"
        cancelText="Cancel"
        variant="warning"
        isLoading={isResettingMfa}
      />
    </>
  )
}
