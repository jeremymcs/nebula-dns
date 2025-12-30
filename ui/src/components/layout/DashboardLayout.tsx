/**
 * Nebula DNS - Dashboard Layout Component
 * Cosmic Security Theme - Top Navigation Layout with Command Bar and Orion AI
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { TopNav } from './TopNav'
import { MobileNav } from './MobileNav'
import { FullPageLoading } from '@/components/LoadingSpinner'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowsRightLeftIcon } from '@heroicons/react/24/outline'
import { CommandBarProvider } from '@/components/command-bar'
import { OrionFAB } from '@/components/orion'

// Breadcrumb mapping
const breadcrumbLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  policies: 'Policies',
  locations: 'Locations',
  lists: 'Custom Lists',
  'block-pages': 'Block Pages',
  agents: 'Agents',
  logs: 'Query Logs',
  reports: 'Reports',
  users: 'Users',
  settings: 'Settings',
  security: 'Security',
  sso: 'SSO',
  'api-keys': 'API Keys',
  scheduled: 'Scheduled',
  onboarding: 'Onboarding',
  clients: 'Clients',
  billing: 'Billing',
}

function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname?.split('/').filter(Boolean) || []

  if (segments.length <= 1) return null

  return (
    <nav className="flex items-center gap-2 text-sm mb-4">
      {segments.map((segment, index) => {
        const href = '/' + segments.slice(0, index + 1).join('/')
        const isLast = index === segments.length - 1
        const label = breadcrumbLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)

        return (
          <span key={segment} className="flex items-center gap-2">
            {index > 0 && (
              <svg className="h-4 w-4 text-space-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            {isLast ? (
              <span className="text-space-900 dark:text-white font-medium">{label}</span>
            ) : (
              <a
                href={href}
                className="text-space-500 dark:text-space-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                {label}
              </a>
            )}
          </span>
        )
      })}
    </nav>
  )
}

interface DashboardLayoutProps {
  children: React.ReactNode
  showBreadcrumbs?: boolean
}

export function DashboardLayout({ children, showBreadcrumbs = true }: DashboardLayoutProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isImpersonating, setIsImpersonating] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
    // Check if we're in impersonation mode
    setIsImpersonating(localStorage.getItem('impersonating') === 'true')
  }, [loading, user, router])

  const exitImpersonation = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('impersonating')
    window.location.href = '/partner/dashboard'
  }

  if (loading) {
    return <FullPageLoading />
  }

  if (!user) {
    return <FullPageLoading />
  }

  return (
    <CommandBarProvider>
      <div className="min-h-screen bg-space-50 dark:bg-space-950">
        {/* Impersonation Banner */}
        {isImpersonating && (
          <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between">
            <span className="text-sm font-medium">
              <ArrowsRightLeftIcon className="h-4 w-4 inline mr-2" />
              You are viewing this organization as a partner admin
            </span>
            <button
              onClick={exitImpersonation}
              className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition-colors"
            >
              Return to Partner Portal
            </button>
          </div>
        )}
        <TopNav />

        <main className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 pt-4 pb-20 lg:pb-6">
          {showBreadcrumbs && <Breadcrumbs />}
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        <MobileNav />

        {/* Orion AI Assistant FAB */}
        <OrionFAB />
      </div>
    </CommandBarProvider>
  )
}

