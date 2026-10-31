'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { GlobeAltIcon } from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import { PRODUCT_MODULE_DNS_MANAGEMENT } from '@/lib/branding'

interface TenantZone {
  id: string
  zoneName: string
  status: string
  nameServers: string[]
  canEditRecords: boolean
  canToggleProxy: boolean
  canDeleteRecords: boolean
}

export default function DnsManagementHomePage() {
  const [zones, setZones] = useState<TenantZone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await api.get<TenantZone[]>('/dns-management/zones')
        if (!cancelled) {
          setZones(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load zones')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
          {PRODUCT_MODULE_DNS_MANAGEMENT}
        </p>
        <h1 className="text-2xl font-bold text-space-900 dark:text-white mt-1">
          Your DNS zones
        </h1>
        <p className="text-sm text-space-600 dark:text-space-400 mt-2">
          Zones assigned to your organization by your MSP or Flux Labs. Record
          editing arrives in a later release; this view is read-only in Phase 1.
        </p>
      </div>

      {loading && (
        <p className="text-sm text-space-500">Loading assigned zones…</p>
      )}
      {error && (
        <p className="text-sm text-danger-600 dark:text-danger-400">{error}</p>
      )}

      {!loading && !error && zones.length === 0 && (
        <div className="rounded-2xl border border-dashed border-space-300 dark:border-space-700 p-10 text-center">
          <GlobeAltIcon className="mx-auto h-10 w-10 text-space-400" />
          <h2 className="mt-4 text-lg font-semibold text-space-900 dark:text-white">
            No zones assigned yet
          </h2>
          <p className="mt-2 text-sm text-space-600 dark:text-space-400 max-w-md mx-auto">
            Contact your provider to have a domain assigned before you can manage
            DNS records here.
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {zones.map((zone) => (
          <li key={zone.id}>
            <Link
              href={`/dns-management/zones/${zone.id}`}
              className="block rounded-xl border border-space-200 dark:border-space-700 bg-white dark:bg-space-800/60 p-4 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-space-900 dark:text-white">
                    {zone.zoneName}
                  </p>
                  <p className="text-xs text-space-500 mt-1 capitalize">
                    {zone.status}
                    {!zone.canEditRecords && ' · read-only'}
                  </p>
                </div>
                <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                  View records →
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
