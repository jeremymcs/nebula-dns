// Flux Shield - Service Level Agreement Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import Link from 'next/link'
import { LegalDocumentLayout } from '@/components/marketing/LegalDocumentLayout'
import { MarketingSerifAccent } from '@/components/marketing/MarketingPageHero'

export default function SLAPage() {
  return (
    <LegalDocumentLayout
      eyebrow="Legal"
      title={<>Service Level <MarketingSerifAccent>Agreement</MarketingSerifAccent></>}
      lede="Our commitment to service availability and reliability."
      updatedLabel="Last updated: February 2026"
    >


        {/* Service Availability */}
        <div className="fs-card rounded-[14px] p-6">
          <h2 className="text-xl font-semibold text-ink mb-4">
            Service Availability
          </h2>
          <p className="text-[var(--fs-txt)] mb-6">
            Flux Shield is committed to providing enterprise-grade DNS security with exceptional uptime.
          </p>

          {/* Uptime Highlight */}
          <div className="fs-card rounded-[14px] border border-[var(--fs-line)] p-6 mb-6 text-center">
            <div className="text-5xl font-bold text-ink mb-2">
              99.99%
            </div>
            <p className="text-[var(--fs-txt)] font-medium">Uptime SLA Guarantee</p>
            <p className="text-[var(--fs-mut)] text-sm mt-1">For all Professional and Enterprise plan customers</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="fs-card rounded-[14px] border border-[var(--fs-line)] bg-[var(--fs-surface)] rounded-xl p-5">
              <h3 className="text-ink font-semibold mb-3">
                Covered Plans
              </h3>
              <ul className="space-y-2 text-[var(--fs-txt)]">
                <li className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-[var(--fs-success)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Professional Plan
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-[var(--fs-success)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Enterprise Plan
                </li>
              </ul>
            </div>
            <div className="fs-card rounded-[14px] border border-[var(--fs-line)] bg-[var(--fs-surface)] rounded-xl p-5">
              <h3 className="text-ink font-semibold mb-3">
                Maximum Downtime
              </h3>
              <div className="space-y-2 text-[var(--fs-txt)]">
                <div className="flex justify-between">
                  <span>Per Month:</span>
                  <strong className="text-ink">4m 23s</strong>
                </div>
                <div className="flex justify-between">
                  <span>Per Year:</span>
                  <strong className="text-ink">52m 35s</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Measurement */}
        <div className="fs-card rounded-[14px] p-6">
          <h2 className="text-xl font-semibold text-ink mb-4">
            Measurement
          </h2>
          <p className="text-[var(--fs-txt)] mb-4">
            Uptime is measured as the percentage of time our DNS resolution service is available and responsive across all geographic regions over a calendar month. Measurements are taken from multiple monitoring locations worldwide every 60 seconds.
          </p>
          <div className="text-[var(--fs-txt)]">
            <p className="text-ink font-medium mb-2">Formula:</p>
            <div className="fs-card rounded-[14px] border border-[var(--fs-line)] bg-[var(--fs-surface)] rounded-xl p-4 font-mono text-sm text-[var(--fs-txt)]">
              Uptime % = (Total Minutes - Downtime Minutes) / Total Minutes × 100
            </div>
          </div>
        </div>

        {/* Exclusions */}
        <div className="fs-card rounded-[14px] p-6">
          <h2 className="text-xl font-semibold text-ink mb-4">
            Exclusions
          </h2>
          <p className="text-[var(--fs-txt)] mb-4">
            The following events are excluded from SLA calculations:
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-[var(--fs-warning)] mt-0.5">•</span>
              <span>Scheduled maintenance windows (announced at least 48 hours in advance)</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-[var(--fs-warning)] mt-0.5">•</span>
              <span>Issues caused by customer configuration or third-party services</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-[var(--fs-warning)] mt-0.5">•</span>
              <span>Distributed Denial of Service (DDoS) attacks targeting customer infrastructure</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-[var(--fs-warning)] mt-0.5">•</span>
              <span>Force majeure events beyond our reasonable control</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-[var(--fs-warning)] mt-0.5">•</span>
              <span>Customer&apos;s internet connection or ISP-related issues</span>
            </li>
          </ul>
        </div>

        {/* Service Credits */}
        <div className="fs-card rounded-[14px] p-6">
          <h2 className="text-xl font-semibold text-ink mb-4">
            Service Credits
          </h2>
          <p className="text-[var(--fs-txt)] mb-6">
            If we fail to meet our 99.99% uptime commitment, you may be eligible for service credits applied to your next billing cycle:
          </p>
          <div className="bg-canvas border border-line rounded-xl overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-panel">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--fs-txt)] uppercase tracking-wider">
                    Monthly Uptime Percentage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--fs-txt)] uppercase tracking-wider">
                    Service Credit
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-canvas">
                  <td className="px-6 py-4 text-sm text-[var(--fs-txt)]">99.00% – 99.99%</td>
                  <td className="px-6 py-4 text-sm text-ink font-medium">10% of monthly fee</td>
                </tr>
                <tr className="bg-canvas">
                  <td className="px-6 py-4 text-sm text-[var(--fs-txt)]">95.00% – 98.99%</td>
                  <td className="px-6 py-4 text-sm text-ink font-medium">25% of monthly fee</td>
                </tr>
                <tr className="bg-canvas">
                  <td className="px-6 py-4 text-sm text-[var(--fs-txt)]">90.00% – 94.99%</td>
                  <td className="px-6 py-4 text-sm text-ink font-medium">50% of monthly fee</td>
                </tr>
                <tr className="bg-canvas">
                  <td className="px-6 py-4 text-sm text-[var(--fs-txt)]">Below 90.00%</td>
                  <td className="px-6 py-4 text-sm text-ink font-medium">100% of monthly fee</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Requesting Service Credits */}
        <div className="fs-card rounded-[14px] p-6">
          <h2 className="text-xl font-semibold text-ink mb-4">
            Requesting Service Credits
          </h2>
          <p className="text-[var(--fs-txt)] mb-4">
            To request a service credit, you must:
          </p>
          <ol className="space-y-3 text-[var(--fs-txt)] list-decimal list-inside">
            <li>Submit a support ticket within 30 days of the incident</li>
            <li>Provide the date and time of the outage (with time zone)</li>
            <li>Include relevant error messages or logs if available</li>
          </ol>
          <p className="mt-4 text-[var(--fs-txt)]">
            We will review your request and respond within 5 business days. Approved credits will be applied to your next invoice.
          </p>
        </div>

        {/* Support Response Times */}
        <div className="fs-card rounded-[14px] p-6">
          <h2 className="text-xl font-semibold text-ink mb-4">
            Support Response Times
          </h2>
          <p className="text-[var(--fs-txt)] mb-6">
            Response times vary by plan and issue severity:
          </p>
          <div className="bg-canvas border border-line rounded-xl overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-panel">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--fs-txt)] uppercase tracking-wider">
                    Priority Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--fs-txt)] uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--fs-txt)] uppercase tracking-wider">
                    Response Time
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-canvas">
                  <td className="px-6 py-4 text-sm font-medium text-[var(--fs-danger)]">Critical</td>
                  <td className="px-6 py-4 text-sm text-[var(--fs-txt)]">Service down or severely degraded</td>
                  <td className="px-6 py-4 text-sm text-ink font-medium">1 hour</td>
                </tr>
                <tr className="bg-canvas">
                  <td className="px-6 py-4 text-sm font-medium text-[var(--fs-warning)]">High</td>
                  <td className="px-6 py-4 text-sm text-[var(--fs-txt)]">Significant impact to service</td>
                  <td className="px-6 py-4 text-sm text-ink font-medium">4 hours</td>
                </tr>
                <tr className="bg-canvas">
                  <td className="px-6 py-4 text-sm font-medium text-brand">Medium</td>
                  <td className="px-6 py-4 text-sm text-[var(--fs-txt)]">Minor feature issues</td>
                  <td className="px-6 py-4 text-sm text-ink font-medium">1 business day</td>
                </tr>
                <tr className="bg-canvas">
                  <td className="px-6 py-4 text-sm font-medium text-[var(--fs-success)]">Low</td>
                  <td className="px-6 py-4 text-sm text-[var(--fs-txt)]">General questions or requests</td>
                  <td className="px-6 py-4 text-sm text-ink font-medium">2 business days</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Scheduled Maintenance */}
        <div className="fs-card rounded-[14px] p-6">
          <h2 className="text-xl font-semibold text-ink mb-4">
            Scheduled Maintenance
          </h2>
          <p className="text-[var(--fs-txt)] mb-4">
            We perform routine maintenance to keep our infrastructure secure and performant. Scheduled maintenance:
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span>Is announced at least 48 hours in advance via email and status page</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span>Typically occurs during low-traffic windows (weekends, late nights UTC)</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span>Is limited to 4 hours per maintenance window</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span>Does not count against SLA uptime calculations</span>
            </li>
          </ul>
          <p className="mt-4 text-[var(--fs-txt)]">
            Enterprise customers may request custom maintenance windows to align with their business hours.
          </p>
        </div>
    </LegalDocumentLayout>
  )
}
