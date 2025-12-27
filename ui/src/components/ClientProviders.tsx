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
import { CommandBarProvider } from '@/components/command-bar'

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PartnerBrandingProvider>
          <CommandBarProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </CommandBarProvider>
        </PartnerBrandingProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

