// Nebula DNS - Marketing Website Landing Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import Link from 'next/link'
import { useState } from 'react'

const features = [
  {
    name: 'DNS Security',
    description: 'Block malware, phishing, and zero-day threats before they reach your network. Real-time threat intelligence updated every 60 seconds.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    name: 'Content Filtering',
    description: 'Control access to inappropriate content across 20+ categories. Perfect for businesses, schools, and families who need granular control.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
  },
  {
    name: 'Multi-Location',
    description: 'Manage DNS policies across multiple offices, branches, or networks from a single unified dashboard with per-location overrides.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    name: 'Real-Time Analytics',
    description: 'See everything happening on your network with detailed query logs, threat insights, and exportable reports powered by ClickHouse.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    name: 'Custom Lists',
    description: 'Build your own allowlists and blocklists. Import thousands of domains at once with bulk upload or subscribe to third-party feeds.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    name: 'SafeSearch',
    description: 'Enforce SafeSearch on Google, Bing, YouTube, and other search engines automatically — no client-side software required.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
]

const stats = [
  { value: '99.99%', label: 'Uptime SLA' },
  { value: '<50ms', label: 'Response Time' },
  { value: '1B+', label: 'Queries/Day' },
  { value: '10M+', label: 'Threats Blocked' },
]

const steps = [
  {
    number: '01',
    title: 'Query Received',
    description: 'Your device sends a DNS query to our anycast network. Our edge resolvers receive the request in under 5ms, no matter where you are.',
  },
  {
    number: '02',
    title: 'Policy Evaluated',
    description: 'Our O(1) policy engine checks the domain against your rules, threat feeds, and content categories — all in a single Redis cache lookup.',
  },
  {
    number: '03',
    title: 'Response Returned',
    description: 'Allowed queries are resolved and returned instantly. Blocked domains return your custom block page. Every decision is logged to ClickHouse.',
  },
]

export default function LandingPage() {
  const [_hovered, setHovered] = useState<string | null>(null)

  return (
    <div className="bg-space-950">

      {/* ============================================================
          HERO SECTION
          ============================================================ */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Nebula orbs */}
        <div className="absolute top-[-100px] right-[-100px] w-[600px] h-[600px] rounded-full bg-primary-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-120px] left-[-80px] w-[500px] h-[500px] rounded-full bg-accent-500/10 blur-[120px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">

            {/* Left column — copy */}
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary-900/50 text-primary-300 border border-primary-800/50 mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-400" />
                </span>
                AI-powered threat detection
              </div>

              {/* Heading */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
                Stop Threats{' '}
                <span className="block">Before They Start</span>
                <span className="block bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400">
                  DNS Security
                </span>
              </h1>

              {/* Subheadline */}
              <p className="mt-6 text-lg sm:text-xl text-space-400 max-w-xl leading-relaxed">
                Protect your organization from malware, phishing, and unwanted content at the DNS level — before a single packet reaches your network.
              </p>

              {/* Buttons */}
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/signup"
                  className="bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-glow hover:shadow-glow-lg px-6 py-3.5 rounded-xl font-semibold transition-all inline-flex items-center gap-2 justify-center"
                >
                  Start Free Trial
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  href="/demo"
                  className="bg-space-800 border border-space-700 text-white hover:bg-space-700 px-6 py-3.5 rounded-xl font-semibold transition-all inline-flex items-center gap-2 justify-center"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Watch Demo
                </Link>
              </div>

              {/* Trust line */}
              <p className="mt-5 text-sm text-space-400">
                No credit card required · 14-day free trial · Setup in 5 minutes
              </p>
            </div>

            {/* Right column — live threat dashboard card */}
            <div className="mt-14 lg:mt-0">
              <div className="relative">
                {/* Glow behind card */}
                <div className="absolute -inset-4 bg-gradient-to-r from-primary-500/20 to-accent-500/20 rounded-3xl blur-2xl" />

                <div className="relative bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6">
                  {/* Card header */}
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-semibold text-white">Threats Blocked Today</h3>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-success-900/50 text-success-300 border border-success-800/50">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success-400" />
                      </span>
                      Live
                    </span>
                  </div>

                  {/* Threat categories grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-space-800/70 border border-space-700/40 rounded-xl p-4">
                      <div className="text-2xl font-bold text-danger-400">1,247</div>
                      <div className="text-xs text-space-400 mt-0.5">Malware</div>
                    </div>
                    <div className="bg-space-800/70 border border-space-700/40 rounded-xl p-4">
                      <div className="text-2xl font-bold text-warning-400">892</div>
                      <div className="text-xs text-space-400 mt-0.5">Phishing</div>
                    </div>
                    <div className="bg-space-800/70 border border-space-700/40 rounded-xl p-4">
                      <div className="text-2xl font-bold text-primary-400">3,456</div>
                      <div className="text-xs text-space-400 mt-0.5">Adult Content</div>
                    </div>
                    <div className="bg-space-800/70 border border-space-700/40 rounded-xl p-4">
                      <div className="text-2xl font-bold text-accent-400">567</div>
                      <div className="text-xs text-space-400 mt-0.5">Gambling</div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-5 pt-4 border-t border-space-700/50 flex items-center justify-between text-sm">
                    <span className="text-space-400">Total queries today</span>
                    <span className="font-semibold text-white">2.4M</span>
                  </div>

                  {/* Mini bar chart — purely decorative */}
                  <div className="mt-4 flex items-end gap-1 h-10">
                    {[40, 65, 50, 80, 55, 90, 70, 85, 60, 95, 75, 100].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm bg-gradient-to-t from-primary-600/60 to-primary-400/40"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          STATS BAR
          ============================================================ */}
      <section className="bg-space-900 border-y border-space-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400">
                  {stat.value}
                </div>
                <div className="mt-2 text-sm text-space-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          FEATURES GRID
          ============================================================ */}
      <section className="py-24 bg-space-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section label */}
          <div className="text-center mb-16">
            <p className="text-primary-400 text-xs font-semibold tracking-widest uppercase mb-4">
              Features
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Everything you need{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400">
                in one platform
              </span>
            </h2>
            <p className="mt-4 text-lg text-space-400 max-w-2xl mx-auto">
              Comprehensive DNS security and content filtering for businesses of all sizes — from single offices to global enterprises.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.name}
                onMouseEnter={() => setHovered(feature.name)}
                onMouseLeave={() => setHovered(null)}
                className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6 hover:border-primary-700/60 transition-all duration-300 group"
              >
                <div className="h-12 w-12 rounded-xl bg-primary-900/50 border border-primary-800/50 flex items-center justify-center text-primary-400 mb-5 group-hover:bg-primary-900/80 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">{feature.name}</h3>
                <p className="text-space-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          HOW IT WORKS
          ============================================================ */}
      <section className="py-24 bg-space-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section label */}
          <div className="text-center mb-16">
            <p className="text-primary-400 text-xs font-semibold tracking-widest uppercase mb-4">
              How It Works
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Protection in{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400">
                milliseconds
              </span>
            </h2>
            <p className="mt-4 text-lg text-space-400 max-w-2xl mx-auto">
              Every DNS query is evaluated in real time against your policy. No agents. No software. No latency.
            </p>
          </div>

          {/* Steps */}
          <div className="relative grid md:grid-cols-3 gap-8">
            {/* Connecting line — desktop only */}
            <div className="hidden md:block absolute top-10 left-[calc(16.66%+1.5rem)] right-[calc(16.66%+1.5rem)] h-px bg-gradient-to-r from-primary-700/50 via-accent-700/50 to-primary-700/50" />

            {steps.map((step, index) => (
              <div key={step.number} className="relative text-center">
                {/* Number circle */}
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary-600 to-accent-600 text-white text-xl font-bold shadow-glow mb-6 relative z-10">
                  {step.number}
                </div>
                <h3 className="text-white font-semibold text-xl mb-3">{step.title}</h3>
                <p className="text-space-400 text-sm leading-relaxed max-w-xs mx-auto">{step.description}</p>

                {/* Mobile connector arrow */}
                {index < steps.length - 1 && (
                  <div className="md:hidden flex justify-center mt-6 mb-2">
                    <svg className="h-6 w-6 text-space-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          CTA SECTION
          ============================================================ */}
      <section className="relative overflow-hidden bg-space-950 py-24">
        {/* Nebula orbs */}
        <div className="absolute top-[-80px] left-[10%] w-[400px] h-[400px] rounded-full bg-primary-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-80px] right-[10%] w-[400px] h-[400px] rounded-full bg-accent-500/10 blur-[120px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center">
          <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-10 sm:p-14 max-w-2xl w-full text-center">
            <p className="text-primary-400 text-xs font-semibold tracking-widest uppercase mb-4">
              Get Started Today
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to secure{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400">
                your network?
              </span>
            </h2>
            <p className="text-space-400 text-lg mb-8 leading-relaxed">
              Join thousands of organizations protecting their networks with Nebula DNS. Deploy in minutes, not days.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-glow hover:shadow-glow-lg px-6 py-3.5 rounded-xl font-semibold transition-all inline-flex items-center gap-2 justify-center"
              >
                Start Free Trial
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/pricing"
                className="bg-space-800 border border-space-700 text-white hover:bg-space-700 px-6 py-3.5 rounded-xl font-semibold transition-all inline-flex items-center gap-2 justify-center"
              >
                View Pricing
              </Link>
            </div>

            <p className="mt-6 text-sm text-space-400">
              No credit card required · 14-day free trial · Cancel anytime
            </p>
          </div>
        </div>
      </section>

    </div>
  )
}
