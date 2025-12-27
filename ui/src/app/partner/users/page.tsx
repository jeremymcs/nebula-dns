/**
 * Partner Users Management
 * Manage partner staff users and permissions
 */

'use client'

import { useEffect, useState } from 'react'
import {
  UsersIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'

interface PartnerUser {
  id: string
  email: string
  name: string
  role: 'partner_owner' | 'partner_admin' | 'partner_support'
  status: string
  lastLoginAt: string | null
  createdAt: string
}

const roleLabels: Record<string, { label: string; color: string }> = {
  partner_owner: { label: 'Owner', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
  partner_admin: { label: 'Admin', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  partner_support: { label: 'Support', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
}

export default function PartnerUsersPage() {
  const [users, setUsers] = useState<PartnerUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    const token = localStorage.getItem('partnerToken')
    if (!token) return

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/partner-dashboard/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Failed to fetch users')

      const data = await res.json()
      setUsers(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-space-900 dark:text-white">Partner Users</h1>
          <p className="text-space-500 dark:text-space-400">Manage your partner team members</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25"
        >
          <PlusIcon className="h-5 w-5" />
          Add User
        </button>
      </div>

      {error && (
        <div className="bg-danger-50 dark:bg-danger-900/20 rounded-xl p-4">
          <p className="text-danger-700 dark:text-danger-300">{error}</p>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white dark:bg-space-900 rounded-xl ring-1 ring-space-200 dark:ring-space-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-space-50 dark:bg-space-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-space-500 dark:text-space-400 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-space-500 dark:text-space-400 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-space-500 dark:text-space-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-space-500 dark:text-space-400 uppercase tracking-wider">Last Login</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-space-500 dark:text-space-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-space-200 dark:divide-space-800">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-space-50 dark:hover:bg-space-800/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-space-900 dark:text-white">{user.name}</p>
                      <p className="text-sm text-space-500 dark:text-space-400">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleLabels[user.role]?.color || 'bg-gray-100 text-gray-700'}`}>
                    {roleLabels[user.role]?.label || user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.status === 'active'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-space-500 dark:text-space-400">
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 text-space-500 hover:text-space-700 dark:hover:text-space-300 hover:bg-space-100 dark:hover:bg-space-800 rounded-lg transition-colors">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    {user.role !== 'partner_owner' && (
                      <button className="p-2 text-danger-500 hover:text-danger-700 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg transition-colors">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

