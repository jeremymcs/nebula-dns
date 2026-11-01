'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import {
  ArrowRightOnRectangleIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  CpuChipIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import { Badge, Button, Card, Skeleton } from '@/components/ui'
import {
  AdminTenantDetail,
  reactivateTenantAdmin,
  startImpersonation,
  suspendTenantAdmin,
  updateTenantLimitsAdmin,
  updateTenantModulesAdmin,
} from '@/hooks/useApi'
import { useToast } from '@/components/Toast'
import { useAdminRole } from '@/hooks/useAdminRole'
import { TENANT_UI_URL } from '@/lib/api'
import { useState } from 'react'

interface TenantDetailViewProps {
  tenantId: string
  tenant?: AdminTenantDetail
  isLoading: boolean
  error?: Error
  onRefresh: () => void
  backHref?: string
  backLabel?: string
}

export function TenantDetailView({
  tenantId,
  tenant,
  isLoading,
  error,
  onRefresh,
  backHref = '/tenants',
  backLabel = 'Back to tenants',
}: TenantDetailViewProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const { canWrite } = useAdminRole()
  const [busy, setBusy] = useState(false)
  const [planDraft, setPlanDraft] = useState<string | null>(null)
  const [locationLimitDraft, setLocationLimitDraft] = useState<string>('')

  const handleImpersonate = async () => {
    setBusy(true)
    try {
      const result = await startImpersonation(tenantId)
      const info = {
        tenantId: result.tenantId,
        tenantName: result.tenantName,
        tenantTier: result.tenantTier,
      }
      const encodedInfo = encodeURIComponent(JSON.stringify(info))
      window.location.href = `${TENANT_UI_URL}/impersonate?token=${result.accessToken}&info=${encodedInfo}`
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Impersonation failed')
      setBusy(false)
    }
  }

  const handleSuspendToggle = async () => {
    if (!tenant || !canWrite) return
    setBusy(true)
    try {
      if (tenant.status === 'active') {
        await suspendTenantAdmin(tenantId)
        showToast('success', 'Tenant suspended')
      } else if (tenant.status === 'suspended') {
        await reactivateTenantAdmin(tenantId)
        showToast('success', 'Tenant reactivated')
      }
      onRefresh()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  const saveLimits = async () => {
    if (!canWrite) return
    setBusy(true)
    try {
      await updateTenantLimitsAdmin(tenantId, {
        plan: (planDraft || tenant?.plan) as AdminTenantDetail['plan'],
        locationLimit:
          locationLimitDraft === ''
            ? undefined
            : locationLimitDraft === 'unlimited'
              ? null
              : Number(locationLimitDraft),
      })
      showToast('success', 'Limits updated')
      onRefresh()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  const toggleModule = async (
    key: keyof AdminTenantDetail['modules'],
    value: boolean
  ) => {
    if (!canWrite || !tenant) return
    setBusy(true)
    try {
      await updateTenantModulesAdmin(tenantId, { [key]: value })
      showToast('success', 'Module settings updated')
      onRefresh()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  if (error) {
    return (
      <Card variant="solid" padding="lg" className="border-danger-200">
        <p className="text-danger-700 dark:text-danger-300">
          Failed to load tenant. {error.message}
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="text-sm text-space-500 hover:text-primary-600 dark:hover:text-primary-400"
      >
        ← {backLabel}
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {isLoading ? (
            <Skeleton className="h-9 w-64" />
          ) : (
            <h1 className="text-3xl font-bold text-space-900 dark:text-white">
              {tenant?.name}
            </h1>
          )}
          <p className="mt-1 text-sm text-space-500 dark:text-space-400 font-mono">
            {tenantId}
          </p>
        </div>
        {!isLoading && tenant && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => router.push(`/tenants/${tenantId}/billing`)}
            >
              <CreditCardIcon className="h-4 w-4 mr-2" />
              Billing
            </Button>
            <Button variant="secondary" onClick={handleImpersonate} disabled={busy}>
              <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
              Impersonate
            </Button>
            {canWrite && tenant.status !== 'cancelled' && (
              <Button
                variant={tenant.status === 'active' ? 'danger' : 'primary'}
                onClick={handleSuspendToggle}
                disabled={busy}
              >
                {tenant.status === 'active' ? 'Suspend' : 'Reactivate'}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Status', value: tenant?.status, icon: ShieldCheckIcon },
          { label: 'Plan / tier', value: tenant ? `${tenant.plan} · ${tenant.tier}` : '—', icon: ChartBarIcon },
          { label: 'Users', value: tenant?.userCount?.toString(), icon: UserGroupIcon },
          { label: 'Agents', value: tenant?.agentCount?.toString(), icon: CpuChipIcon },
        ].map((stat) => (
          <Card key={stat.label} variant="glass" padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                <stat.icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-space-500">{stat.label}</p>
                <p className="font-semibold text-space-900 dark:text-white capitalize">
                  {isLoading ? '…' : stat.value ?? '—'}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {!isLoading && tenant && (
        <>
          {tenant.managedByMspName && (
            <p className="text-sm text-space-600 dark:text-space-400">
              Managed by MSP:{' '}
              <Link
                href={`/msps/${tenant.managedByMspId}`}
                className="text-primary-600 dark:text-primary-400 hover:underline"
              >
                {tenant.managedByMspName}
              </Link>
            </p>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card variant="solid" padding="md">
              <h2 className="text-lg font-semibold text-space-900 dark:text-white mb-4">
                Limits
              </h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-space-500">Location limit</dt>
                  <dd>{tenant.limits.locationLimit ?? 'Unlimited'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-space-500">Client limit</dt>
                  <dd>{tenant.limits.clientLimit ?? 'Unlimited'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-space-500">Queries / month</dt>
                  <dd>{tenant.limits.queriesPerMonth ?? 'Unlimited'}</dd>
                </div>
              </dl>
              {canWrite && (
                <div className="mt-4 pt-4 border-t border-space-200 dark:border-space-700 space-y-3">
                  <label className="block text-xs font-medium text-space-500">
                    Override plan
                    <select
                      className="mt-1 w-full rounded-lg border border-space-200 dark:border-space-700 bg-white dark:bg-space-900 px-3 py-2 text-sm"
                      value={planDraft ?? tenant.plan}
                      onChange={(e) => setPlanDraft(e.target.value)}
                    >
                      {['free', 'starter', 'pro', 'enterprise'].map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-medium text-space-500">
                    Location limit (blank = no change, unlimited = empty cap)
                    <input
                      className="mt-1 w-full rounded-lg border border-space-200 dark:border-space-700 bg-white dark:bg-space-900 px-3 py-2 text-sm"
                      placeholder="e.g. 25 or unlimited"
                      value={locationLimitDraft}
                      onChange={(e) => setLocationLimitDraft(e.target.value)}
                    />
                  </label>
                  <Button size="sm" onClick={saveLimits} disabled={busy}>
                    Save limits
                  </Button>
                </div>
              )}
            </Card>

            <Card variant="solid" padding="md">
              <h2 className="text-lg font-semibold text-space-900 dark:text-white mb-4">
                Product modules
              </h2>
              <ul className="space-y-3">
                {(
                  [
                    ['dnsFilter', 'DNS Filter'],
                    ['dnsManagement', 'DNS Management'],
                    ['dmarc', 'DMARC (placeholder)'],
                  ] as const
                ).map(([key, label]) => (
                  <li
                    key={key}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-space-700 dark:text-space-300">{label}</span>
                    <button
                      type="button"
                      disabled={!canWrite || busy}
                      onClick={() => toggleModule(key, !tenant.modules[key])}
                      className={clsx(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                        tenant.modules[key]
                          ? 'bg-primary-600'
                          : 'bg-space-300 dark:bg-space-600',
                        !canWrite && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <span
                        className={clsx(
                          'inline-block h-4 w-4 transform rounded-full bg-white transition',
                          tenant.modules[key] ? 'translate-x-6' : 'translate-x-1'
                        )}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card variant="solid" padding="md">
            <h2 className="text-lg font-semibold text-space-900 dark:text-white mb-2">
              Recent query volume ({tenant.recentUsage.period})
            </h2>
            {!tenant.recentUsage.analyticsAvailable ? (
              <p className="text-sm text-warning-700 dark:text-warning-300">
                Analytics unavailable — ClickHouse is not connected. Counts may be
                empty or mock data.
              </p>
            ) : tenant.recentUsage.isMockData ? (
              <p className="text-sm text-warning-700 dark:text-warning-300">
                Showing mock analytics data (no live ClickHouse series).
              </p>
            ) : null}
            <p className="text-2xl font-bold text-space-900 dark:text-white mt-2">
              {tenant.recentUsage.totalQueries.toLocaleString()} queries
              <span className="text-base font-normal text-space-500 ml-2">
                ({tenant.recentUsage.blockedQueries.toLocaleString()} blocked)
              </span>
            </p>
          </Card>

          <Card variant="solid" padding="none">
            <div className="px-4 py-3 border-b border-space-200 dark:border-space-700">
              <h2 className="font-semibold text-space-900 dark:text-white">
                Users ({tenant.userCount})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="table text-sm w-full">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Name</th>
                    <th className="table-header-cell">Email</th>
                    <th className="table-header-cell">Role</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {tenant.users.map((user) => (
                    <tr key={user.id} className="table-row">
                      <td className="table-cell">{user.name}</td>
                      <td className="table-cell">{user.email}</td>
                      <td className="table-cell">
                        <Badge size="sm">{user.role}</Badge>
                      </td>
                    </tr>
                  ))}
                  {tenant.users.length === 0 && (
                    <tr>
                      <td colSpan={3} className="table-cell text-center text-space-500 py-6">
                        No users
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
