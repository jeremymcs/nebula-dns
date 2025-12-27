/**
 * Create New Organization
 * Partner provisioning form for new sub-clients
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline'

interface FormData {
  name: string
  contactEmail: string
  contactPhone: string
  plan: string
  industry: string
  companySize: string
  address: {
    street: string
    city: string
    state: string
    postalCode: string
    country: string
  }
}

export default function NewOrganizationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState<FormData>({
    name: '',
    contactEmail: '',
    contactPhone: '',
    plan: 'professional',
    industry: '',
    companySize: '',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const token = localStorage.getItem('partnerToken')
    if (!token) {
      router.push('/partner/login')
      return
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/partner-dashboard/organizations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Failed to create organization')
      }

      router.push('/partner/organizations')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization')
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: string, value: string) => {
    if (field.startsWith('address.')) {
      const addressField = field.replace('address.', '')
      setFormData(prev => ({
        ...prev,
        address: { ...prev.address, [addressField]: value },
      }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/partner/organizations"
          className="p-2 hover:bg-space-100 dark:hover:bg-space-800 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 text-space-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-space-900 dark:text-white">New Organization</h1>
          <p className="text-space-500 dark:text-space-400">Provision a new client organization</p>
        </div>
      </div>

      {error && (
        <div className="bg-danger-50 dark:bg-danger-900/20 rounded-xl p-4">
          <p className="text-danger-700 dark:text-danger-300">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-space-900 rounded-xl ring-1 ring-space-200 dark:ring-space-800 p-6 space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-space-900 dark:text-white flex items-center gap-2">
            <BuildingOffice2Icon className="h-5 w-5 text-emerald-500" />
            Organization Details
          </h2>

          <div>
            <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
              Organization Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              className="w-full px-4 py-2 bg-space-50 dark:bg-space-800 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-emerald-500"
              placeholder="Acme Corporation"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
                Contact Email *
              </label>
              <input
                type="email"
                required
                value={formData.contactEmail}
                onChange={(e) => updateField('contactEmail', e.target.value)}
                className="w-full px-4 py-2 bg-space-50 dark:bg-space-800 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-emerald-500"
                placeholder="admin@acme.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => updateField('contactPhone', e.target.value)}
                className="w-full px-4 py-2 bg-space-50 dark:bg-space-800 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-emerald-500"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
                Plan
              </label>
              <select
                value={formData.plan}
                onChange={(e) => updateField('plan', e.target.value)}
                className="w-full px-4 py-2 bg-space-50 dark:bg-space-800 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
                Industry
              </label>
              <select
                value={formData.industry}
                onChange={(e) => updateField('industry', e.target.value)}
                className="w-full px-4 py-2 bg-space-50 dark:bg-space-800 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select industry...</option>
                <option value="technology">Technology</option>
                <option value="healthcare">Healthcare</option>
                <option value="finance">Finance</option>
                <option value="education">Education</option>
                <option value="retail">Retail</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
              Company Size
            </label>
            <select
              value={formData.companySize}
              onChange={(e) => updateField('companySize', e.target.value)}
              className="w-full px-4 py-2 bg-space-50 dark:bg-space-800 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Select size...</option>
              <option value="1-10">1-10 employees</option>
              <option value="11-50">11-50 employees</option>
              <option value="51-200">51-200 employees</option>
              <option value="201-500">201-500 employees</option>
              <option value="501-1000">501-1000 employees</option>
              <option value="1000+">1000+ employees</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-space-200 dark:border-space-700">
          <Link
            href="/partner/organizations"
            className="px-4 py-2 text-space-600 dark:text-space-400 hover:text-space-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Organization'}
          </button>
        </div>
      </form>
    </div>
  )
}

