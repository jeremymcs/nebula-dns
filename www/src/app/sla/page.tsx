// Nebula DNS - Service Level Agreement Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import Link from 'next/link'

export default function SLAPage() {
  return (
    <div className="bg-space-950 min-h-screen">
      {/* Page Header */}
      <div className="py-20 border-b border-space-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-primary-400 text-xs font-semibold tracking-widest uppercase mb-4">
            Legal
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400">
              Service Level Agreement
            </span>
          </h1>
          <p className="mt-4 text-space-400">
            Our commitment to service availability and reliability
          </p>
          <p className="mt-2 text-sm text-space-500">
            Last updated: February 2026
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">

        {/* Service Availability */}
        <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Service Availability
          </h2>
          <p className="text-space-400 mb-6">
            Nebula DNS is committed to providing enterprise-grade DNS security with exceptional uptime.
          </p>

          {/* Uptime Highlight */}
          <div className="bg-primary-900/30 border border-primary-800/50 rounded-xl p-6 mb-6 text-center">
            <div className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400 mb-2">
              99.99%
            </div>
            <p className="text-space-300 font-medium">Uptime SLA Guarantee</p>
            <p className="text-space-500 text-sm mt-1">For all Professional and Enterprise plan customers</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-space-950 border border-space-700/30 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-3">
                Covered Plans
              </h3>
              <ul className="space-y-2 text-space-400">
                <li className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-success-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Professional Plan
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-success-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Enterprise Plan
                </li>
              </ul>
            </div>
            <div className="bg-space-950 border border-space-700/30 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-3">
                Maximum Downtime
              </h3>
              <div className="space-y-2 text-space-400">
                <div className="flex justify-between">
                  <span>Per Month:</span>
                  <strong className="text-white">4m 23s</strong>
                </div>
                <div className="flex justify-between">
                  <span>Per Year:</span>
                  <strong className="text-white">52m 35s</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Measurement */}
        <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Measurement
          </h2>
          <p className="text-space-400 mb-4">
            Uptime is measured as the percentage of time our DNS resolution service is available and responsive across all geographic regions over a calendar month. Measurements are taken from multiple monitoring locations worldwide every 60 seconds.
          </p>
          <div className="text-space-400">
            <p className="text-white font-medium mb-2">Formula:</p>
            <div className="bg-space-950 border border-space-700/30 rounded-xl p-4 font-mono text-sm text-space-300">
              Uptime % = (Total Minutes - Downtime Minutes) / Total Minutes × 100
            </div>
          </div>
        </div>

        {/* Exclusions */}
        <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Exclusions
          </h2>
          <p className="text-space-400 mb-4">
            The following events are excluded from SLA calculations:
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-space-400">
              <span className="text-warning-400 mt-0.5">•</span>
              <span>Scheduled maintenance windows (announced at least 48 hours in advance)</span>
            </li>
            <li className="flex items-start gap-2 text-space-400">
              <span className="text-warning-400 mt-0.5">•</span>
              <span>Issues caused by customer configuration or third-party services</span>
            </li>
            <li className="flex items-start gap-2 text-space-400">
              <span className="text-warning-400 mt-0.5">•</span>
              <span>Distributed Denial of Service (DDoS) attacks targeting customer infrastructure</span>
            </li>
            <li className="flex items-start gap-2 text-space-400">
              <span className="text-warning-400 mt-0.5">•</span>
              <span>Force majeure events beyond our reasonable control</span>
            </li>
            <li className="flex items-start gap-2 text-space-400">
              <span className="text-warning-400 mt-0.5">•</span>
              <span>Customer&apos;s internet connection or ISP-related issues</span>
            </li>
          </ul>
        </div>

        {/* Service Credits */}
        <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Service Credits
          </h2>
          <p className="text-space-400 mb-6">
            If we fail to meet our 99.99% uptime commitment, you may be eligible for service credits applied to your next billing cycle:
          </p>
          <div className="bg-space-900 border border-space-700/50 rounded-xl overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-space-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-space-300 uppercase tracking-wider">
                    Monthly Uptime Percentage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-space-300 uppercase tracking-wider">
                    Service Credit
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-space-900">
                  <td className="px-6 py-4 text-sm text-space-400">99.00% – 99.99%</td>
                  <td className="px-6 py-4 text-sm text-white font-medium">10% of monthly fee</td>
                </tr>
                <tr className="bg-space-950">
                  <td className="px-6 py-4 text-sm text-space-400">95.00% – 98.99%</td>
                  <td className="px-6 py-4 text-sm text-white font-medium">25% of monthly fee</td>
                </tr>
                <tr className="bg-space-900">
                  <td className="px-6 py-4 text-sm text-space-400">90.00% – 94.99%</td>
                  <td className="px-6 py-4 text-sm text-white font-medium">50% of monthly fee</td>
                </tr>
                <tr className="bg-space-950">
                  <td className="px-6 py-4 text-sm text-space-400">Below 90.00%</td>
                  <td className="px-6 py-4 text-sm text-white font-medium">100% of monthly fee</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Requesting Service Credits */}
        <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Requesting Service Credits
          </h2>
          <p className="text-space-400 mb-4">
            To request a service credit, you must:
          </p>
          <ol className="space-y-3 text-space-400 list-decimal list-inside">
            <li>Submit a support ticket within 30 days of the incident</li>
            <li>Provide the date and time of the outage (with time zone)</li>
            <li>Include relevant error messages or logs if available</li>
          </ol>
          <p className="mt-4 text-space-400">
            We will review your request and respond within 5 business days. Approved credits will be applied to your next invoice.
          </p>
        </div>

        {/* Support Response Times */}
        <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Support Response Times
          </h2>
          <p className="text-space-400 mb-6">
            Response times vary by plan and issue severity:
          </p>
          <div className="bg-space-900 border border-space-700/50 rounded-xl overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-space-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-space-300 uppercase tracking-wider">
                    Priority Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-space-300 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-space-300 uppercase tracking-wider">
                    Response Time
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-space-900">
                  <td className="px-6 py-4 text-sm font-medium text-danger-400">Critical</td>
                  <td className="px-6 py-4 text-sm text-space-400">Service down or severely degraded</td>
                  <td className="px-6 py-4 text-sm text-white font-medium">1 hour</td>
                </tr>
                <tr className="bg-space-950">
                  <td className="px-6 py-4 text-sm font-medium text-warning-400">High</td>
                  <td className="px-6 py-4 text-sm text-space-400">Significant impact to service</td>
                  <td className="px-6 py-4 text-sm text-white font-medium">4 hours</td>
                </tr>
                <tr className="bg-space-900">
                  <td className="px-6 py-4 text-sm font-medium text-primary-400">Medium</td>
                  <td className="px-6 py-4 text-sm text-space-400">Minor feature issues</td>
                  <td className="px-6 py-4 text-sm text-white font-medium">1 business day</td>
                </tr>
                <tr className="bg-space-950">
                  <td className="px-6 py-4 text-sm font-medium text-success-400">Low</td>
                  <td className="px-6 py-4 text-sm text-space-400">General questions or requests</td>
                  <td className="px-6 py-4 text-sm text-white font-medium">2 business days</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Scheduled Maintenance */}
        <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Scheduled Maintenance
          </h2>
          <p className="text-space-400 mb-4">
            We perform routine maintenance to keep our infrastructure secure and performant. Scheduled maintenance:
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-space-400">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>Is announced at least 48 hours in advance via email and status page</span>
            </li>
            <li className="flex items-start gap-2 text-space-400">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>Typically occurs during low-traffic windows (weekends, late nights UTC)</span>
            </li>
            <li className="flex items-start gap-2 text-space-400">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>Is limited to 4 hours per maintenance window</span>
            </li>
            <li className="flex items-start gap-2 text-space-400">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>Does not count against SLA uptime calculations</span>
            </li>
          </ul>
          <p className="mt-4 text-space-400">
            Enterprise customers may request custom maintenance windows to align with their business hours.
          </p>
        </div>
      </div>

      {/* CTA Section */}
      <div className="border-t border-space-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="bg-primary-900/30 border border-primary-800/50 rounded-xl p-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Questions about our SLA?
            </h2>
            <p className="text-space-400 mb-8">
              Contact our sales team to learn more about our service commitments
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 text-white font-medium hover:from-primary-500 hover:to-accent-500 transition-all"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
