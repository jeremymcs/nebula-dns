// Flux Shield - Marketing Website Root Layout
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import { GeistMono } from 'geist/font/mono'
import Link from 'next/link'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'
import { APP_URL, SITE_URL } from '@/lib/config'
import {
  currentCopyrightYear,
  FLUX_LABS_NAME,
  FLUX_LABS_PHONE,
  FLUX_LABS_PHONE_HREF,
  FLUX_LABS_URL,
  PRODUCT_META_DESCRIPTION,
  PRODUCT_NAME,
} from '@/lib/branding'
import { ProductWordmark } from '@/components/ProductWordmark'
import { ShieldMark } from '@/components/ShieldMark'
import { ThemeToggle, themeInitScript } from '@/components/ThemeToggle'
import { SUPPORT_EMAIL } from '@/lib/contact-emails'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-poppins',
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
  { href: '/pricing', label: 'Pricing' },
  { href: '/msp', label: 'For MSPs' },
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
] as const

const doors = [
  {
    href: '/contact',
    external: false,
    title: 'Talk to Flux Labs',
    body: 'A 15-minute call about your offices, your team and what worries you.',
    action: 'Pick a time',
  },
  {
    href: `mailto:${SUPPORT_EMAIL}`,
    external: true,
    title: 'Something’s blocked',
    body: 'Already a client? Email our help desk and a technician will take a look.',
    action: 'Get support',
  },
  {
    href: APP_URL,
    external: true,
    title: 'Sign in',
    body: 'See your query logs, reports and security score any time.',
    action: 'Open the dashboard',
  },
] as const

const footerColumns = [
  {
    title: 'Product',
    links: [
      { href: '/#how', label: 'How it works' },
      { href: '/features', label: 'What’s included' },
      { href: '/pricing', label: 'Pricing' },
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
    <html lang="en" className={`h-full ${poppins.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="h-full bg-canvas font-sans text-txt antialiased" suppressHydrationWarning>
        <div className="flex min-h-screen flex-col">
          <div className="fx-band text-[13px] text-[var(--fx-navy-text)]">
            <div className="mx-auto flex h-10 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
              <a
                href={FLUX_LABS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--fx-navy-text)] no-underline transition-colors hover:text-white"
              >
                A {FLUX_LABS_NAME} managed service ↗
              </a>
              <div className="flex items-center gap-4">
                <a href={FLUX_LABS_PHONE_HREF} className="hidden font-medium text-white no-underline sm:inline">
                  {FLUX_LABS_PHONE}
                </a>
                <Link
                  href="/contact"
                  className="fx-btn-grad rounded-full px-3.5 py-1 text-[13px] font-semibold no-underline"
                >
                  Contact us
                </Link>
              </div>
            </div>
          </div>

          <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur">
            <nav className="mx-auto flex h-[72px] max-w-[1200px] items-center px-4 sm:px-6" aria-label="Main">
              <Link
                href="/"
                className="flex shrink-0 items-center gap-2.5 whitespace-nowrap no-underline"
                aria-label={PRODUCT_NAME}
              >
                <ShieldMark className="h-[30px] w-[30px]" />
                <ProductWordmark
                  className="text-[19px] font-semibold tracking-[-0.3px] text-ink"
                  accentClassName="text-[#4B7CBB] dark:text-[#7DC8E5]"
                />
              </Link>

              <div className="ml-auto hidden items-center gap-7 text-sm font-medium text-ink lg:flex">
                {navLinks.map(({ href, label }) => (
                  <Link key={href} href={href} className="no-underline transition-colors hover:text-[var(--fx-coral)]">
                    {label}
                  </Link>
                ))}
              </div>

              <div className="ml-auto flex items-center gap-4 text-sm font-medium text-ink lg:ml-7">
                <a href={APP_URL} className="whitespace-nowrap no-underline transition-colors hover:text-[var(--fx-coral)]">
                  Sign in
                </a>
                <ThemeToggle />
                <details className="group relative lg:hidden">
                  <summary
                    className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-line [&::-webkit-details-marker]:hidden"
                    aria-label="Menu"
                  >
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                      <path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round" />
                    </svg>
                  </summary>
                  <div className="absolute right-0 top-11 w-56 rounded-2xl border border-line bg-panel p-2 shadow-[0_20px_40px_-20px_rgba(15,31,66,0.35)]">
                    {navLinks.map(({ href, label }) => (
                      <Link key={href} href={href} className="block rounded-xl px-3 py-2.5 text-[15px] text-ink no-underline hover:bg-surface">
                        {label}
                      </Link>
                    ))}
                  </div>
                </details>
              </div>
            </nav>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="fx-band text-[var(--fx-navy-text)]">
            <div className="mx-auto max-w-[1200px] px-4 pb-10 pt-16 sm:px-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-[13px] font-semibold uppercase tracking-[1.5px] text-[var(--fx-amber)]">
                    How can we help?
                  </div>
                  <h2 className="mt-2 text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-[-0.8px] text-white">
                    Pick a door. A real person answers.
                  </h2>
                </div>
                <a href={FLUX_LABS_PHONE_HREF} className="font-semibold text-white no-underline">
                  {FLUX_LABS_PHONE}
                </a>
              </div>

              <div className="mt-7 grid gap-4 md:grid-cols-3">
                {doors.map((door) => {
                  const inner = (
                    <>
                      <div className="text-[17px] font-semibold text-white">{door.title}</div>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--fx-navy-text)]">{door.body}</p>
                      <div className="mt-4 text-sm font-semibold text-[var(--fx-amber)]">{door.action} →</div>
                    </>
                  )
                  const cls =
                    'block rounded-2xl border border-[var(--fx-navy-line)] bg-[var(--fx-navy-800)] p-6 no-underline transition-colors hover:border-[var(--fx-amber)]'
                  return door.external ? (
                    <a key={door.title} href={door.href} className={cls}>
                      {inner}
                    </a>
                  ) : (
                    <Link key={door.title} href={door.href} className={cls}>
                      {inner}
                    </Link>
                  )
                })}
              </div>

              <div className="mt-14 grid gap-10 border-t border-[var(--fx-navy-line)] pt-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
                <div>
                  <Link href="/" className="flex items-center gap-2.5 no-underline">
                    <ShieldMark className="h-[28px] w-[28px]" ringColor="#0F1F42" />
                    <ProductWordmark className="text-[17px] font-semibold text-white" accentClassName="text-[#7DC8E5]" />
                  </Link>
                  <p className="mt-3 max-w-[260px] text-sm leading-relaxed">
                    DNS security from {FLUX_LABS_NAME}, managed from Panama City across the Panhandle.
                  </p>
                </div>
                {footerColumns.map((column) => (
                  <div key={column.title}>
                    <div className="text-sm font-semibold text-white">{column.title}</div>
                    <ul className="mt-3 space-y-2 text-sm">
                      {column.links.map(({ href, label }) => (
                        <li key={href}>
                          <Link href={href} className="text-[var(--fx-navy-text)] no-underline transition-colors hover:text-white">
                            {label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="mt-12 flex flex-col gap-2 border-t border-[var(--fx-navy-line)] pt-6 text-[13px] text-[#A7B2C7] sm:flex-row">
                <span>
                  © {currentCopyrightYear()} {FLUX_LABS_NAME}
                </span>
                <span className="sm:ml-auto">
                  {PRODUCT_NAME} is built and run by{' '}
                  <a
                    href={FLUX_LABS_URL}
                    className="font-medium text-[var(--fx-coral)] no-underline transition-opacity hover:opacity-80"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {FLUX_LABS_NAME}
                  </a>
                  , Panama City, Florida
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
