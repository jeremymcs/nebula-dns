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
  metadataBase: new URL('https://app.nebuladns.io'),
  title: {
    default: 'Nebula DNS',
    template: '%s · Nebula DNS',
  },
  description:
    'Nebula DNS — enterprise DNS security, threat intelligence, and content filtering for your organization.',
  applicationName: 'Nebula DNS',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: '/favicon.svg',
  },
  openGraph: {
    siteName: 'Nebula DNS',
    title: 'Nebula DNS',
    description:
      'Enterprise DNS security and content filtering. Protect your network at the DNS layer.',
    type: 'website',
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
