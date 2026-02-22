// Nebula DNS - Features Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import Link from 'next/link'

const features = [
  {
    name: 'DNS Security',
    description: 'Block malware, ransomware, phishing, and botnets at the DNS level before they reach your network. Real-time threat intelligence from multiple sources keeps you protected 24/7.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    accent: 'purple',
  },
  {
    name: 'Content Filtering',
    description: 'Control access to inappropriate content with 20+ categories including adult content, gambling, social media, and more. Perfect for businesses, schools, and families.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
    accent: 'cyan',
  },
  {
    name: 'Multi-Location Support',
    description: 'Manage DNS policies across unlimited office locations, branches, remote workers, or networks from a single unified dashboard. Each location can have its own policy.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    accent: 'purple',
  },
  {
    name: 'Real-Time Analytics',
    description: 'Powerful analytics dashboard with detailed reports, query logs, threat insights, and trend analysis. See exactly what\'s happening on your network in real-time.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    accent: 'cyan',
  },
  {
    name: 'Custom Lists',
    description: 'Create custom allowlists and blocklists with thousands of domains. Import bulk lists, use regex patterns, and manage exceptions with ease.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    accent: 'purple',
  },
  {
    name: 'SafeSearch Enforcement',
    description: 'Automatically enforce SafeSearch on Google, Bing, YouTube, DuckDuckGo, and other search engines. Prevent inappropriate content in search results.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    accent: 'cyan',
  },
  {
    name: 'API Access',
    description: 'Full-featured REST API for automation and integration. Programmatically manage policies, query logs, and integrate with your existing security tools.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    accent: 'purple',
  },
  {
    name: 'Automated Playbooks',
    description: 'Create automated responses to threats and security events. Schedule policy changes, generate reports, and trigger webhooks based on DNS activity.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    accent: 'cyan',
  },
]

const steps = [
  {
    number: '01',
    title: 'Configure Your Policies',
    description: 'Set up DNS security policies, content filtering rules, and custom lists through our intuitive dashboard. Define what should be blocked or allowed.',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Deploy Across Locations',
    description: 'Point your network DNS to Nebula DNS servers or deploy our lightweight agents. Changes take effect instantly across all your locations.',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Monitor & Analyze',
    description: 'Watch real-time analytics, review threat reports, and investigate DNS queries. Continuously optimize your security posture based on insights.',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
]

const stats = [
  { label: 'Avg Response Time', value: '<50ms' },
  { label: 'Uptime SLA', value: '99.99%' },
  { label: 'Daily Queries', value: '1B+' },
  { label: 'Threats Blocked', value: '10M+' },
]

export default function FeaturesPage() {
  return (
    <div className="bg-space-950">

      {/* Hero Section */}
      <section className="py-24 bg-space-950 relative overflow-hidden">
        {/* Nebula orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-primary-400 text-xs font-semibold tracking-widest uppercase mb-4">
            Platform Overview
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight">
            Powerful DNS Security{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400">
              Features
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-space-400 max-w-3xl mx-auto">
            Everything you need to protect your organization from malware, phishing, and unwanted content.
            Enterprise-grade security that&apos;s simple to deploy and manage.
          </p>
          <div className="mt-10">
            <Link
              href="/signup"
              className="bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-glow hover:shadow-glow-lg rounded-xl font-semibold px-6 py-3 transition-all inline-flex items-center gap-2"
            >
              Start Free Trial
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-space-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-primary-400 text-xs font-semibold tracking-widest uppercase mb-3">
              What We Offer
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Everything You Need to Stay Protected
            </h2>
            <p className="mt-4 text-space-400 max-w-2xl mx-auto">
              A comprehensive suite of DNS security tools built for organizations of every size.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.name}
                className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6 hover:border-primary-700/50 transition-all"
              >
                {feature.accent === 'purple' ? (
                  <div className="h-12 w-12 rounded-xl bg-primary-900/50 border border-primary-800/50 flex items-center justify-center text-primary-400 mb-4">
                    {feature.icon}
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-accent-900/50 border border-accent-800/50 flex items-center justify-center text-accent-400 mb-4">
                    {feature.icon}
                  </div>
                )}
                <h3 className="text-lg font-semibold text-white mb-3">
                  {feature.name}
                </h3>
                <p className="text-space-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-space-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-primary-400 text-xs font-semibold tracking-widest uppercase mb-3">
              Simple Setup
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              How It Works
            </h2>
            <p className="mt-4 text-space-400 max-w-2xl mx-auto">
              Get started with Nebula DNS in three simple steps. No complex setup required.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-gradient-to-r from-primary-700/50 to-accent-700/50" />
                )}
                <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary-600 to-accent-600 text-white font-bold text-xl mb-6">
                    {step.number}
                  </div>
                  <div className="mb-4 text-primary-400">
                    {step.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-space-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Performance Stats */}
      <section className="py-24 bg-space-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-primary-400 text-xs font-semibold tracking-widest uppercase mb-3">
              By the Numbers
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Built for Performance at Scale
            </h2>
            <p className="mt-4 text-space-400 max-w-2xl mx-auto">
              Global anycast infrastructure delivering sub-50ms responses and 99.99% uptime.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6 text-center"
              >
                <div className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400 mb-2">
                  {stat.value}
                </div>
                <div className="text-space-400 text-sm">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Performance feature list */}
          <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-8">
            <h3 className="text-xl font-bold text-white mb-6 text-center">
              Enterprise-Grade Infrastructure
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                'Global anycast network with 100+ locations',
                'Sub-50ms average response time',
                '99.99% uptime SLA with guaranteed credits',
                'Automatic failover and load balancing',
                'DNSSEC validation for enhanced security',
                'DNS over HTTPS (DoH) and DNS over TLS (DoT)',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <svg
                    className="h-5 w-5 text-success-400 flex-shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-space-400 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-space-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-10 text-center">
            <p className="text-primary-400 text-xs font-semibold tracking-widest uppercase mb-4">
              Get Started Today
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to secure your network?
            </h2>
            <p className="text-space-400 mb-8 max-w-xl mx-auto">
              Try all features free for 14 days. No credit card required. Cancel anytime.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-glow hover:shadow-glow-lg rounded-xl font-semibold px-6 py-3 transition-all inline-flex items-center justify-center gap-2"
              >
                Start Free Trial
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/pricing"
                className="bg-space-800 border border-space-700 text-white hover:bg-space-700 rounded-xl font-semibold px-6 py-3 transition-all inline-flex items-center justify-center"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
