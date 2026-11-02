/**
 * Nebula DNS - Edit Client Page
 * Allows MSP users to edit existing clients
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { useToast } from '@/components/Toast'
import {
  BuildingOffice2Icon,
  ArrowLeftIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'

const COMPANY_SIZES = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '500+', label: '500+ employees' },
]

const STATUSES = [
  { value: 'active', label: 'Active', color: 'bg-success-100 text-success-700' },
  { value: 'suspended', label: 'Suspended', color: 'bg-warning-100 text-warning-700' },
  { value: 'inactive', label: 'Inactive', color: 'bg-space-100 text-space-700' },
]

export default function EditClientPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string
  const { isMsp } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    status: 'active',
    contactEmail: '',
    contactPhone: '',
    address: '',
    industry: '',
    companySize: '',
  })

  useEffect(() => {
    if (clientId) {
      loadClient()
    }
  }, [clientId])

  const loadClient = async () => {
    try {
      const client = await api.getMspClient(clientId)
      setFormData({
        name: client.name || '',
        slug: client.slug || '',
        status: client.status || 'active',
        contactEmail: client.contactEmail || '',
        contactPhone: client.contactPhone || '',
        address: client.address || '',
        industry: client.industry || '',
        companySize: client.companySize || '',
      })
    } catch (err) {
      showToast('error', 'Failed to load client')
      router.push('/dashboard/clients')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      showToast('error', 'Client name is required')
      return
    }

    setSaving(true)
    try {
      await api.updateMspClient(clientId, {
        name: formData.name,
        status: formData.status,
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
        address: formData.address || undefined,
        industry: formData.industry || undefined,
        companySize: formData.companySize || undefined,
      })
      showToast('success', 'Client updated successfully')
      router.push('/dashboard/clients')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update client')
    } finally {
      setSaving(false)
    }
  }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/clients"
          className="p-2 rounded-lg bg-space-100 dark:bg-space-800 hover:bg-space-200 dark:hover:bg-space-700 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 text-space-600 dark:text-space-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-space-900 dark:text-white">Edit Client</h1>
          <p className="text-space-500 dark:text-space-400">Update {formData.name}</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-space-800 rounded-2xl p-6 space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-space-900 dark:text-white flex items-center gap-2">
            <BuildingOffice2Icon className="h-5 w-5 text-primary-500" />
            Client Details
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
                Client Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Acme Corporation"
                className="w-full px-4 py-2.5 bg-space-50 dark:bg-space-700 rounded-xl ring-1 ring-space-200 dark:ring-space-600 focus:ring-2 focus:ring-primary-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
                URL Slug
              </label>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                disabled
                className="w-full px-4 py-2.5 bg-space-100 dark:bg-space-600 rounded-xl ring-1 ring-space-200 dark:ring-space-600 text-space-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
              Status
            </label>
            <div className="flex gap-3">
              {STATUSES.map((status) => (
                <label
                  key={status.value}
                  className={`relative flex cursor-pointer rounded-xl px-4 py-2 ring-1 transition-all ${
                    formData.status === status.value
                      ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'ring-space-200 dark:ring-space-600 hover:ring-space-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={status.value}
                    checked={formData.status === status.value}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium text-space-900 dark:text-white">
                    {status.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-4 pt-4 border-t border-space-200 dark:border-space-700">
          <h3 className="text-lg font-semibold text-space-900 dark:text-white">Contact Information</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleChange}
                placeholder="contact@acme.com"
                className="w-full px-4 py-2.5 bg-space-50 dark:bg-space-700 rounded-xl ring-1 ring-space-200 dark:ring-space-600 focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleChange}
                placeholder="+1 (555) 123-4567"
                className="w-full px-4 py-2.5 bg-space-50 dark:bg-space-700 rounded-xl ring-1 ring-space-200 dark:ring-space-600 focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
              Address
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="123 Business St, Suite 100, City, State 12345"
              rows={2}
              className="w-full px-4 py-2.5 bg-space-50 dark:bg-space-700 rounded-xl ring-1 ring-space-200 dark:ring-space-600 focus:ring-2 focus:ring-primary-500 outline-none resize-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
                Industry
              </label>
              <input
                type="text"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                placeholder="Technology, Healthcare, etc."
                className="w-full px-4 py-2.5 bg-space-50 dark:bg-space-700 rounded-xl ring-1 ring-space-200 dark:ring-space-600 focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
                Company Size
              </label>
              <select
                name="companySize"
                value={formData.companySize}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-space-50 dark:bg-space-700 rounded-xl ring-1 ring-space-200 dark:ring-space-600 focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="">Select size</option>
                {COMPANY_SIZES.map((size) => (
                  <option key={size.value} value={size.value}>
                    {size.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-4 border-t border-space-200 dark:border-space-700">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:from-primary-600 hover:to-accent-600 transition-all shadow-lg shadow-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <Link
            href="/dashboard/clients"
            className="px-6 py-3 bg-space-100 dark:bg-space-700 text-space-700 dark:text-space-200 rounded-xl font-medium hover:bg-space-200 dark:hover:bg-space-600 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

