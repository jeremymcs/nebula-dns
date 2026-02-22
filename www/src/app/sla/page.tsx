// Nebula DNS - Service Level Agreement Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import Link from 'next/link'

export default function SLAPage() {
  return (
    <div className="bg-white dark:bg-space-900 transition-colors">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-space-900 dark:text-white">
              Service Level Agreement
            </h1>
            <p className="mt-4 text-lg text-space-600 dark:text-space-300">
              Our commitment to service availability and reliability
            </p>
            <p className="mt-2 text-sm text-space-500 dark:text-space-400">
              Last updated: February 2026
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-8 mb-8">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mt-0">
              Service Availability
            </h2>
            <p className="text-space-600 dark:text-space-400">
              Nebula DNS is committed to providing enterprise-grade DNS security with exceptional uptime. We guarantee a <strong>99.99% uptime SLA</strong> for all Professional and Enterprise plan customers.
            </p>
            <div className="mt-6 grid md:grid-cols-2 gap-6">
              <div className="bg-space-50 dark:bg-space-900 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-space-900 dark:text-white mt-0">
                  Covered Plans
                </h3>
                <ul className="mt-3 space-y-2 text-space-600 dark:text-space-400">
                  <li className="flex items-center">
                    <svg className="h-5 w-5 text-success-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Professional Plan
                  </li>
                  <li className="flex items-center">
                    <svg className="h-5 w-5 text-success-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Enterprise Plan
                  </li>
                </ul>
              </div>
              <div className="bg-space-50 dark:bg-space-900 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-space-900 dark:text-white mt-0">
                  Maximum Downtime
                </h3>
                <div className="mt-3 text-space-600 dark:text-space-400">
                  <div className="flex justify-between mb-2">
                    <span>Per Month:</span>
                    <strong>4m 23s</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Per Year:</span>
                    <strong>52m 35s</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-8 mb-8">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mt-0">
              Measurement
            </h2>
            <p className="text-space-600 dark:text-space-400">
              Uptime is measured as the percentage of time our DNS resolution service is available and responsive across all geographic regions over a calendar month. Measurements are taken from multiple monitoring locations worldwide every 60 seconds.
            </p>
            <div className="mt-4 text-space-600 dark:text-space-400">
              <strong>Formula:</strong>
              <div className="mt-2 p-4 bg-space-50 dark:bg-space-900 rounded-lg font-mono text-sm">
                Uptime % = (Total Minutes - Downtime Minutes) / Total Minutes × 100
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-8 mb-8">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mt-0">
              Exclusions
            </h2>
            <p className="text-space-600 dark:text-space-400">
              The following events are excluded from SLA calculations:
            </p>
            <ul className="mt-4 space-y-2 text-space-600 dark:text-space-400">
              <li className="flex items-start">
                <span className="mr-2 mt-1">•</span>
                <span>Scheduled maintenance windows (announced at least 48 hours in advance)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 mt-1">•</span>
                <span>Issues caused by customer configuration or third-party services</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 mt-1">•</span>
                <span>Distributed Denial of Service (DDoS) attacks targeting customer infrastructure</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 mt-1">•</span>
                <span>Force majeure events beyond our reasonable control</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 mt-1">•</span>
                <span>Customer's internet connection or ISP-related issues</span>
              </li>
            </ul>
          </div>

          <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-8 mb-8">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mt-0">
              Service Credits
            </h2>
            <p className="text-space-600 dark:text-space-400 mb-6">
              If we fail to meet our 99.99% uptime commitment, you may be eligible for service credits applied to your next billing cycle:
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-space-200 dark:divide-space-700">
                <thead>
                  <tr className="bg-space-50 dark:bg-space-900">
                    <th className="px-6 py-3 text-left text-xs font-medium text-space-500 dark:text-space-400 uppercase tracking-wider">
                      Monthly Uptime Percentage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-space-500 dark:text-space-400 uppercase tracking-wider">
                      Service Credit
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-space-200 dark:divide-space-700">
                  <tr>
                    <td className="px-6 py-4 text-sm text-space-600 dark:text-space-400">99.00% - 99.99%</td>
                    <td className="px-6 py-4 text-sm text-space-900 dark:text-white font-medium">10% of monthly fee</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm text-space-600 dark:text-space-400">95.00% - 98.99%</td>
                    <td className="px-6 py-4 text-sm text-space-900 dark:text-white font-medium">25% of monthly fee</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm text-space-600 dark:text-space-400">90.00% - 94.99%</td>
                    <td className="px-6 py-4 text-sm text-space-900 dark:text-white font-medium">50% of monthly fee</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm text-space-600 dark:text-space-400">Below 90.00%</td>
                    <td className="px-6 py-4 text-sm text-space-900 dark:text-white font-medium">100% of monthly fee</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-8 mb-8">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mt-0">
              Requesting Service Credits
            </h2>
            <p className="text-space-600 dark:text-space-400">
              To request a service credit, you must:
            </p>
            <ol className="mt-4 space-y-3 text-space-600 dark:text-space-400 list-decimal list-inside">
              <li>Submit a support ticket within 30 days of the incident</li>
              <li>Provide the date and time of the outage (with time zone)</li>
              <li>Include relevant error messages or logs if available</li>
            </ol>
            <p className="mt-4 text-space-600 dark:text-space-400">
              We will review your request and respond within 5 business days. Approved credits will be applied to your next invoice.
            </p>
          </div>

          <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-8 mb-8">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mt-0">
              Support Response Times
            </h2>
            <p className="text-space-600 dark:text-space-400 mb-6">
              Response times vary by plan and issue severity:
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-space-200 dark:divide-space-700">
                <thead>
                  <tr className="bg-space-50 dark:bg-space-900">
                    <th className="px-6 py-3 text-left text-xs font-medium text-space-500 dark:text-space-400 uppercase tracking-wider">
                      Priority Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-space-500 dark:text-space-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-space-500 dark:text-space-400 uppercase tracking-wider">
                      Response Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-space-200 dark:divide-space-700">
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-danger-600 dark:text-danger-400">Critical</td>
                    <td className="px-6 py-4 text-sm text-space-600 dark:text-space-400">Service down or severely degraded</td>
                    <td className="px-6 py-4 text-sm text-space-900 dark:text-white font-medium">1 hour</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-warning-600 dark:text-warning-400">High</td>
                    <td className="px-6 py-4 text-sm text-space-600 dark:text-space-400">Significant impact to service</td>
                    <td className="px-6 py-4 text-sm text-space-900 dark:text-white font-medium">4 hours</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-info-600 dark:text-info-400">Medium</td>
                    <td className="px-6 py-4 text-sm text-space-600 dark:text-space-400">Minor feature issues</td>
                    <td className="px-6 py-4 text-sm text-space-900 dark:text-white font-medium">1 business day</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-success-600 dark:text-success-400">Low</td>
                    <td className="px-6 py-4 text-sm text-space-600 dark:text-space-400">General questions or requests</td>
                    <td className="px-6 py-4 text-sm text-space-900 dark:text-white font-medium">2 business days</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-8">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mt-0">
              Scheduled Maintenance
            </h2>
            <p className="text-space-600 dark:text-space-400">
              We perform routine maintenance to keep our infrastructure secure and performant. Scheduled maintenance:
            </p>
            <ul className="mt-4 space-y-2 text-space-600 dark:text-space-400">
              <li className="flex items-start">
                <span className="mr-2 mt-1">•</span>
                <span>Is announced at least 48 hours in advance via email and status page</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 mt-1">•</span>
                <span>Typically occurs during low-traffic windows (weekends, late nights UTC)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 mt-1">•</span>
                <span>Is limited to 4 hours per maintenance window</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 mt-1">•</span>
                <span>Does not count against SLA uptime calculations</span>
              </li>
            </ul>
            <p className="mt-4 text-space-600 dark:text-space-400">
              Enterprise customers may request custom maintenance windows to align with their business hours.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Questions about our SLA?
          </h2>
          <p className="text-lg text-indigo-100 mb-8">
            Contact our sales team to learn more about our service commitments
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white text-indigo-600 font-medium hover:bg-space-100 transition-all"
          >
            Contact Sales
          </Link>
        </div>
      </div>
    </div>
  )
}
