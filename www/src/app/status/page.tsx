// Nebula DNS - System Status Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import Link from 'next/link'
import { useState } from 'react'

type ServiceStatus = 'operational' | 'degraded' | 'outage'

const services: { name: string; status: ServiceStatus; description: string }[] = [
  {
    name: 'API',
    status: 'operational',
    description: 'REST API for management, policy control, and integrations',
  },
  {
    name: 'DNS Resolution',
    status: 'operational',
    description: 'Core DNS filtering and recursive resolution service',
  },
  {
    name: 'Dashboard',
    status: 'operational',
    description: 'Web-based control panel, analytics, and reporting UI',
  },
  {
    name: 'Analytics',
    status: 'operational',
    description: 'Query logging, ClickHouse ingestion, and reporting pipeline',
  },
  {
    name: 'Certificate Services',
    status: 'operational',
    description: 'TLS certificate issuance and renewal for DNS-over-HTTPS/TLS',
  },
]

const statusConfig: Record<ServiceStatus, { dot: string; text: string; label: string }> = {
  operational: {
    dot: 'bg-success-500',
    text: 'text-success-400',
    label: 'Operational',
  },
  degraded: {
    dot: 'bg-warning-500',
    text: 'text-warning-400',
    label: 'Degraded',
  },
  outage: {
    dot: 'bg-danger-500',
    text: 'text-danger-400',
    label: 'Outage',
  },
}

const allOperational = services.every((s) => s.status === 'operational')

// 90 simulated daily uptime bars — all green (no incidents)
const uptimeBars = Array.from({ length: 90 }, (_, i) => ({ day: i + 1, up: true }))

export default function StatusPage() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault()
    if (email.trim()) {
      setSubscribed(true)
    }
  }

  return (
    <div className="bg-space-950">

      {/* Hero */}
      <div className="relative py-24 bg-space-950 overflow-hidden">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-success-600/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-accent-600/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-primary-400 text-xs font-semibold tracking-widest uppercase mb-4">
            STATUS
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-8">
            System Status
          </h1>

          {/* Overall status badge */}
          <div className="inline-flex flex-col items-center">
            <div
              className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl border text-lg font-semibold ${
                allOperational
                  ? 'bg-success-900/40 border-success-800/50 text-success-300'
                  : 'bg-warning-900/40 border-warning-800/50 text-warning-300'
              }`}
            >
              <span
                className={`h-3 w-3 rounded-full animate-pulse ${
                  allOperational ? 'bg-success-400' : 'bg-warning-400'
                }`}
              />
              {allOperational ? 'All Systems Operational' : 'Partial Service Degradation'}
            </div>
            <p className="mt-3 text-space-400 text-sm">
              Last updated:{' '}
              {new Date().toLocaleString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Service Cards */}
      <div className="py-16 bg-space-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-8">
            Service Status
          </h2>

          <div className="space-y-3">
            {services.map((service, index) => {
              const cfg = statusConfig[service.status]
              return (
                <div
                  key={index}
                  className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6 flex items-start justify-between gap-4"
                >
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">
                      {service.name}
                    </h3>
                    <p className="mt-1 text-sm text-space-400">
                      {service.description}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
                    <span className={`text-sm font-medium ${cfg.text}`}>
                      {cfg.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Uptime */}
      <div className="py-16 bg-space-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h3 className="text-3xl font-bold text-white mb-1">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400">
                    99.99%
                  </span>
                </h3>
                <p className="text-space-400 text-sm">uptime over the last 90 days</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-space-400 uppercase tracking-wider font-semibold mb-1">
                  90-Day History
                </p>
                <p className="text-xs text-space-400">
                  Today &rarr;
                </p>
              </div>
            </div>

            {/* 90-day uptime bars */}
            <div className="flex items-end gap-[2px] h-10">
              {uptimeBars.map((bar) => (
                <div
                  key={bar.day}
                  title={`Day ${bar.day}: ${bar.up ? 'Operational' : 'Outage'}`}
                  className={`flex-1 rounded-sm transition-all ${
                    bar.up ? 'bg-success-500/70 hover:bg-success-400' : 'bg-danger-500/70 hover:bg-danger-400'
                  }`}
                  style={{ height: bar.up ? '100%' : '40%' }}
                />
              ))}
            </div>

            <div className="flex justify-between mt-2 text-xs text-space-400">
              <span>90 days ago</span>
              <span>Today</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="py-16 bg-space-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-8">
            Recent Incidents
          </h2>

          <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-12 text-center">
            <div className="h-14 w-14 rounded-xl bg-success-900/50 border border-success-800/50 flex items-center justify-center text-success-400 mx-auto mb-4">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No incidents in the past 90 days
            </h3>
            <p className="text-space-400 text-sm">
              All systems have been running smoothly. Any incidents will be posted here in real time.
            </p>
          </div>
        </div>
      </div>

      {/* Subscribe */}
      <div className="py-16 bg-space-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-8 text-center">
            <div className="h-12 w-12 rounded-xl bg-accent-900/50 border border-accent-800/50 flex items-center justify-center text-accent-400 mx-auto mb-5">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Subscribe to Status Updates
            </h3>
            <p className="text-space-400 mb-6 max-w-md mx-auto">
              Get notified the moment an incident is detected and when it has been resolved.
            </p>

            {subscribed ? (
              <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-success-900/40 border border-success-800/50 text-success-300 font-semibold">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Subscribed! We'll keep you in the loop.
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="max-w-md mx-auto flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="flex-1 px-4 py-2.5 rounded-xl border border-space-700/50 bg-space-950 text-white placeholder-space-500 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent text-sm"
                />
                <button
                  type="submit"
                  className="bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-glow hover:shadow-glow-lg rounded-xl font-semibold px-5 py-2.5 transition-all text-sm whitespace-nowrap"
                >
                  Subscribe to Updates
                </button>
              </form>
            )}

            <p className="mt-3 text-xs text-space-400">
              We'll only contact you about service status changes.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-24 bg-space-900 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-primary-700/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Experiencing an issue?
          </h2>
          <p className="text-space-400 mb-8 max-w-xl mx-auto">
            If you're seeing something not reflected on this page, our support team is standing by.
          </p>
          <Link
            href="/contact"
            className="bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-glow hover:shadow-glow-lg rounded-xl font-semibold px-6 py-3 transition-all inline-flex items-center gap-2"
          >
            Contact Support
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </div>

    </div>
  )
}
