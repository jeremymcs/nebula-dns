// Flux Shield - Documentation Hub
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import Link from 'next/link'
import { MarketingPageShell, MarketingCard } from '@/components/marketing/MarketingPageShell'
import { MarketingPageHero, MarketingSerifAccent } from '@/components/marketing/MarketingPageHero'
import { MarketingCtaBand } from '@/components/marketing/MarketingCtaBand'

export default function DocsPage() {
  const mainCategories = [
    {
      title: 'Getting Started',
      description: 'Step-by-step tutorials to get up and running with Flux Shield in minutes.',
      href: '/docs/guides',
      icon: (
        <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      ),
      topics: ['Quick Start', 'DNS Setup', 'Policy Configuration', 'Client Agents', 'Troubleshooting'],
      accentColor: 'from-primary-600 to-primary-500',
      dotColor: 'bg-primary-500',
      linkColor: 'text-primary-400 hover:text-primary-300',
    },
    {
      title: 'API Reference',
      description: 'Complete REST API documentation with examples and an interactive playground.',
      href: '/docs/api',
      icon: (
        <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
        </svg>
      ),
      topics: ['Authentication', 'Policies API', 'Reports API', 'Webhooks', 'Rate Limits'],
      accentColor: 'from-accent-600 to-accent-500',
      dotColor: 'bg-accent-500',
      linkColor: 'text-accent-400 hover:text-accent-300',
    },
    {
      title: 'Guides & Articles',
      description: 'Technical articles, security insights, and product updates from our team.',
      href: '/blog',
      icon: (
        <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
        </svg>
      ),
      topics: ['DNS Security', 'Best Practices', 'Case Studies', 'Release Notes', 'Industry News'],
      accentColor: 'from-primary-600 to-accent-500',
      dotColor: 'bg-accent-500',
      linkColor: 'text-primary-400 hover:text-primary-300',
    },
  ]

  const quickLinks = [
    { title: 'Setup DNS Resolvers', href: '/docs/guides/setup-dns', icon: '🔧' },
    { title: 'Create Your First Policy', href: '/docs/guides/policies', icon: '🛡' },
    { title: 'Configure Block Pages', href: '/docs/guides/block-pages', icon: '🚫' },
    { title: 'View Reports & Analytics', href: '/docs/guides/reports', icon: '📊' },
    { title: 'Install Client Agents', href: '/docs/guides/agents', icon: '💻' },
    { title: 'SSO Integration', href: '/docs/guides/sso', icon: '🔐' },
    { title: 'API Authentication', href: '/docs/api#authentication', icon: '🔑' },
    { title: 'Webhook Setup', href: '/docs/api#webhooks', icon: '🔗' },
  ]

  const popularTopics = [
    {
      category: 'Security',
      icon: (
        <svg className="h-5 w-5 text-danger-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
      links: [
        { title: 'Threat Intelligence Feeds', href: '/docs/security/threat-feeds' },
        { title: 'Custom Block Lists', href: '/docs/security/block-lists' },
        { title: 'Allow Lists & Exceptions', href: '/docs/security/allow-lists' },
      ],
    },
    {
      category: 'Advanced',
      icon: (
        <svg className="h-5 w-5 text-accent-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
        </svg>
      ),
      links: [
        { title: 'DNS-over-HTTPS (DoH)', href: '/docs/advanced/doh' },
        { title: 'DNS-over-TLS (DoT)', href: '/docs/advanced/dot' },
        { title: 'SIEM Integration', href: '/docs/advanced/siem' },
      ],
    },
    {
      category: 'Account',
      icon: (
        <svg className="h-5 w-5 text-primary-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
      links: [
        { title: 'Multi-Factor Authentication', href: '/docs/account/mfa' },
        { title: 'Team Management', href: '/docs/account/teams' },
        { title: 'Billing & Subscriptions', href: '/docs/account/billing' },
      ],
    },
  ]

  const whatsNew = [
    { version: 'v1.3', title: 'Enhanced Analytics Dashboard', detail: 'New visualizations and custom date ranges' },
    { version: 'v1.2', title: 'API Rate Limit Improvements', detail: 'Higher limits for enterprise customers' },
    { version: 'v1.1', title: 'SSO/SAML Integration', detail: 'Enterprise identity provider support' },
  ]

  return (
    <MarketingPageShell>
      <MarketingPageHero
        eyebrow="Documentation"
        title={
          <>
            <MarketingSerifAccent>Everything</MarketingSerifAccent> You Need to Get Started
          </>
        }
        lede="Guides, API references, and tutorials to help you configure policies, integrate with your infrastructure, and get the most out of Flux Shield."
      >
        <div className="mx-auto mt-2 w-full max-w-2xl text-left sm:text-center">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <svg className="h-5 w-5 text-[var(--fs-mut)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search documentation..."
              className="fs-input pl-12 pr-16"
            />
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
              <kbd className="hidden rounded border border-[var(--fs-line)] bg-[var(--fs-surface)] px-2 py-1 font-mono text-xs text-[var(--fs-mut)] sm:inline-flex">
                ⌘K
              </kbd>
            </div>
          </div>
        </div>
      </MarketingPageHero>

      {/* Main Category Cards */}
      <div className="section-container py-16">
        <div className="grid lg:grid-cols-3 gap-6">
          {mainCategories.map((category, index) => (
            <Link
              key={index}
              href={category.href}
              className="fs-card rounded-[14px] p-8 hover:border-primary-700/50 transition-all group flex flex-col"
            >
              <div className={`h-16 w-16 rounded-xl bg-gradient-to-br ${category.accentColor} flex items-center justify-center text-white mb-6 group-hover:scale-105 transition-transform`}>
                {category.icon}
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                {category.title}
              </h3>
              <p className="text-[var(--fs-txt)] mb-6 leading-relaxed flex-1">
                {category.description}
              </p>
              <ul className="space-y-2 mb-6">
                {category.topics.map((topic, topicIndex) => (
                  <li key={topicIndex} className="flex items-center text-sm text-[var(--fs-txt)]">
                    <span className={`h-1.5 w-1.5 ${category.dotColor} rounded-full mr-3 flex-shrink-0`}></span>
                    {topic}
                  </li>
                ))}
              </ul>
              <div className={`flex items-center gap-2 font-medium text-sm ${category.linkColor} group-hover:translate-x-1 transition-transform`}>
                View docs
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Links Grid */}
      <div className="border-t border-space-800/50 py-16">
        <div className="section-container">
          <div className="text-center mb-10">
            <p className="fs-eyebrow mb-3">QUICK ACCESS</p>
            <h2 className="text-3xl font-bold text-white mb-3">
              Popular Topics
            </h2>
            <p className="text-[var(--fs-txt)]">
              Jump directly to the most commonly accessed documentation.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {quickLinks.map((link, index) => (
              <Link
                key={index}
                href={link.href}
                className="fs-card rounded-[14px] px-4 py-4 hover:border-primary-700/50 transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg" aria-hidden="true">{link.icon}</span>
                  <span className="text-[var(--fs-txt)] text-sm font-medium group-hover:text-white transition-colors">
                    {link.title}
                  </span>
                </div>
                <svg className="h-4 w-4 text-[var(--fs-mut)] group-hover:text-primary-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* What's New + Popular Topics */}
      <div className="section-container py-16">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* What's New */}
          <div className="fs-card rounded-[14px] p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center text-white">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white">What&apos;s New</h3>
            </div>
            <ul className="space-y-5">
              {whatsNew.map((item, i) => (
                <li key={i} className="flex items-start gap-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-900/50 text-success-300 border border-success-800/50 flex-shrink-0 mt-0.5">
                    {item.version}
                  </span>
                  <div>
                    <div className="font-medium text-white text-sm">{item.title}</div>
                    <div className="text-[var(--fs-mut)] text-sm mt-0.5">{item.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
            <Link
              href="/blog/releases"
              className="mt-8 inline-flex items-center gap-1 text-primary-400 hover:text-primary-300 font-medium text-sm transition-colors"
            >
              View all releases
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>

          {/* Popular Topics by Category */}
          <div className="fs-card rounded-[14px] p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-accent-600 to-accent-500 flex items-center justify-center text-white">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white">Browse by Topic</h3>
            </div>
            <div className="space-y-6">
              {popularTopics.map((topic, index) => (
                <div key={index}>
                  <div className="flex items-center gap-2 mb-3">
                    {topic.icon}
                    <span className="text-white font-medium text-sm">{topic.category}</span>
                  </div>
                  <ul className="space-y-2 pl-7">
                    {topic.links.map((link, linkIndex) => (
                      <li key={linkIndex}>
                        <Link
                          href={link.href}
                          className="text-[var(--fs-txt)] hover:text-primary-400 text-sm flex items-center gap-1.5 group transition-colors"
                        >
                          <svg className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                          </svg>
                          {link.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Help CTA */}
      <div className="section-container pb-24">
        <div className="fs-card rounded-[14px] p-10 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">
            Can&apos;t Find What You&apos;re Looking For?
          </h2>
          <p className="text-[var(--fs-txt)] mb-8 max-w-xl mx-auto">
            Our support team is here to help. Reach out with your questions or browse the
            community forum for answers from other users.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/contact?subject=documentation-help"
              className="fs-btn fs-btn-primary fs-btn-lg no-underline px-6 py-3 transition-all inline-flex items-center gap-2 justify-center"
            >
              Contact Support
            </Link>
            <Link
              href="/community"
              className="fs-btn rounded-[10px] px-6 py-3 transition-all inline-flex items-center gap-2 justify-center"
            >
              Visit Community Forum
            </Link>
          </div>
        </div>
      </div>
    </MarketingPageShell>
  )
}
