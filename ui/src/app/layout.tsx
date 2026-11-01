/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Root Layout Component
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
import { Providers } from './providers'
import { PRODUCT_META_DESCRIPTION, PRODUCT_NAME } from '@/lib/branding'
import { APP_ORIGIN } from '@/lib/public-urls'

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['italic'],
  variable: '--font-instrument-serif',
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
    <html
      lang="en"
      className={`h-full ${GeistSans.variable} ${GeistMono.variable} ${instrumentSerif.variable}`}
      suppressHydrationWarning
    >
      <body className="h-full font-sans bg-canvas dark:bg-space-950 text-ink transition-colors" suppressHydrationWarning>
        <Providers>{children}</Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
