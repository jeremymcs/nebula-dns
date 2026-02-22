// Nebula DNS - System Status Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import Link from 'next/link'

const services = [
  {
    name: 'DNS Resolution',
    status: 'operational',
    description: 'Core DNS filtering and resolution service',
  },
  {
    name: 'API',
    status: 'operational',
    description: 'REST API for management and integrations',
  },
  {
    name: 'Dashboard',
    status: 'operational',
    description: 'Web-based control panel and UI',
  },
  {
    name: 'Analytics',
    status: 'operational',
    description: 'Query logging and reporting infrastructure',
  },
  {
    name: 'Authentication',
    status: 'operational',
    description: 'User authentication and authorization',
  },
]

export default function StatusPage() {
  return (
    <div className="bg-white dark:bg-space-900 transition-colors">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-space-900 dark:text-white">
              System Status
            </h1>
            <p className="mt-4 text-lg text-space-600 dark:text-space-300">
              Current status of all Nebula DNS services
            </p>
          </div>

          {/* Overall Status */}
          <div className="mt-10 bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-8 text-center">
            <div className="flex items-center justify-center space-x-3">
              <div className="h-4 w-4 rounded-full bg-success-500 animate-pulse"></div>
              <span className="text-2xl font-semibold text-space-900 dark:text-white">
                All Systems Operational
              </span>
            </div>
            <p className="mt-2 text-space-600 dark:text-space-400">
              Last updated: {new Date().toLocaleString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Services Status */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-6">
          Service Status
        </h2>

        <div className="space-y-4">
          {services.map((service, index) => (
            <div
              key={index}
              className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-space-900 dark:text-white">
                    {service.name}
                  </h3>
                  <p className="mt-1 text-sm text-space-600 dark:text-space-400">
                    {service.description}
                  </p>
                </div>
                <div className="ml-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-success-100 dark:bg-success-900/50 text-success-700 dark:text-success-300">
                    <div className="h-2 w-2 rounded-full bg-success-500 mr-2"></div>
                    Operational
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Uptime */}
        <div className="mt-10 bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-6">
          <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-4">
            Uptime
          </h3>
          <div className="flex items-baseline space-x-2">
            <span className="text-4xl font-bold text-success-600 dark:text-success-400">99.99%</span>
            <span className="text-space-600 dark:text-space-400">over the last 90 days</span>
          </div>
          <p className="mt-4 text-sm text-space-500 dark:text-space-400">
            For detailed uptime history and historical incidents, visit our{' '}
            <a href="#" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              external status page
            </a>
          </p>
        </div>

        {/* Recent Incidents */}
        <div className="mt-10">
          <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-6">
            Recent Incidents
          </h2>
          <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-space-300 dark:text-space-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-space-900 dark:text-white">
              No recent incidents
            </h3>
            <p className="mt-2 text-space-600 dark:text-space-400">
              All systems have been running smoothly. Any incidents will be posted here.
            </p>
          </div>
        </div>

        {/* Subscribe Section */}
        <div className="mt-10 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 p-8">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-space-900 dark:text-white">
              Subscribe to Updates
            </h3>
            <p className="mt-2 text-space-600 dark:text-space-400">
              Get notified when incidents occur and when they're resolved
            </p>
            <div className="mt-6 max-w-md mx-auto">
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="flex-1 px-4 py-2 rounded-lg border border-space-200 dark:border-space-700 bg-white dark:bg-space-800 text-space-900 dark:text-white placeholder-space-400 dark:placeholder-space-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button className="px-6 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 transition-all">
                  Subscribe
                </button>
              </div>
              <p className="mt-2 text-xs text-space-500 dark:text-space-400">
                We'll only email you about service status updates
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Questions about our status?
          </h2>
          <p className="text-lg text-indigo-100 mb-8">
            Contact our support team if you're experiencing any issues
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white text-indigo-600 font-medium hover:bg-space-100 transition-all"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  )
}
