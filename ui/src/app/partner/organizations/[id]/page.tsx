/**
 * Partner Organization Detail Page
 * View and manage a client organization with their locations
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  BuildingOffice2Icon,
  MapPinIcon,
  UsersIcon,
  ArrowLeftIcon,
  ArrowsRightLeftIcon,
  PencilSquareIcon,
  PlusIcon,
  SignalIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

interface Organization {
  id: string
  name: string
  slug: string
  status: string
  plan: string
  contactEmail: string | null
  contactPhone: string | null
  address: string | null
  industry: string | null
  companySize: string | null
  createdAt: string
  locations: Location[]
}

interface Location {
  id: string
  name: string
  description: string | null
  status: string
  createdAt: string
}

export default function OrganizationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [org, setOrg] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (params.id) {
      fetchOrganization(params.id as string)
    }
  }, [params.id])

  const fetchOrganization = async (id: string) => {
    const token = localStorage.getItem('partnerToken')
    if (!token) {
      router.push('/partner/login')
      return
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/partner-dashboard/organizations/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (!res.ok) throw new Error('Failed to fetch organization')

      const data = await res.json()
      setOrg(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organization')
    } finally {
      setLoading(false)
    }
  }

  const handleImpersonate = async () => {
    if (!org) return
    const token = localStorage.getItem('partnerToken')
    if (!token) return

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/partner-dashboard/impersonate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ organizationId: org.id }),
        }
      )

      if (!res.ok) throw new Error('Failed to impersonate')

      const data = await res.json()
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('impersonating', 'true')
      window.location.href = '/dashboard'
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to switch organization')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error || !org) {
    return (
      <div className="bg-danger-50 dark:bg-danger-900/20 rounded-xl p-6 text-center">
        <p className="text-danger-700 dark:text-danger-300">{error || 'Organization not found'}</p>
        <Link href="/partner/organizations" className="text-emerald-600 mt-4 inline-block hover:underline">
          ← Back to Organizations
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/partner/organizations"
            className="p-2 rounded-lg bg-space-100 dark:bg-space-800 hover:bg-space-200 dark:hover:bg-space-700 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-space-600 dark:text-space-400" />
          </Link>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
              <BuildingOffice2Icon className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-space-900 dark:text-white">{org.name}</h1>
              <p className="text-space-500 dark:text-space-400">{org.slug}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleImpersonate}
            className="flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-xl font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
          >
            <ArrowsRightLeftIcon className="h-5 w-5" />
            Switch to Org
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Status"
          value={org.status}
          color={org.status === 'active' ? 'green' : 'amber'}
        />
        <StatCard label="Plan" value={org.plan} color="blue" />
        <StatCard label="Locations" value={org.locations?.length || 0} color="purple" />
        <StatCard label="Industry" value={org.industry || 'Not set'} color="slate" />
      </div>

      {/* Organization Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details Card */}
        <div className="bg-white dark:bg-space-900 rounded-xl ring-1 ring-space-200 dark:ring-space-800 p-6">
          <h2 className="text-lg font-semibold text-space-900 dark:text-white mb-4">Organization Details</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-space-500">Contact Email</dt>
              <dd className="text-space-900 dark:text-white">{org.contactEmail || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-space-500">Contact Phone</dt>
              <dd className="text-space-900 dark:text-white">{org.contactPhone || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-space-500">Address</dt>
              <dd className="text-space-900 dark:text-white">{org.address || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-space-500">Company Size</dt>
              <dd className="text-space-900 dark:text-white">{org.companySize || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-space-500">Created</dt>
              <dd className="text-space-900 dark:text-white">
                {new Date(org.createdAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>

        {/* Locations Card */}
        <div className="lg:col-span-2 bg-white dark:bg-space-900 rounded-xl ring-1 ring-space-200 dark:ring-space-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-space-200 dark:border-space-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPinIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-lg font-semibold text-space-900 dark:text-white">Locations / Sites</h2>
            </div>
            <span className="text-sm text-space-500">{org.locations?.length || 0} total</span>
          </div>

          {org.locations && org.locations.length > 0 ? (
            <div className="divide-y divide-space-200 dark:divide-space-800">
              {org.locations.map((location) => (
                <div
                  key={location.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-space-50 dark:hover:bg-space-800/50"
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      location.status === 'active'
                        ? 'bg-success-100 dark:bg-success-900/30'
                        : 'bg-amber-100 dark:bg-amber-900/30'
                    }`}>
                      <SignalIcon className={`h-5 w-5 ${
                        location.status === 'active'
                          ? 'text-success-600 dark:text-success-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-space-900 dark:text-white">{location.name}</p>
                      <p className="text-sm text-space-500 dark:text-space-400">
                        {location.description || 'No description'}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    location.status === 'active'
                      ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                  }`}>
                    {location.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <MapPinIcon className="h-12 w-12 mx-auto text-space-400 mb-4" />
              <p className="text-space-500 dark:text-space-400">No locations configured</p>
              <p className="text-sm text-space-400 mt-1">
                Switch to this organization to add locations
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colorMap: Record<string, string> = {
    green: 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    slate: 'bg-space-100 dark:bg-space-800 text-space-700 dark:text-space-300',
  }

  return (
    <div className="bg-white dark:bg-space-900 rounded-xl ring-1 ring-space-200 dark:ring-space-800 p-4">
      <p className="text-sm text-space-500 dark:text-space-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold capitalize ${colorMap[color] || colorMap.slate}`}>
        {value}
      </p>
    </div>
  )
}

