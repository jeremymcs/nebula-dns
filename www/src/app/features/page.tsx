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
  },
  {
    name: 'Content Filtering',
    description: 'Control access to inappropriate content with 20+ categories including adult content, gambling, social media, and more. Perfect for businesses, schools, and families.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
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
  },
  {
    name: 'Real-Time Analytics',
    description: 'Powerful analytics dashboard with detailed reports, query logs, threat insights, and trend analysis. See exactly what\'s happening on your network in real-time.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    name: 'Custom Lists',
    description: 'Create custom allowlists and blocklists with thousands of domains. Import bulk lists, use regex patterns, and manage exceptions with ease.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    name: 'SafeSearch Enforcement',
    description: 'Automatically enforce SafeSearch on Google, Bing, YouTube, DuckDuckGo, and other search engines. Prevent inappropriate content in search results.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    name: 'API Access',
    description: 'Full-featured REST API for automation and integration. Programmatically manage policies, query logs, and integrate with your existing security tools.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  {
    name: 'Automated Playbooks',
    description: 'Create automated responses to threats and security events. Schedule policy changes, generate reports, and trigger webhooks based on DNS activity.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
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

export default function FeaturesPage() {
  return (
    <div className="bg-white dark:bg-space-900 transition-colors">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-24 sm:pb-32">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-space-900 dark:text-white tracking-tight">
              Powerful DNS Security
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                Features
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-space-600 dark:text-space-300 max-w-3xl mx-auto">
              Everything you need to protect your organization from malware, phishing, and unwanted content.
              Enterprise-grade security that&apos;s simple to deploy and manage.
            </p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="py-24 bg-white dark:bg-space-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div
                key={feature.name}
                className="bg-white dark:bg-space-800 rounded-xl p-6 border border-space-200 dark:border-space-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-lg transition-all"
              >
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-3">
                  {feature.name}
                </h3>
                <p className="text-space-600 dark:text-space-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-24 bg-space-50 dark:bg-space-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-space-900 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-lg text-space-600 dark:text-space-300 max-w-2xl mx-auto">
              Get started with Nebula DNS in three simple steps. No complex setup required.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                {/* Connector Line (desktop only) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-16 left-1/2 w-full h-0.5 bg-gradient-to-r from-indigo-200 to-purple-200 dark:from-indigo-800 dark:to-purple-800" />
                )}

                <div className="relative bg-white dark:bg-space-900 rounded-xl p-8 border border-space-200 dark:border-space-700">
                  {/* Step Number */}
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xl mb-6">
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div className="mb-4 text-indigo-600 dark:text-indigo-400">
                    {step.icon}
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-space-900 dark:text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-space-600 dark:text-space-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Features Highlight */}
      <div className="py-24 bg-white dark:bg-space-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-space-900 dark:text-white mb-6">
                Enterprise-Grade Performance
              </h2>
              <p className="text-lg text-space-600 dark:text-space-300 mb-8">
                Built for scale with global anycast DNS infrastructure. Our distributed network ensures
                low-latency responses and 99.99% uptime SLA.
              </p>

              <div className="space-y-4">
                {[
                  'Global anycast network with 100+ locations',
                  'Sub-50ms average response time',
                  '99.99% uptime SLA with guaranteed credits',
                  'Automatic failover and load balancing',
                  'DNSSEC validation for enhanced security',
                  'DNS over HTTPS (DoH) and DNS over TLS (DoT)',
                ].map((item) => (
                  <div key={item} className="flex items-start">
                    <svg
                      className="h-6 w-6 text-success-500 flex-shrink-0 mr-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-space-700 dark:text-space-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-space-50 dark:bg-space-800 rounded-2xl p-8 border border-space-200 dark:border-space-700">
              <h3 className="text-xl font-bold text-space-900 dark:text-white mb-6">
                Performance Stats
              </h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-sm font-medium text-space-600 dark:text-space-400">
                      Average Response Time
                    </span>
                    <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      &lt;50ms
                    </span>
                  </div>
                  <div className="h-2 bg-space-200 dark:bg-space-700 rounded-full overflow-hidden">
                    <div className="h-full w-[15%] bg-gradient-to-r from-indigo-500 to-purple-600" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-sm font-medium text-space-600 dark:text-space-400">
                      Uptime SLA
                    </span>
                    <span className="text-2xl font-bold text-success-600 dark:text-success-400">
                      99.99%
                    </span>
                  </div>
                  <div className="h-2 bg-space-200 dark:bg-space-700 rounded-full overflow-hidden">
                    <div className="h-full w-[99.99%] bg-gradient-to-r from-success-500 to-success-600" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-sm font-medium text-space-600 dark:text-space-400">
                      Queries/Day
                    </span>
                    <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      1B+
                    </span>
                  </div>
                  <div className="h-2 bg-space-200 dark:bg-space-700 rounded-full overflow-hidden">
                    <div className="h-full w-[85%] bg-gradient-to-r from-purple-500 to-purple-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to get started?
          </h2>
          <p className="text-lg text-indigo-100 mb-8 max-w-2xl mx-auto">
            Try all features free for 14 days. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-white text-indigo-600 font-semibold text-lg hover:bg-space-100 transition-all shadow-lg"
            >
              Start Free Trial
              <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-indigo-700 text-white font-semibold text-lg hover:bg-indigo-800 transition-all border-2 border-white/20"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
