// Nebula DNS - Terms of Service Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="bg-white dark:bg-space-900 transition-colors">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-space-900 dark:text-white mb-4">
            Terms of Service
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
              Please read these Terms of Service carefully before using Nebula DNS. By accessing or using
              our service, you agree to be bound by these terms.
            </p>
          </div>

          {/* Section 1 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-space-600 dark:text-space-400 mb-4">
              By creating an account or using Nebula DNS (&quot;Service&quot;), you agree to these Terms of Service
              (&quot;Terms&quot;) and our Privacy Policy. If you do not agree, you may not use the Service.
            </p>
            <p className="text-space-600 dark:text-space-400">
              These Terms apply to all users, including individuals, businesses, and organizations. If you
              are using the Service on behalf of an organization, you represent that you have authority to
              bind that organization to these Terms.
            </p>
          </section>

          {/* Section 2 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-4">
              2. Description of Service
            </h2>
            <p className="text-space-600 dark:text-space-400 mb-4">
              Nebula DNS provides DNS security, content filtering, and threat protection services. Our
              Service includes:
            </p>
            <ul className="space-y-2 text-space-600 dark:text-space-400 mb-4">
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>DNS-level malware, phishing, and botnet blocking</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Content filtering across 20+ categories</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Real-time analytics and reporting</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Custom allowlists and blocklists</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>API access for automation and integration</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Management dashboard and configuration tools</span>
              </li>
            </ul>
            <p className="text-space-600 dark:text-space-400">
              We reserve the right to modify, suspend, or discontinue any part of the Service at any time
              with reasonable notice.
            </p>
          </section>

          {/* Section 3 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-4">
              3. Account Registration
            </h2>
            <p className="text-space-600 dark:text-space-400 mb-4">
              To use the Service, you must create an account by providing accurate and complete information.
              You are responsible for:
            </p>
            <ul className="space-y-2 text-space-600 dark:text-space-400 mb-4">
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Maintaining the confidentiality of your account credentials</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>All activities that occur under your account</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Notifying us immediately of any unauthorized access</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Keeping your account information current and accurate</span>
              </li>
            </ul>
            <p className="text-space-600 dark:text-space-400">
              We reserve the right to suspend or terminate accounts that violate these Terms or are used
              for fraudulent or illegal activities.
            </p>
          </section>

          {/* Section 4 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-4">
              4. Acceptable Use Policy
            </h2>
            <p className="text-space-600 dark:text-space-400 mb-4">
              You agree not to use the Service to:
            </p>
            <ul className="space-y-2 text-space-600 dark:text-space-400 mb-4">
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Violate any laws, regulations, or third-party rights</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Transmit malware, viruses, or harmful code</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Engage in fraudulent or deceptive practices</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Attempt to gain unauthorized access to our systems</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Interfere with or disrupt the Service or servers</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Use the Service to harm minors in any way</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Resell or redistribute the Service without authorization</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Reverse engineer or attempt to extract source code</span>
              </li>
            </ul>
            <p className="text-space-600 dark:text-space-400">
              Violations may result in immediate suspension or termination of your account without refund.
            </p>
          </section>

          {/* Section 5 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-4">
              5. Intellectual Property
            </h2>
            <p className="text-space-600 dark:text-space-400 mb-4">
              The Service, including all software, features, content, and trademarks, is owned by Nebula DNS
              and protected by intellectual property laws. We grant you a limited, non-exclusive,
              non-transferable license to use the Service in accordance with these Terms.
            </p>
            <p className="text-space-600 dark:text-space-400 mb-4">
              You retain ownership of any data you submit to the Service. By using the Service, you grant
              us a license to process your data as necessary to provide the Service.
            </p>
            <p className="text-space-600 dark:text-space-400">
              You may not copy, modify, distribute, sell, or lease any part of our Service without explicit
              written permission.
            </p>
          </section>

          {/* Section 6 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-4">
              6. Payment Terms
            </h2>

            <h3 className="text-xl font-semibold text-space-900 dark:text-white mb-3">
              Pricing and Billing
            </h3>
            <p className="text-space-600 dark:text-space-400 mb-4">
              Subscription fees are billed in advance on a monthly or annual basis. All fees are in U.S.
              dollars and non-refundable except as required by law or stated in these Terms.
            </p>

            <h3 className="text-xl font-semibold text-space-900 dark:text-white mb-3">
              Free Trials
            </h3>
            <p className="text-space-600 dark:text-space-400 mb-4">
              We offer a 14-day free trial for new accounts. You will not be charged until the trial period
              ends. You may cancel at any time during the trial without charge.
            </p>

            <h3 className="text-xl font-semibold text-space-900 dark:text-white mb-3">
              Payment Methods
            </h3>
            <p className="text-space-600 dark:text-space-400 mb-4">
              We accept major credit cards through our payment processor, Stripe. You authorize us to charge
              your payment method for all fees incurred.
            </p>

            <h3 className="text-xl font-semibold text-space-900 dark:text-white mb-3">
              Late Payment
            </h3>
            <p className="text-space-600 dark:text-space-400">
              If payment fails, we will attempt to notify you. Your account may be suspended if payment is
              not received within 7 days. We reserve the right to charge late fees and interest on overdue
              amounts.
            </p>
          </section>

          {/* Section 7 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-4">
              7. Cancellation and Termination
            </h2>

            <h3 className="text-xl font-semibold text-space-900 dark:text-white mb-3">
              Your Right to Cancel
            </h3>
            <p className="text-space-600 dark:text-space-400 mb-4">
              You may cancel your subscription at any time through your account dashboard. Cancellation
              takes effect at the end of your current billing period. No refunds are provided for partial
              billing periods.
            </p>

            <h3 className="text-xl font-semibold text-space-900 dark:text-white mb-3">
              Our Right to Terminate
            </h3>
            <p className="text-space-600 dark:text-space-400 mb-4">
              We reserve the right to suspend or terminate your account if you violate these Terms, fail to
              pay fees, or engage in fraudulent or illegal activities. We will provide notice when possible
              but may terminate immediately for serious violations.
            </p>

            <h3 className="text-xl font-semibold text-space-900 dark:text-white mb-3">
              Effect of Termination
            </h3>
            <p className="text-space-600 dark:text-space-400">
              Upon termination, your access to the Service will cease, and your data will be deleted after
              90 days unless otherwise required by law. You may request a data export before termination.
            </p>
          </section>

          {/* Section 8 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-4">
              8. Limitation of Liability
            </h2>
            <p className="text-space-600 dark:text-space-400 mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEBULA DNS SHALL NOT BE LIABLE FOR:
            </p>
            <ul className="space-y-2 text-space-600 dark:text-space-400 mb-4">
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Indirect, incidental, special, consequential, or punitive damages</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Loss of profits, revenue, data, or business opportunities</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Service interruptions or downtime</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Security breaches or unauthorized access to your data</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Errors, bugs, or inaccuracies in the Service</span>
              </li>
            </ul>
            <p className="text-space-600 dark:text-space-400">
              Our total liability for any claim arising from these Terms or the Service shall not exceed the
              amount you paid us in the 12 months preceding the claim.
            </p>
          </section>

          {/* Section 9 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-4">
              9. Warranty Disclaimer
            </h2>
            <p className="text-space-600 dark:text-space-400 mb-4">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS
              OR IMPLIED. WE DO NOT WARRANT THAT:
            </p>
            <ul className="space-y-2 text-space-600 dark:text-space-400 mb-4">
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>The Service will be uninterrupted, secure, or error-free</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>The Service will meet your specific requirements</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>Results obtained from the Service will be accurate or reliable</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 dark:text-indigo-400 mr-2">•</span>
                <span>All threats, malware, or harmful content will be blocked</span>
              </li>
            </ul>
            <p className="text-space-600 dark:text-space-400">
              While we strive to provide the highest quality service, we cannot guarantee complete
              protection against all security threats.
            </p>
          </section>

          {/* Section 10 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-4">
              10. Indemnification
            </h2>
            <p className="text-space-600 dark:text-space-400">
              You agree to indemnify, defend, and hold harmless Nebula DNS and its officers, directors,
              employees, and agents from any claims, losses, damages, liabilities, and expenses (including
              legal fees) arising from your use of the Service, violation of these Terms, or infringement
              of any third-party rights.
            </p>
          </section>

          {/* Section 11 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-4">
              11. Governing Law
            </h2>
            <p className="text-space-600 dark:text-space-400 mb-4">
              These Terms shall be governed by and construed in accordance with the laws of the State of
              California, United States, without regard to conflict of law principles.
            </p>
            <p className="text-space-600 dark:text-space-400">
              Any disputes arising from these Terms or the Service shall be resolved exclusively in the
              state or federal courts located in San Francisco County, California.
            </p>
          </section>

          {/* Section 12 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-4">
              12. Changes to Terms
            </h2>
            <p className="text-space-600 dark:text-space-400 mb-4">
              We reserve the right to modify these Terms at any time. We will notify you of material changes
              by email or through the Service at least 30 days before they take effect.
            </p>
            <p className="text-space-600 dark:text-space-400">
              Your continued use of the Service after changes take effect constitutes acceptance of the
              modified Terms. If you do not agree to the changes, you must cancel your account.
            </p>
          </section>

          {/* Section 13 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-4">
              13. Contact Information
            </h2>
            <p className="text-space-600 dark:text-space-400 mb-4">
              If you have questions about these Terms, please contact us:
            </p>
            <div className="bg-space-50 dark:bg-space-800 rounded-lg p-6 border border-space-200 dark:border-space-700">
              <p className="text-space-700 dark:text-space-300 mb-2">
                <strong>Email:</strong>{' '}
                <a href="mailto:legal@nebuladns.io" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                  legal@nebuladns.io
                </a>
              </p>
              <p className="text-space-700 dark:text-space-300 mb-2">
                <strong>Support:</strong>{' '}
                <a href="mailto:support@nebuladns.io" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                  support@nebuladns.io
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
                href="/privacy"
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                View Privacy Policy →
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
