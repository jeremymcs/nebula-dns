/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Locations Management Page
 */

'use client'

import { useState } from 'react'
import { useLocations, usePolicies } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  MapPinIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ArrowPathIcon,
  XMarkIcon,
  KeyIcon
} from '@heroicons/react/24/outline'

interface Location {
  id: string
  name: string
  description: string
  status: 'active' | 'inactive'
  policyId: string
  policyName?: string
  ipRanges?: string[]
  createdAt: string
  updatedAt: string
}

export default function LocationsPage() {
  const { data, isLoading, error, mutate } = useLocations()
  const { data: policiesData } = usePolicies()
  const { showToast } = useToast()
  
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [generatedToken, setGeneratedToken] = useState<{ token: string; expiresAt: string | null } | null>(null)
  const [copiedToken, setCopiedToken] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    description: '',
    policyId: '',
    ipRanges: '',
  })

  const locations: Location[] = data?.data || []
  const policies = policiesData?.data || []

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      policyId: policies[0]?.id || '',
      ipRanges: '',
    })
  }

  const openCreateModal = () => {
    resetForm()
    setEditingLocation(null)
    setShowCreateModal(true)
  }

  const openEditModal = (location: Location) => {
    setEditingLocation(location)
    setForm({
      name: location.name,
      description: location.description || '',
      policyId: location.policyId || '',
      ipRanges: location.ipRanges?.join('\n') || '',
    })
    setShowCreateModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('error', 'Location name is required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name,
        description: form.description,
        policyId: form.policyId || undefined,
        ipRanges: form.ipRanges ? form.ipRanges.split('\n').filter(ip => ip.trim()) : [],
      }

      if (editingLocation) {
        const token = localStorage.getItem('token')
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/locations/${editingLocation.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        })
        showToast('success', 'Location updated successfully')
      } else {
        await api.createLocation(payload)
        showToast('success', 'Location created successfully')
      }

      mutate()
      setShowCreateModal(false)
      resetForm()
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save location')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (location: Location) => {
    if (!confirm(`Are you sure you want to delete "${location.name}"?`)) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/locations/${location.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (!res.ok) throw new Error('Failed to delete')
      
      showToast('success', 'Location deleted')
      mutate()
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete location')
    }
  }

  const generateToken = async (location: Location) => {
    try {
      const result = await api.createLocationToken(location.id, {
        name: 'DoH Access Token',
        type: 'doh',
      })
      setGeneratedToken({
        token: result.token,
        expiresAt: result.expiresAt,
      })
      setEditingLocation(location)
      setShowTokenModal(true)
    } catch (err: any) {
      showToast('error', err.message || 'Failed to generate token')
    }
  }

  const copyToken = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken.token)
      setCopiedToken(true)
      setTimeout(() => setCopiedToken(false), 2000)
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">Failed to load locations. Make sure the API is running.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Locations</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage network locations and their DNS filtering settings
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button onClick={openCreateModal} className="btn-primary inline-flex items-center">
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Location
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-8 flex items-center justify-center py-12">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="mt-8">
          <div className="card overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Policy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Ranges
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Token
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {locations.map((location) => (
                  <tr key={location.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
                          <MapPinIcon className="h-6 w-6 text-primary-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{location.name}</div>
                          <div className="text-sm text-gray-500">{location.description || 'No description'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        location.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {location.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {policies.find(p => p.id === location.policyId)?.name || location.policyName || 'Default'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {location.ipRanges && location.ipRanges.length > 0 ? (
                        <div className="text-xs text-gray-500 font-mono">
                          {location.ipRanges[0]}
                          {location.ipRanges.length > 1 && (
                            <span className="ml-1 text-gray-400">+{location.ipRanges.length - 1} more</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Any IP</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => generateToken(location)}
                        className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded text-primary-700 bg-primary-100 hover:bg-primary-200"
                      >
                        <KeyIcon className="h-4 w-4 mr-1" />
                        Generate Token
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => openEditModal(location)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(location)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {locations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No locations</h3>
                      <p className="mt-1 text-sm text-gray-500">Get started by adding a new location.</p>
                      <div className="mt-6">
                        <button onClick={openCreateModal} className="btn-primary inline-flex items-center">
                          <PlusIcon className="h-5 w-5 mr-2" />
                          Add Location
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowCreateModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingLocation ? 'Edit Location' : 'Add New Location'}
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-500">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location Name *</label>
                  <input 
                    type="text" 
                    className="input mt-1" 
                    placeholder="e.g., Main Office"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <input 
                    type="text" 
                    className="input mt-1" 
                    placeholder="Brief description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">IP Ranges (one per line)</label>
                  <textarea 
                    className="input mt-1" 
                    rows={3}
                    placeholder="192.168.1.0/24&#10;10.0.0.0/8"
                    value={form.ipRanges}
                    onChange={(e) => setForm({ ...form, ipRanges: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-gray-500">Leave empty to allow any IP address</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Policy</label>
                  <select 
                    className="input mt-1"
                    value={form.policyId}
                    onChange={(e) => setForm({ ...form, policyId: e.target.value })}
                  >
                    <option value="">Use default policy</option>
                    {policies.map((policy) => (
                      <option key={policy.id} value={policy.id}>{policy.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowCreateModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave} 
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : editingLocation ? 'Save Changes' : 'Create Location'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Token Modal */}
      {showTokenModal && generatedToken && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowTokenModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  DoH Access Token for {editingLocation?.name}
                </h3>
                <button onClick={() => setShowTokenModal(false)} className="text-gray-400 hover:text-gray-500">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> This token will only be shown once. Make sure to copy it now.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Access Token</label>
                <div className="flex items-center">
                  <code className="flex-1 bg-gray-100 px-3 py-2 rounded-l font-mono text-sm overflow-x-auto">
                    {generatedToken.token}
                  </code>
                  <button
                    onClick={copyToken}
                    className="px-4 py-2 bg-gray-200 rounded-r hover:bg-gray-300 flex items-center"
                  >
                    {copiedToken ? (
                      <CheckIcon className="h-5 w-5 text-green-600" />
                    ) : (
                      <ClipboardDocumentIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">DoH Endpoint:</p>
                <code className="text-xs bg-white px-2 py-1 rounded border break-all">
                  https://doh.nebuladns.io/dns-query?token={generatedToken.token.substring(0, 20)}...
                </code>
              </div>

              <div className="flex justify-end mt-6">
                <button onClick={() => setShowTokenModal(false)} className="btn-primary">
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
