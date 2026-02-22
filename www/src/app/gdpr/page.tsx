// Nebula DNS - GDPR Compliance Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import Link from 'next/link'

export default function GDPRPage() {
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
              GDPR Compliance
            </span>
          </h1>
          <p className="mt-4 text-space-400">
            Our Commitment to Your Data
          </p>
          <p className="mt-2 text-sm text-space-500">
            Last updated: February 2026
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">

        {/* Our Commitment */}
        <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Our Commitment
          </h2>
          <p className="text-space-400 mb-6">
            Nebula DNS is committed to protecting the privacy and security of personal data in accordance with the General Data Protection Regulation (GDPR). We have implemented comprehensive technical and organizational measures to ensure compliance and safeguard your data rights.
          </p>

          {/* 3 Commitment Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-space-950 border border-space-700/30 rounded-xl p-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent-500 to-primary-500 flex items-center justify-center text-white flex-shrink-0">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Privacy by Design</h3>
                <p className="text-xs text-space-400 mt-1">Built with privacy at the core</p>
              </div>
            </div>
            <div className="bg-space-950 border border-space-700/30 rounded-xl p-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent-500 to-primary-500 flex items-center justify-center text-white flex-shrink-0">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Data Encryption</h3>
                <p className="text-xs text-space-400 mt-1">End-to-end encryption</p>
              </div>
            </div>
            <div className="bg-space-950 border border-space-700/30 rounded-xl p-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent-500 to-primary-500 flex items-center justify-center text-white flex-shrink-0">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Full Transparency</h3>
                <p className="text-xs text-space-400 mt-1">Clear data practices</p>
              </div>
            </div>
          </div>
        </div>

        {/* Data We Process */}
        <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Data We Process
          </h2>
          <p className="text-space-400 mb-6">
            We process the following categories of personal data:
          </p>
          <div className="bg-space-900 border border-space-700/50 rounded-xl overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-space-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-space-300 uppercase tracking-wider w-8">#</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-space-300 uppercase tracking-wider">Data Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-space-300 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-space-900">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-900/50 text-primary-400 text-xs font-medium">1</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-white">Account Information</td>
                  <td className="px-6 py-4 text-sm text-space-400">Name, email address, company name, billing address</td>
                </tr>
                <tr className="bg-space-950">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-900/50 text-primary-400 text-xs font-medium">2</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-white">DNS Query Metadata</td>
                  <td className="px-6 py-4 text-sm text-space-400">Query domain, timestamp, query type, response code (IP addresses are anonymized)</td>
                </tr>
                <tr className="bg-space-900">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-900/50 text-primary-400 text-xs font-medium">3</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-white">Usage Data</td>
                  <td className="px-6 py-4 text-sm text-space-400">Dashboard interactions, feature usage, performance metrics</td>
                </tr>
                <tr className="bg-space-950">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-900/50 text-primary-400 text-xs font-medium">4</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-white">Payment Information</td>
                  <td className="px-6 py-4 text-sm text-space-400">Processed securely through Stripe (we do not store full credit card details)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Legal Basis for Processing */}
        <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Legal Basis for Processing
          </h2>
          <p className="text-space-400 mb-6">
            We process your personal data based on the following legal grounds:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-space-950 border border-space-700/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-primary-400"></div>
                <h3 className="text-sm font-semibold text-white">Contract Performance</h3>
              </div>
              <p className="text-xs text-space-400">Processing necessary to provide our DNS security service</p>
            </div>
            <div className="bg-space-950 border border-space-700/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-accent-400"></div>
                <h3 className="text-sm font-semibold text-white">Legitimate Interest</h3>
              </div>
              <p className="text-xs text-space-400">Security monitoring, fraud prevention, service improvement</p>
            </div>
            <div className="bg-space-950 border border-space-700/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-warning-400"></div>
                <h3 className="text-sm font-semibold text-white">Legal Obligation</h3>
              </div>
              <p className="text-xs text-space-400">Compliance with tax, accounting, and data retention laws</p>
            </div>
            <div className="bg-space-950 border border-space-700/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-success-400"></div>
                <h3 className="text-sm font-semibold text-white">Consent</h3>
              </div>
              <p className="text-xs text-space-400">Marketing communications (you can opt-out anytime)</p>
            </div>
          </div>
        </div>

        {/* Your Rights */}
        <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Your Rights
          </h2>
          <p className="text-space-400 mb-6">
            Under GDPR, you have the following rights regarding your personal data:
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-success-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <strong className="text-white">Right to Access:</strong>
                <span className="text-space-400"> Request a copy of your personal data we hold</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-success-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <strong className="text-white">Right to Rectification:</strong>
                <span className="text-space-400"> Correct inaccurate or incomplete data</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-success-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <strong className="text-white">Right to Erasure (Right to be Forgotten):</strong>
                <span className="text-space-400"> Request deletion of your data when no longer necessary</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-success-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <strong className="text-white">Right to Restriction:</strong>
                <span className="text-space-400"> Limit how we use your data under certain circumstances</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-success-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <strong className="text-white">Right to Data Portability:</strong>
                <span className="text-space-400"> Receive your data in a structured, machine-readable format</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-success-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <strong className="text-white">Right to Object:</strong>
                <span className="text-space-400"> Object to processing based on legitimate interests or direct marketing</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-success-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <strong className="text-white">Right to Withdraw Consent:</strong>
                <span className="text-space-400"> Withdraw consent at any time (does not affect prior processing)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Data Processing Agreement */}
        <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Data Processing Agreement
          </h2>
          <p className="text-space-400 mb-4">
            When you use Nebula DNS, we act as a data processor on your behalf. We have established a comprehensive Data Processing Agreement (DPA) that outlines:
          </p>
          <ul className="space-y-2 mb-4">
            <li className="flex items-start gap-2 text-space-400">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>The subject matter, duration, nature, and purpose of processing</span>
            </li>
            <li className="flex items-start gap-2 text-space-400">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>Types of personal data and categories of data subjects</span>
            </li>
            <li className="flex items-start gap-2 text-space-400">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>Our obligations and your rights as the data controller</span>
            </li>
            <li className="flex items-start gap-2 text-space-400">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>Security measures and data breach notification procedures</span>
            </li>
            <li className="flex items-start gap-2 text-space-400">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>Sub-processor management and international transfers</span>
            </li>
          </ul>
          <p className="text-space-400">
            Enterprise customers receive a signed DPA as part of their onboarding. Other customers can request a copy by contacting{' '}
            <a href="mailto:privacy@nebuladns.io" className="text-primary-400 hover:text-primary-300 transition-colors">
              privacy@nebuladns.io
            </a>
          </p>
        </div>

        {/* International Data Transfers */}
        <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            International Data Transfers
          </h2>
          <p className="text-space-400 mb-6">
            Our primary data centers are located in the European Union. When we transfer personal data outside the EU/EEA, we ensure adequate protection through:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-space-950 border border-space-700/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-primary-400"></div>
                <h3 className="text-sm font-semibold text-white">Standard Contractual Clauses</h3>
              </div>
              <p className="text-xs text-space-400">EU Commission-approved transfer mechanisms</p>
            </div>
            <div className="bg-space-950 border border-space-700/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-accent-400"></div>
                <h3 className="text-sm font-semibold text-white">Adequacy Decisions</h3>
              </div>
              <p className="text-xs text-space-400">Transfers to countries with adequate data protection</p>
            </div>
          </div>
        </div>

        {/* Data Protection Officer */}
        <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Data Protection Officer
          </h2>
          <p className="text-space-400 mb-4">
            We have appointed a Data Protection Officer (DPO) to oversee our GDPR compliance:
          </p>
          <div className="bg-space-950 border border-space-700/30 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <svg className="h-6 w-6 text-primary-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="font-semibold text-white mb-1">Email:</p>
                <a href="mailto:dpo@nebuladns.io" className="text-primary-400 hover:text-primary-300 transition-colors">
                  dpo@nebuladns.io
                </a>
                <p className="mt-3 text-sm text-space-400">
                  Our DPO is available to answer questions about our data practices and assist with exercising your rights.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* How to Exercise Your Rights */}
        <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            How to Exercise Your Rights
          </h2>
          <p className="text-space-400 mb-6">
            To exercise any of your GDPR rights:
          </p>
          <ol className="space-y-3 text-space-400 list-decimal list-inside mb-6">
            <li>Email <a href="mailto:privacy@nebuladns.io" className="text-primary-400 hover:text-primary-300 transition-colors">privacy@nebuladns.io</a> with your request</li>
            <li>Include your account email and specific right you wish to exercise</li>
            <li>We will verify your identity and respond within 30 days</li>
            <li>If needed, we may request additional information to confirm your identity</li>
          </ol>
          <div className="bg-primary-900/30 border border-primary-800/50 rounded-xl p-4 text-space-300">
            <strong className="text-white">Note:</strong> You also have the right to lodge a complaint with your local data protection authority if you believe we have not handled your data appropriately.
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="border-t border-space-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="bg-primary-900/30 border border-primary-800/50 rounded-xl p-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Privacy questions?
            </h2>
            <p className="text-space-400 mb-8">
              Our privacy team is here to help
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:privacy@nebuladns.io"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 text-white font-medium hover:from-primary-500 hover:to-accent-500 transition-all"
              >
                Contact Privacy Team
              </a>
              <Link
                href="/privacy"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-space-700/50 text-primary-400 hover:text-primary-300 hover:border-primary-700/50 font-medium transition-all"
              >
                View Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
