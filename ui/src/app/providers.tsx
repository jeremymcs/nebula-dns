/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Client-side Providers - wrapped with dynamic import to prevent SSR
 */

'use client'

import dynamic from 'next/dynamic'
import { ReactNode } from 'react'

// Dynamically import providers with SSR disabled to prevent hydration mismatch
const ClientProviders = dynamic(
  () => import('@/components/ClientProviders').then((mod) => mod.ClientProviders),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }
)

export function Providers({ children }: { children: ReactNode }) {
  return <ClientProviders>{children}</ClientProviders>
}
