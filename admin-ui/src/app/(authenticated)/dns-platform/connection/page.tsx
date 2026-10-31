'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, Button, Input } from '@/components/ui'
import { useRequireFeature } from '@/hooks/useRequireRole'
import { useToast } from '@/components/Toast'
import {
  fetchPlatformConnection,
  savePlatformConnection,
  type PlatformConnectionStatus,
} from '@/lib/dns-platform-api'

export default function DnsPlatformConnectionPage() {
  const hasAccess = useRequireFeature('dns-platform')
  const { showToast } = useToast()
  const [connection, setConnection] = useState<PlatformConnectionStatus | null>(
    null,
  )
  const [label, setLabel] = useState('Flux Labs production CF')
  const [apiToken, setApiToken] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const status = await fetchPlatformConnection()
      setConnection(status)
      if (status?.label) {
        setLabel(status.label)
      }
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

  const onSave = async () => {
    if (!apiToken.trim()) {
      showToast('error', 'Token required', 'Paste a Cloudflare API token to verify.')
      return
    }
    setSaving(true)
    try {
      const saved = await savePlatformConnection({ label, apiToken })
      setConnection(saved)
      setApiToken('')
      showToast('success', 'Connection saved', 'Token verified and stored securely.')
    } catch (err) {
      showToast(
        'error',
        'Verification failed',
        err instanceof Error ? err.message : 'Unknown error',
      )
    } finally {
      setSaving(false)
    }
  }

  if (!hasAccess) {
    return null
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-space-900 dark:text-white">
            DNS Platform connection
          </h1>
          <p className="text-sm text-space-600 dark:text-space-400 mt-2">
            Connect the Flux Cloudflare account used for MSP-hosted zones. Tokens
            are verified with Cloudflare, encrypted at rest, and never returned to
            the browser after save.
          </p>
        </div>
        <Link
          href="/dns-platform/zones"
          className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline shrink-0"
        >
          Zone inventory →
        </Link>
      </div>

      <Card className="p-6 space-y-4">
        {loading ? (
          <p className="text-sm text-space-500">Loading…</p>
        ) : connection ? (
          <div className="rounded-lg bg-space-50 dark:bg-space-900/40 p-4 text-sm space-y-1">
            <p>
              <span className="text-space-500">Status:</span>{' '}
              <span className="font-medium capitalize">{connection.status}</span>
            </p>
            <p>
              <span className="text-space-500">Fingerprint:</span>{' '}
              <code className="text-xs">{connection.tokenFingerprint}</code>
            </p>
            {connection.verifiedAt && (
              <p>
                <span className="text-space-500">Verified:</span>{' '}
                {new Date(connection.verifiedAt).toLocaleString()}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-space-600 dark:text-space-400">
            No active platform connection yet.
          </p>
        )}

        <Input
          label="Connection label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <Input
          label="Cloudflare API token"
          type="password"
          autoComplete="off"
          placeholder="Paste token — not stored in browser after submit"
          value={apiToken}
          onChange={(e) => setApiToken(e.target.value)}
        />

        <div className="flex gap-3 pt-2">
          <Button onClick={onSave} disabled={saving}>
            {saving ? 'Verifying…' : connection ? 'Replace token' : 'Connect'}
          </Button>
        </div>

        <p className="text-xs text-space-500 pt-2">
          Set <code className="text-[11px]">DNS_MANAGEMENT_ENCRYPTION_KEY</code>{' '}
          in the API environment before connecting in production. See{' '}
          <code className="text-[11px]">docs/modules/dns-management/OPERATIONS.md</code>.
        </p>
      </Card>
    </div>
  )
}
