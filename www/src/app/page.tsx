// Nebula DNS - Marketing Website - page.tsx
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

/**
 * Nebula DNS Landing Page
 * Modern marketing page with hero, features, pricing preview
 */

'use client'

import Link from 'next/link'
import { useState } from 'react'

const features = [
  {
    name: 'DNS-Level Security',
    description: 'Block malware, phishing, and other threats before they reach your network. Real-time threat intelligence keeps you protected.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    name: 'Content Filtering',
    description: 'Control access to inappropriate content with 20+ categories. Perfect for businesses, schools, and families.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
  },
  {
    name: 'Multi-Location Support',
    description: 'Manage DNS policies across multiple office locations, branches, or networks from a single dashboard.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    name: 'Real-Time Analytics',
    description: 'See what\'s happening on your network with detailed reports, query logs, and threat insights.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    name: 'Custom Allow/Block Lists',
    description: 'Create your own allowlists and blocklists. Import thousands of domains with bulk upload.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    name: 'SafeSearch Enforcement',
    description: 'Enforce SafeSearch on Google, Bing, YouTube, and other search engines automatically.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
]

const stats = [
  { value: '99.99%', label: 'Uptime SLA' },
  { value: '50ms', label: 'Avg Response' },
  { value: '1B+', label: 'Queries/Day' },
  { value: '10M+', label: 'Threats Blocked' },
]

export default function LandingPage() {
  return (
    <div className="bg-white dark:bg-space-900 transition-colors">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800" />
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-indigo-100/50 dark:from-indigo-900/20" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-32 sm:pb-32">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 mb-6">
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                Now with AI-powered threat detection
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-space-900 dark:text-white tracking-tight">
                Secure Your Network with
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                  DNS Security
                </span>
              </h1>

              <p className="mt-6 text-lg sm:text-xl text-space-600 dark:text-space-300 max-w-2xl">
                Protect your organization from malware, phishing, and unwanted content at the DNS level.
                Easy to deploy, powerful to manage.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 font-medium text-lg shadow-lg hover:shadow-xl transition-all"
                >
                  Start Free Trial
                  <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-space-700 dark:text-space-200 bg-white dark:bg-space-800 border border-space-300 dark:border-space-700 hover:bg-space-50 dark:hover:bg-space-700 font-medium text-lg transition-all"
                >
                  <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Watch Demo
                </Link>
              </div>

              <p className="mt-4 text-sm text-space-500 dark:text-space-400">
                No credit card required · 14-day free trial · Setup in 5 minutes
              </p>
            </div>
            
            <div className="mt-12 lg:mt-0">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl opacity-20 blur-2xl" />
                <div className="relative bg-white dark:bg-space-800 rounded-2xl shadow-2xl p-6 border border-space-100 dark:border-space-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-space-900 dark:text-white">Threats Blocked Today</h3>
                    <span className="px-2 py-1 bg-success-100 dark:bg-success-900/50 text-success-700 dark:text-success-300 text-xs font-medium rounded-full">Live</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-danger-50 dark:bg-danger-900/30 rounded-lg p-4">
                      <div className="text-2xl font-bold text-danger-600 dark:text-danger-400">1,247</div>
                      <div className="text-sm text-danger-600/80 dark:text-danger-400/80">Malware</div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-4">
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">892</div>
                      <div className="text-sm text-orange-600/80 dark:text-orange-400/80">Phishing</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">3,456</div>
                      <div className="text-sm text-purple-600/80 dark:text-purple-400/80">Adult Content</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">567</div>
                      <div className="text-sm text-blue-600/80 dark:text-blue-400/80">Gambling</div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-space-100 dark:border-space-700">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-space-500 dark:text-space-400">Total queries today</span>
                      <span className="font-semibold text-space-900 dark:text-white">2.4M</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-space-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-white">{stat.value}</div>
                <div className="mt-2 text-space-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-white dark:bg-space-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-space-900 dark:text-white">
              Everything you need to secure your DNS
            </h2>
            <p className="mt-4 text-lg text-space-600 dark:text-space-300 max-w-2xl mx-auto">
              Comprehensive DNS security and content filtering for businesses of all sizes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.name}
                className="bg-white dark:bg-space-800 rounded-xl p-6 border border-space-200 dark:border-space-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-lg transition-all"
              >
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-2">{feature.name}</h3>
                <p className="text-space-600 dark:text-space-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to secure your network?
          </h2>
          <p className="text-lg text-indigo-100 mb-8 max-w-2xl mx-auto">
            Join thousands of organizations protecting their networks with Nebula DNS.
            Start your free trial today.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center px-8 py-4 rounded-lg bg-white text-indigo-600 font-semibold text-lg hover:bg-space-100 transition-all shadow-lg"
          >
            Get Started Free
            <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="py-16 bg-space-50 dark:bg-space-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-space-500 dark:text-space-400 text-sm font-medium mb-8">
            TRUSTED BY ORGANIZATIONS WORLDWIDE
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-50">
            {['Enterprise Co', 'Tech Corp', 'Global Inc', 'Secure Ltd', 'Network Pro'].map((company) => (
              <div key={company} className="text-2xl font-bold text-space-400 dark:text-space-500">{company}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
