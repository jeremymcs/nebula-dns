// Nebula DNS - Marketing Website Root Layout
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import { APP_URL } from '@/lib/config'

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
  title: 'Nebula DNS — Enterprise DNS Security & Content Filtering',
  description: 'Protect your organization from malware, phishing, and unwanted content at the DNS level. Easy to deploy, powerful to manage.',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark h-full ${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="h-full font-sans bg-space-950 text-white" suppressHydrationWarning>
        <div className="min-h-screen flex flex-col">

          {/* ── Navigation ─────────────────────────────────────────── */}
          <nav className="fixed top-0 w-full z-50 bg-space-950/80 backdrop-blur-xl border-b border-space-800/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">

                {/* Logo */}
                <Link href="/" className="flex items-center gap-2.5 group">
                  <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center shadow-glow group-hover:shadow-glow-lg transition-all">
                    {/* Nebula shield icon */}
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 blur-sm -z-10" />
                  </div>
                  <span className="text-lg font-bold text-white tracking-tight">
                    Nebula<span className="text-gradient ml-0.5">DNS</span>
                  </span>
                </Link>

                {/* Nav Links */}
                <div className="hidden md:flex items-center gap-1">
                  {[
                    { href: '/features', label: 'Features' },
                    { href: '/pricing', label: 'Pricing' },
                    { href: '/enterprise', label: 'Enterprise' },
                    { href: '/docs', label: 'Docs' },
                    { href: '/blog', label: 'Blog' },
                  ].map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className="px-3 py-2 rounded-lg text-sm font-medium text-space-400 hover:text-white hover:bg-space-800/60 transition-all"
                    >
                      {label}
                    </Link>
                  ))}
                </div>

                {/* Auth Buttons */}
                <div className="flex items-center gap-3">
                  <a
                    href={APP_URL}
                    className="text-sm font-medium text-space-400 hover:text-white transition-colors"
                  >
                    Sign In
                  </a>
                  <Link
                    href="/signup"
                    className="btn-primary btn-sm shadow-glow"
                  >
                    Start Free Trial
                  </Link>
                </div>
              </div>
            </div>
          </nav>

          {/* ── Main Content ──────────────────────────────────────── */}
          <main className="flex-1 pt-16">
            {children}
          </main>

          {/* ── Footer ───────────────────────────────────────────── */}
          <footer className="bg-space-900 border-t border-space-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">

              {/* Footer top: brand + columns */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-10 mb-12">

                {/* Brand */}
                <div className="md:col-span-2">
                  <Link href="/" className="flex items-center gap-2.5 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center shadow-glow-sm">
                      <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <span className="text-base font-bold text-white">
                      Nebula<span className="text-gradient">DNS</span>
                    </span>
                  </Link>
                  <p className="text-sm text-space-400 leading-relaxed max-w-xs">
                    Enterprise DNS security and content filtering. Protect your network at the DNS layer — before threats reach your users.
                  </p>
                  {/* Social links */}
                  <div className="flex items-center gap-3 mt-6">
                    {[
                      {
                        label: 'Twitter',
                        icon: <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />,
                      },
                      {
                        label: 'GitHub',
                        icon: <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />,
                      },
                      {
                        label: 'LinkedIn',
                        icon: <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />,
                      },
                    ].map(({ label, icon }) => (
                      <a
                        key={label}
                        href="#"
                        className="h-8 w-8 rounded-lg bg-space-800 border border-space-700 flex items-center justify-center text-space-400 hover:text-white hover:border-space-600 transition-all"
                        aria-label={label}
                      >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">{icon}</svg>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Link Columns */}
                {[
                  {
                    heading: 'Product',
                    links: [
                      { href: '/features', label: 'Features' },
                      { href: '/pricing', label: 'Pricing' },
                      { href: '/security', label: 'Security' },
                      { href: '/enterprise', label: 'Enterprise' },
                      { href: '/status', label: 'Status' },
                    ],
                  },
                  {
                    heading: 'Resources',
                    links: [
                      { href: '/docs', label: 'Documentation' },
                      { href: '/docs/api', label: 'API Reference' },
                      { href: '/docs/guides', label: 'Guides' },
                      { href: '/blog', label: 'Blog' },
                    ],
                  },
                  {
                    heading: 'Company',
                    links: [
                      { href: '/about', label: 'About' },
                      { href: '/careers', label: 'Careers' },
                      { href: '/contact', label: 'Contact' },
                    ],
                  },
                ].map(({ heading, links }) => (
                  <div key={heading}>
                    <h3 className="text-xs font-semibold text-space-500 uppercase tracking-widest mb-4">{heading}</h3>
                    <ul className="space-y-2.5">
                      {links.map(({ href, label }) => (
                        <li key={href}>
                          <Link href={href} className="text-sm text-space-400 hover:text-white transition-colors">
                            {label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Footer bottom */}
              <div className="pt-8 border-t border-space-800 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-sm text-space-500">© 2026 Nebula DNS. All rights reserved.</p>
                <div className="flex items-center gap-6">
                  {[
                    { href: '/privacy', label: 'Privacy' },
                    { href: '/terms', label: 'Terms' },
                    { href: '/sla', label: 'SLA' },
                    { href: '/gdpr', label: 'GDPR' },
                  ].map(({ href, label }) => (
                    <Link key={href} href={href} className="text-sm text-space-500 hover:text-space-300 transition-colors">
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </footer>

        </div>
      </body>
    </html>
  )
}
