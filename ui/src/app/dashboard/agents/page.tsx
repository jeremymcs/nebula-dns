/**
 * Client Agents Download & Management Page - Cosmic Security Theme
 */

'use client'

import { useState, useEffect } from 'react'
import {
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  SignalIcon
} from '@heroicons/react/24/outline'
import { Button, Card, Badge, Modal, EmptyState } from '@/components/ui'
import { HeroMetric, HeroMetricsGrid } from '@/components/dashboard'

interface AgentVersion {
  version: string
  releaseDate: string
  downloadUrl: string
  releaseNotes: string
}

interface AgentInstallation {
  id: string
  deviceName: string
  platform: string
  osVersion: string
  agentVersion: string
  status: 'active' | 'inactive' | 'disconnected' | 'error'
  lastSeenAt: string
  ipAddress: string
  location?: { name: string }
}

interface AgentStats {
  total: number
  active: number
  inactive: number
  byPlatform: Record<string, number>
}

const platformIcons: Record<string, React.ReactNode> = {
  windows: <ComputerDesktopIcon className="h-8 w-8" />,
  macos: <ComputerDesktopIcon className="h-8 w-8" />,
  linux: <ComputerDesktopIcon className="h-8 w-8" />,
  ios: <DevicePhoneMobileIcon className="h-8 w-8" />,
  android: <DevicePhoneMobileIcon className="h-8 w-8" />,
}

const platformNames: Record<string, string> = {
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
  ios: 'iOS',
  android: 'Android',
}

export default function AgentsPage() {
  const [versions, setVersions] = useState<Record<string, AgentVersion>>({})
  const [agents, setAgents] = useState<AgentInstallation[]>([])
  const [stats, setStats] = useState<AgentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
  const [downloadLink, setDownloadLink] = useState<{ url: string; token: string; expiresAt: string } | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token')
      
      // Fetch versions
      const versionsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/agents/versions`)
      if (versionsRes.ok) {
        const data = await versionsRes.json()
        setVersions(data.data)
      }

      // Fetch installed agents
      const agentsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/agents`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (agentsRes.ok) {
        const data = await agentsRes.json()
        setAgents(data.data || [])
      }

      // Fetch stats
      const statsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/agents/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (platform: string) => {
    setSelectedPlatform(platform)
    setDownloading(platform)
    
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/agents/download-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ platform }),
      })

      if (res.ok) {
        const data = await res.json()
        setDownloadLink({
          url: data.data.downloadUrl,
          token: data.data.installationToken,
          expiresAt: data.data.expiresAt,
        })
        setShowDownloadModal(true)
      }
    } catch (err) {
      console.error('Failed to generate download link')
    } finally {
      setDownloading(null)
    }
  }

  const formatLastSeen = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`
    return d.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="skeleton h-8 w-48 rounded-lg" />
        <div className="grid grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-space-900 dark:text-white">Client Agents</h1>
        <p className="text-space-500 dark:text-space-400 mt-1">
          Download and manage SafeDNS client agents for your devices
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <HeroMetricsGrid columns={4}>
          <HeroMetric
            title="Total Agents"
            value={stats.total}
            icon={<ComputerDesktopIcon className="h-6 w-6" />}
            variant="primary"
          />
          <HeroMetric
            title="Active"
            value={stats.active}
            icon={<SignalIcon className="h-6 w-6" />}
            variant="success"
          />
          <HeroMetric
            title="Inactive"
            value={stats.inactive}
            icon={<ClockIcon className="h-6 w-6" />}
            variant="warning"
          />
          <Card variant="solid" padding="md">
            <div className="text-sm text-space-500 dark:text-space-400 mb-2">By Platform</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPlatform).map(([platform, count]) => (
                <Badge key={platform} variant="neutral" size="sm">
                  {platformNames[platform]}: {count}
                </Badge>
              ))}
            </div>
          </Card>
        </HeroMetricsGrid>
      )}

      {/* Download Section */}
      <Card variant="solid" padding="lg">
        <h2 className="text-lg font-semibold text-space-900 dark:text-white mb-4">Download Agents</h2>
        <div className="grid grid-cols-5 gap-4">
          {Object.entries(versions).map(([platform, version]) => (
            <Card
              key={platform}
              variant="interactive"
              padding="md"
              className="text-center"
            >
              <div className="flex justify-center text-space-500 dark:text-space-400 mb-3">
                {platformIcons[platform]}
              </div>
              <h3 className="font-medium text-space-900 dark:text-white">{platformNames[platform]}</h3>
              <p className="text-sm text-space-500 dark:text-space-400 mb-3">v{version.version}</p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleDownload(platform)}
                isLoading={downloading === platform}
                className="w-full"
              >
                {downloading !== platform && <ArrowDownTrayIcon className="h-4 w-4 mr-1" />}
                {downloading === platform ? 'Generating...' : 'Download'}
              </Button>
            </Card>
          ))}
        </div>
      </Card>

      {/* Installed Agents */}
      <Card variant="solid" padding="none">
        <div className="px-6 py-4 border-b border-space-200 dark:border-space-700">
          <h2 className="text-lg font-semibold text-space-900 dark:text-white">Installed Agents</h2>
        </div>

        {agents.length === 0 ? (
          <EmptyState
            icon={<ComputerDesktopIcon className="h-12 w-12" />}
            title="No agents installed yet"
            description="Download and install an agent to get started"
          />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Device</th>
                  <th className="table-header-cell">Platform</th>
                  <th className="table-header-cell">Version</th>
                  <th className="table-header-cell">Location</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Last Seen</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {agents.map((agent) => (
                  <tr key={agent.id} className="table-row">
                    <td className="table-cell">
                      <div className="font-medium text-space-900 dark:text-white">{agent.deviceName}</div>
                      <div className="text-sm text-space-500 dark:text-space-400">{agent.ipAddress}</div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center">
                        <span className="text-space-500 dark:text-space-400 mr-2">
                          {platformIcons[agent.platform]}
                        </span>
                        <div>
                          <div className="text-space-900 dark:text-white">{platformNames[agent.platform]}</div>
                          <div className="text-sm text-space-500 dark:text-space-400">{agent.osVersion}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">v{agent.agentVersion}</td>
                    <td className="table-cell">{agent.location?.name || 'Unassigned'}</td>
                    <td className="table-cell">
                      <Badge
                        variant={
                          agent.status === 'active' ? 'success' :
                          agent.status === 'error' ? 'danger' :
                          agent.status === 'disconnected' ? 'warning' : 'neutral'
                        }
                        size="sm"
                      >
                        {agent.status === 'active' && <SignalIcon className="h-3 w-3 mr-1" />}
                        {agent.status === 'inactive' && <ClockIcon className="h-3 w-3 mr-1" />}
                        {(agent.status === 'disconnected' || agent.status === 'error') && <XCircleIcon className="h-3 w-3 mr-1" />}
                        {agent.status}
                      </Badge>
                    </td>
                    <td className="table-cell text-sm text-space-500 dark:text-space-400">
                      {formatLastSeen(agent.lastSeenAt)}
                    </td>
                    <td className="table-cell">
                      <Button variant="ghost" size="sm">Manage</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Download Modal */}
      <Modal
        isOpen={showDownloadModal && !!downloadLink && !!selectedPlatform}
        onClose={() => {
          setShowDownloadModal(false)
          setDownloadLink(null)
        }}
        title={`Download ${selectedPlatform ? platformNames[selectedPlatform] : ''} Agent`}
        size="md"
      >
        {downloadLink && (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <div className="flex items-center text-green-700 dark:text-green-300 mb-2">
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                <span className="font-medium">Download link ready!</span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                Your installation token has been generated. Use it during setup.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
                Installation Token
              </label>
              <div className="flex items-center">
                <code className="flex-1 bg-space-100 dark:bg-space-700 dark:text-space-200 px-3 py-2 rounded-l-xl font-mono text-sm overflow-x-auto">
                  {downloadLink.token}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(downloadLink.token)}
                  className="px-3 py-2 bg-space-200 dark:bg-space-600 dark:text-space-200 rounded-r-xl hover:bg-space-300 dark:hover:bg-space-500 transition-colors"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-space-500 dark:text-space-400 mt-1">
                Expires: {new Date(downloadLink.expiresAt).toLocaleString()}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <a
                href={downloadLink.url}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium hover:from-primary-600 hover:to-primary-700 text-center transition-all shadow-lg shadow-primary-500/25"
              >
                <ArrowDownTrayIcon className="h-5 w-5 inline mr-2" />
                Download Agent
              </a>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDownloadModal(false)
                  setDownloadLink(null)
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
