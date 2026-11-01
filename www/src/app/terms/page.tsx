// Flux Shield - Terms of Service Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import Link from 'next/link'
import { LegalDocumentLayout } from '@/components/marketing/LegalDocumentLayout'
import { MarketingSerifAccent } from '@/components/marketing/MarketingPageHero'

export default function TermsPage() {
  return (
    <LegalDocumentLayout
      eyebrow="Legal"
      title={<>Terms of <MarketingSerifAccent>Service</MarketingSerifAccent></>}
      updatedLabel="Last updated: February 2026"
    >

        {/* Intro Callout */}
        <div className="fs-card rounded-[14px] border border-[var(--fs-line)] p-4 mb-12 text-[var(--fs-txt)]">
          Please read these Terms of Service carefully before using Flux Shield. By accessing or using
          our service, you agree to be bound by these terms.
        </div>

        {/* Section 1 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">
            1. Acceptance of Terms
          </h2>
          <p className="text-[var(--fs-txt)] mb-4">
            By creating an account or using Flux Shield (&quot;Service&quot;), you agree to these Terms of Service
            (&quot;Terms&quot;) and our Privacy Policy. If you do not agree, you may not use the Service.
          </p>
          <p className="text-[var(--fs-txt)]">
            These Terms apply to all users, including individuals, businesses, and organizations. If you
            are using the Service on behalf of an organization, you represent that you have authority to
            bind that organization to these Terms.
          </p>
        </section>

        {/* Section 2 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">
            2. Description of Service
          </h2>
          <p className="text-[var(--fs-txt)] mb-4">
            Flux Shield provides DNS security, content filtering, and threat protection services. Our
            Service includes:
          </p>
          <ul className="space-y-2 mb-4">
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>DNS-level malware, phishing, and botnet blocking</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>Content filtering across 20+ categories</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>Real-time analytics and reporting</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>Custom allowlists and blocklists</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>API access for automation and integration</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>Management dashboard and configuration tools</span>
            </li>
          </ul>
          <p className="text-[var(--fs-txt)]">
            We reserve the right to modify, suspend, or discontinue any part of the Service at any time
            with reasonable notice.
          </p>
        </section>

        {/* Section 3 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">
            3. Account Registration
          </h2>
          <p className="text-[var(--fs-txt)] mb-4">
            To use the Service, you must create an account by providing accurate and complete information.
            You are responsible for:
          </p>
          <ul className="space-y-2 mb-4">
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>Maintaining the confidentiality of your account credentials</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>All activities that occur under your account</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>Notifying us immediately of any unauthorized access</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>Keeping your account information current and accurate</span>
            </li>
          </ul>
          <p className="text-[var(--fs-txt)]">
            We reserve the right to suspend or terminate accounts that violate these Terms or are used
            for fraudulent or illegal activities.
          </p>
        </section>

        {/* Section 4 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">
            4. Acceptable Use Policy
          </h2>
          <p className="text-[var(--fs-txt)] mb-4">
            You agree not to use the Service to:
          </p>
          <ul className="space-y-2 mb-4">
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>Violate any laws, regulations, or third-party rights</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>Transmit malware, viruses, or harmful code</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>Engage in fraudulent or deceptive practices</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>Attempt to gain unauthorized access to our systems</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>Interfere with or disrupt the Service or servers</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>Use the Service to harm minors in any way</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>Resell or redistribute the Service without authorization</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>Reverse engineer or attempt to extract source code</span>
            </li>
          </ul>
          <p className="text-[var(--fs-txt)]">
            Violations may result in immediate suspension or termination of your account without refund.
          </p>
        </section>

        {/* Section 5 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">
            5. Intellectual Property
          </h2>
          <p className="text-[var(--fs-txt)] mb-4">
            The Service, including all software, features, content, and trademarks, is owned by Flux Labs
            and operated under the Flux Shield product name.
            and protected by intellectual property laws. We grant you a limited, non-exclusive,
            non-transferable license to use the Service in accordance with these Terms.
          </p>
          <p className="text-[var(--fs-txt)] mb-4">
            You retain ownership of any data you submit to the Service. By using the Service, you grant
            us a license to process your data as necessary to provide the Service.
          </p>
          <p className="text-[var(--fs-txt)]">
            You may not copy, modify, distribute, sell, or lease any part of our Service without explicit
            written permission.
          </p>
        </section>

        {/* Section 6 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">
            6. Payment Terms
          </h2>

          <h3 className="text-xl font-semibold text-white mt-8 mb-3">
            Pricing and Billing
          </h3>
          <p className="text-[var(--fs-txt)] mb-4">
            Subscription fees are billed in advance on a monthly or annual basis. All fees are in U.S.
            dollars and non-refundable except as required by law or stated in these Terms.
          </p>

          <h3 className="text-xl font-semibold text-white mt-8 mb-3">
            Free Trials
          </h3>
          <p className="text-[var(--fs-txt)] mb-4">
            We offer a 14-day free trial for new accounts. You will not be charged until the trial period
            ends. You may cancel at any time during the trial without charge.
          </p>

          <h3 className="text-xl font-semibold text-white mt-8 mb-3">
            Payment Methods
          </h3>
          <p className="text-[var(--fs-txt)] mb-4">
            We accept major credit cards through our payment processor, Stripe. You authorize us to charge
            your payment method for all fees incurred.
          </p>

          <h3 className="text-xl font-semibold text-white mt-8 mb-3">
            Late Payment
          </h3>
          <p className="text-[var(--fs-txt)]">
            If payment fails, we will attempt to notify you. Your account may be suspended if payment is
            not received within 7 days. We reserve the right to charge late fees and interest on overdue
            amounts.
          </p>
        </section>

        {/* Section 7 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">
            7. Cancellation and Termination
          </h2>

          <h3 className="text-xl font-semibold text-white mt-8 mb-3">
            Your Right to Cancel
          </h3>
          <p className="text-[var(--fs-txt)] mb-4">
            You may cancel your subscription at any time through your account dashboard. Cancellation
            takes effect at the end of your current billing period. No refunds are provided for partial
            billing periods.
          </p>

          <h3 className="text-xl font-semibold text-white mt-8 mb-3">
            Our Right to Terminate
          </h3>
          <p className="text-[var(--fs-txt)] mb-4">
            We reserve the right to suspend or terminate your account if you violate these Terms, fail to
            pay fees, or engage in fraudulent or illegal activities. We will provide notice when possible
            but may terminate immediately for serious violations.
          </p>

          <h3 className="text-xl font-semibold text-white mt-8 mb-3">
            Effect of Termination
          </h3>
          <p className="text-[var(--fs-txt)]">
            Upon termination, your access to the Service will cease, and your data will be deleted after
            90 days unless otherwise required by law. You may request a data export before termination.
          </p>
        </section>

        {/* Section 8 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">
            8. Limitation of Liability
          </h2>
          <p className="text-[var(--fs-mut)] text-sm mb-4">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEBULA DNS SHALL NOT BE LIABLE FOR:
          </p>
          <ul className="space-y-2 mb-4">
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>Indirect, incidental, special, consequential, or punitive damages</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>Loss of profits, revenue, data, or business opportunities</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>Service interruptions or downtime</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>Security breaches or unauthorized access to your data</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>Errors, bugs, or inaccuracies in the Service</span>
            </li>
          </ul>
          <p className="text-[var(--fs-txt)]">
            Our total liability for any claim arising from these Terms or the Service shall not exceed the
            amount you paid us in the 12 months preceding the claim.
          </p>
        </section>

        {/* Section 9 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">
            9. Warranty Disclaimer
          </h2>
          <p className="text-[var(--fs-mut)] text-sm mb-4">
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS
            OR IMPLIED. WE DO NOT WARRANT THAT:
          </p>
          <ul className="space-y-2 mb-4">
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>The Service will be uninterrupted, secure, or error-free</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>The Service will meet your specific requirements</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>Results obtained from the Service will be accurate or reliable</span>
            </li>
            <li className="flex items-start gap-2 text-[var(--fs-txt)]">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>All threats, malware, or harmful content will be blocked</span>
            </li>
          </ul>
          <p className="text-[var(--fs-txt)]">
            While we strive to provide the highest quality service, we cannot guarantee complete
            protection against all security threats.
          </p>
        </section>

        {/* Section 10 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">
            10. Indemnification
          </h2>
          <p className="text-[var(--fs-txt)]">
            You agree to indemnify, defend, and hold harmless Flux Labs and its officers, directors,
            employees, and agents from any claims, losses, damages, liabilities, and expenses (including
            legal fees) arising from your use of the Service, violation of these Terms, or infringement
            of any third-party rights.
          </p>
        </section>

        {/* Section 11 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">
            11. Governing Law
          </h2>
          <p className="text-[var(--fs-txt)] mb-4">
            These Terms shall be governed by and construed in accordance with the laws of the State of
            California, United States, without regard to conflict of law principles.
          </p>
          <p className="text-[var(--fs-txt)]">
            Any disputes arising from these Terms or the Service shall be resolved exclusively in the
            state or federal courts located in Bay County, Florida.
          </p>
        </section>

        {/* Section 12 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">
            12. Changes to Terms
          </h2>
          <p className="text-[var(--fs-txt)] mb-4">
            We reserve the right to modify these Terms at any time. We will notify you of material changes
            by email or through the Service at least 30 days before they take effect.
          </p>
          <p className="text-[var(--fs-txt)]">
            Your continued use of the Service after changes take effect constitutes acceptance of the
            modified Terms. If you do not agree to the changes, you must cancel your account.
          </p>
        </section>

        {/* Section 13 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">
            13. Contact Information
          </h2>
          <p className="text-[var(--fs-txt)] mb-4">
            If you have questions about these Terms, please contact us:
          </p>
          <div className="fs-card rounded-[14px] p-6">
            <p className="text-[var(--fs-txt)] mb-2">
              <strong className="text-white">Email:</strong>{' '}
              <a href="mailto:legal@shield.fluxlabs.net" className="text-primary-400 hover:text-primary-300 transition-colors">
                legal@shield.fluxlabs.net
              </a>
            </p>
            <p className="text-[var(--fs-txt)] mb-2">
              <strong className="text-white">Support:</strong>{' '}
              <a href="mailto:support@shield.fluxlabs.net" className="text-primary-400 hover:text-primary-300 transition-colors">
                support@shield.fluxlabs.net
              </a>
            </p>
            <p className="text-[var(--fs-txt)]">
              <strong className="text-white">Address:</strong> Flux Labs, Panama City Beach, FL 32407, United States
            </p>
          </div>
        </section>
    </LegalDocumentLayout>
  )
}
