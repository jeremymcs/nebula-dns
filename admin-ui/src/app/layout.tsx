/**
 * Nebula DNS - Admin UI Root Layout
 * Mission Control - Internal Admin Portal
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import type { Metadata } from 'next'
import { Instrument_Serif } from 'next/font/google'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import '@/styles/flux-shield-design-tokens.css'
import './globals.css'
import '@/styles/flux-shield-components.css'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/Toast'
import { PRODUCT_NAME, ADMIN_PORTAL_NAME, adminPortalTitle } from '@/lib/branding'
import { ADMIN_ORIGIN } from '@/lib/public-urls'

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(ADMIN_ORIGIN),
  title: {
    default: adminPortalTitle(),
    template: `%s · ${PRODUCT_NAME} ${ADMIN_PORTAL_NAME}`,
  },
  description: `Internal admin portal for ${PRODUCT_NAME} platform management`,
  applicationName: `${PRODUCT_NAME} ${ADMIN_PORTAL_NAME}`,
  manifest: '/site.webmanifest',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    siteName: `${PRODUCT_NAME} ${ADMIN_PORTAL_NAME}`,
    title: adminPortalTitle(),
    description: `Internal admin portal for ${PRODUCT_NAME}`,
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`h-full ${GeistSans.variable} ${GeistMono.variable} ${instrumentSerif.variable}`}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen h-full font-sans bg-canvas dark:bg-space-950 text-ink transition-colors"
        suppressHydrationWarning
      >
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
