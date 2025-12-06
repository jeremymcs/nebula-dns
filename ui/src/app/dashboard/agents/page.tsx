/**
 * Client Agents Download & Management Page
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

const statusStyles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  active: { 
    bg: 'bg-green-100', 
    text: 'text-green-700',
    icon: <SignalIcon className="h-4 w-4" />
  },
  inactive: { 
    bg: 'bg-gray-100', 
    text: 'text-gray-700',
    icon: <ClockIcon className="h-4 w-4" />
  },
  disconnected: { 
    bg: 'bg-yellow-100', 
    text: 'text-yellow-700',
    icon: <XCircleIcon className="h-4 w-4" />
  },
  error: { 
    bg: 'bg-red-100', 
    text: 'text-red-700',
    icon: <XCircleIcon className="h-4 w-4" />
  },
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
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-5 gap-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-40 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Client Agents</h1>
        <p className="text-gray-600 mt-1">Download and manage SafeDNS client agents for your devices</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Agents</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-gray-600">Active</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-500">{stats.inactive}</div>
            <div className="text-sm text-gray-600">Inactive</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-2">By Platform</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPlatform).map(([platform, count]) => (
                <span key={platform} className="px-2 py-1 bg-gray-100 rounded text-xs">
                  {platformNames[platform]}: {count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Download Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Download Agents</h2>
        <div className="grid grid-cols-5 gap-4">
          {Object.entries(versions).map(([platform, version]) => (
            <div
              key={platform}
              className="border border-gray-200 rounded-lg p-4 text-center hover:border-indigo-300 hover:shadow-md transition-all"
            >
              <div className="flex justify-center text-gray-600 mb-3">
                {platformIcons[platform]}
              </div>
              <h3 className="font-medium text-gray-900">{platformNames[platform]}</h3>
              <p className="text-sm text-gray-500 mb-3">v{version.version}</p>
              <button
                onClick={() => handleDownload(platform)}
                disabled={downloading === platform}
                className="w-full px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center"
              >
                {downloading === platform ? (
                  'Generating...'
                ) : (
                  <>
                    <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                    Download
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Installed Agents */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Installed Agents</h2>
        </div>
        
        {agents.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <ComputerDesktopIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No agents installed yet</p>
            <p className="text-sm mt-1">Download and install an agent to get started</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Seen</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {agents.map((agent) => {
                const status = statusStyles[agent.status]
                return (
                  <tr key={agent.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{agent.deviceName}</div>
                      <div className="text-sm text-gray-500">{agent.ipAddress}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className="text-gray-600 mr-2">
                          {platformIcons[agent.platform]}
                        </span>
                        <div>
                          <div className="text-gray-900">{platformNames[agent.platform]}</div>
                          <div className="text-sm text-gray-500">{agent.osVersion}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-900">
                      v{agent.agentVersion}
                    </td>
                    <td className="px-6 py-4 text-gray-900">
                      {agent.location?.name || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                        {status.icon}
                        <span className="ml-1 capitalize">{agent.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm">
                      {formatLastSeen(agent.lastSeenAt)}
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                        Manage
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Download Modal */}
      {showDownloadModal && downloadLink && selectedPlatform && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-lg w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Download {platformNames[selectedPlatform]} Agent
            </h2>
            
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center text-green-700 mb-2">
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  <span className="font-medium">Download link ready!</span>
                </div>
                <p className="text-sm text-green-600">
                  Your installation token has been generated. Use it during setup.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Installation Token
                </label>
                <div className="flex items-center">
                  <code className="flex-1 bg-gray-100 px-3 py-2 rounded-l font-mono text-sm overflow-x-auto">
                    {downloadLink.token}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(downloadLink.token)}
                    className="px-3 py-2 bg-gray-200 rounded-r hover:bg-gray-300"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Expires: {new Date(downloadLink.expiresAt).toLocaleString()}
                </p>
              </div>

              <div className="flex space-x-3">
                <a
                  href={downloadLink.url}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 text-center"
                >
                  <ArrowDownTrayIcon className="h-5 w-5 inline mr-2" />
                  Download Agent
                </a>
                <button
                  onClick={() => {
                    setShowDownloadModal(false)
                    setDownloadLink(null)
                  }}
                  className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
