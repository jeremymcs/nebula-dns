/**
 * Nebula DNS - Dashboard Layout Component
 * Cosmic Security Theme - Top Navigation Layout with Command Bar and Orion AI
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { TopNav } from './TopNav'
import { MobileNav } from './MobileNav'
import { FullPageLoading } from '@/components/LoadingSpinner'
import { useAuth } from '@/contexts/AuthContext'
import { CommandBarProvider } from '@/components/command-bar'
import { OrionFAB } from '@/components/orion'
import { ErrorBoundary } from '@/components/ErrorBoundary'
// US-027, US-028: Subscription status components
import { GracePeriodBanner } from '@/components/banners/GracePeriodBanner'
import { SuspendedBanner } from '@/components/banners/SuspendedBanner'
import { ImpersonationBanner } from '@/components/banners/ImpersonationBanner'
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus'
import { useImpersonation } from '@/hooks/useImpersonation'

function Breadcrumbs() {
  const pathname = usePathname()
  const { tier } = useAuth()
  const segments = pathname?.split('/').filter(Boolean) || []

  if (segments.length <= 1) return null

  // Breadcrumb mapping - adjust for tier
  // mission-control removed - admin functionality moved to separate admin-ui app (port 4012)
  const getBreadcrumbLabel = (segment: string): string => {
    const labels: Record<string, string> = {
      dashboard: 'Dashboard',
      home: 'Home',
      policies: 'Policies',
      locations: tier === 'home' ? 'Networks' : 'Locations',
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
      family: 'Family Mode',
      msp: 'MSP',
      templates: 'Templates',
      playbooks: 'Playbooks',
      insights: 'AI Insights',
      investigate: 'Investigate',
    }
    return labels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
  }

  return (
    <nav className="flex items-center gap-2 text-sm mb-4">
      {segments.map((segment, index) => {
        const href = '/' + segments.slice(0, index + 1).join('/')
        const isLast = index === segments.length - 1
        const label = getBreadcrumbLabel(segment)

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

  // US-027, US-028: Fetch subscription status for banners
  const { gracePeriodInfo, subscriptionStatus } = useSubscriptionStatus()

  // Impersonation state management via hook
  const { impersonationInfo, isImpersonating, endImpersonation } = useImpersonation()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [loading, user, router])

  if (loading) {
    return <FullPageLoading />
  }

  if (!user) {
    return <FullPageLoading />
  }

  // US-028: Show full-page suspended state if subscription is suspended
  if (subscriptionStatus?.status === 'suspended') {
    return (
      <SuspendedBanner
        isFullPage
        suspendedInfo={{
          mspName: gracePeriodInfo?.mspName,
          mspContactEmail: gracePeriodInfo?.mspContactEmail,
          mspSupportUrl: gracePeriodInfo?.mspSupportUrl,
        }}
      />
    )
  }

  return (
    <ErrorBoundary name="AppLayout" showReload>
      <CommandBarProvider>
        <div className="min-h-screen bg-space-50 dark:bg-space-950">
          {/* US-028: Grace Period Warning Banner */}
          {gracePeriodInfo?.subscriptionStatus === 'grace' && gracePeriodInfo.daysRemaining !== null && (
            <GracePeriodBanner
              gracePeriodInfo={{
                daysRemaining: gracePeriodInfo.daysRemaining,
                mspName: gracePeriodInfo.mspName,
                mspContactEmail: gracePeriodInfo.mspContactEmail,
              }}
            />
          )}

          {/* Impersonation Banner - shown when admin is viewing as tenant */}
          {isImpersonating && impersonationInfo && (
            <ImpersonationBanner
              impersonationInfo={impersonationInfo}
              onEndImpersonation={endImpersonation}
            />
          )}

          <ErrorBoundary name="TopNav">
            <TopNav />
          </ErrorBoundary>

          <main className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 pt-8 pb-20 lg:pb-12">
            {showBreadcrumbs && <Breadcrumbs />}
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <ErrorBoundary name="PageContent">
                  {children}
                </ErrorBoundary>
              </motion.div>
            </AnimatePresence>
          </main>

          <ErrorBoundary name="MobileNav">
            <MobileNav />
          </ErrorBoundary>

          {/* Orion AI Assistant FAB */}
          <ErrorBoundary name="OrionFAB">
            <OrionFAB />
          </ErrorBoundary>
        </div>
      </CommandBarProvider>
    </ErrorBoundary>
  )
}

