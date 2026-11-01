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
import { ThemeToggle, themeInitScript } from '@/components/ThemeToggle'

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
    apple: '/apple-touch-icon.png',
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
  { href: '/#how', label: 'How it works' },
  { href: '/features', label: 'What’s included' },
  { href: '/about', label: 'About Flux Labs' },
  { href: '/blog', label: 'Blog' },
] as const

const footerColumns = [
  {
    title: 'Product',
    links: [
      { href: '/#how', label: 'How it works' },
      { href: '/features', label: 'What’s included' },
      { href: '/enterprise', label: 'Larger organizations' },
      { href: '/msp', label: 'For other MSPs' },
      { href: '/status', label: 'Status' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { href: '/docs', label: 'Docs' },
      { href: '/docs/guides', label: 'Guides' },
      { href: '/docs/api', label: 'API' },
      { href: '/blog', label: 'Blog' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/contact', label: 'Contact' },
      { href: '/careers', label: 'Careers' },
      { href: '/security', label: 'Security' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
      { href: '/gdpr', label: 'GDPR' },
      { href: '/sla', label: 'SLA' },
    ],
  },
] as const

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`h-full ${GeistSans.variable} ${GeistMono.variable} ${instrumentSerif.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="h-full bg-canvas font-sans text-ink antialiased" suppressHydrationWarning>
        <div className="flex min-h-screen flex-col">
          <header className="relative z-10 border-b border-[var(--fs-line)]">
            <nav className="mx-auto flex h-[72px] max-w-[1200px] items-center px-4 sm:px-6">
              <Link
                href="/"
                className="flex shrink-0 items-center gap-2.5 whitespace-nowrap font-semibold tracking-tight text-ink"
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
                <ThemeToggle />
                <a href={APP_URL} className="whitespace-nowrap transition-colors hover:text-ink">
                  Sign in
                </a>
                <Link href="/contact" className="fs-btn fs-btn-primary whitespace-nowrap no-underline">
                  Talk to us
                </Link>
              </div>
            </nav>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-line">
            <div className="mx-auto max-w-[1200px] px-4 pb-10 pt-14 sm:px-6">
              <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
                <div>
                  <Link href="/" className="flex items-center gap-2.5 font-semibold text-ink no-underline">
                    <ShieldMark className="h-[24px] w-[24px] rounded-[7px]" iconClassName="h-3 w-3" />
                    <ProductWordmark className="text-[15px] font-semibold text-ink" accentClassName="text-ink" />
                  </Link>
                  <p className="mt-3 max-w-[260px] text-sm leading-relaxed text-mut">
                    Website and threat filtering for your business, managed by Flux Labs.
                  </p>
                </div>
                {footerColumns.map((column) => (
                  <div key={column.title}>
                    <div className="text-sm font-medium text-ink">{column.title}</div>
                    <ul className="mt-3 space-y-2 text-sm">
                      {column.links.map(({ href, label }) => (
                        <li key={href}>
                          <Link href={href} className="text-mut no-underline transition-colors hover:text-ink">
                            {label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="mt-12 flex flex-col gap-2 border-t border-line pt-6 text-sm text-mut sm:flex-row">
                <span>
                  © {currentCopyrightYear()} {PRODUCT_NAME}
                </span>
                <span className="sm:ml-auto">
                  Built by{' '}
                  <a
                    href={FLUX_LABS_URL}
                    className="font-medium text-[var(--fs-coral)] transition-opacity hover:opacity-80"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {FLUX_LABS_NAME}
                  </a>
                  , a managed service provider in Panama City, Florida
                </span>
              </div>
            </div>
          </footer>
        </div>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
