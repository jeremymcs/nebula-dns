/**
 * Nebula DNS - Admin UI Root Layout
 * Mission Control - Internal Admin Portal
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/Toast'
import { PRODUCT_NAME, ADMIN_PORTAL_NAME, adminPortalTitle } from '@/lib/branding'
import { ADMIN_ORIGIN } from '@/lib/public-urls'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
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
    apple: '/favicon.svg',
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans bg-space-50 dark:bg-space-950 text-space-900 dark:text-space-100 min-h-screen`}
      >
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
