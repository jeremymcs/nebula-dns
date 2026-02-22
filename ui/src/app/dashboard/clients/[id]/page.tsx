// Nebula DNS - Client Detail Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { use } from 'react'
import Link from 'next/link'
import { useMspClient } from '@/hooks/useMspClients'
import { useClientContext } from '@/hooks/useClientContext'
import { Button } from '@/components/ui/Button'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { StatsCard } from '@/components/StatsCard'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BuildingOffice2Icon,
  MapPinIcon,
  ShieldCheckIcon,
  UsersIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { client, stats, loading } = useMspClient(id)
  const { switchToClient } = useClientContext()

  const handleSwitchToClient = () => {
    if (client) {
      switchToClient(client.id, client.name)
      window.location.href = '/dashboard'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse h-12 bg-space-100 dark:bg-space-800 rounded-lg" />
        <div className="grid grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse h-32 bg-space-100 dark:bg-space-800 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <BuildingOffice2Icon className="mx-auto h-12 w-12 text-space-400 dark:text-space-500" />
        <h3 className="mt-4 text-sm font-semibold text-space-900 dark:text-white">
          Client Not Found
        </h3>
        <p className="mt-2 text-sm text-space-500 dark:text-space-400">
          The client you're looking for doesn't exist or you don't have access.
        </p>
        <div className="mt-6">
          <Link href="/dashboard/clients">
            <Button variant="primary" leftIcon={<ArrowLeftIcon className="w-5 h-5" />}>
              Back to Clients
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/clients">
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeftIcon className="w-4 h-4" />}>
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-space-900 dark:text-white">
                {client.name}
              </h1>
              <StatusBadge status={client.status === 'suspended' ? 'inactive' : client.status} />
            </div>
            <p className="mt-1 text-sm text-space-500 dark:text-space-400">
              {client.slug} • Created {formatDistanceToNow(new Date(client.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          rightIcon={<ArrowRightIcon className="w-5 h-5" />}
          onClick={handleSwitchToClient}
        >
          Switch to Client
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Queries"
          value={stats?.totalQueries?.toLocaleString() || '0'}
          icon={ChartBarIcon}
          trend={{ value: 0, isUp: true }}
        />
        <StatsCard
          title="Blocked Queries"
          value={stats?.blockedQueries?.toLocaleString() || '0'}
          icon={ShieldCheckIcon}
          trend={{ value: 0, isUp: true }}
        />
        <StatsCard
          title="Locations"
          value={client.locationCount?.toString() || '0'}
          icon={MapPinIcon}
        />
        <StatsCard
          title="Users"
          value={client.userCount?.toString() || '0'}
          icon={UsersIcon}
        />
      </div>

      {/* Client Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-4">
            Client Information
          </h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-space-500 dark:text-space-400">Organization Name</dt>
              <dd className="text-sm font-medium text-space-900 dark:text-white mt-1">
                {client.name}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-space-500 dark:text-space-400">Slug</dt>
              <dd className="text-sm font-medium text-space-900 dark:text-white mt-1">
                {client.slug}
              </dd>
            </div>
            {client.plan && (
              <div>
                <dt className="text-sm text-space-500 dark:text-space-400">Plan</dt>
                <dd className="mt-1">
                  <Badge variant="accent" size="sm">
                    {client.plan}
                  </Badge>
                </dd>
              </div>
            )}
            {client.industry && (
              <div>
                <dt className="text-sm text-space-500 dark:text-space-400">Industry</dt>
                <dd className="text-sm font-medium text-space-900 dark:text-white mt-1 capitalize">
                  {client.industry}
                </dd>
              </div>
            )}
            {client.companySize && (
              <div>
                <dt className="text-sm text-space-500 dark:text-space-400">Company Size</dt>
                <dd className="text-sm font-medium text-space-900 dark:text-white mt-1">
                  {client.companySize} employees
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-4">
            Contact Information
          </h3>
          <dl className="space-y-3">
            {client.contactEmail && (
              <div>
                <dt className="text-sm text-space-500 dark:text-space-400">Email</dt>
                <dd className="text-sm font-medium text-space-900 dark:text-white mt-1">
                  <a
                    href={`mailto:${client.contactEmail}`}
                    className="text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    {client.contactEmail}
                  </a>
                </dd>
              </div>
            )}
            {client.contactPhone && (
              <div>
                <dt className="text-sm text-space-500 dark:text-space-400">Phone</dt>
                <dd className="text-sm font-medium text-space-900 dark:text-white mt-1">
                  {client.contactPhone}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-space-500 dark:text-space-400">Created</dt>
              <dd className="text-sm font-medium text-space-900 dark:text-white mt-1">
                {new Date(client.createdAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-4">
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={handleSwitchToClient}>
            View Dashboard
          </Button>
          <Button variant="secondary">Manage Policies</Button>
          <Button variant="secondary">View Locations</Button>
          <Button variant="secondary">Manage Users</Button>
        </div>
      </div>
    </div>
  )
}
