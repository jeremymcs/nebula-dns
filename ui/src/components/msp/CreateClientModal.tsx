// Nebula DNS - Create Client Modal Component
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { useMspTemplates, CreateClientData } from '@/hooks/useMspClients'
import { useClientContext } from '@/hooks/useClientContext'
import { CheckCircleIcon } from '@heroicons/react/24/outline'

interface CreateClientModalProps {
  isOpen: boolean
  onClose: () => void
  onClientCreated: (client: any) => void
  onCreateClient: (data: CreateClientData) => Promise<any>
}

export function CreateClientModal({
  isOpen,
  onClose,
  onClientCreated,
  onCreateClient,
}: CreateClientModalProps) {
  const { templates } = useMspTemplates()
  const { switchToClient } = useClientContext()
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdClient, setCreatedClient] = useState<any>(null)

  const [formData, setFormData] = useState<CreateClientData>({
    name: '',
    adminEmail: '',
    adminName: '',
    initialLocation: undefined,
    applyTemplateId: '',
    contactEmail: '',
    contactPhone: '',
    industry: '',
    companySize: '',
  })

  const [createLocation, setCreateLocation] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const dataToSubmit: CreateClientData = {
        ...formData,
        contactEmail: formData.contactEmail || formData.adminEmail,
      }

      if (!createLocation) {
        dataToSubmit.initialLocation = undefined
      }

      const client = await onCreateClient(dataToSubmit)
      setCreatedClient(client)
      setStep('success')
      onClientCreated(client)
    } catch (err: any) {
      setError(err.message || 'Failed to create client')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep('form')
    setFormData({
      name: '',
      adminEmail: '',
      adminName: '',
      initialLocation: undefined,
      applyTemplateId: '',
      contactEmail: '',
      contactPhone: '',
      industry: '',
      companySize: '',
    })
    setCreateLocation(false)
    setCreatedClient(null)
    setError(null)
    onClose()
  }

  const handleSwitchToClient = () => {
    if (createdClient) {
      switchToClient(createdClient.id, createdClient.name)
      handleClose()
      // Reload to show client context
      window.location.href = '/dashboard'
    }
  }

  if (step === 'success') {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        size="md"
        showClose={false}
      >
        <div className="text-center py-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-success-100 dark:bg-success-900/30">
            <CheckCircleIcon className="h-10 w-10 text-success-600 dark:text-success-400" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-space-900 dark:text-white">
            Client Created Successfully
          </h3>
          <p className="mt-2 text-sm text-space-600 dark:text-space-400">
            {createdClient?.name} has been created. A welcome email has been sent to the admin.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Button variant="secondary" onClick={handleClose}>
              Back to Clients
            </Button>
            <Button variant="primary" onClick={handleSwitchToClient}>
              Switch to Client
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Client"
      description="Set up a new client organization with initial configuration"
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-danger-50 dark:bg-danger-900/20 p-4">
            <p className="text-sm text-danger-600 dark:text-danger-400">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-space-900 dark:text-white">
            Organization Details
          </h4>

          <Input
            label="Organization Name"
            name="name"
            required
            placeholder="Acme Corporation"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Industry"
              name="industry"
              options={[
                { value: '', label: 'Select industry' },
                { value: 'technology', label: 'Technology' },
                { value: 'finance', label: 'Finance' },
                { value: 'healthcare', label: 'Healthcare' },
                { value: 'education', label: 'Education' },
                { value: 'retail', label: 'Retail' },
                { value: 'manufacturing', label: 'Manufacturing' },
                { value: 'other', label: 'Other' },
              ]}
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            />

            <Select
              label="Company Size"
              name="companySize"
              options={[
                { value: '', label: 'Select size' },
                { value: '1-10', label: '1-10 employees' },
                { value: '11-50', label: '11-50 employees' },
                { value: '51-200', label: '51-200 employees' },
                { value: '201-500', label: '201-500 employees' },
                { value: '501+', label: '501+ employees' },
              ]}
              value={formData.companySize}
              onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-space-200 dark:border-space-700">
          <h4 className="text-sm font-semibold text-space-900 dark:text-white">
            Administrator Account
          </h4>

          <Input
            label="Admin Name"
            name="adminName"
            placeholder="John Smith"
            value={formData.adminName}
            onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
            helperText="Optional - will be used in welcome email"
          />

          <Input
            label="Admin Email"
            name="adminEmail"
            type="email"
            required
            placeholder="admin@acme.com"
            value={formData.adminEmail}
            onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
            helperText="A welcome email with login credentials will be sent"
          />

          <Input
            label="Contact Phone"
            name="contactPhone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={formData.contactPhone}
            onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
          />
        </div>

        <div className="space-y-4 pt-4 border-t border-space-200 dark:border-space-700">
          <h4 className="text-sm font-semibold text-space-900 dark:text-white">
            Initial Configuration
          </h4>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="createLocation"
              checked={createLocation}
              onChange={(e) => setCreateLocation(e.target.checked)}
              className="rounded border-space-300 dark:border-space-600 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="createLocation" className="text-sm text-space-700 dark:text-space-300">
              Create initial location
            </label>
          </div>

          {createLocation && (
            <div className="ml-6 space-y-3">
              <Input
                label="Location Name"
                name="locationName"
                placeholder="Headquarters"
                value={formData.initialLocation?.name || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    initialLocation: {
                      name: e.target.value,
                      type: formData.initialLocation?.type || 'office',
                    },
                  })
                }
              />

              <Select
                label="Location Type"
                name="locationType"
                options={[
                  { value: 'office', label: 'Office' },
                  { value: 'datacenter', label: 'Data Center' },
                  { value: 'remote', label: 'Remote' },
                  { value: 'branch', label: 'Branch Office' },
                ]}
                value={formData.initialLocation?.type || 'office'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    initialLocation: {
                      name: formData.initialLocation?.name || '',
                      type: e.target.value,
                    },
                  })
                }
              />
            </div>
          )}

          <div>
            <Select
              label="Apply Policy Template"
              name="applyTemplateId"
              options={[
                { value: '', label: 'No template' },
                ...templates.map((t) => ({ value: t.id, label: t.name })),
              ]}
              value={formData.applyTemplateId}
              onChange={(e) => setFormData({ ...formData, applyTemplateId: e.target.value })}
            />
            <p className="mt-1.5 text-sm text-space-500 dark:text-space-400">
              Optionally apply a policy template to the new client
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            Create Client
          </Button>
        </div>
      </form>
    </Modal>
  )
}
