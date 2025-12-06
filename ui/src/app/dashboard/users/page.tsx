/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Users Management Page
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800'
      case 'admin': return 'bg-blue-100 text-blue-800'
      case 'analyst': return 'bg-green-100 text-green-800'
      case 'readonly': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (usersError) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">Failed to load users. Make sure the API is running.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Team Members</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage users and pending invitations
          </p>
        </div>
        {isAdmin && (
          <div className="mt-4 sm:mt-0">
            <button onClick={() => setShowInviteModal(true)} className="btn-primary inline-flex items-center">
              <UserPlusIcon className="h-5 w-5 mr-2" />
              Invite Team Member
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users' 
                ? 'border-primary-500 text-primary-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Team Members ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'invitations' 
                ? 'border-primary-500 text-primary-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pending Invitations ({pendingInvitations.length})
          </button>
        </nav>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        usersLoading ? (
          <div className="mt-8 flex items-center justify-center py-12">
            <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="mt-6">
            <div className="card overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      MFA
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    {isAdmin && (
                      <th className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.name || 'No name'}
                              {user.id === currentUser?.id && (
                                <span className="ml-2 text-xs text-gray-500">(you)</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : user.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.status === 'active' ? 'Active' : user.status === 'pending' ? 'Pending' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.mfaEnabled ? (
                          <ShieldCheckIcon className="h-5 w-5 text-green-500" title="MFA Enabled" />
                        ) : (
                          <span className="text-xs text-gray-400">Not set up</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.lastLogin 
                          ? new Date(user.lastLogin).toLocaleDateString() 
                          : 'Never'}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {user.role !== 'owner' && user.id !== currentUser?.id && (
                            <div className="flex justify-end space-x-2">
                              <button 
                                onClick={() => openEditModal(user)}
                                className="p-1 text-gray-400 hover:text-gray-600"
                                title="Edit"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              <button 
                                onClick={() => handleRemoveUser(user)}
                                className="p-1 text-gray-400 hover:text-red-600"
                                title="Remove"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5} className="px-6 py-12 text-center">
                        <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No team members</h3>
                        <p className="mt-1 text-sm text-gray-500">Get started by inviting a team member.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Invitations Tab */}
      {activeTab === 'invitations' && (
        invitationsLoading ? (
          <div className="mt-8 flex items-center justify-center py-12">
            <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="mt-6">
            <div className="card overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires
                    </th>
                    {isAdmin && (
                      <th className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invitations.map((invitation) => (
                    <tr key={invitation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                          <span className="text-sm text-gray-900">{invitation.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleColor(invitation.role)}`}>
                          {invitation.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          invitation.status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : invitation.status === 'accepted'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {invitation.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1 text-gray-400" />
                          {new Date(invitation.expiresAt).toLocaleDateString()}
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {invitation.status === 'pending' && (
                            <div className="flex justify-end space-x-2">
                              <button 
                                onClick={() => handleResendInvitation(invitation)}
                                className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                              >
                                Resend
                              </button>
                              <button 
                                onClick={() => handleRevokeInvitation(invitation)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                              >
                                Revoke
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {invitations.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin ? 5 : 4} className="px-6 py-12 text-center">
                        <EnvelopeIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No invitations</h3>
                        <p className="mt-1 text-sm text-gray-500">Invite team members to get started.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowInviteModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Invite Team Member</h3>
                <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-500">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email Address *</label>
                  <input 
                    type="email" 
                    className="input mt-1" 
                    placeholder="colleague@company.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <div className="space-y-2">
                    {ROLES.map((role) => (
                      <label 
                        key={role.value}
                        className={`flex items-start p-3 border rounded-lg cursor-pointer ${
                          inviteForm.role === role.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'
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
                          <span className="text-sm font-medium text-gray-900">{role.label}</span>
                          <p className="text-xs text-gray-500">{role.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowInviteModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleInvite} 
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowEditModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Edit User</h3>
                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-500">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input 
                    type="text" 
                    className="input mt-1" 
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input 
                    type="email" 
                    className="input mt-1 bg-gray-50" 
                    value={editingUser.email}
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <select 
                    className="input"
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as typeof editForm.role })}
                  >
                    <option value="admin">Admin</option>
                    <option value="analyst">Analyst</option>
                    <option value="readonly">Read Only</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowEditModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpdateUser} 
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
