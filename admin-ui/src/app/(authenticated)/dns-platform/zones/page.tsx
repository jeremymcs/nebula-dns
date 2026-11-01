'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, Button, Input, Modal } from '@/components/ui'
import { useRequireFeature } from '@/hooks/useRequireRole'
import { useToast } from '@/components/Toast'
import {
  assignZone,
  createPlatformZone,
  listPlatformZones,
  syncPlatformZones,
  type AdminZoneRow,
} from '@/lib/dns-platform-api'

export default function DnsPlatformZonesPage() {
  const hasAccess = useRequireFeature('dns-platform')
  const { showToast } = useToast()
  const [zones, setZones] = useState<AdminZoneRow[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [assignTarget, setAssignTarget] = useState<AdminZoneRow | null>(null)
  const [tenantId, setTenantId] = useState('')
  const [newZoneName, setNewZoneName] = useState('')
  const [creating, setCreating] = useState(false)
  const [nameServers, setNameServers] = useState<string[] | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setZones(await listPlatformZones())
    } catch (err) {
      showToast(
        'error',
        'Load failed',
        err instanceof Error ? err.message : 'Unknown error',
      )
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    if (hasAccess) {
      load()
    }
  }, [hasAccess, load])

  const onSync = async () => {
    setSyncing(true)
    try {
      setZones(await syncPlatformZones())
      showToast('success', 'Sync complete', 'Zone inventory refreshed from Cloudflare.')
    } catch (err) {
      showToast(
        'error',
        'Sync failed',
        err instanceof Error ? err.message : 'Unknown error',
      )
    } finally {
      setSyncing(false)
    }
  }

  const onAssign = async () => {
    if (!assignTarget || !tenantId.trim()) {
      return
    }
    try {
      await assignZone(assignTarget.providerZoneId, { tenantId: tenantId.trim() })
      showToast('success', 'Zone assigned', assignTarget.zoneName)
      setAssignTarget(null)
      setTenantId('')
      await load()
    } catch (err) {
      showToast(
        'error',
        'Assign failed',
        err instanceof Error ? err.message : 'Unknown error',
      )
    }
  }

  const onCreate = async () => {
    if (!newZoneName.trim()) {
      return
    }
    setCreating(true)
    try {
      const result = await createPlatformZone({
        name: newZoneName.trim(),
        tenantId: tenantId.trim() || undefined,
      })
      setNameServers(result.nameServers ?? [])
      setNewZoneName('')
      showToast('success', 'Zone created', result.zoneName)
      await load()
    } catch (err) {
      showToast(
        'error',
        'Create failed',
        err instanceof Error ? err.message : 'Unknown error',
      )
    } finally {
      setCreating(false)
    }
  }

  if (!hasAccess) {
    return null
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-space-900 dark:text-white">
            DNS zone inventory
          </h1>
          <p className="text-sm text-space-600 dark:text-space-400 mt-2">
            Zones in the Flux Cloudflare account. Assign zones to tenants for the
            DNS Management module.
          </p>
        </div>
        <Link
          href="/dns-platform/connection"
          className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
        >
          ← Connection settings
        </Link>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-space-900 dark:text-white">
          Create zone
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Domain name"
            placeholder="customer.example.com"
            value={newZoneName}
            onChange={(e) => setNewZoneName(e.target.value)}
          />
          <Input
            label="Assign to tenant ID (optional)"
            placeholder="UUID"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
          />
        </div>
        <Button onClick={onCreate} disabled={creating}>
          {creating ? 'Creating…' : 'Create in Cloudflare'}
        </Button>
        {nameServers && nameServers.length > 0 && (
          <div className="text-sm rounded-lg bg-primary-50 dark:bg-primary-900/20 p-4">
            <p className="font-medium text-primary-800 dark:text-primary-200">
              Nameservers for cutover
            </p>
            <ul className="mt-2 font-mono text-xs space-y-1">
              {nameServers.map((ns) => (
                <li key={ns}>{ns}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <div className="flex justify-end">
        <Button variant="secondary" onClick={onSync} disabled={syncing}>
          {syncing ? 'Syncing…' : 'Sync from Cloudflare'}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-space-200 dark:border-space-700">
        <table className="min-w-full text-sm">
          <thead className="bg-space-50 dark:bg-space-900/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Zone</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-space-200 dark:divide-space-700">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-space-500">
                  Loading…
                </td>
              </tr>
            ) : (
              zones.map((zone) => (
                <tr key={zone.providerZoneId} className="bg-white dark:bg-space-800/40">
                  <td className="px-4 py-3 font-medium">{zone.zoneName}</td>
                  <td className="px-4 py-3 capitalize">{zone.status}</td>
                  <td className="px-4 py-3">
                    {zone.tenantName || zone.tenantId || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!zone.assignmentId && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setAssignTarget(zone)}
                      >
                        Assign
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
            {!loading && zones.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-space-500">
                  No zones in inventory — connect Cloudflare and run sync.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        title={`Assign ${assignTarget?.zoneName ?? 'zone'}`}
      >
        <div className="space-y-4">
          <Input
            label="Tenant ID"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAssignTarget(null)}>
              Cancel
            </Button>
            <Button onClick={onAssign}>Assign zone</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
