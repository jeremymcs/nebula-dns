/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Locations Management Page - Cosmic Security Theme
 */

'use client'

import { useState } from 'react'
import { useLocations, usePolicies } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { Button, Card, Badge, Modal, Input, Textarea, Select } from '@/components/ui'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  KeyIcon,
  GlobeAltIcon,
  SignalIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

interface Location {
  id: string
  name: string
  description: string
  status: 'active' | 'inactive'
  policyId: string
  policyName?: string
  ipRange?: string
  dyndns?: string
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
    ipRange: '',
    dyndns: '',
  })

  const locations: Location[] = data?.data || []
  const policies = policiesData?.data || []

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      policyId: policies[0]?.id || '',
      ipRange: '',
      dyndns: '',
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
      ipRange: location.ipRange || '',
      dyndns: location.dyndns || '',
    })
    setShowCreateModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('error', 'Location name is required')
      return
    }

    if (!form.ipRange.trim() && !form.dyndns.trim()) {
      showToast('error', 'Either IP Range or DynDNS hostname is required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name,
        description: form.description,
        policyId: form.policyId || undefined,
        ipRange: form.ipRange.trim() || undefined,
        dyndns: form.dyndns.trim() || undefined,
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
        label: 'DoH Access Token',
        expiresInDays: 365,
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
      <div className="p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20 ring-1 ring-danger-200 dark:ring-danger-800">
        <p className="text-danger-800 dark:text-danger-200">Failed to load locations. Make sure the API is running.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-space-900 dark:text-white">Locations</h1>
          <p className="mt-1 text-space-500 dark:text-space-400">
            Manage network locations and their DNS filtering settings
          </p>
        </div>
        <Button onClick={openCreateModal} leftIcon={<PlusIcon className="h-5 w-5" />}>
          Add Location
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-48 rounded-2xl" />
          ))}
        </div>
      ) : locations.length === 0 ? (
        <Card variant="glass" padding="lg" className="text-center">
          <div className="flex flex-col items-center py-8">
            <div className="p-4 rounded-2xl bg-primary-100 dark:bg-primary-900/30 mb-4">
              <GlobeAltIcon className="h-10 w-10 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-space-900 dark:text-white">No locations yet</h3>
            <p className="mt-2 text-space-500 dark:text-space-400 max-w-sm">
              Add your first location to start filtering DNS traffic for your network.
            </p>
            <Button onClick={openCreateModal} className="mt-6" leftIcon={<PlusIcon className="h-5 w-5" />}>
              Add Location
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => (
            <Card
              key={location.id}
              variant="interactive"
              padding="none"
              className="group overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-4 relative">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      'p-3 rounded-xl',
                      location.status === 'active'
                        ? 'bg-success-100 dark:bg-success-900/30'
                        : 'bg-space-100 dark:bg-space-800'
                    )}>
                      <MapPinIcon className={clsx(
                        'h-6 w-6',
                        location.status === 'active'
                          ? 'text-success-600 dark:text-success-400'
                          : 'text-space-500 dark:text-space-400'
                      )} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-space-900 dark:text-white">{location.name}</h3>
                      <p className="text-sm text-space-500 dark:text-space-400 line-clamp-1">
                        {location.description || 'No description'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={location.status === 'active' ? 'success' : 'neutral'}>
                    <span className="flex items-center gap-1">
                      <SignalIcon className="h-3 w-3" />
                      {location.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </Badge>
                </div>
              </div>

              {/* Card Body */}
              <div className="px-4 pb-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-space-500 dark:text-space-400">Policy</span>
                  <Badge variant="primary">
                    {policies.find(p => p.id === location.policyId)?.name || location.policyName || 'Default'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-space-500 dark:text-space-400">
                    {location.dyndns ? 'DynDNS' : 'IP Range'}
                  </span>
                  {location.ipRange ? (
                    <span className="font-mono text-xs text-space-600 dark:text-space-300">
                      {location.ipRange}
                    </span>
                  ) : location.dyndns ? (
                    <span className="font-mono text-xs text-space-600 dark:text-space-300">
                      {location.dyndns}
                    </span>
                  ) : (
                    <span className="text-xs text-space-400">Not set</span>
                  )}
                </div>

                {/* Generate Token Button */}
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => generateToken(location)}
                  leftIcon={<KeyIcon className="h-4 w-4" />}
                >
                  Generate DoH Token
                </Button>
              </div>

              {/* Card Footer */}
              <div className="px-4 py-3 flex items-center justify-end gap-1 border-t border-space-100 dark:border-space-700 bg-space-50/50 dark:bg-space-900/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditModal(location)}
                  leftIcon={<PencilIcon className="h-4 w-4" />}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(location)}
                  className="text-danger-600 hover:text-danger-700 hover:bg-danger-50 dark:hover:bg-danger-900/20"
                  leftIcon={<TrashIcon className="h-4 w-4" />}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={editingLocation ? 'Edit Location' : 'Add New Location'}
      >
        <div className="space-y-4">
          <Input
            label="Location Name"
            required
            placeholder="e.g., Main Office"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Description"
            placeholder="Brief description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            label="IP Range"
            placeholder="e.g., 192.168.1.0/24 or 203.0.113.50"
            value={form.ipRange}
            onChange={(e) => setForm({ ...form, ipRange: e.target.value })}
            helperText="Static IP address or CIDR range"
          />
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-space-200 dark:bg-space-700" />
            <span className="text-sm text-space-500 dark:text-space-400">OR</span>
            <div className="flex-1 h-px bg-space-200 dark:bg-space-700" />
          </div>
          <Input
            label="DynDNS Hostname"
            placeholder="e.g., myoffice.dyndns.org"
            value={form.dyndns}
            onChange={(e) => setForm({ ...form, dyndns: e.target.value })}
            helperText="Dynamic DNS hostname for locations with changing IPs"
          />
          <Select
            label="Policy"
            value={form.policyId}
            onChange={(e) => setForm({ ...form, policyId: e.target.value })}
            options={[
              { value: '', label: 'Use default policy' },
              ...policies.map((policy) => ({ value: policy.id, label: policy.name })),
            ]}
          />
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowCreateModal(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            isLoading={saving}
          >
            {editingLocation ? 'Save Changes' : 'Create Location'}
          </Button>
        </div>
      </Modal>

      {/* Token Modal */}
      <Modal
        isOpen={showTokenModal && !!generatedToken}
        onClose={() => setShowTokenModal(false)}
        title={`DoH Access Token for ${editingLocation?.name}`}
      >
        {/* Warning */}
        <div className="p-4 rounded-xl bg-warning-50 dark:bg-warning-900/20 ring-1 ring-warning-200 dark:ring-warning-800 mb-6">
          <p className="text-sm text-warning-800 dark:text-warning-200">
            <strong>⚠️ Important:</strong> This token will only be shown once. Make sure to copy it now.
          </p>
        </div>

        {/* Token Display */}
        <div>
          <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
            Access Token
          </label>
          <div className="flex items-center">
            <code className="flex-1 bg-space-100 dark:bg-space-800 px-4 py-3 rounded-l-xl font-mono text-sm overflow-x-auto text-space-900 dark:text-space-100 ring-1 ring-space-200 dark:ring-space-700">
              {generatedToken?.token}
            </code>
            <button
              onClick={copyToken}
              className={clsx(
                'px-4 py-3 rounded-r-xl flex items-center transition-colors',
                copiedToken
                  ? 'bg-success-500 text-white'
                  : 'bg-space-200 dark:bg-space-700 hover:bg-space-300 dark:hover:bg-space-600 text-space-700 dark:text-space-300'
              )}
            >
              {copiedToken ? (
                <CheckIcon className="h-5 w-5" />
              ) : (
                <ClipboardDocumentIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* DoH Endpoint */}
        <div className="mt-4 p-4 rounded-xl bg-space-50 dark:bg-space-800/50 ring-1 ring-space-200 dark:ring-space-700">
          <p className="text-sm text-space-600 dark:text-space-300 mb-2">DoH Endpoint:</p>
          <code className="text-xs bg-white dark:bg-space-900 px-3 py-2 rounded-lg ring-1 ring-space-200 dark:ring-space-700 break-all text-space-800 dark:text-space-200 block">
            https://doh.nebuladns.io/dns-query?token={generatedToken?.token.substring(0, 20)}...
          </code>
        </div>

        <div className="mt-8 flex justify-end">
          <Button onClick={() => setShowTokenModal(false)}>
            Done
          </Button>
        </div>
      </Modal>
    </div>
  )
}
