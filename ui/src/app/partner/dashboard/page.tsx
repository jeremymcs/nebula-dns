/**
 * Partner Dashboard - Main Overview
 * Aggregate stats and organization management
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BuildingOffice2Icon,
  MapPinIcon,
  UsersIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'

interface PartnerStats {
  totalOrganizations: number
  activeOrganizations: number
  suspendedOrganizations: number
  totalLocations: number
  activeLocations: number
  totalUsers: number
  planBreakdown: Record<string, number>
}

interface OrganizationSummary {
  id: string
  name: string
  slug: string
  status: string
  plan: string
  locationCount: number
  userCount: number
  createdAt: string
}

export default function PartnerDashboardPage() {
  const [stats, setStats] = useState<PartnerStats | null>(null)
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const token = localStorage.getItem('partnerToken')
    if (!token) return

    try {
      const [statsRes, orgsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/partner-dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/partner-dashboard/organizations/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (!statsRes.ok || !orgsRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const [statsData, orgsData] = await Promise.all([
        statsRes.json(),
        orgsRes.json(),
      ])

      setStats(statsData.data)
      setOrganizations(orgsData.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-danger-50 dark:bg-danger-900/20 rounded-xl p-6 text-center">
        <p className="text-danger-700 dark:text-danger-300">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-space-900 dark:text-white">Partner Dashboard</h1>
          <p className="text-space-500 dark:text-space-400">Overview of all managed organizations</p>
        </div>
        <Link
          href="/partner/organizations/new"
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25"
        >
          <PlusIcon className="h-5 w-5" />
          New Organization
        </Link>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Organizations"
            value={stats.totalOrganizations}
            subtitle={`${stats.activeOrganizations} active`}
            icon={BuildingOffice2Icon}
            color="emerald"
          />
          <StatCard
            title="Locations"
            value={stats.totalLocations}
            subtitle={`${stats.activeLocations} active`}
            icon={MapPinIcon}
            color="blue"
          />
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            subtitle="Across all orgs"
            icon={UsersIcon}
            color="purple"
          />
          <StatCard
            title="Health"
            value={stats.suspendedOrganizations === 0 ? 'Good' : `${stats.suspendedOrganizations} issues`}
            subtitle={stats.suspendedOrganizations === 0 ? 'All systems normal' : 'Needs attention'}
            icon={stats.suspendedOrganizations === 0 ? CheckCircleIcon : ExclamationTriangleIcon}
            color={stats.suspendedOrganizations === 0 ? 'green' : 'amber'}
          />
        </div>
      )}

      {/* Plan Breakdown */}
      {stats && Object.keys(stats.planBreakdown).length > 0 && (
        <div className="bg-white dark:bg-space-900 rounded-xl p-6 ring-1 ring-space-200 dark:ring-space-800">
          <h2 className="text-lg font-semibold text-space-900 dark:text-white mb-4">Plan Distribution</h2>
          <div className="flex flex-wrap gap-4">
            {Object.entries(stats.planBreakdown).map(([plan, count]) => (
              <div key={plan} className="flex items-center gap-2 px-4 py-2 bg-space-100 dark:bg-space-800 rounded-lg">
                <span className="text-sm font-medium text-space-700 dark:text-space-300 capitalize">{plan}</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Organizations */}
      <div className="bg-white dark:bg-space-900 rounded-xl ring-1 ring-space-200 dark:ring-space-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-space-200 dark:border-space-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-space-900 dark:text-white">Organizations</h2>
          <Link href="/partner/organizations" className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-space-200 dark:divide-space-800">
          {organizations.slice(0, 5).map((org) => (
            <Link
              key={org.id}
              href={`/partner/organizations/${org.id}`}
              className="flex items-center justify-between px-6 py-4 hover:bg-space-50 dark:hover:bg-space-800/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                  <BuildingOffice2Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-medium text-space-900 dark:text-white">{org.name}</p>
                  <p className="text-sm text-space-500 dark:text-space-400">{org.slug}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-right">
                  <p className="text-space-500 dark:text-space-400">{org.locationCount} locations</p>
                  <p className="text-space-500 dark:text-space-400">{org.userCount} users</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  org.status === 'active'
                    ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300'
                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                }`}>
                  {org.status}
                </span>
              </div>
            </Link>
          ))}
          {organizations.length === 0 && (
            <div className="px-6 py-12 text-center">
              <BuildingOffice2Icon className="h-12 w-12 mx-auto text-space-400 mb-4" />
              <p className="text-space-500 dark:text-space-400">No organizations yet</p>
              <Link
                href="/partner/organizations/new"
                className="inline-flex items-center gap-2 mt-4 text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                <PlusIcon className="h-4 w-4" />
                Create your first organization
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  color: 'emerald' | 'blue' | 'purple' | 'green' | 'amber'
}

function StatCard({ title, value, subtitle, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    emerald: 'from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400',
    blue: 'from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-400',
    purple: 'from-purple-500/20 to-pink-500/20 text-purple-600 dark:text-purple-400',
    green: 'from-green-500/20 to-emerald-500/20 text-success-600 dark:text-success-400',
    amber: 'from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400',
  }

  return (
    <div className="bg-white dark:bg-space-900 rounded-xl p-6 ring-1 ring-space-200 dark:ring-space-800">
      <div className="flex items-center gap-4">
        <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-space-500 dark:text-space-400">{title}</p>
          <p className="text-2xl font-bold text-space-900 dark:text-white">{value}</p>
          <p className="text-xs text-space-400 dark:text-space-500">{subtitle}</p>
        </div>
      </div>
    </div>
  )
}

