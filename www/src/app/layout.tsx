// Flux Shield - Marketing Website Root Layout
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import type { Metadata } from 'next'
import { Instrument_Serif } from 'next/font/google'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import Link from 'next/link'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'
import { APP_URL, SITE_URL } from '@/lib/config'
import {
  currentCopyrightYear,
  FLUX_LABS_NAME,
  FLUX_LABS_URL,
  PRODUCT_META_DESCRIPTION,
  PRODUCT_NAME,
} from '@/lib/branding'
import { ProductWordmark } from '@/components/ProductWordmark'
import { ShieldMark } from '@/components/ShieldMark'

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: PRODUCT_NAME,
    template: `%s · ${PRODUCT_NAME}`,
  },
  description: PRODUCT_META_DESCRIPTION,
  applicationName: PRODUCT_NAME,
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: '/favicon.svg',
  },
  openGraph: {
    siteName: PRODUCT_NAME,
    title: PRODUCT_NAME,
    description: PRODUCT_META_DESCRIPTION,
    type: 'website',
    url: SITE_URL,
  },
}

const navLinks = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/enterprise', label: 'Enterprise' },
  { href: '/docs', label: 'Docs' },
  { href: '/blog', label: 'Blog' },
] as const

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`h-full ${GeistSans.variable} ${GeistMono.variable} ${instrumentSerif.variable}`}
      suppressHydrationWarning
    >
      <body className="h-full bg-canvas font-sans text-ink antialiased" suppressHydrationWarning>
        <div className="flex min-h-screen flex-col">
          <header className="relative z-10 border-b border-[var(--fs-line)]">
            <nav className="mx-auto flex h-[72px] max-w-[1200px] items-center px-4 sm:px-6">
              <Link
                href="/"
                className="flex items-center gap-2.5 font-semibold tracking-tight text-ink"
                aria-label={PRODUCT_NAME}
              >
                <ShieldMark className="h-[26px] w-[26px] rounded-[7px]" iconClassName="h-3.5 w-3.5" />
                <ProductWordmark
                  className="text-base font-semibold text-ink"
                  accentClassName="text-ink"
                />
              </Link>

              <div className="ml-14 hidden items-center gap-8 text-sm text-[var(--fs-txt)] md:flex">
                {navLinks.map(({ href, label }) => (
                  <Link key={href} href={href} className="transition-colors hover:text-ink">
                    {label}
                  </Link>
                ))}
              </div>

              <div className="ml-auto flex items-center gap-[18px] text-sm text-[var(--fs-txt)]">
                <a href={APP_URL} className="transition-colors hover:text-ink">
                  Sign in
                </a>
                <Link href="/signup" className="fs-btn fs-btn-primary no-underline">
                  Start free trial
                </Link>
              </div>
            </nav>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-[var(--fs-line)]">
            <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-4 py-14 text-sm text-[var(--fs-mut)] sm:flex-row sm:px-6">
              <span>
                © {currentCopyrightYear()} {PRODUCT_NAME}
              </span>
              <span className="sm:ml-auto">
                Powered by{' '}
                <a
                  href={FLUX_LABS_URL}
                  className="font-medium text-[var(--fs-coral)] transition-opacity hover:opacity-80"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {FLUX_LABS_NAME}
                </a>
              </span>
            </div>
          </footer>
        </div>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
