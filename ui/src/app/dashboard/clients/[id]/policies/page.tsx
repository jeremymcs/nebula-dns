/**
 * Nebula DNS - Client Policies Page
 * View and manage policies for a specific client
 */

'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useClientPolicies } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { useToast } from '@/components/Toast'
import {
  ShieldCheckIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  ClockIcon,
  UserGroupIcon,
  MapPinIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

export default function ClientPoliciesPage() {
  const params = useParams()
  const clientId = params.id as string
  const { data, isLoading, mutate } = useClientPolicies(clientId)
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState<{ id: string; name: string } | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [newPolicy, setNewPolicy] = useState({ name: '', description: '' })

  const policies = data?.policies || []
  const filteredPolicies = policies.filter(policy =>
    policy.name?.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreatePolicy = async () => {
    if (!newPolicy.name.trim()) {
      showToast('error', 'Policy name is required')
      return
    }
    setCreating(true)
    try {
      await api.createClientPolicy(clientId, {
        name: newPolicy.name,
        description: newPolicy.description,
        enabled: true,
      })
      showToast('success', 'Policy created successfully')
      setShowCreateModal(false)
      setNewPolicy({ name: '', description: '' })
      mutate()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to create policy')
    } finally {
      setCreating(false)
    }
  }

  const handleTogglePolicy = async (policyId: string, currentEnabled: boolean) => {
    setToggling(policyId)
    try {
      await api.updateClientPolicy(clientId, policyId, { enabled: !currentEnabled })
      showToast('success', `Policy ${currentEnabled ? 'disabled' : 'enabled'}`)
      mutate()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update policy')
    } finally {
      setToggling(null)
    }
  }

  const handleDeletePolicy = async () => {
    if (!showDeleteModal) return
    setDeleting(true)
    try {
      await api.deleteClientPolicy(clientId, showDeleteModal.id)
      showToast('success', 'Policy deleted successfully')
      setShowDeleteModal(null)
      mutate()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to delete policy')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-space-400" />
          <input
            type="text"
            placeholder="Search policies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-space-800 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:from-primary-600 hover:to-accent-600 transition-all shadow-lg shadow-primary-500/25"
        >
          <PlusIcon className="h-5 w-5" />
          Create Policy
        </button>
      </div>

      {/* Policies List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-space-800 rounded-2xl p-5 ring-1 ring-space-200 dark:ring-space-700">
              <div className="animate-pulse flex items-center gap-4">
                <div className="h-12 w-12 bg-space-200 dark:bg-space-700 rounded-xl" />
                <div className="flex-1">
                  <div className="h-5 w-48 bg-space-200 dark:bg-space-700 rounded" />
                  <div className="h-4 w-32 bg-space-200 dark:bg-space-700 rounded mt-2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredPolicies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-space-800 rounded-2xl ring-1 ring-space-200 dark:ring-space-700">
          <ShieldCheckIcon className="h-12 w-12 text-space-300 mb-4" />
          <h3 className="text-lg font-medium text-space-900 dark:text-white mb-2">No policies found</h3>
          <p className="text-space-500 dark:text-space-400 mb-6 text-center max-w-sm">
            {search ? 'Try adjusting your search' : 'Create security policies to protect this client'}
          </p>
          {!search && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Create First Policy
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPolicies.map((policy) => (
            <div
              key={policy.id}
              className="bg-white dark:bg-space-800 rounded-2xl p-5 ring-1 ring-space-200 dark:ring-space-700 hover:ring-primary-300 dark:hover:ring-primary-700 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary-600">
                    <ShieldCheckIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-space-900 dark:text-white">{policy.name}</h4>
                    <p className="text-sm text-space-500 dark:text-space-400 mt-1">
                      {policy.description || 'No description'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleTogglePolicy(policy.id, policy.enabled) }}
                    disabled={toggling === policy.id}
                    className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                      policy.enabled
                        ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300 hover:bg-success-200 dark:hover:bg-success-900/50'
                        : 'bg-space-100 dark:bg-space-700 text-space-600 dark:text-space-400 hover:bg-space-200 dark:hover:bg-space-600'
                    }`}
                  >
                    {toggling === policy.id ? '...' : policy.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === policy.id ? null : policy.id) }}
                      className="p-1 rounded-lg hover:bg-space-100 dark:hover:bg-space-700 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <EllipsisVerticalIcon className="h-5 w-5 text-space-500" />
                    </button>
                    {activeMenu === policy.id && (
                      <div className="absolute right-0 top-8 z-10 w-40 bg-white dark:bg-space-800 rounded-xl shadow-xl ring-1 ring-space-200 dark:ring-space-700 py-1">
                        <button className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-space-50 dark:hover:bg-space-700 text-space-700 dark:text-space-300">
                          <PencilIcon className="h-4 w-4" />
                          Edit Policy
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveMenu(null); setShowDeleteModal({ id: policy.id, name: policy.name }) }}
                          className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-space-50 dark:hover:bg-space-700 text-danger-600 dark:text-danger-400"
                        >
                          <TrashIcon className="h-4 w-4" />
                          Delete Policy
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-space-100 dark:border-space-700 flex flex-wrap gap-4">
                {policy.schedule && (
                  <div className="flex items-center gap-2 text-sm text-space-500 dark:text-space-400">
                    <ClockIcon className="h-4 w-4" />
                    <span>{policy.schedule}</span>
                  </div>
                )}
                {policy.appliedUsers && (
                  <div className="flex items-center gap-2 text-sm text-space-500 dark:text-space-400">
                    <UserGroupIcon className="h-4 w-4" />
                    <span>{policy.appliedUsers} users</span>
                  </div>
                )}
                {policy.appliedZones && (
                  <div className="flex items-center gap-2 text-sm text-space-500 dark:text-space-400">
                    <MapPinIcon className="h-4 w-4" />
                    <span>{policy.appliedZones} zones</span>
                  </div>
                )}
                {policy.blockedCategories && (
                  <div className="flex items-center gap-2 text-sm text-space-500 dark:text-space-400">
                    <ShieldCheckIcon className="h-4 w-4" />
                    <span>{policy.blockedCategories} categories blocked</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Policy Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-space-800 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-space-100 dark:border-space-700">
              <h3 className="text-lg font-semibold text-space-900 dark:text-white">Create Policy</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-space-100 dark:hover:bg-space-700 rounded-lg">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">Policy Name</label>
                <input
                  type="text"
                  value={newPolicy.name}
                  onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })}
                  placeholder="e.g., Content Filtering"
                  className="w-full px-4 py-2.5 bg-space-50 dark:bg-space-900 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">Description</label>
                <textarea
                  value={newPolicy.description}
                  onChange={(e) => setNewPolicy({ ...newPolicy, description: e.target.value })}
                  placeholder="What does this policy do?"
                  rows={3}
                  className="w-full px-4 py-2.5 bg-space-50 dark:bg-space-900 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-space-100 dark:border-space-700">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-space-700 dark:text-space-300 hover:bg-space-100 dark:hover:bg-space-700 rounded-xl">Cancel</button>
              <button onClick={handleCreatePolicy} disabled={creating} className="px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50">
                {creating ? 'Creating...' : 'Create Policy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-space-800 rounded-2xl w-full max-w-sm mx-4 shadow-2xl p-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center mb-4">
                <TrashIcon className="h-6 w-6 text-danger-600" />
              </div>
              <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-2">Delete Policy</h3>
              <p className="text-space-500 dark:text-space-400">
                Are you sure you want to delete <strong>{showDeleteModal.name}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowDeleteModal(null)} className="flex-1 px-4 py-2 text-space-700 dark:text-space-300 hover:bg-space-100 dark:hover:bg-space-700 rounded-xl">Cancel</button>
              <button onClick={handleDeletePolicy} disabled={deleting} className="flex-1 px-4 py-2 bg-danger-600 text-white rounded-xl font-medium hover:bg-danger-700 disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

