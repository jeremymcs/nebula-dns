'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { api } from '@/lib/api'

interface DnsRecord {
  id: string
  type: string
  name: string
  content: string
  ttl: number
  proxied?: boolean
  priority?: number
}

export default function DnsZoneRecordsPage() {
  const params = useParams()
  const zoneId = params.zoneId as string
  const [records, setRecords] = useState<DnsRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await api.get<DnsRecord[]>(
          `/dns-management/zones/${zoneId}/records`,
        )
        if (!cancelled) {
          setRecords(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load records')
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
  }, [zoneId])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <Link
        href="/dns-management"
        className="inline-flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to zones
      </Link>

      <h1 className="text-2xl font-bold text-space-900 dark:text-white">
        DNS records
      </h1>

      {loading && (
        <p className="text-sm text-space-500">Loading records from Cloudflare…</p>
      )}
      {error && (
        <p className="text-sm text-danger-600 dark:text-danger-400">{error}</p>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-space-200 dark:border-space-700">
          <table className="min-w-full text-sm">
            <thead className="bg-space-50 dark:bg-space-900/50 text-left text-space-600 dark:text-space-400">
              <tr>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Content</th>
                <th className="px-4 py-3 font-medium">TTL</th>
                <th className="px-4 py-3 font-medium">Proxy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-space-200 dark:divide-space-700">
              {records.map((record) => (
                <tr key={record.id} className="bg-white dark:bg-space-800/40">
                  <td className="px-4 py-3 font-mono text-xs">{record.type}</td>
                  <td className="px-4 py-3 break-all">{record.name}</td>
                  <td className="px-4 py-3 break-all font-mono text-xs">
                    {record.content}
                  </td>
                  <td className="px-4 py-3">{record.ttl}</td>
                  <td className="px-4 py-3">
                    {record.proxied ? 'Proxied' : 'DNS only'}
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-space-500"
                  >
                    No records returned for this zone.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
