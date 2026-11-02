/**
 * Nebula DNS - Client Users Page
 * View and manage users for a specific client
 */

'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useClientUsers } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { useToast } from '@/components/Toast'
import {
  UserGroupIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  ClockIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

const ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full access to manage client settings' },
  { value: 'manager', label: 'Manager', description: 'Can manage policies and zones' },
  { value: 'user', label: 'User', description: 'View-only access' },
]

export default function ClientUsersPage() {
  const params = useParams()
  const clientId = params.id as string
  const { data, isLoading, mutate } = useClientUsers(clientId)
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState<{ id: string; name: string } | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'user' })

  const users = data?.users || []
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(search.toLowerCase()) ||
                          user.email?.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  const handleInviteUser = async () => {
    if (!newUser.email.trim()) {
      showToast('error', 'Email is required')
      return
    }
    setInviting(true)
    try {
      await api.inviteClientUser(clientId, {
        email: newUser.email,
        name: newUser.name || undefined,
        role: newUser.role,
      })
      showToast('success', 'Invitation sent successfully')
      setShowInviteModal(false)
      setNewUser({ email: '', name: '', role: 'user' })
      mutate()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to invite user')
    } finally {
      setInviting(false)
    }
  }

  const handleRemoveUser = async () => {
    if (!showRemoveModal) return
    setRemoving(true)
    try {
      await api.removeClientUser(clientId, showRemoveModal.id)
      showToast('success', 'User removed successfully')
      setShowRemoveModal(null)
      mutate()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to remove user')
    } finally {
      setRemoving(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
      case 'manager': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
      default: return 'bg-space-100 dark:bg-space-700 text-space-600 dark:text-space-400'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-3 max-w-lg">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-space-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-space-800 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-space-800 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="user">User</option>
          </select>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:from-primary-600 hover:to-accent-600 transition-all shadow-lg shadow-primary-500/25"
        >
          <PlusIcon className="h-5 w-5" />
          Invite User
        </button>
      </div>

      {/* Users List */}
      {isLoading ? (
        <div className="bg-white dark:bg-space-800 rounded-2xl ring-1 ring-space-200 dark:ring-space-700 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 border-b border-space-100 dark:border-space-700 last:border-0">
              <div className="animate-pulse flex items-center gap-4">
                <div className="h-10 w-10 bg-space-200 dark:bg-space-700 rounded-full" />
                <div className="flex-1">
                  <div className="h-5 w-40 bg-space-200 dark:bg-space-700 rounded" />
                  <div className="h-4 w-48 bg-space-200 dark:bg-space-700 rounded mt-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-space-800 rounded-2xl ring-1 ring-space-200 dark:ring-space-700">
          <UserGroupIcon className="h-12 w-12 text-space-300 mb-4" />
          <h3 className="text-lg font-medium text-space-900 dark:text-white mb-2">No users found</h3>
          <p className="text-space-500 dark:text-space-400 mb-6 text-center max-w-sm">
            {search ? 'Try adjusting your search' : 'Invite users to manage this client\'s account'}
          </p>
          {!search && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Invite First User
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-space-800 rounded-2xl ring-1 ring-space-200 dark:ring-space-700 overflow-hidden">
          {filteredUsers.map((user, idx) => (
            <div
              key={user.id}
              className={`p-4 flex items-center gap-4 hover:bg-space-50 dark:hover:bg-space-700/50 transition-colors group ${
                idx !== filteredUsers.length - 1 ? 'border-b border-space-100 dark:border-space-700' : ''
              }`}
            >
              <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold">
                {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-space-900 dark:text-white truncate">{user.name || 'Unnamed User'}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleBadgeColor(user.role)}`}>
                    {user.role || 'user'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-space-500 dark:text-space-400">
                  <span className="flex items-center gap-1 truncate">
                    <EnvelopeIcon className="h-3.5 w-3.5" />
                    {user.email}
                  </span>
                  {user.lastActive && (
                    <span className="flex items-center gap-1">
                      <ClockIcon className="h-3.5 w-3.5" />
                      {user.lastActive}
                    </span>
                  )}
                </div>
              </div>
              {user.mfaEnabled && (
                <div className="flex items-center gap-1 text-sm text-success-600 dark:text-success-400">
                  <ShieldCheckIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">MFA</span>
                </div>
              )}
              <div className="relative">
                <button
                  onClick={() => setActiveMenu(activeMenu === user.id ? null : user.id)}
                  className="p-2 rounded-lg hover:bg-space-100 dark:hover:bg-space-600 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <EllipsisVerticalIcon className="h-5 w-5 text-space-500" />
                </button>
                {activeMenu === user.id && (
                  <div className="absolute right-0 top-10 z-10 w-40 bg-white dark:bg-space-800 rounded-xl shadow-xl ring-1 ring-space-200 dark:ring-space-700 py-1">
                    <button className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-space-50 dark:hover:bg-space-700 text-space-700 dark:text-space-300">
                      <PencilIcon className="h-4 w-4" />
                      Change Role
                    </button>
                    <button
                      onClick={() => { setActiveMenu(null); setShowRemoveModal({ id: user.id, name: user.name || user.email }) }}
                      className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-space-50 dark:hover:bg-space-700 text-danger-600 dark:text-danger-400"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Remove User
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-space-800 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-space-100 dark:border-space-700">
              <h3 className="text-lg font-semibold text-space-900 dark:text-white">Invite User</h3>
              <button onClick={() => setShowInviteModal(false)} className="p-2 hover:bg-space-100 dark:hover:bg-space-700 rounded-lg">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">Email Address *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@example.com"
                  className="w-full px-4 py-2.5 bg-space-50 dark:bg-space-900 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">Full Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-4 py-2.5 bg-space-50 dark:bg-space-900 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">Role</label>
                <div className="space-y-2">
                  {ROLES.map((role) => (
                    <button
                      key={role.value}
                      onClick={() => setNewUser({ ...newUser, role: role.value })}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                        newUser.role === role.value
                          ? 'bg-primary-50 dark:bg-primary-900/30 ring-2 ring-primary-500'
                          : 'bg-space-50 dark:bg-space-900 ring-1 ring-space-200 dark:ring-space-700 hover:bg-space-100 dark:hover:bg-space-800'
                      }`}
                    >
                      <div>
                        <p className="font-medium text-space-900 dark:text-white">{role.label}</p>
                        <p className="text-xs text-space-500">{role.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-space-100 dark:border-space-700">
              <button onClick={() => setShowInviteModal(false)} className="px-4 py-2 text-space-700 dark:text-space-300 hover:bg-space-100 dark:hover:bg-space-700 rounded-xl">Cancel</button>
              <button onClick={handleInviteUser} disabled={inviting} className="px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50">
                {inviting ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove User Modal */}
      {showRemoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-space-800 rounded-2xl w-full max-w-sm mx-4 shadow-2xl p-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center mb-4">
                <TrashIcon className="h-6 w-6 text-danger-600" />
              </div>
              <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-2">Remove User</h3>
              <p className="text-space-500 dark:text-space-400">
                Are you sure you want to remove <strong>{showRemoveModal.name}</strong> from this client? They will lose access immediately.
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowRemoveModal(null)} className="flex-1 px-4 py-2 text-space-700 dark:text-space-300 hover:bg-space-100 dark:hover:bg-space-700 rounded-xl">Cancel</button>
              <button onClick={handleRemoveUser} disabled={removing} className="flex-1 px-4 py-2 bg-danger-600 text-white rounded-xl font-medium hover:bg-danger-700 disabled:opacity-50">
                {removing ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

