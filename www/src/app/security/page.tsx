// Nebula DNS - Security Practices Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import Link from 'next/link'

export default function SecurityPage() {
  const securityFeatures = [
    {
      title: 'End-to-End Encryption',
      description: 'All DNS queries are encrypted using TLS 1.3 with perfect forward secrecy. We support DNS-over-HTTPS (DoH) and DNS-over-TLS (DoT).',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
    },
    {
      title: 'Data Encryption at Rest',
      description: 'All stored data is encrypted using AES-256 encryption. Encryption keys are managed with industry-standard key rotation policies.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
        </svg>
      ),
    },
    {
      title: 'Infrastructure Security',
      description: 'Our infrastructure runs on hardened, regularly patched systems. All services operate in isolated containers with minimal attack surface.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
    },
    {
      title: 'Zero-Knowledge Architecture',
      description: 'Your DNS policies and custom lists are encrypted client-side. We cannot access your sensitive filtering configurations.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
        </svg>
      ),
    },
    {
      title: 'Regular Security Audits',
      description: 'Independent third-party security audits are conducted annually. Penetration testing occurs quarterly by certified professionals.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
      ),
    },
    {
      title: 'DDoS Protection',
      description: 'Multi-layered DDoS mitigation protects against volumetric and application-layer attacks, ensuring 99.99% uptime.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
        </svg>
      ),
    },
    {
      title: 'Access Control',
      description: 'Role-based access control (RBAC) with multi-factor authentication (MFA) and single sign-on (SSO) support via SAML.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
    },
    {
      title: 'Comprehensive Logging',
      description: 'All administrative actions and policy changes are logged immutably. Full audit trails available for compliance reviews.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
    },
    {
      title: 'Bug Bounty Program',
      description: 'Our responsible disclosure program rewards security researchers who help us identify and fix vulnerabilities.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]

  const complianceItems = [
    {
      name: 'SOC 2 Type II',
      status: 'In Progress',
      description: 'Expected certification Q2 2026',
    },
    {
      name: 'GDPR Compliant',
      status: 'Certified',
      description: 'Full compliance with EU data regulations',
    },
    {
      name: 'ISO 27001',
      status: 'In Progress',
      description: 'Information security management certification',
    },
    {
      name: 'CCPA Compliant',
      status: 'Certified',
      description: 'California Consumer Privacy Act compliance',
    },
  ]

  return (
    <div className="bg-white dark:bg-space-900 transition-colors">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-medium mb-6">
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            Enterprise-Grade Security
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-space-900 dark:text-white">
            Security First, Always
          </h1>
          <p className="mt-4 text-lg text-space-600 dark:text-space-300 max-w-3xl mx-auto">
            Your trust is our top priority. We implement industry-leading security practices to protect your data,
            ensure privacy, and maintain the highest standards of operational security.
          </p>
        </div>
      </div>

      {/* Security Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-space-900 dark:text-white">
            Comprehensive Security Architecture
          </h2>
          <p className="mt-4 text-lg text-space-600 dark:text-space-300 max-w-2xl mx-auto">
            Multi-layered security controls protecting your DNS infrastructure and data.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {securityFeatures.map((feature, index) => (
            <div
              key={index}
              className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-6 hover:shadow-lg transition-all"
            >
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-space-600 dark:text-space-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Data Privacy Section */}
      <div className="bg-space-50 dark:bg-space-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-space-900 dark:text-white mb-6">
                Your Privacy is Non-Negotiable
              </h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-success-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="ml-3 text-space-600 dark:text-space-300">
                    <strong className="text-space-900 dark:text-white">No DNS Query Logging:</strong> We do not log individual DNS queries in a way that can be traced back to users.
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-success-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="ml-3 text-space-600 dark:text-space-300">
                    <strong className="text-space-900 dark:text-white">No Data Selling:</strong> Your data is never sold, shared, or monetized. We make money from subscriptions, not data.
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-success-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="ml-3 text-space-600 dark:text-space-300">
                    <strong className="text-space-900 dark:text-white">Minimal Data Retention:</strong> Analytics are aggregated and anonymized. Personal data is retained only as long as necessary.
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-success-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="ml-3 text-space-600 dark:text-space-300">
                    <strong className="text-space-900 dark:text-white">Data Portability:</strong> Export your data anytime in standard formats. No vendor lock-in.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-space-900 rounded-xl border border-space-200 dark:border-space-700 p-8">
              <h3 className="text-xl font-bold text-space-900 dark:text-white mb-4">
                Privacy by Design
              </h3>
              <p className="text-space-600 dark:text-space-400 mb-6">
                Privacy is built into every layer of our architecture, not added as an afterthought. We follow
                the principle of data minimization and enforce strict access controls.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center text-sm text-space-600 dark:text-space-400">
                  <span className="h-2 w-2 bg-indigo-500 rounded-full mr-3"></span>
                  Anonymous DNS query handling
                </li>
                <li className="flex items-center text-sm text-space-600 dark:text-space-400">
                  <span className="h-2 w-2 bg-indigo-500 rounded-full mr-3"></span>
                  Encrypted backups with customer-controlled keys
                </li>
                <li className="flex items-center text-sm text-space-600 dark:text-space-400">
                  <span className="h-2 w-2 bg-indigo-500 rounded-full mr-3"></span>
                  Regular privacy impact assessments
                </li>
                <li className="flex items-center text-sm text-space-600 dark:text-space-400">
                  <span className="h-2 w-2 bg-indigo-500 rounded-full mr-3"></span>
                  Transparent data processing policies
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-space-900 dark:text-white">
            Compliance & Certifications
          </h2>
          <p className="mt-4 text-lg text-space-600 dark:text-space-300 max-w-2xl mx-auto">
            Meeting and exceeding regulatory requirements and industry standards.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {complianceItems.map((item, index) => (
            <div
              key={index}
              className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-6 text-center"
            >
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 mb-4">
                <svg className="h-8 w-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-space-900 dark:text-white mb-2">
                {item.name}
              </h3>
              <div className="mb-3">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    item.status === 'Certified'
                      ? 'bg-success-100 dark:bg-success-900/50 text-success-700 dark:text-success-300'
                      : 'bg-warning-100 dark:bg-warning-900/50 text-warning-700 dark:text-warning-300'
                  }`}
                >
                  {item.status}
                </span>
              </div>
              <p className="text-sm text-space-600 dark:text-space-400">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Penetration Testing Section */}
      <div className="bg-space-50 dark:bg-space-800 py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-space-900 rounded-2xl border border-space-200 dark:border-space-700 p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-4">
                  Continuous Security Testing
                </h2>
                <p className="text-space-600 dark:text-space-400 mb-6">
                  We partner with leading security firms to conduct regular penetration tests and vulnerability assessments.
                  Our infrastructure is continuously monitored for threats and anomalies.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start text-sm">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold mr-3">1</span>
                    <span className="text-space-600 dark:text-space-400">Quarterly penetration testing by certified ethical hackers</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold mr-3">2</span>
                    <span className="text-space-600 dark:text-space-400">Automated vulnerability scanning and patch management</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold mr-3">3</span>
                    <span className="text-space-600 dark:text-space-400">24/7 security operations center (SOC) monitoring</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold mr-3">4</span>
                    <span className="text-space-600 dark:text-space-400">Incident response team with &lt;15 minute response time</span>
                  </li>
                </ul>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-8">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white mb-4">
                    <svg className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-space-900 dark:text-white mb-2">
                    Bug Bounty Program
                  </h3>
                  <p className="text-space-600 dark:text-space-400 mb-4">
                    Rewards up to <strong className="text-space-900 dark:text-white">$10,000</strong> for critical vulnerabilities
                  </p>
                  <Link
                    href="/security/bug-bounty"
                    className="inline-flex items-center text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                  >
                    View Program Details
                    <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Need More Security Details?
          </h2>
          <p className="text-lg text-indigo-100 mb-8 max-w-2xl mx-auto">
            Download our comprehensive security whitepaper or schedule a call with our security team
            to discuss your specific compliance requirements.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact?subject=security-whitepaper"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white text-indigo-600 font-medium hover:bg-space-100 transition-all"
            >
              Request Security Whitepaper
            </Link>
            <Link
              href="/contact?subject=security-consultation"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-transparent border-2 border-white text-white font-medium hover:bg-white/10 transition-all"
            >
              Talk to Security Team
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
