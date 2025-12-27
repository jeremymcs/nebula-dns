/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Protection Zones Management Page - Cosmic Security Theme
 */

'use client'

import { useState } from 'react'
import { useLocations, usePolicies } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { Button, Card, Badge, Modal } from '@/components/ui'
import { ZoneEditorModal, ZoneFormData } from '@/components/zones'
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
  ClockIcon,
  DocumentTextIcon,
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

  const [showZoneEditor, setShowZoneEditor] = useState(false)
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [generatedToken, setGeneratedToken] = useState<{ token: string; expiresAt: string | null } | null>(null)
  const [copiedToken, setCopiedToken] = useState(false)
  const [saving, setSaving] = useState(false)

  const locations: Location[] = data?.data || []
  const policies = policiesData?.data || []

  const openCreateModal = () => {
    setEditingLocation(null)
    setShowZoneEditor(true)
  }

  const openEditModal = (location: Location) => {
    setEditingLocation(location)
    setShowZoneEditor(true)
  }

  const handleSave = async (formData: ZoneFormData) => {
    setSaving(true)
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        policyId: formData.policyId || undefined,
        ipRange: formData.ipRanges.join(', ') || undefined,
        dyndns: formData.dyndns.trim() || undefined,
        status: formData.status,
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
        showToast('success', 'Zone updated successfully')
      } else {
        await api.createLocation(payload)
        showToast('success', 'Zone created successfully')
      }

      mutate()
      setShowZoneEditor(false)
      setEditingLocation(null)
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save zone')
    } finally {
      setSaving(false)
    }
  }

  const getInitialFormData = (): Partial<ZoneFormData> | undefined => {
    if (!editingLocation) return undefined
    return {
      name: editingLocation.name,
      description: editingLocation.description || '',
      policyId: editingLocation.policyId || '',
      ipRanges: editingLocation.ipRange ? editingLocation.ipRange.split(',').map(ip => ip.trim()) : [''],
      dyndns: editingLocation.dyndns || '',
      status: editingLocation.status || 'active',
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
          <h1 className="text-2xl font-bold text-space-900 dark:text-white">Protection Zones</h1>
          <p className="mt-1 text-space-500 dark:text-space-400">
            Manage network locations and their DNS filtering settings
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={openCreateModal} leftIcon={<PlusIcon className="h-5 w-5" />}>
            Add Zone
          </Button>
        </div>
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

      {/* Zone Editor Modal */}
      <ZoneEditorModal
        isOpen={showZoneEditor}
        onClose={() => {
          setShowZoneEditor(false)
          setEditingLocation(null)
        }}
        onSave={handleSave}
        initialData={getInitialFormData()}
        policies={policies}
        isEditing={!!editingLocation}
        isSaving={saving}
      />

      {/* Token Modal - Redesigned */}
      <Modal
        isOpen={showTokenModal && !!generatedToken}
        onClose={() => setShowTokenModal(false)}
        size="lg"
      >
        {/* Header with icon */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-shrink-0 p-3 rounded-2xl bg-gradient-to-br from-nebula-500/20 to-cosmic-500/20 ring-1 ring-nebula-500/30">
            <KeyIcon className="h-8 w-8 text-nebula-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-space-900 dark:text-white">
              DoH Access Token
            </h2>
            <p className="text-sm text-space-500 dark:text-space-400">
              {editingLocation?.name}
            </p>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-warning-500/10 to-orange-500/10 ring-1 ring-warning-500/30 mb-6">
          <div className="flex-shrink-0 p-1.5 rounded-lg bg-warning-500/20">
            <svg className="h-5 w-5 text-warning-600 dark:text-warning-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-warning-800 dark:text-warning-200 text-sm">
              Save this token now
            </p>
            <p className="text-sm text-warning-700/80 dark:text-warning-300/80 mt-0.5">
              This token will only be shown once and cannot be retrieved later.
            </p>
          </div>
        </div>

        {/* Token Display Card */}
        <div className="rounded-xl bg-space-900 dark:bg-space-950 p-4 ring-1 ring-space-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-space-400 uppercase tracking-wider">
              Access Token
            </span>
            {generatedToken?.expiresAt && (
              <span className="flex items-center gap-1 text-xs text-space-400">
                <ClockIcon className="h-3.5 w-3.5" />
                Expires {new Date(generatedToken.expiresAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-sm text-nebula-400 break-all select-all leading-relaxed">
              {generatedToken?.token}
            </code>
            <button
              onClick={copyToken}
              className={clsx(
                'flex-shrink-0 p-2.5 rounded-lg transition-all duration-200',
                copiedToken
                  ? 'bg-success-500 text-white scale-95'
                  : 'bg-space-700 hover:bg-space-600 text-space-300 hover:text-white'
              )}
              title={copiedToken ? 'Copied!' : 'Copy to clipboard'}
            >
              {copiedToken ? (
                <CheckIcon className="h-5 w-5" />
              ) : (
                <ClipboardDocumentIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          {copiedToken && (
            <p className="mt-2 text-xs text-success-400 flex items-center gap-1">
              <CheckIcon className="h-3.5 w-3.5" />
              Token copied to clipboard
            </p>
          )}
        </div>

        {/* Usage Instructions */}
        <div className="mt-6 space-y-4">
          <h3 className="text-sm font-semibold text-space-700 dark:text-space-300 flex items-center gap-2">
            <DocumentTextIcon className="h-4 w-4" />
            How to use this token
          </h3>

          {/* DoH Endpoint */}
          <div className="rounded-xl bg-space-50 dark:bg-space-800/50 p-4 ring-1 ring-space-200 dark:ring-space-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-space-500 dark:text-space-400 uppercase tracking-wider">
                DoH Endpoint URL
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://doh.nebuladns.io/dns-query?token=${generatedToken?.token}`)
                  showToast('success', 'Endpoint URL copied')
                }}
                className="text-xs text-nebula-500 hover:text-nebula-400 font-medium flex items-center gap-1"
              >
                <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                Copy URL
              </button>
            </div>
            <code className="text-sm font-mono text-space-800 dark:text-space-200 break-all block">
              https://doh.nebuladns.io/dns-query?token=<span className="text-nebula-500">{generatedToken?.token.substring(0, 16)}...</span>
            </code>
          </div>

          {/* Browser/OS Setup hint */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-accent-50 dark:bg-accent-900/20 ring-1 ring-accent-200 dark:ring-accent-800">
            <GlobeAltIcon className="h-5 w-5 text-accent-600 dark:text-accent-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-accent-800 dark:text-accent-200">
              <p className="font-medium">Configure your devices</p>
              <p className="text-accent-700 dark:text-accent-300 mt-0.5">
                Use this endpoint in your browser, OS, or router&apos;s DNS-over-HTTPS settings.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex items-center justify-between pt-4 border-t border-space-200 dark:border-space-700">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const text = `DoH Token: ${generatedToken?.token}\nEndpoint: https://doh.nebuladns.io/dns-query?token=${generatedToken?.token}`
              navigator.clipboard.writeText(text)
              showToast('success', 'All details copied')
            }}
          >
            <ClipboardDocumentIcon className="h-4 w-4 mr-2" />
            Copy All Details
          </Button>
          <Button onClick={() => setShowTokenModal(false)}>
            Done
          </Button>
        </div>
      </Modal>
    </div>
  )
}
