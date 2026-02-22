/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Client-only Providers Component
 * This is dynamically imported to prevent SSR hydration mismatches
 * Updated to remove partner branding (US-022, US-023)
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { ReactNode } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ToastProvider } from '@/components/Toast'
// PartnerBrandingProvider removed - using unified tier system (US-022, US-023)
// Branding is now handled at the tenant level via settings
// AdminAuthProvider removed - admin functionality moved to admin-ui app (port 4012)
import { CommandBarProvider } from '@/components/command-bar'

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CommandBarProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </CommandBarProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
