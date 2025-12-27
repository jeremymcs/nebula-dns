/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Client-only Providers Component
 * This is dynamically imported to prevent SSR hydration mismatches
 */

'use client'

import { ReactNode } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ToastProvider } from '@/components/Toast'
import { PartnerBrandingProvider } from '@/contexts/PartnerBrandingContext'

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PartnerBrandingProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </PartnerBrandingProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

