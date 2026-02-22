// Nebula DNS - Privacy Policy Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="bg-white dark:bg-space-900 transition-colors">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-space-900 dark:text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-lg text-space-600 dark:text-space-300">
            Last updated: February 2026
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-6 mb-8">
            <p className="text-space-700 dark:text-space-300 m-0">
              At Nebula DNS, we take your privacy seriously. This Privacy Policy explains how we collect,
              use, disclose, and safeguard your information when you use our DNS security and content
              filtering service.
            </p>
          </div>

          {/* Section 1 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-4">
              1. Information We Collect
            </h2>

            <h3 className="text-xl font-semibold text-space-900 dark:text-white mb-3">
              Account Information
            </h3>
            <p className="text-space-600 dark:text-space-400 mb-4">
              When you create an account, we collect your name, email address, company name, and billing
              information. This information is necessary to provide and manage your service.
            </p>

            <h3 className="text-xl font-semibold text-space-900 dark:text-white mb-3">
              DNS Query Data
            </h3>
            <p className="text-space-600 dark:text-space-400 mb-4">
              We log DNS queries to provide security filtering, analytics, and reporting features. This
              includes domain names queried, timestamps, query types, response codes, and network location
              identifiers. We do not log source IP addresses by default.
            </p>

            <h3 className="text-xl font-semibold text-space-900 dark:text-white mb-3">
              Usage Data
            </h3>
            <p className="text-space-600 dark:text-space-400 mb-4">
              We collect information about how you interact with our dashboard and services, including
              pages visited, features used, and configuration changes made.
            </p>

            <h3 className="text-xl font-semibold text-space-900 dark:text-white mb-3">
              Technical Data
            </h3>
            <p className="text-space-600 dark:text-space-400">
              We automatically collect device information, browser type, operating system, and IP addresses
              when you access our dashboard for security and fraud prevention purposes.
            </p>
          </section>

          {/* Section 2 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-4">
              2. How We Use Your Information
            </h2>
            <p className="text-space-600 dark:text-space-400 mb-4">
              We use the information we collect to:
            </p>
            <ul className="space-y-2 text-space-600 dark:text-space-400 mb-4">
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Provide DNS security and content filtering services</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Generate analytics, reports, and insights about DNS activity</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Detect and prevent malware, phishing, and security threats</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Process payments and manage your account</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Communicate with you about service updates and support</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Improve our services and develop new features</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Comply with legal obligations and enforce our terms</span>
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-4">
              3. Data Storage and Security
            </h2>
            <p className="text-space-600 dark:text-space-400 mb-4">
              We implement industry-standard security measures to protect your data, including:
            </p>
            <ul className="space-y-2 text-space-600 dark:text-space-400 mb-4">
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Encryption in transit using TLS 1.3</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Encryption at rest for all stored data</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Regular security audits and penetration testing</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Access controls and authentication requirements</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>24/7 security monitoring and incident response</span>
              </li>
            </ul>
            <p className="text-space-600 dark:text-space-400">
              Your data is stored in secure data centers with redundancy and backup systems. We maintain
              SOC 2 Type II compliance and adhere to industry best practices.
            </p>
          </section>

          {/* Section 4 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-4">
              4. Cookies and Tracking Technologies
            </h2>
            <p className="text-space-600 dark:text-space-400 mb-4">
              We use cookies and similar technologies to:
            </p>
            <ul className="space-y-2 text-space-600 dark:text-space-400 mb-4">
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Keep you logged in to your dashboard</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Remember your preferences and settings</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Analyze how you use our services</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Prevent fraud and improve security</span>
              </li>
            </ul>
            <p className="text-space-600 dark:text-space-400">
              You can control cookies through your browser settings. Note that disabling cookies may limit
              some functionality of our service.
            </p>
          </section>

          {/* Section 5 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-4">
              5. Third-Party Services
            </h2>
            <p className="text-space-600 dark:text-space-400 mb-4">
              We use trusted third-party service providers to help us operate our business:
            </p>
            <ul className="space-y-2 text-space-600 dark:text-space-400 mb-4">
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span><strong>Payment Processing:</strong> Stripe (credit card processing)</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span><strong>Cloud Infrastructure:</strong> AWS, Google Cloud (data hosting)</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span><strong>Analytics:</strong> PostHog (usage analytics)</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span><strong>Support:</strong> Intercom (customer support chat)</span>
              </li>
            </ul>
            <p className="text-space-600 dark:text-space-400">
              These providers are contractually obligated to protect your data and use it only for the
              purposes we specify.
            </p>
          </section>

          {/* Section 6 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-4">
              6. Your Rights
            </h2>
            <p className="text-space-600 dark:text-space-400 mb-4">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="space-y-2 text-space-600 dark:text-space-400 mb-4">
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span><strong>Access:</strong> Request a copy of your personal data</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span><strong>Rectification:</strong> Correct inaccurate or incomplete data</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span><strong>Erasure:</strong> Request deletion of your data</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span><strong>Portability:</strong> Receive your data in a machine-readable format</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span><strong>Objection:</strong> Object to certain processing activities</span>
              </li>
            </ul>
            <p className="text-space-600 dark:text-space-400">
              To exercise these rights, contact us at{' '}
              <a href="mailto:privacy@nebuladns.io" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                privacy@nebuladns.io
              </a>
            </p>
          </section>

          {/* Section 7 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-4">
              7. Data Retention
            </h2>
            <p className="text-space-600 dark:text-space-400 mb-4">
              We retain your information for as long as necessary to provide our services and comply with
              legal obligations:
            </p>
            <ul className="space-y-2 text-space-600 dark:text-space-400 mb-4">
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span><strong>Account Data:</strong> Retained while your account is active, plus 90 days after closure</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span><strong>DNS Query Logs:</strong> Retained for 90 days by default (configurable)</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span><strong>Billing Records:</strong> Retained for 7 years for tax and accounting purposes</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span><strong>Aggregated Data:</strong> May be retained indefinitely for analytics</span>
              </li>
            </ul>
          </section>

          {/* Section 8 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-4">
              8. Children&apos;s Privacy
            </h2>
            <p className="text-space-600 dark:text-space-400">
              Our service is not directed to individuals under the age of 18. We do not knowingly collect
              personal information from children. If you believe we have collected information from a child,
              please contact us immediately and we will delete it.
            </p>
          </section>

          {/* Section 9 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-4">
              9. Changes to This Policy
            </h2>
            <p className="text-space-600 dark:text-space-400">
              We may update this Privacy Policy from time to time. We will notify you of significant changes
              by email or through our dashboard. The &quot;Last updated&quot; date at the top of this page indicates
              when the policy was last revised.
            </p>
          </section>

          {/* Section 10 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-4">
              10. Contact Us
            </h2>
            <p className="text-space-600 dark:text-space-400 mb-4">
              If you have questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-space-50 dark:bg-space-800 rounded-lg p-6 border border-space-200 dark:border-space-700">
              <p className="text-space-700 dark:text-space-300 mb-2">
                <strong>Email:</strong>{' '}
                <a href="mailto:privacy@nebuladns.io" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                  privacy@nebuladns.io
                </a>
              </p>
              <p className="text-space-700 dark:text-space-300 mb-2">
                <strong>Data Protection Officer:</strong>{' '}
                <a href="mailto:dpo@nebuladns.io" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                  dpo@nebuladns.io
                </a>
              </p>
              <p className="text-space-700 dark:text-space-300">
                <strong>Address:</strong> Nebula DNS, 123 Security Blvd, San Francisco, CA 94105
              </p>
            </div>
          </section>

          {/* Footer Navigation */}
          <div className="mt-12 pt-8 border-t border-space-200 dark:border-space-700">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <Link
                href="/terms"
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                View Terms of Service →
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 transition-all"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
