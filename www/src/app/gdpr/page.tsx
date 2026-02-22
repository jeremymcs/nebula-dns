// Nebula DNS - GDPR Compliance Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import Link from 'next/link'

export default function GDPRPage() {
  return (
    <div className="bg-white dark:bg-space-900 transition-colors">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-space-900 dark:text-white">
              GDPR Compliance
            </h1>
            <p className="mt-4 text-lg text-space-600 dark:text-space-300">
              How Nebula DNS protects your privacy rights under GDPR
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
              Our Commitment
            </h2>
            <p className="text-space-600 dark:text-space-400">
              Nebula DNS is committed to protecting the privacy and security of personal data in accordance with the General Data Protection Regulation (GDPR). We have implemented comprehensive technical and organizational measures to ensure compliance and safeguard your data rights.
            </p>
            <div className="mt-6 grid md:grid-cols-3 gap-4">
              <div className="flex items-start">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mr-3 flex-shrink-0">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-space-900 dark:text-white mt-0">Privacy by Design</h3>
                  <p className="text-xs text-space-600 dark:text-space-400 mt-1">Built with privacy at the core</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mr-3 flex-shrink-0">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-space-900 dark:text-white mt-0">Data Encryption</h3>
                  <p className="text-xs text-space-600 dark:text-space-400 mt-1">End-to-end encryption</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mr-3 flex-shrink-0">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-space-900 dark:text-white mt-0">Full Transparency</h3>
                  <p className="text-xs text-space-600 dark:text-space-400 mt-1">Clear data practices</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-8 mb-8">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mt-0">
              Data We Process
            </h2>
            <p className="text-space-600 dark:text-space-400 mb-4">
              We process the following categories of personal data:
            </p>
            <div className="space-y-4">
              <div className="flex items-start">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-medium mr-3 flex-shrink-0">1</span>
                <div>
                  <h3 className="text-lg font-semibold text-space-900 dark:text-white mt-0">Account Information</h3>
                  <p className="text-space-600 dark:text-space-400 text-sm">Name, email address, company name, billing address</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-medium mr-3 flex-shrink-0">2</span>
                <div>
                  <h3 className="text-lg font-semibold text-space-900 dark:text-white mt-0">DNS Query Metadata</h3>
                  <p className="text-space-600 dark:text-space-400 text-sm">Query domain, timestamp, query type, response code (IP addresses are anonymized)</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-medium mr-3 flex-shrink-0">3</span>
                <div>
                  <h3 className="text-lg font-semibold text-space-900 dark:text-white mt-0">Usage Data</h3>
                  <p className="text-space-600 dark:text-space-400 text-sm">Dashboard interactions, feature usage, performance metrics</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-medium mr-3 flex-shrink-0">4</span>
                <div>
                  <h3 className="text-lg font-semibold text-space-900 dark:text-white mt-0">Payment Information</h3>
                  <p className="text-space-600 dark:text-space-400 text-sm">Processed securely through Stripe (we do not store full credit card details)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-8 mb-8">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mt-0">
              Legal Basis for Processing
            </h2>
            <p className="text-space-600 dark:text-space-400 mb-4">
              We process your personal data based on the following legal grounds:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-space-50 dark:bg-space-900 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-space-900 dark:text-white mt-0">Contract Performance</h3>
                <p className="text-xs text-space-600 dark:text-space-400">Processing necessary to provide our DNS security service</p>
              </div>
              <div className="bg-space-50 dark:bg-space-900 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-space-900 dark:text-white mt-0">Legitimate Interest</h3>
                <p className="text-xs text-space-600 dark:text-space-400">Security monitoring, fraud prevention, service improvement</p>
              </div>
              <div className="bg-space-50 dark:bg-space-900 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-space-900 dark:text-white mt-0">Legal Obligation</h3>
                <p className="text-xs text-space-600 dark:text-space-400">Compliance with tax, accounting, and data retention laws</p>
              </div>
              <div className="bg-space-50 dark:bg-space-900 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-space-900 dark:text-white mt-0">Consent</h3>
                <p className="text-xs text-space-600 dark:text-space-400">Marketing communications (you can opt-out anytime)</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-8 mb-8">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mt-0">
              Your Rights
            </h2>
            <p className="text-space-600 dark:text-space-400 mb-6">
              Under GDPR, you have the following rights regarding your personal data:
            </p>
            <div className="space-y-4">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <strong className="text-space-900 dark:text-white">Right to Access:</strong>
                  <span className="text-space-600 dark:text-space-400"> Request a copy of your personal data we hold</span>
                </div>
              </div>
              <div className="flex items-start">
                <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <strong className="text-space-900 dark:text-white">Right to Rectification:</strong>
                  <span className="text-space-600 dark:text-space-400"> Correct inaccurate or incomplete data</span>
                </div>
              </div>
              <div className="flex items-start">
                <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <strong className="text-space-900 dark:text-white">Right to Erasure (Right to be Forgotten):</strong>
                  <span className="text-space-600 dark:text-space-400"> Request deletion of your data when no longer necessary</span>
                </div>
              </div>
              <div className="flex items-start">
                <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <strong className="text-space-900 dark:text-white">Right to Restriction:</strong>
                  <span className="text-space-600 dark:text-space-400"> Limit how we use your data under certain circumstances</span>
                </div>
              </div>
              <div className="flex items-start">
                <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <strong className="text-space-900 dark:text-white">Right to Data Portability:</strong>
                  <span className="text-space-600 dark:text-space-400"> Receive your data in a structured, machine-readable format</span>
                </div>
              </div>
              <div className="flex items-start">
                <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <strong className="text-space-900 dark:text-white">Right to Object:</strong>
                  <span className="text-space-600 dark:text-space-400"> Object to processing based on legitimate interests or direct marketing</span>
                </div>
              </div>
              <div className="flex items-start">
                <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <strong className="text-space-900 dark:text-white">Right to Withdraw Consent:</strong>
                  <span className="text-space-600 dark:text-space-400"> Withdraw consent at any time (does not affect prior processing)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-8 mb-8">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mt-0">
              Data Processing Agreement
            </h2>
            <p className="text-space-600 dark:text-space-400">
              When you use Nebula DNS, we act as a data processor on your behalf. We have established a comprehensive Data Processing Agreement (DPA) that outlines:
            </p>
            <ul className="mt-4 space-y-2 text-space-600 dark:text-space-400">
              <li className="flex items-start">
                <span className="mr-2 mt-1">•</span>
                <span>The subject matter, duration, nature, and purpose of processing</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 mt-1">•</span>
                <span>Types of personal data and categories of data subjects</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 mt-1">•</span>
                <span>Our obligations and your rights as the data controller</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 mt-1">•</span>
                <span>Security measures and data breach notification procedures</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 mt-1">•</span>
                <span>Sub-processor management and international transfers</span>
              </li>
            </ul>
            <p className="mt-4 text-space-600 dark:text-space-400">
              Enterprise customers receive a signed DPA as part of their onboarding. Other customers can request a copy by contacting{' '}
              <a href="mailto:privacy@nebuladns.io" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                privacy@nebuladns.io
              </a>
            </p>
          </div>

          <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-8 mb-8">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mt-0">
              International Data Transfers
            </h2>
            <p className="text-space-600 dark:text-space-400">
              Our primary data centers are located in the European Union. When we transfer personal data outside the EU/EEA, we ensure adequate protection through:
            </p>
            <div className="mt-4 grid md:grid-cols-2 gap-4">
              <div className="bg-space-50 dark:bg-space-900 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-space-900 dark:text-white mt-0">Standard Contractual Clauses</h3>
                <p className="text-xs text-space-600 dark:text-space-400">EU Commission-approved transfer mechanisms</p>
              </div>
              <div className="bg-space-50 dark:bg-space-900 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-space-900 dark:text-white mt-0">Adequacy Decisions</h3>
                <p className="text-xs text-space-600 dark:text-space-400">Transfers to countries with adequate data protection</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-8 mb-8">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mt-0">
              Data Protection Officer
            </h2>
            <p className="text-space-600 dark:text-space-400">
              We have appointed a Data Protection Officer (DPO) to oversee our GDPR compliance:
            </p>
            <div className="mt-4 bg-space-50 dark:bg-space-900 rounded-lg p-6">
              <div className="flex items-start">
                <svg className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="font-semibold text-space-900 dark:text-white">Email:</p>
                  <a href="mailto:dpo@nebuladns.io" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                    dpo@nebuladns.io
                  </a>
                  <p className="mt-3 text-sm text-space-600 dark:text-space-400">
                    Our DPO is available to answer questions about our data practices and assist with exercising your rights.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-8">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mt-0">
              How to Exercise Your Rights
            </h2>
            <p className="text-space-600 dark:text-space-400 mb-6">
              To exercise any of your GDPR rights:
            </p>
            <ol className="space-y-3 text-space-600 dark:text-space-400 list-decimal list-inside">
              <li>Email <a href="mailto:privacy@nebuladns.io" className="text-indigo-600 dark:text-indigo-400 hover:underline">privacy@nebuladns.io</a> with your request</li>
              <li>Include your account email and specific right you wish to exercise</li>
              <li>We will verify your identity and respond within 30 days</li>
              <li>If needed, we may request additional information to confirm your identity</li>
            </ol>
            <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <p className="text-sm text-space-600 dark:text-space-400">
                <strong className="text-space-900 dark:text-white">Note:</strong> You also have the right to lodge a complaint with your local data protection authority if you believe we have not handled your data appropriately.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Privacy questions?
          </h2>
          <p className="text-lg text-indigo-100 mb-8">
            Our privacy team is here to help
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:privacy@nebuladns.io"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white text-indigo-600 font-medium hover:bg-space-100 transition-all"
            >
              Contact Privacy Team
            </a>
            <Link
              href="/privacy"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg border-2 border-white text-white font-medium hover:bg-white/10 transition-all"
            >
              View Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
