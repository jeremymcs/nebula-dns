/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Mission Control Layout - Full-screen immersive layout
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import { FullPageLoading } from '@/components/LoadingSpinner'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowsRightLeftIcon } from '@heroicons/react/24/outline'
import { CommandBarProvider } from '@/components/command-bar'
import { OrionFAB } from '@/components/orion'

export default function MissionControlLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isImpersonating, setIsImpersonating] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
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

        {/* Full-screen content area - no max-width or padding constraints */}
        <main className="pb-20 lg:pb-0">
          {children}
        </main>

        <MobileNav />

        {/* Orion AI Assistant FAB */}
        <OrionFAB />
      </div>
    </CommandBarProvider>
  )
}
