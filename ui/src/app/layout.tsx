/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Root Layout Component
 */

import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { PRODUCT_META_DESCRIPTION, PRODUCT_NAME } from '@/lib/branding'
import { APP_ORIGIN } from '@/lib/public-urls'

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
  metadataBase: new URL(APP_ORIGIN),
  title: {
    default: PRODUCT_NAME,
    template: `%s · ${PRODUCT_NAME}`,
  },
  description: PRODUCT_META_DESCRIPTION,
  applicationName: PRODUCT_NAME,
  manifest: '/site.webmanifest',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: '/favicon.svg',
  },
  openGraph: {
    siteName: PRODUCT_NAME,
    title: PRODUCT_NAME,
    description: PRODUCT_META_DESCRIPTION,
    type: 'website',
    url: APP_ORIGIN,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`h-full ${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="h-full font-sans bg-space-50 dark:bg-space-950 text-space-900 dark:text-space-100 transition-colors" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
