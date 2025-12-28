/**
 * Nebula DNS - Client Organizations Page
 * Allows MSP users to view and manage their client organizations
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useMspClients } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { useToast } from '@/components/Toast'
import {
  BuildingOffice2Icon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowsRightLeftIcon,
  PencilSquareIcon,
  TrashIcon,
  UserGroupIcon,
  MapPinIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

export default function ClientsPage() {
  const { isMsp, switchOrganization, currentOrg } = useAuth()
  const { data, error, isLoading, mutate } = useMspClients()
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [switching, setSwitching] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const clients = data?.clients || []

  const handleSwitch = async (orgId: string) => {
    if (switching) return
    setSwitching(orgId)
    try {
      await switchOrganization(orgId)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to switch organization')
    } finally {
      setSwitching(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteModal || deleting) return
    setDeleting(true)
    try {
      await api.deleteMspClient(deleteModal.id)
      showToast('success', `${deleteModal.name} has been deleted`)
      setDeleteModal(null)
      mutate() // Refresh the client list
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to delete client')
    } finally {
      setDeleting(false)
    }
  }

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(search.toLowerCase()) ||
                          client.slug.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Redirect non-MSP users
  if (!isMsp) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <ShieldCheckIcon className="h-12 w-12 text-space-400 mb-4" />
        <h2 className="text-xl font-semibold text-space-900 dark:text-white mb-2">
          MSP Feature Only
        </h2>
        <p className="text-space-500 dark:text-space-400 max-w-md">
          This feature is only available for MSP accounts. Contact support to upgrade.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-space-900 dark:text-white">Client Organizations</h1>
          <p className="text-space-500 dark:text-space-400">
            Manage your {clients.length} client organization{clients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/dashboard/clients/new"
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-medium hover:from-primary-600 hover:to-accent-600 transition-all shadow-lg shadow-primary-500/25"
        >
          <PlusIcon className="h-5 w-5" />
          Add Client
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-space-400" />
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-space-800 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-white dark:bg-space-800 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-primary-500 outline-none"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {error && (
        <div className="bg-danger-50 dark:bg-danger-900/20 rounded-xl p-4">
          <p className="text-danger-700 dark:text-danger-300">{error.message || 'Failed to load clients'}</p>
        </div>
      )}

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-white dark:bg-space-800 rounded-2xl">
          <BuildingOffice2Icon className="h-12 w-12 text-space-300 mb-4" />
          <h3 className="text-lg font-medium text-space-900 dark:text-white mb-2">No clients found</h3>
          <p className="text-space-500 dark:text-space-400 mb-6">
            {search ? 'Try adjusting your search or filters' : 'Get started by adding your first client'}
          </p>
          {!search && (
            <Link
              href="/dashboard/clients/new"
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Add Your First Client
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className={`relative bg-white dark:bg-space-800 rounded-2xl p-5 ring-1 transition-all hover:shadow-lg ${
                currentOrg?.id === client.id
                  ? 'ring-primary-500 shadow-lg shadow-primary-500/10'
                  : 'ring-space-200 dark:ring-space-700 hover:ring-space-300 dark:hover:ring-space-600'
              }`}
            >
              {currentOrg?.id === client.id && (
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-medium rounded-full">
                  Current
                </div>
              )}

              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                  <BuildingOffice2Icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-space-900 dark:text-white truncate">{client.name}</h3>
                  <p className="text-sm text-space-500 dark:text-space-400">{client.slug}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-space-50 dark:bg-space-700/50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-space-500 dark:text-space-400 mb-1">
                    <MapPinIcon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm font-semibold text-space-900 dark:text-white">{client.locationCount}</span>
                  <span className="text-xs text-space-500 block">Zones</span>
                </div>
                <div className="p-2 bg-space-50 dark:bg-space-700/50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-space-500 dark:text-space-400 mb-1">
                    <UserGroupIcon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm font-semibold text-space-900 dark:text-white">{client.userCount}</span>
                  <span className="text-xs text-space-500 block">Users</span>
                </div>
                <div className="p-2 bg-space-50 dark:bg-space-700/50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-space-500 dark:text-space-400 mb-1">
                    <ShieldCheckIcon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm font-semibold text-space-900 dark:text-white">{client.policyCount}</span>
                  <span className="text-xs text-space-500 block">Policies</span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                {currentOrg?.id !== client.id && (
                  <button
                    onClick={() => handleSwitch(client.id)}
                    disabled={switching === client.id}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-xl text-sm font-medium hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors disabled:opacity-50"
                  >
                    {switching === client.id ? (
                      <div className="h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ArrowsRightLeftIcon className="h-4 w-4" />
                    )}
                    Switch
                  </button>
                )}
                <Link
                  href={`/dashboard/clients/${client.id}/edit`}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-space-100 dark:bg-space-700 text-space-700 dark:text-space-200 rounded-xl text-sm font-medium hover:bg-space-200 dark:hover:bg-space-600 transition-colors"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => setDeleteModal({ id: client.id, name: client.name })}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300 rounded-xl text-sm font-medium hover:bg-danger-100 dark:hover:bg-danger-900/50 transition-colors"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-space-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center">
                <ExclamationTriangleIcon className="h-6 w-6 text-danger-600 dark:text-danger-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-space-900 dark:text-white">
                  Delete Client Organization
                </h3>
                <p className="mt-2 text-sm text-space-600 dark:text-space-400">
                  Are you sure you want to delete <strong>{deleteModal.name}</strong>? This action cannot be undone.
                  All associated data including users, locations, and policies will be permanently removed.
                </p>
              </div>
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-space-100 dark:hover:bg-space-700 transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-space-500" />
              </button>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2 bg-space-100 dark:bg-space-700 text-space-700 dark:text-space-200 rounded-xl font-medium hover:bg-space-200 dark:hover:bg-space-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-danger-600 text-white rounded-xl font-medium hover:bg-danger-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deleting && (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {deleting ? 'Deleting...' : 'Delete Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

