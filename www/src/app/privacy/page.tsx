// Flux Shield - Privacy Policy Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import Link from 'next/link'
import { LegalDocumentLayout } from '@/components/marketing/LegalDocumentLayout'
import { MarketingSerifAccent } from '@/components/marketing/MarketingPageHero'

export default function PrivacyPage() {
  return (
    <LegalDocumentLayout
      eyebrow="Legal"
      title={<>Privacy <MarketingSerifAccent>Policy</MarketingSerifAccent></>}
      updatedLabel="Last updated: January 2026"
    >

        {/* Intro Callout */}
        <div className="fs-card rounded-[14px] border border-[var(--fs-line)] p-4 mb-12 text-[var(--fs-txt)]">
          At Flux Shield, we take your privacy seriously. This Privacy Policy explains how we collect,
          use, disclose, and safeguard your information when you use our DNS security and content
          filtering service.
        </div>

        {/* Section 1 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-ink mt-8 mb-3">
            1. Information We Collect
          </h2>

          <h3 className="text-xl font-semibold text-ink mt-8 mb-3">
            Account Information
          </h3>
          <p className="text-[var(--fs-txt)] mb-4">
            When you create an account, we collect your name, email address, company name, and billing
            information. This information is necessary to provide and manage your service.
          </p>

          <h3 className="text-xl font-semibold text-ink mt-8 mb-3">
            DNS Query Data
          </h3>
          <p className="text-[var(--fs-txt)] mb-4">
            We log DNS queries to provide security filtering, analytics, and reporting features. This
            includes domain names queried, timestamps, query types, response codes, and network location
            identifiers. We do not log source IP addresses by default.
          </p>

          <h3 className="text-xl font-semibold text-ink mt-8 mb-3">
            Usage Data
          </h3>
          <p className="text-[var(--fs-txt)] mb-4">
            We collect information about how you interact with our dashboard and services, including
            pages visited, features used, and configuration changes made.
          </p>

          <h3 className="text-xl font-semibold text-ink mt-8 mb-3">
            Technical Data
          </h3>
          <p className="text-[var(--fs-txt)]">
            We automatically collect device information, browser type, operating system, and IP addresses
            when you access our dashboard for security and fraud prevention purposes.
          </p>
        </section>

        {/* Section 2 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-ink mt-8 mb-3">
            2. How We Use Your Information
          </h2>
          <p className="text-[var(--fs-txt)] mb-4">
            We use the information we collect to:
          </p>
          <ul className="space-y-2 mb-4">
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span>Provide DNS security and content filtering services</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span>Generate analytics, reports, and insights about DNS activity</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span>Detect and prevent malware, phishing, and security threats</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span>Process payments and manage your account</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span>Communicate with you about service updates and support</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span>Improve our services and develop new features</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span>Comply with legal obligations and enforce our terms</span>
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-ink mt-8 mb-3">
            3. Data Storage and Security
          </h2>
          <p className="text-[var(--fs-txt)] mb-4">
            We implement industry-standard security measures to protect your data, including:
          </p>
          <ul className="space-y-2 mb-4">
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span>Encryption in transit using TLS 1.3</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span>Encryption at rest for all stored data</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span>Regular security audits and penetration testing</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span>Access controls and authentication requirements</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span>24/7 security monitoring and incident response</span>
            </li>
          </ul>
          <p className="text-[var(--fs-txt)]">
            Your data is stored in secure data centers with redundancy and backup systems. We maintain
            SOC 2 Type II compliance and adhere to industry best practices.
          </p>
        </section>

        {/* Section 4 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-ink mt-8 mb-3">
            4. Cookies and Tracking Technologies
          </h2>
          <p className="text-[var(--fs-txt)] mb-4">
            We use cookies and similar technologies to:
          </p>
          <ul className="space-y-2 mb-4">
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span>Keep you logged in to your dashboard</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span>Remember your preferences and settings</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span>Analyze how you use our services</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span>Prevent fraud and improve security</span>
            </li>
          </ul>
          <p className="text-[var(--fs-txt)]">
            You can control cookies through your browser settings. Note that disabling cookies may limit
            some functionality of our service.
          </p>
        </section>

        {/* Section 5 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-ink mt-8 mb-3">
            5. Third-Party Services
          </h2>
          <p className="text-[var(--fs-txt)] mb-4">
            We use trusted third-party service providers to help us operate our business:
          </p>
          <ul className="space-y-2 mb-4">
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span><strong className="text-ink">Payment Processing:</strong> Stripe (credit card processing)</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span><strong className="text-ink">Cloud Infrastructure:</strong> AWS, Google Cloud (data hosting)</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span><strong className="text-ink">Analytics:</strong> PostHog (usage analytics)</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span><strong className="text-ink">Support:</strong> Intercom (customer support chat)</span>
            </li>
          </ul>
          <p className="text-[var(--fs-txt)]">
            These providers are contractually obligated to protect your data and use it only for the
            purposes we specify.
          </p>
        </section>

        {/* Section 6 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-ink mt-8 mb-3">
            6. Your Rights
          </h2>
          <p className="text-[var(--fs-txt)] mb-4">
            Depending on your location, you may have the following rights:
          </p>
          <ul className="space-y-2 mb-4">
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span><strong className="text-ink">Access:</strong> Request a copy of your personal data</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span><strong className="text-ink">Rectification:</strong> Correct inaccurate or incomplete data</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span><strong className="text-ink">Erasure:</strong> Request deletion of your data</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span><strong className="text-ink">Portability:</strong> Receive your data in a machine-readable format</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span><strong className="text-ink">Objection:</strong> Object to certain processing activities</span>
            </li>
          </ul>
          <p className="text-[var(--fs-txt)]">
            To exercise these rights, contact us at{' '}
            <a href="mailto:privacy@shield.fluxlabs.net" className="text-brand hover:text-brand transition-colors">
              privacy@shield.fluxlabs.net
            </a>
          </p>
        </section>

        {/* Section 7 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-ink mt-8 mb-3">
            7. Data Retention
          </h2>
          <p className="text-[var(--fs-txt)] mb-4">
            We retain your information for as long as necessary to provide our services and comply with
            legal obligations:
          </p>
          <ul className="space-y-2 mb-4">
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span><strong className="text-ink">Account Data:</strong> Retained while your account is active, plus 90 days after closure</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span><strong className="text-ink">DNS Query Logs:</strong> Retained for 90 days by default (configurable)</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span><strong className="text-ink">Billing Records:</strong> Retained for 7 years for tax and accounting purposes</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-brand mt-0.5">•</span>
              <span><strong className="text-ink">Aggregated Data:</strong> May be retained indefinitely for analytics</span>
            </li>
          </ul>
        </section>

        {/* Section 8 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-ink mt-8 mb-3">
            8. Children&apos;s Privacy
          </h2>
          <p className="text-[var(--fs-txt)]">
            Our service is not directed to individuals under the age of 18. We do not knowingly collect
            personal information from children. If you believe we have collected information from a child,
            please contact us immediately and we will delete it.
          </p>
        </section>

        {/* Section 9 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-ink mt-8 mb-3">
            9. Changes to This Policy
          </h2>
          <p className="text-[var(--fs-txt)]">
            We may update this Privacy Policy from time to time. We will notify you of significant changes
            by email or through our dashboard. The &quot;Last updated&quot; date at the top of this page indicates
            when the policy was last revised.
          </p>
        </section>

        {/* Section 10 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-ink mt-8 mb-3">
            10. Contact Us
          </h2>
          <p className="text-[var(--fs-txt)] mb-4">
            If you have questions about this Privacy Policy or our data practices, please contact us:
          </p>
          <div className="fs-card rounded-[14px] p-6">
            <p className="text-[var(--fs-txt)] mb-2">
              <strong className="text-ink">Email:</strong>{' '}
              <a href="mailto:privacy@shield.fluxlabs.net" className="text-brand hover:text-brand transition-colors">
                privacy@shield.fluxlabs.net
              </a>
            </p>
            <p className="text-[var(--fs-txt)] mb-2">
              <strong className="text-ink">Data Protection Officer:</strong>{' '}
              <a href="mailto:dpo@shield.fluxlabs.net" className="text-brand hover:text-brand transition-colors">
                dpo@shield.fluxlabs.net
              </a>
            </p>
            <p className="text-[var(--fs-txt)]">
              <strong className="text-ink">Address:</strong> Flux Labs, Panama City Beach, FL 32407, United States
            </p>
          </div>
        </section>
    </LegalDocumentLayout>
  )
}
