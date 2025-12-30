/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Users Management Page - Cosmic Security Theme
 */

'use client'

import { useState } from 'react'
import { useUsers, useInvitations } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { useAuth } from '@/contexts/AuthContext'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  UserPlusIcon,
  ArrowPathIcon,
  XMarkIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { Button, Card, Badge, Modal, Input, EmptyState } from '@/components/ui'

interface User {
  id: string
  email: string
  name: string
  role: 'owner' | 'admin' | 'analyst' | 'readonly'
  status: 'active' | 'inactive' | 'pending'
  lastLogin?: string
  createdAt: string
  mfaEnabled?: boolean
}

interface Invitation {
  id: string
  email: string
  role: 'admin' | 'analyst' | 'readonly'
  status: 'pending' | 'accepted' | 'expired'
  expiresAt: string
  createdAt: string
}

const ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full access to all settings' },
  { value: 'analyst', label: 'Analyst', description: 'View reports and manage policies' },
  { value: 'readonly', label: 'Read Only', description: 'View-only access to dashboard' },
]

export default function UsersPage() {
  const { data: usersData, isLoading: usersLoading, error: usersError, mutate: mutateUsers } = useUsers()
  const { data: invitationsData, isLoading: invitationsLoading, mutate: mutateInvitations } = useInvitations()
  const { showToast } = useToast()
  const { user: currentUser } = useAuth()
  
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'users' | 'invitations'>('users')

  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'analyst' as 'admin' | 'analyst' | 'readonly',
  })

  const [editForm, setEditForm] = useState({
    name: '',
    role: 'analyst' as 'owner' | 'admin' | 'analyst' | 'readonly',
    status: 'active' as 'active' | 'inactive',
  })

  const users: User[] = usersData?.data || []
  const invitations: Invitation[] = invitationsData?.data || []
  const pendingInvitations = invitations.filter(i => i.status === 'pending')

  const isAdmin = currentUser?.role === 'owner' || currentUser?.role === 'admin'

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setEditForm({
      name: user.name,
      role: user.role,
      status: user.status === 'pending' ? 'active' : user.status,
    })
    setShowEditModal(true)
  }

  const handleInvite = async () => {
    if (!inviteForm.email.trim()) {
      showToast('error', 'Email is required')
      return
    }

    setSaving(true)
    try {
      await api.sendInvitation({
        email: inviteForm.email,
        role: inviteForm.role,
      })
      showToast('success', 'Invitation sent successfully')
      mutateInvitations()
      setShowInviteModal(false)
      setInviteForm({ email: '', role: 'analyst' })
    } catch (err: any) {
      showToast('error', err.message || 'Failed to send invitation')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return

    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editForm.name,
          role: editForm.role,
        }),
      })
      showToast('success', 'User updated successfully')
      mutateUsers()
      setShowEditModal(false)
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveUser = async (user: User) => {
    if (user.id === currentUser?.id) {
      showToast('error', 'You cannot remove yourself')
      return
    }

    if (user.role === 'owner') {
      showToast('error', 'Cannot remove the account owner')
      return
    }

    if (!confirm(`Are you sure you want to remove ${user.name}?`)) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      showToast('success', 'User removed')
      mutateUsers()
    } catch (err: any) {
      showToast('error', err.message || 'Failed to remove user')
    }
  }

  const handleResendInvitation = async (invitation: Invitation) => {
    try {
      await api.resendInvitation(invitation.id)
      showToast('success', 'Invitation resent')
      mutateInvitations()
    } catch (err: any) {
      showToast('error', err.message || 'Failed to resend invitation')
    }
  }

  const handleRevokeInvitation = async (invitation: Invitation) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) {
      return
    }

    try {
      await api.revokeInvitation(invitation.id)
      showToast('success', 'Invitation revoked')
      mutateInvitations()
    } catch (err: any) {
      showToast('error', err.message || 'Failed to revoke invitation')
    }
  }

  const getRoleBadgeVariant = (role: string): 'primary' | 'success' | 'warning' | 'danger' | 'neutral' => {
    switch (role) {
      case 'owner': return 'primary'
      case 'admin': return 'primary'
      case 'analyst': return 'success'
      case 'readonly': return 'neutral'
      default: return 'neutral'
    }
  }

  if (usersError) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Card variant="solid" padding="lg" className="border-red-200 dark:border-red-800 bg-danger-50 dark:bg-danger-900/20">
          <p className="text-danger-800 dark:text-danger-200">Failed to load users. Make sure the API is running.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-space-900 dark:text-white">Team Members</h1>
          <p className="mt-2 text-space-500 dark:text-space-400">
            Manage users and pending invitations
          </p>
        </div>
        {isAdmin && (
          <div className="mt-4 sm:mt-0">
            <Button
              variant="primary"
              onClick={() => setShowInviteModal(true)}
              leftIcon={<UserPlusIcon className="h-5 w-5" />}
            >
              Invite Team Member
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-space-200 dark:border-space-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'users'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-space-500 dark:text-space-400 hover:text-space-700 dark:hover:text-space-300 hover:border-space-300 dark:hover:border-space-600'
            }`}
          >
            Team Members ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'invitations'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-space-500 dark:text-space-400 hover:text-space-700 dark:hover:text-space-300 hover:border-space-300 dark:hover:border-space-600'
            }`}
          >
            Pending Invitations ({pendingInvitations.length})
          </button>
        </nav>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        usersLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-xl" />
            ))}
          </div>
        ) : (
          <Card variant="solid" padding="none">
            <div className="table-container">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">User</th>
                    <th className="table-header-cell">Role</th>
                    <th className="table-header-cell">Status</th>
                    <th className="table-header-cell">MFA</th>
                    <th className="table-header-cell">Last Login</th>
                    {isAdmin && <th className="table-header-cell text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="table-body">
                  {users.map((user) => (
                    <tr key={user.id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                              {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-space-900 dark:text-white">
                              {user.name || 'No name'}
                              {user.id === currentUser?.id && (
                                <span className="ml-2 text-xs text-space-500 dark:text-space-400">(you)</span>
                              )}
                            </div>
                            <div className="text-sm text-space-500 dark:text-space-400">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <Badge variant={getRoleBadgeVariant(user.role)} size="sm">
                          {user.role}
                        </Badge>
                      </td>
                      <td className="table-cell">
                        <Badge
                          variant={user.status === 'active' ? 'success' : user.status === 'pending' ? 'warning' : 'neutral'}
                          size="sm"
                        >
                          {user.status === 'active' ? 'Active' : user.status === 'pending' ? 'Pending' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="table-cell">
                        {user.mfaEnabled ? (
                          <ShieldCheckIcon className="h-5 w-5 text-success-500 dark:text-success-400" title="MFA Enabled" />
                        ) : (
                          <span className="text-xs text-space-400">Not set up</span>
                        )}
                      </td>
                      <td className="table-cell text-space-500 dark:text-space-400">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                      </td>
                      {isAdmin && (
                        <td className="table-cell text-right">
                          {user.role !== 'owner' && user.id !== currentUser?.id && (
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(user)}
                                leftIcon={<PencilIcon className="h-4 w-4" />}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveUser(user)}
                                leftIcon={<TrashIcon className="h-4 w-4 text-danger-500" />}
                              />
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <EmptyState
                  icon={<UserIcon className="h-12 w-12" />}
                  title="No team members"
                  description="Get started by inviting a team member."
                />
              )}
            </div>
          </Card>
        )
      )}

      {/* Invitations Tab */}
      {activeTab === 'invitations' && (
        invitationsLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-xl" />
            ))}
          </div>
        ) : (
          <Card variant="solid" padding="none">
            <div className="table-container">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Email</th>
                    <th className="table-header-cell">Role</th>
                    <th className="table-header-cell">Status</th>
                    <th className="table-header-cell">Expires</th>
                    {isAdmin && <th className="table-header-cell text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="table-body">
                  {invitations.map((invitation) => (
                    <tr key={invitation.id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center">
                          <EnvelopeIcon className="h-5 w-5 text-space-400 mr-3" />
                          <span className="text-sm text-space-900 dark:text-white">{invitation.email}</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <Badge variant={getRoleBadgeVariant(invitation.role)} size="sm">
                          {invitation.role}
                        </Badge>
                      </td>
                      <td className="table-cell">
                        <Badge
                          variant={invitation.status === 'pending' ? 'warning' : invitation.status === 'accepted' ? 'success' : 'danger'}
                          size="sm"
                        >
                          {invitation.status}
                        </Badge>
                      </td>
                      <td className="table-cell text-space-500 dark:text-space-400">
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1 text-space-400" />
                          {new Date(invitation.expiresAt).toLocaleDateString()}
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="table-cell text-right">
                          {invitation.status === 'pending' && (
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResendInvitation(invitation)}
                              >
                                Resend
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRevokeInvitation(invitation)}
                                className="text-danger-600 hover:text-danger-400"
                              >
                                Revoke
                              </Button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {invitations.length === 0 && (
                <EmptyState
                  icon={<EnvelopeIcon className="h-12 w-12" />}
                  title="No invitations"
                  description="Invite team members to get started."
                />
              )}
            </div>
          </Card>
        )
      )}

      {/* Invite Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Team Member"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="colleague@company.com"
            value={inviteForm.email}
            onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">Role</label>
            <div className="space-y-2">
              {ROLES.map((role) => (
                <label
                  key={role.value}
                  className={`flex items-start p-3 border rounded-xl cursor-pointer transition-colors ${
                    inviteForm.role === role.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-space-200 dark:border-space-700 hover:bg-space-50 dark:hover:bg-space-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role.value}
                    checked={inviteForm.role === role.value}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as typeof inviteForm.role })}
                    className="mt-0.5 h-4 w-4 text-primary-600"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-space-900 dark:text-white">{role.label}</span>
                    <p className="text-xs text-space-500 dark:text-space-400">{role.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-space-200 dark:border-space-700">
          <Button variant="secondary" onClick={() => setShowInviteModal(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleInvite} disabled={saving}>
            {saving ? 'Sending...' : 'Send Invitation'}
          </Button>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal && !!editingUser}
        onClose={() => setShowEditModal(false)}
        title="Edit User"
        size="md"
      >
        {editingUser && (
          <>
            <div className="space-y-4">
              <Input
                label="Name"
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
              <Input
                label="Email"
                type="email"
                value={editingUser.email}
                disabled
              />
              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">Role</label>
                <select
                  className="w-full px-4 py-2.5 rounded-xl border border-space-200 dark:border-space-700 bg-white dark:bg-space-800 text-space-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as typeof editForm.role })}
                >
                  <option value="admin">Admin</option>
                  <option value="analyst">Analyst</option>
                  <option value="readonly">Read Only</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-space-200 dark:border-space-700">
              <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={saving}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleUpdateUser} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
