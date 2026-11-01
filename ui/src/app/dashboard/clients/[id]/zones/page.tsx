/**
 * Nebula DNS - Client Zones Page
 * View and manage zones/locations for a specific client
 */

'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useClientZones } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { useToast } from '@/components/Toast'
import {
  MapPinIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  GlobeAltIcon,
  ComputerDesktopIcon,
  WifiIcon,
  SignalIcon,
  EllipsisVerticalIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

const ZONE_TYPES = [
  { value: 'network', label: 'Network', icon: WifiIcon, description: 'Protect a network by IP range' },
  { value: 'device', label: 'Device', icon: ComputerDesktopIcon, description: 'Protect individual devices' },
  { value: 'roaming', label: 'Roaming', icon: SignalIcon, description: 'Protect users anywhere' },
]

export default function ClientZonesPage() {
  const params = useParams()
  const clientId = params.id as string
  const { data, isLoading, mutate } = useClientZones(clientId)
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState<{ id: string; name: string } | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [newZone, setNewZone] = useState({ name: '', type: 'network', ipAddresses: '' })

  const zones = data?.zones || []
  const filteredZones = zones.filter(zone =>
    zone.name?.toLowerCase().includes(search.toLowerCase()) ||
    zone.type?.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreateZone = async () => {
    if (!newZone.name.trim()) {
      showToast('error', 'Zone name is required')
      return
    }
    setCreating(true)
    try {
      await api.createClientZone(clientId, {
        name: newZone.name,
        type: newZone.type,
        ipAddresses: newZone.ipAddresses ? newZone.ipAddresses.split(',').map(ip => ip.trim()) : undefined,
      })
      showToast('success', 'Zone created successfully')
      setShowCreateModal(false)
      setNewZone({ name: '', type: 'network', ipAddresses: '' })
      mutate()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to create zone')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteZone = async () => {
    if (!showDeleteModal) return
    setDeleting(true)
    try {
      await api.deleteClientZone(clientId, showDeleteModal.id)
      showToast('success', 'Zone deleted successfully')
      setShowDeleteModal(null)
      mutate()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to delete zone')
    } finally {
      setDeleting(false)
    }
  }

  const getZoneIcon = (type: string) => {
    switch (type) {
      case 'network': return WifiIcon
      case 'device': return ComputerDesktopIcon
      case 'roaming': return SignalIcon
      default: return GlobeAltIcon
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
            placeholder="Search zones..."
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
          Add Zone
        </button>
      </div>

      {/* Zones List */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-space-800 rounded-2xl p-5 ring-1 ring-space-200 dark:ring-space-700">
              <div className="animate-pulse space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-space-200 dark:bg-space-700 rounded-xl" />
                  <div className="flex-1">
                    <div className="h-5 w-32 bg-space-200 dark:bg-space-700 rounded" />
                    <div className="h-4 w-20 bg-space-200 dark:bg-space-700 rounded mt-1" />
                  </div>
                </div>
                <div className="h-4 w-full bg-space-200 dark:bg-space-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredZones.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-space-800 rounded-2xl ring-1 ring-space-200 dark:ring-space-700">
          <MapPinIcon className="h-12 w-12 text-space-300 mb-4" />
          <h3 className="text-lg font-medium text-space-900 dark:text-white mb-2">No zones found</h3>
          <p className="text-space-500 dark:text-space-400 mb-6 text-center max-w-sm">
            {search ? 'Try adjusting your search' : 'Create zones to start protecting this client\'s network'}
          </p>
          {!search && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Create First Zone
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredZones.map((zone) => {
            const Icon = getZoneIcon(zone.type)
            return (
              <div
                key={zone.id}
                className="bg-white dark:bg-space-800 rounded-2xl p-5 ring-1 ring-space-200 dark:ring-space-700 hover:ring-primary-300 dark:hover:ring-primary-700 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-900/30">
                      <Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-space-900 dark:text-white">{zone.name}</h4>
                      <p className="text-sm text-space-500 dark:text-space-400 capitalize">{zone.type}</p>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === zone.id ? null : zone.id) }}
                      className="p-1 rounded-lg hover:bg-space-100 dark:hover:bg-space-700 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <EllipsisVerticalIcon className="h-5 w-5 text-space-500" />
                    </button>
                    {activeMenu === zone.id && (
                      <div className="absolute right-0 top-8 z-10 w-40 bg-white dark:bg-space-800 rounded-xl shadow-xl ring-1 ring-space-200 dark:ring-space-700 py-1">
                        <button className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-space-50 dark:hover:bg-space-700 text-space-700 dark:text-space-300">
                          <PencilIcon className="h-4 w-4" />
                          Edit Zone
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveMenu(null); setShowDeleteModal({ id: zone.id, name: zone.name }) }}
                          className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-space-50 dark:hover:bg-space-700 text-danger-600 dark:text-danger-400"
                        >
                          <TrashIcon className="h-4 w-4" />
                          Delete Zone
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-space-100 dark:border-space-700">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-space-500 dark:text-space-400">Status</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      zone.status === 'active'
                        ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300'
                        : 'bg-space-100 dark:bg-space-700 text-space-600 dark:text-space-400'
                    }`}>
                      {zone.status || 'Active'}
                    </span>
                  </div>
                  {zone.ipCount && (
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-space-500 dark:text-space-400">IP Addresses</span>
                      <span className="font-medium text-space-900 dark:text-white">{zone.ipCount}</span>
                    </div>
                  )}
                  {zone.deviceCount && (
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-space-500 dark:text-space-400">Devices</span>
                      <span className="font-medium text-space-900 dark:text-white">{zone.deviceCount}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Zone Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-space-800 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-space-100 dark:border-space-700">
              <h3 className="text-lg font-semibold text-space-900 dark:text-white">Create Zone</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-space-100 dark:hover:bg-space-700 rounded-lg">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">Zone Name</label>
                <input
                  type="text"
                  value={newZone.name}
                  onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                  placeholder="e.g., Main Office"
                  className="w-full px-4 py-2.5 bg-space-50 dark:bg-space-900 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">Zone Type</label>
                <div className="grid gap-2">
                  {ZONE_TYPES.map((type) => {
                    const TypeIcon = type.icon
                    return (
                      <button
                        key={type.value}
                        onClick={() => setNewZone({ ...newZone, type: type.value })}
                        className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                          newZone.type === type.value
                            ? 'bg-primary-50 dark:bg-primary-900/30 ring-2 ring-primary-500'
                            : 'bg-space-50 dark:bg-space-900 ring-1 ring-space-200 dark:ring-space-700 hover:bg-space-100 dark:hover:bg-space-800'
                        }`}
                      >
                        <TypeIcon className={`h-5 w-5 ${newZone.type === type.value ? 'text-primary-600' : 'text-space-500'}`} />
                        <div>
                          <p className="font-medium text-space-900 dark:text-white">{type.label}</p>
                          <p className="text-xs text-space-500">{type.description}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
              {newZone.type === 'network' && (
                <div>
                  <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">IP Addresses (comma-separated)</label>
                  <input
                    type="text"
                    value={newZone.ipAddresses}
                    onChange={(e) => setNewZone({ ...newZone, ipAddresses: e.target.value })}
                    placeholder="e.g., 192.168.1.1, 10.0.0.0/24"
                    className="w-full px-4 py-2.5 bg-space-50 dark:bg-space-900 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-space-100 dark:border-space-700">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-space-700 dark:text-space-300 hover:bg-space-100 dark:hover:bg-space-700 rounded-xl">Cancel</button>
              <button onClick={handleCreateZone} disabled={creating} className="px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50">
                {creating ? 'Creating...' : 'Create Zone'}
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
              <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-2">Delete Zone</h3>
              <p className="text-space-500 dark:text-space-400">
                Are you sure you want to delete <strong>{showDeleteModal.name}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowDeleteModal(null)} className="flex-1 px-4 py-2 text-space-700 dark:text-space-300 hover:bg-space-100 dark:hover:bg-space-700 rounded-xl">Cancel</button>
              <button onClick={handleDeleteZone} disabled={deleting} className="flex-1 px-4 py-2 bg-danger-600 text-white rounded-xl font-medium hover:bg-danger-700 disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

