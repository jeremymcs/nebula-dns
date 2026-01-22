/**
 * Nebula DNS - Admin Users Page
 * Management interface for admin user accounts and invitations
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useState, useCallback } from 'react'
import { PlusIcon, UsersIcon } from '@heroicons/react/24/outline'
import { Card, Button } from '@/components/ui'
import { useRequireFeature } from '@/hooks/useRequireRole'
import {
  useAdminUsers,
  useAdminInvitations,
} from '@/hooks/useApi'
import { AdminUsersTable } from '@/components/admin-users/AdminUsersTable'
import { PendingInvitesSection } from '@/components/admin-users/PendingInvitesSection'
import { InviteAdminModal } from '@/components/admin-users/InviteAdminModal'
import { AdminDetailDrawer } from '@/components/admin-users/AdminDetailDrawer'

export default function AdminUsersPage() {
  // Route protection - redirects non-super_admin users
  const hasAccess = useRequireFeature('admin-users')

  // Modal and drawer state
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null)

  // Fetch admin users
  const {
    data: adminsData,
    isLoading: isLoadingAdmins,
    mutate: mutateAdmins,
  } = useAdminUsers()

  // Fetch pending invitations
  const {
    data: invitationsData,
    isLoading: isLoadingInvitations,
    mutate: mutateInvitations,
  } = useAdminInvitations({ status: 'pending' })

  // Handler: open admin detail drawer
  const handleRowClick = useCallback((adminId: string) => {
    setSelectedAdminId(adminId)
  }, [])

  // Handler: close admin detail drawer
  const handleCloseDrawer = useCallback(() => {
    setSelectedAdminId(null)
  }, [])

  // Handler: admin updated (suspend/reactivate/mfa reset)
  const handleAdminUpdate = useCallback(() => {
    mutateAdmins()
  }, [mutateAdmins])

  // Handler: invitation created successfully
  const handleInviteSuccess = useCallback(() => {
    mutateAdmins()
    mutateInvitations()
  }, [mutateAdmins, mutateInvitations])

  // Handler: invitation revoked
  const handleInviteRevoke = useCallback(() => {
    mutateInvitations()
  }, [mutateInvitations])

  // Render nothing while checking access (redirect happens in hook)
  if (!hasAccess) {
    return null
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-space-900 dark:text-white">Admin Users</h1>
          <p className="mt-2 text-space-500 dark:text-space-400">
            Manage administrator accounts and invitations
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button
            variant="primary"
            leftIcon={<PlusIcon className="h-5 w-5" />}
            onClick={() => setShowInviteModal(true)}
          >
            Invite Admin
          </Button>
        </div>
      </div>

      {/* Admin Users Table Section */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <UsersIcon className="h-5 w-5 text-space-500 dark:text-space-400" />
          <h2 className="text-lg font-semibold text-space-900 dark:text-white">
            Admin Accounts
          </h2>
          {adminsData && (
            <span className="text-sm text-space-500 dark:text-space-400">
              ({adminsData.pagination.total} total)
            </span>
          )}
        </div>
        <AdminUsersTable
          admins={adminsData?.data ?? []}
          isLoading={isLoadingAdmins}
          onRowClick={handleRowClick}
        />
      </section>

      {/* Pending Invites Section */}
      <section>
        <PendingInvitesSection
          invitations={invitationsData?.data ?? []}
          isLoading={isLoadingInvitations}
          onRevoke={handleInviteRevoke}
        />
      </section>

      {/* Invite Admin Modal */}
      <InviteAdminModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={handleInviteSuccess}
      />

      {/* Admin Detail Drawer */}
      <AdminDetailDrawer
        adminId={selectedAdminId}
        onClose={handleCloseDrawer}
        onUpdate={handleAdminUpdate}
      />
    </div>
  )
}
