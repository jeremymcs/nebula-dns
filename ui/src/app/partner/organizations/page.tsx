/**
 * Partner Organizations List
 * View and manage all sub-client organizations
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BuildingOffice2Icon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsRightLeftIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline'

interface Organization {
  id: string
  name: string
  slug: string
  status: string
  plan: string
  locationCount: number
  userCount: number
  createdAt: string
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    const token = localStorage.getItem('partnerToken')
    if (!token) return

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/partner-dashboard/organizations/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Failed to fetch organizations')

      const data = await res.json()
      setOrganizations(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organizations')
    } finally {
      setLoading(false)
    }
  }

  const handleImpersonate = async (orgId: string) => {
    const token = localStorage.getItem('partnerToken')
    if (!token) return

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/partner-dashboard/impersonate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organizationId: orgId }),
      })

      if (!res.ok) throw new Error('Failed to impersonate')

      const data = await res.json()
      // Store impersonation token and redirect to regular dashboard
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('impersonating', 'true')
      window.location.href = '/dashboard'
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to switch organization')
    }
  }

  const filteredOrgs = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(search.toLowerCase()) ||
                          org.slug.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || org.status === statusFilter
    return matchesSearch && matchesStatus
  })

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
          <h1 className="text-2xl font-bold text-space-900 dark:text-white">Organizations</h1>
          <p className="text-space-500 dark:text-space-400">Manage your client organizations</p>
        </div>
        <Link
          href="/partner/organizations/new"
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25"
        >
          <PlusIcon className="h-5 w-5" />
          New Organization
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-space-400" />
          <input
            type="text"
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-space-800 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-white dark:bg-space-800 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {error && (
        <div className="bg-danger-50 dark:bg-danger-900/20 rounded-xl p-4">
          <p className="text-danger-700 dark:text-danger-300">{error}</p>
        </div>
      )}

      {/* Organizations Table */}
      <div className="bg-white dark:bg-space-900 rounded-xl ring-1 ring-space-200 dark:ring-space-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-space-50 dark:bg-space-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-space-500 dark:text-space-400 uppercase tracking-wider">Organization</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-space-500 dark:text-space-400 uppercase tracking-wider">Plan</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-space-500 dark:text-space-400 uppercase tracking-wider">Locations</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-space-500 dark:text-space-400 uppercase tracking-wider">Users</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-space-500 dark:text-space-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-space-500 dark:text-space-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-space-200 dark:divide-space-800">
            {filteredOrgs.map((org) => (
              <tr key={org.id} className="hover:bg-space-50 dark:hover:bg-space-800/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                      <BuildingOffice2Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <Link href={`/partner/organizations/${org.id}`} className="font-medium text-space-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400">
                        {org.name}
                      </Link>
                      <p className="text-sm text-space-500 dark:text-space-400">{org.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-space-100 dark:bg-space-800 rounded text-sm font-medium text-space-700 dark:text-space-300 capitalize">
                    {org.plan}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-space-600 dark:text-space-400">{org.locationCount}</td>
                <td className="px-6 py-4 text-sm text-space-600 dark:text-space-400">{org.userCount}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    org.status === 'active'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : org.status === 'suspended'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                  }`}>
                    {org.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleImpersonate(org.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                      title="Switch to this organization"
                    >
                      <ArrowsRightLeftIcon className="h-4 w-4" />
                      Switch
                    </button>
                    <Link
                      href={`/partner/organizations/${org.id}`}
                      className="p-2 text-space-500 hover:text-space-700 dark:hover:text-space-300 hover:bg-space-100 dark:hover:bg-space-800 rounded-lg transition-colors"
                    >
                      <EllipsisVerticalIcon className="h-5 w-5" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredOrgs.length === 0 && (
          <div className="px-6 py-12 text-center">
            <BuildingOffice2Icon className="h-12 w-12 mx-auto text-space-400 mb-4" />
            <p className="text-space-500 dark:text-space-400">
              {search || statusFilter !== 'all' ? 'No organizations match your filters' : 'No organizations yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

