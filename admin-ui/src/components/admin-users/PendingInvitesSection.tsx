/**
 * Nebula DNS - Pending Invites Section Component
 * Displays pending admin invitations with expiry countdown and revoke action
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useState } from 'react'
import { EnvelopeIcon, ClockIcon, TrashIcon } from '@heroicons/react/24/outline'
import { Badge, Skeleton, ConfirmDialog } from '@/components/ui'
import { AdminRoleBadge } from '@/components/rbac/AdminRoleBadge'
import { revokeAdminInvitation } from '@/hooks/useApi'
import { useToast } from '@/components/Toast'
import type { AdminInvitation } from '@/types/admin-users'

export interface PendingInvitesSectionProps {
  invitations: AdminInvitation[]
  isLoading: boolean
  onRevoke: () => void
}

/**
 * Calculate time remaining until expiry
 * Returns a human-readable string like "5 days", "3 hours", "Expired"
 */
function getExpiryCountdown(expiresAt: string, isExpired: boolean): { text: string; isExpired: boolean } {
  if (isExpired) {
    return { text: 'Expired', isExpired: true }
  }

  const expiry = new Date(expiresAt)
  const now = new Date()
  const diffMs = expiry.getTime() - now.getTime()

  if (diffMs <= 0) {
    return { text: 'Expired', isExpired: true }
  }

  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays > 0) {
    return { text: `Expires in ${diffDays} day${diffDays !== 1 ? 's' : ''}`, isExpired: false }
  }
  if (diffHours > 0) {
    return { text: `Expires in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`, isExpired: false }
  }
  if (diffMins > 0) {
    return { text: `Expires in ${diffMins} minute${diffMins !== 1 ? 's' : ''}`, isExpired: false }
  }
  return { text: 'Expires soon', isExpired: false }
}

/**
 * Format date to readable format
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
 * Skeleton card for loading state
 */
function SkeletonCard() {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-space-200 dark:border-space-700 bg-white dark:bg-space-800">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="space-y-2">
          <Skeleton variant="text" width={180} height={14} />
          <div className="flex items-center gap-3">
            <Skeleton variant="rounded" width={60} height={20} />
            <Skeleton variant="text" width={100} height={12} />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Skeleton variant="text" width={100} height={14} />
        <Skeleton variant="rounded" width={70} height={32} />
      </div>
    </div>
  )
}

export function PendingInvitesSection({
  invitations,
  isLoading,
  onRevoke,
}: PendingInvitesSectionProps) {
  const { showToast } = useToast()
  const [selectedInvite, setSelectedInvite] = useState<AdminInvitation | null>(null)
  const [isRevoking, setIsRevoking] = useState(false)

  const handleRevokeClick = (invite: AdminInvitation) => {
    setSelectedInvite(invite)
  }

  const handleCloseDialog = () => {
    setSelectedInvite(null)
  }

  const handleConfirmRevoke = async () => {
    if (!selectedInvite) return

    setIsRevoking(true)
    try {
      await revokeAdminInvitation(selectedInvite.id)
      showToast('success', 'Invitation revoked', `Invitation to ${selectedInvite.email} has been revoked.`)
      setSelectedInvite(null)
      onRevoke()
    } catch (err) {
      showToast('error', 'Failed to revoke invitation', err instanceof Error ? err.message : 'Please try again.')
    } finally {
      setIsRevoking(false)
    }
  }

  // Pending invites only (exclude already accepted/revoked)
  const pendingInvites = invitations.filter((inv) => inv.status === 'pending')

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-space-900 dark:text-white">Pending Invites</h2>
        {!isLoading && (
          <Badge variant="neutral" size="sm">
            {pendingInvites.length}
          </Badge>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && pendingInvites.length === 0 && (
        <div className="p-6 rounded-xl border border-space-200 dark:border-space-700 bg-white dark:bg-space-800 text-center">
          <EnvelopeIcon className="h-10 w-10 mx-auto text-space-400 dark:text-space-500 mb-3" />
          <p className="text-sm text-space-500 dark:text-space-400">No pending invitations</p>
        </div>
      )}

      {/* Invitation Cards */}
      {!isLoading && pendingInvites.length > 0 && (
        <div className="space-y-3">
          {pendingInvites.map((invite) => {
            const expiry = getExpiryCountdown(invite.expiresAt, invite.isExpired)
            return (
              <div
                key={invite.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-space-200 dark:border-space-700 bg-white dark:bg-space-800"
              >
                {/* Left: Email and Role */}
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                    <EnvelopeIcon className="h-5 w-5 text-accent-600 dark:text-accent-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-space-900 dark:text-white">
                      {invite.email}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <AdminRoleBadge role={invite.role} size="sm" />
                      <span className="text-xs text-space-500 dark:text-space-400">
                        Invited by {invite.invitedByAdminEmail}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Expiry and Revoke */}
                <div className="flex items-center gap-4 sm:gap-6">
                  {/* Expiry Countdown */}
                  <div className="flex items-center gap-1.5">
                    <ClockIcon
                      className={`h-4 w-4 ${
                        expiry.isExpired
                          ? 'text-danger-500'
                          : 'text-space-400 dark:text-space-500'
                      }`}
                    />
                    <span
                      className={`text-sm ${
                        expiry.isExpired
                          ? 'text-danger-600 dark:text-danger-400 font-medium'
                          : 'text-space-500 dark:text-space-400'
                      }`}
                    >
                      {expiry.text}
                    </span>
                  </div>

                  {/* Revoke Button */}
                  <button
                    onClick={() => handleRevokeClick(invite)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-danger-600 dark:text-danger-400 hover:text-danger-700 dark:hover:text-danger-300 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg transition-colors"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Revoke
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={selectedInvite !== null}
        onClose={handleCloseDialog}
        onConfirm={handleConfirmRevoke}
        title="Revoke Invitation"
        message={`Are you sure you want to revoke the invitation to ${selectedInvite?.email}? This action cannot be undone.`}
        confirmText="Revoke"
        cancelText="Cancel"
        variant="danger"
        isLoading={isRevoking}
      />
    </div>
  )
}
