/**
 * Nebula DNS - MSP Detail Page (Mission Control)
 * Admin interface for viewing MSP details and taking actions
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  BuildingOffice2Icon,
  CreditCardIcon,
  ArrowRightOnRectangleIcon,
  CheckBadgeIcon,
  CalendarIcon,
  UserGroupIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'
import { Card, Badge, Skeleton } from '@/components/ui'
import { useAdminMspDetail, startImpersonation, MspDetailResponse } from '@/hooks/useAdminApi'
import { useToast } from '@/components/Toast'

interface MspDetailPageProps {
  params: { id: string }
}

/**
 * Get Badge variant based on MSP status
 */
function getStatusBadgeVariant(status: MspDetailResponse['status']): 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'active':
      return 'success'
    case 'suspended':
      return 'warning'
    case 'cancelled':
      return 'danger'
    default:
      return 'success'
  }
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Loading skeleton for stat cards
 */
function StatCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} variant="glass" padding="md">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

export default function MspDetailPage({ params }: MspDetailPageProps) {
  const mspId = params.id
  const { showToast } = useToast()
  const [isImpersonating, setIsImpersonating] = useState(false)

  const { data: msp, isLoading, error } = useAdminMspDetail(mspId)

  /**
   * Handle impersonation - immediately starts session without confirmation
   */
  const handleImpersonate = async () => {
    if (isImpersonating) return
    setIsImpersonating(true)
    try {
      const result = await startImpersonation(mspId)
      // Store impersonation token and info
      localStorage.setItem('impersonation_token', result.accessToken)
      localStorage.setItem(
        'impersonation_info',
        JSON.stringify({
          tenantId: result.tenantId,
          tenantName: result.tenantName,
          tenantTier: result.tenantTier,
          startedAt: new Date().toISOString(),
        })
      )
      // Set as active tenant token for dashboard
      localStorage.setItem('token', result.accessToken)
      showToast('success', `Now impersonating ${result.tenantName}`)
      // Redirect to tenant dashboard
      window.location.href = '/dashboard'
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Impersonation failed')
      setIsImpersonating(false)
    }
  }

  /**
   * Handle View Billing - placeholder for Phase 14
   */
  const handleViewBilling = () => {
    showToast('info', 'Billing details coming in Phase 14')
  }

  // Error state
  if (error) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Back Link */}
        <Link
          href="/mission-control/msps"
          className="inline-flex items-center gap-2 text-space-500 dark:text-space-400 hover:text-space-700 dark:hover:text-space-200 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to MSPs
        </Link>

        <Card
          variant="solid"
          padding="lg"
          className="border-red-200 dark:border-red-800 bg-danger-50 dark:bg-danger-900/20"
        >
          <p className="text-danger-800 dark:text-danger-200">
            Failed to load MSP details. {error.message || 'Please try again.'}
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back Link */}
      <Link
        href="/mission-control/msps"
        className="inline-flex items-center gap-2 text-space-500 dark:text-space-400 hover:text-space-700 dark:hover:text-space-200 transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to MSPs
      </Link>

      {/* Breadcrumb */}
      <nav className="text-sm text-space-500 dark:text-space-400">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/mission-control" className="hover:text-space-700 dark:hover:text-space-200">
              Mission Control
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href="/mission-control/msps" className="hover:text-space-700 dark:hover:text-space-200">
              MSPs
            </Link>
          </li>
          <li>/</li>
          <li className="text-space-900 dark:text-white font-medium">
            {isLoading ? <Skeleton className="h-4 w-32 inline-block" /> : msp?.name || 'MSP Detail'}
          </li>
        </ol>
      </nav>

      {/* Page Header with Actions */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-space-900 dark:text-white">
            {isLoading ? <Skeleton className="h-9 w-64" /> : msp?.name}
          </h1>
          <p className="mt-2 text-space-500 dark:text-space-400">
            {isLoading ? (
              <Skeleton className="h-4 w-48" />
            ) : (
              `ID: ${mspId.slice(0, 8)}...${mspId.slice(-4)}`
            )}
          </p>
        </div>

        {/* Action Buttons */}
        {!isLoading && msp && (
          <div className="mt-4 sm:mt-0 flex gap-3">
            <button
              onClick={handleViewBilling}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
            >
              <CreditCardIcon className="h-5 w-5" />
              View Billing
            </button>
            <button
              onClick={handleImpersonate}
              disabled={isImpersonating}
              className="px-4 py-2 bg-space-100 dark:bg-space-800 text-space-700 dark:text-space-300 rounded-lg hover:bg-space-200 dark:hover:bg-space-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              {isImpersonating ? 'Starting...' : 'Impersonate'}
            </button>
          </div>
        )}
      </div>

      {/* Stat Cards */}
      {isLoading ? (
        <StatCardsSkeleton />
      ) : msp ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* MSP Name Card */}
          <Card variant="glass" padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                <BuildingOffice2Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-space-500 dark:text-space-400">MSP Name</p>
                <p className="text-lg font-semibold text-space-900 dark:text-white truncate max-w-[180px]">
                  {msp.name}
                </p>
              </div>
            </div>
          </Card>

          {/* Tier Card */}
          <Card variant="glass" padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent-100 dark:bg-accent-900/30">
                <CheckBadgeIcon className="h-5 w-5 text-accent-600 dark:text-accent-400" />
              </div>
              <div>
                <p className="text-xs text-space-500 dark:text-space-400">Tier</p>
                <p className="text-lg font-semibold text-space-900 dark:text-white uppercase">
                  {msp.tier}
                </p>
              </div>
            </div>
          </Card>

          {/* Status Card */}
          <Card variant="glass" padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success-100 dark:bg-success-900/30">
                <UserGroupIcon className="h-5 w-5 text-success-600 dark:text-success-400" />
              </div>
              <div>
                <p className="text-xs text-space-500 dark:text-space-400">Status</p>
                <Badge variant={getStatusBadgeVariant(msp.status)} size="sm">
                  {msp.status}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Created Date Card */}
          <Card variant="glass" padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning-100 dark:bg-warning-900/30">
                <CalendarIcon className="h-5 w-5 text-warning-600 dark:text-warning-400" />
              </div>
              <div>
                <p className="text-xs text-space-500 dark:text-space-400">Created</p>
                <p className="text-lg font-semibold text-space-900 dark:text-white">
                  {formatDate(msp.createdAt)}
                </p>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {/* Additional Stats Row */}
      {!isLoading && msp && (
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Clients Count */}
          <Card variant="glass" padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                <BuildingOffice2Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-space-500 dark:text-space-400">Clients</p>
                <p className="text-2xl font-bold text-space-900 dark:text-white">
                  {msp.clientCount.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>

          {/* Locations Count */}
          <Card variant="glass" padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent-100 dark:bg-accent-900/30">
                <MapPinIcon className="h-5 w-5 text-accent-600 dark:text-accent-400" />
              </div>
              <div>
                <p className="text-xs text-space-500 dark:text-space-400">Locations</p>
                <p className="text-2xl font-bold text-space-900 dark:text-white">
                  {msp.locationCount.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>

          {/* Users Count */}
          <Card variant="glass" padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success-100 dark:bg-success-900/30">
                <UserGroupIcon className="h-5 w-5 text-success-600 dark:text-success-400" />
              </div>
              <div>
                <p className="text-xs text-space-500 dark:text-space-400">Users</p>
                <p className="text-2xl font-bold text-space-900 dark:text-white">
                  {msp.userCount.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Client list and usage charts added in Plan 02 */}
    </div>
  )
}
