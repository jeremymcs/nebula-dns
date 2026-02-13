/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Users Management Page - Cosmic Security Theme
 */

'use client'

import { useState, useMemo } from 'react'
import { useUsers, useInvitations } from '@/hooks/useApi'
import { api, API_URL } from '@/lib/api'
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
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  KeyIcon,
  ClipboardDocumentIcon,
  CheckIcon,
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
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null)
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)
  const [copiedPassword, setCopiedPassword] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'users' | 'invitations'>('users')

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [mfaFilter, setMfaFilter] = useState<string>('')

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

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Search filter
      const matchesSearch = searchQuery === '' ||
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())

      // Role filter
      const matchesRole = roleFilter === '' || user.role === roleFilter

      // Status filter
      const matchesStatus = statusFilter === '' || user.status === statusFilter

      // MFA filter
      const matchesMfa = mfaFilter === '' ||
        (mfaFilter === 'enabled' && user.mfaEnabled) ||
        (mfaFilter === 'disabled' && !user.mfaEnabled)

      return matchesSearch && matchesRole && matchesStatus && matchesMfa
    })
  }, [users, searchQuery, roleFilter, statusFilter, mfaFilter])

  const hasActiveFilters = searchQuery || roleFilter || statusFilter || mfaFilter

  const clearFilters = () => {
    setSearchQuery('')
    setRoleFilter('')
    setStatusFilter('')
    setMfaFilter('')
  }

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
      const res = await fetch(`${API_URL}/users/${editingUser.id}`, {
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

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Request failed' }))
        throw new Error(errorData.message || `Failed to update user (${res.status})`)
      }

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
      await fetch(`${API_URL}/users/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      showToast('success', 'User removed')
      mutateUsers()
    } catch (err: any) {
      showToast('error', err.message || 'Failed to remove user')
    }
  }

  const handleToggleUserStatus = async (user: User) => {
    if (user.id === currentUser?.id) {
      showToast('error', 'You cannot deactivate yourself')
      return
    }

    if (user.role === 'owner') {
      showToast('error', 'Cannot deactivate the account owner')
      return
    }

    const action = user.status === 'active' ? 'deactivate' : 'reactivate'
    if (!confirm(`Are you sure you want to ${action} ${user.name}?`)) {
      return
    }

    try {
      if (user.status === 'active') {
        await api.suspendUser(user.id)
        showToast('success', 'User deactivated')
      } else {
        await api.reactivateUser(user.id)
        showToast('success', 'User reactivated')
      }
      mutateUsers()
    } catch (err: any) {
      showToast('error', err.message || `Failed to ${action} user`)
    }
  }

  const handleResetPassword = async (user: User) => {
    if (user.role === 'owner') {
      showToast('error', 'Cannot reset password for the account owner')
      return
    }

    if (!confirm(`Are you sure you want to reset the password for ${user.name || user.email}? They will need to use a temporary password to log in.`)) {
      return
    }

    setResetPasswordUser(user)
    setResettingPassword(true)
    try {
      const result = await api.adminResetPassword(user.id)
      setTemporaryPassword(result.temporaryPassword)
      setShowPasswordResetModal(true)
    } catch (err: any) {
      showToast('error', err.message || 'Failed to reset password')
      setResetPasswordUser(null)
    } finally {
      setResettingPassword(false)
    }
  }

  const copyTemporaryPassword = () => {
    if (temporaryPassword) {
      navigator.clipboard.writeText(temporaryPassword)
      setCopiedPassword(true)
      setTimeout(() => setCopiedPassword(false), 2000)
    }
  }

  const closePasswordResetModal = () => {
    setShowPasswordResetModal(false)
    setResetPasswordUser(null)
    setTemporaryPassword(null)
    setCopiedPassword(false)
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
        <>
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Search Input */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-space-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-space-800 border border-space-200 dark:border-space-700 text-space-900 dark:text-white placeholder-space-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
              {/* Role Filter */}
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-white dark:bg-space-800 border border-space-200 dark:border-space-700 text-space-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                >
                  <option value="">All Roles</option>
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="analyst">Analyst</option>
                  <option value="readonly">Read Only</option>
                </select>
                <FunnelIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-space-400 pointer-events-none" />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-white dark:bg-space-800 border border-space-200 dark:border-space-700 text-space-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
                <FunnelIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-space-400 pointer-events-none" />
              </div>

              {/* MFA Filter */}
              <div className="relative">
                <select
                  value={mfaFilter}
                  onChange={(e) => setMfaFilter(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-white dark:bg-space-800 border border-space-200 dark:border-space-700 text-space-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                >
                  <option value="">MFA Status</option>
                  <option value="enabled">MFA Enabled</option>
                  <option value="disabled">MFA Disabled</option>
                </select>
                <FunnelIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-space-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Results count */}
          {users.length > 0 && (
            <div className="text-sm text-space-500 dark:text-space-400 mb-4">
              Showing {filteredUsers.length} of {users.length} team members
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="ml-2 text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {usersLoading ? (
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
                  {filteredUsers.map((user) => (
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
                                title="Edit user"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResetPassword(user)}
                                disabled={resettingPassword}
                                leftIcon={<KeyIcon className="h-4 w-4 text-accent-500" />}
                                title="Reset password"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleUserStatus(user)}
                                leftIcon={user.status === 'active'
                                  ? <PauseCircleIcon className="h-4 w-4 text-warning-500" />
                                  : <PlayCircleIcon className="h-4 w-4 text-success-500" />
                                }
                                title={user.status === 'active' ? 'Deactivate user' : 'Reactivate user'}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveUser(user)}
                                leftIcon={<TrashIcon className="h-4 w-4 text-danger-500" />}
                                title="Remove user"
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
              {users.length > 0 && filteredUsers.length === 0 && (
                <EmptyState
                  icon={<MagnifyingGlassIcon className="h-12 w-12" />}
                  title="No matching users"
                  description="No users match your current filters. Try adjusting your search or filters."
                />
              )}
            </div>
          </Card>
          )}
        </>
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

      {/* Password Reset Modal */}
      <Modal
        isOpen={showPasswordResetModal && !!temporaryPassword}
        onClose={closePasswordResetModal}
        title="Password Reset"
        size="md"
      >
        <div className="space-y-4">
          {/* User info */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-space-50 dark:bg-space-800">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                {resetPasswordUser?.name?.charAt(0).toUpperCase() || resetPasswordUser?.email.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-medium text-space-900 dark:text-white">{resetPasswordUser?.name}</p>
              <p className="text-sm text-space-500 dark:text-space-400">{resetPasswordUser?.email}</p>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-warning-50 dark:bg-warning-900/20 ring-1 ring-warning-200 dark:ring-warning-800">
            <KeyIcon className="h-5 w-5 text-warning-600 dark:text-warning-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-warning-800 dark:text-warning-200 text-sm">
                Save this password now
              </p>
              <p className="text-sm text-warning-700 dark:text-warning-300 mt-0.5">
                This temporary password will only be shown once. Share it securely with the user.
              </p>
            </div>
          </div>

          {/* Password display */}
          <div className="rounded-xl bg-space-100 dark:bg-space-900 p-4 ring-1 ring-space-200 dark:ring-space-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-space-500 dark:text-space-400 uppercase tracking-wider">
                Temporary Password
              </span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-lg text-primary-600 dark:text-primary-400 break-all select-all">
                {temporaryPassword}
              </code>
              <button
                onClick={copyTemporaryPassword}
                className={`flex-shrink-0 p-2.5 rounded-lg transition-all duration-200 ${
                  copiedPassword
                    ? 'bg-success-500 text-white scale-95'
                    : 'bg-space-200 dark:bg-space-700 hover:bg-space-300 dark:hover:bg-space-600 text-space-600 dark:text-space-300 hover:text-space-900 dark:hover:text-white'
                }`}
                title={copiedPassword ? 'Copied!' : 'Copy to clipboard'}
              >
                {copiedPassword ? (
                  <CheckIcon className="h-5 w-5" />
                ) : (
                  <ClipboardDocumentIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            {copiedPassword && (
              <p className="mt-2 text-xs text-success-400 flex items-center gap-1">
                <CheckIcon className="h-3.5 w-3.5" />
                Password copied to clipboard
              </p>
            )}
          </div>

          <p className="text-sm text-space-500 dark:text-space-400">
            The user will be required to change this password upon their next login.
          </p>
        </div>

        <div className="flex justify-end mt-6 pt-4 border-t border-space-200 dark:border-space-700">
          <Button onClick={closePasswordResetModal}>
            Done
          </Button>
        </div>
      </Modal>
    </div>
  )
}
