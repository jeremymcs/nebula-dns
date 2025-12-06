/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Dashboard Layout Component
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { FullPageLoading } from '@/components/LoadingSpinner'
import { useAuth } from '@/contexts/AuthContext'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [loading, user, router])

  // Show loading spinner while checking auth
  if (loading) {
    return <FullPageLoading />
  }

  // Don't render dashboard if not authenticated
  if (!user) {
    return <FullPageLoading />
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="py-6">
          {children}
        </div>
      </main>
    </div>
  )
}

