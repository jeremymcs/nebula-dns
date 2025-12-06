/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * User Management Page
 */

'use client'

import { useState } from 'react'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  UserCircleIcon,
  EnvelopeIcon,
  KeyIcon
} from '@heroicons/react/24/outline'

interface User {
  id: string
  name: string
  email: string
  role: 'owner' | 'admin' | 'analyst' | 'readonly'
  status: 'active' | 'suspended' | 'pending'
  lastLogin: string | null
  createdAt: string
}

const mockUsers: User[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@demo.local',
    role: 'owner',
    status: 'active',
    lastLogin: '2024-01-15 14:30',
    createdAt: '2024-01-01',
  },
  {
    id: '2',
    name: 'John Smith',
    email: 'john.smith@demo.local',
    role: 'admin',
    status: 'active',
    lastLogin: '2024-01-14 09:15',
    createdAt: '2024-01-05',
  },
  {
    id: '3',
    name: 'Jane Doe',
    email: 'jane.doe@demo.local',
    role: 'analyst',
    status: 'active',
    lastLogin: '2024-01-15 11:00',
    createdAt: '2024-01-08',
  },
  {
    id: '4',
    name: 'Bob Wilson',
    email: 'bob.wilson@demo.local',
    role: 'readonly',
    status: 'pending',
    lastLogin: null,
    createdAt: '2024-01-12',
  },
]

const roleColors: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  analyst: 'bg-green-100 text-green-800',
  readonly: 'bg-gray-100 text-gray-800',
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
}

export default function UsersPage() {
  const [users] = useState<User[]>(mockUsers)
  const [showCreateModal, setShowCreateModal] = useState(false)

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage user accounts and permissions
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary inline-flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Invite User
          </button>
        </div>
      </div>

      {/* Role Legend */}
      <div className="mt-6 card p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Role Permissions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors.owner}`}>
              Owner
            </span>
            <p className="mt-1 text-xs text-gray-500">Full access, billing, delete tenant</p>
          </div>
          <div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors.admin}`}>
              Admin
            </span>
            <p className="mt-1 text-xs text-gray-500">Manage policies, locations, users</p>
          </div>
          <div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors.analyst}`}>
              Analyst
            </span>
            <p className="mt-1 text-xs text-gray-500">View reports, manage lists</p>
          </div>
          <div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors.readonly}`}>
              Read Only
            </span>
            <p className="mt-1 text-xs text-gray-500">View-only access</p>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="mt-6 card overflow-hidden">
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
                Last Login
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <UserCircleIcon className="h-6 w-6 text-primary-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <EnvelopeIcon className="h-4 w-4 mr-1" />
                        {user.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[user.role]}`}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[user.status]}`}>
                    {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.lastLogin || 'Never'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.createdAt}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <button className="p-1 text-gray-400 hover:text-gray-600" title="Reset Password">
                      <KeyIcon className="h-5 w-5" />
                    </button>
                    <button className="p-1 text-gray-400 hover:text-gray-600" title="Edit">
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    {user.role !== 'owner' && (
                      <button className="p-1 text-gray-400 hover:text-red-600" title="Delete">
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowCreateModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Invite New User</h3>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input type="text" className="input mt-1" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email Address</label>
                  <input type="email" className="input mt-1" placeholder="john@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select className="input mt-1">
                    <option value="readonly">Read Only</option>
                    <option value="analyst">Analyst</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <p className="text-sm text-gray-500">
                  An email invitation will be sent to the user with instructions to set their password.
                </p>
                <div className="flex justify-end space-x-3 pt-4">
                  <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Send Invitation
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

