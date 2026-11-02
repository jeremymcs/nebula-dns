/**
 * Nebula DNS - Client View Layout
 * Shared layout for viewing and managing a specific client
 */

'use client'

import { useParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useMspClient } from '@/hooks/useApi'
import {
  BuildingOffice2Icon,
  ChartBarIcon,
  MapPinIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'

const TABS = [
  { id: 'overview', label: 'Overview', icon: ChartBarIcon, href: '' },
  { id: 'zones', label: 'Zones', icon: MapPinIcon, href: '/zones' },
  { id: 'policies', label: 'Policies', icon: ShieldCheckIcon, href: '/policies' },
  { id: 'users', label: 'Users', icon: UserGroupIcon, href: '/users' },
  { id: 'insights', label: 'Insights', icon: ChartBarIcon, href: '/insights' },
  { id: 'settings', label: 'Settings', icon: Cog6ToothIcon, href: '/settings' },
]

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const pathname = usePathname()
  const clientId = params.id as string
  const { isMsp } = useAuth()
  const { data: client, isLoading } = useMspClient(clientId)

  const basePath = `/dashboard/clients/${clientId}`
  
  const getActiveTab = () => {
    const path = pathname.replace(basePath, '')
    if (path === '' || path === '/') return 'overview'
    if (path.startsWith('/edit')) return 'settings'
    return path.split('/')[1] || 'overview'
  }

  const activeTab = getActiveTab()

  if (!isMsp) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <ShieldCheckIcon className="h-12 w-12 text-space-400 mb-4" />
        <h2 className="text-xl font-semibold text-space-900 dark:text-white mb-2">
          MSP Feature Only
        </h2>
        <p className="text-space-500 dark:text-space-400 max-w-md">
          This feature is only available for MSP accounts.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Client Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/clients"
          className="p-2 rounded-lg bg-space-100 dark:bg-space-800 hover:bg-space-200 dark:hover:bg-space-700 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 text-space-600 dark:text-space-400" />
        </Link>
        <div className="h-12 w-12 rounded-xl bg-success-600 flex items-center justify-center flex-shrink-0">
          <BuildingOffice2Icon className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="h-7 w-48 bg-space-200 dark:bg-space-700 rounded animate-pulse" />
          ) : (
            <>
              <h1 className="text-2xl font-bold text-space-900 dark:text-white truncate">
                {client?.name || 'Client'}
              </h1>
              <p className="text-sm text-space-500 dark:text-space-400">{client?.slug}</p>
            </>
          )}
        </div>
        {client?.status && (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            client.status === 'active' 
              ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300'
              : client.status === 'suspended'
              ? 'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300'
              : 'bg-space-100 dark:bg-space-700 text-space-700 dark:text-space-300'
          }`}>
            {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
          </span>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-space-200 dark:border-space-700">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <Link
                key={tab.id}
                href={`${basePath}${tab.href}`}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-space-500 hover:text-space-700 dark:hover:text-space-300 hover:border-space-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Page Content */}
      {children}
    </div>
  )
}

