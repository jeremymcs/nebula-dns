// Flux Shield - Security Practices Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import Link from 'next/link'
import { MarketingPageShell, MarketingCard } from '@/components/marketing/MarketingPageShell'
import { MarketingPageHero, MarketingSerifAccent } from '@/components/marketing/MarketingPageHero'
import { MarketingCtaBand } from '@/components/marketing/MarketingCtaBand'

const securityFeatures = [
  {
    title: 'End-to-End Encryption',
    description: 'All DNS queries are encrypted using TLS 1.3 with perfect forward secrecy. We support DNS-over-HTTPS (DoH) and DNS-over-TLS (DoT).',
    variant: 'purple',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    title: 'Data Encryption at Rest',
    description: 'All stored data is encrypted using AES-256. Encryption keys are managed with industry-standard rotation policies and hardware security modules.',
    variant: 'cyan',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      </svg>
    ),
  },
  {
    title: 'Infrastructure Security',
    description: 'Our infrastructure runs on hardened, regularly patched systems. All services operate in isolated containers with minimal attack surface.',
    variant: 'purple',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: 'Zero-Knowledge DNS',
    description: 'Your DNS policies and custom lists are encrypted client-side. We cannot access your sensitive filtering configurations.',
    variant: 'cyan',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
      </svg>
    ),
  },
  {
    title: 'Third-Party Audits',
    description: 'Independent third-party security audits are conducted annually. Penetration testing occurs quarterly by certified ethical hackers.',
    variant: 'purple',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
  },
  {
    title: 'DDoS Protection',
    description: 'Multi-layered DDoS mitigation protects against volumetric and application-layer attacks, ensuring our 99.99% uptime commitment.',
    variant: 'cyan',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
      </svg>
    ),
  },
  {
    title: 'Role-Based Access Control',
    description: 'Granular RBAC with multi-factor authentication and single sign-on via SAML. Every action scoped to the right user, the right tenant.',
    variant: 'purple',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    title: 'Audit Logging',
    description: 'All administrative actions and policy changes are logged immutably. Full audit trails for compliance reviews and forensic analysis.',
    variant: 'cyan',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    title: 'Bug Bounty Program',
    description: 'Our responsible disclosure program rewards security researchers who help us identify and fix vulnerabilities before they can be exploited.',
    variant: 'purple',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Compliance Framework',
    description: 'Built to support SOC 2, GDPR, ISO 27001, and CCPA requirements. We make compliance documentation available to enterprise customers on request.',
    variant: 'cyan',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
    ),
  },
]

const privacyCommitments = [
  {
    title: 'No DNS Query Logging',
    description: 'We do not log individual DNS queries in a way that can be traced back to specific users.',
  },
  {
    title: 'No Data Selling',
    description: 'Your data is never sold, shared, or monetized. We make money from subscriptions, not from you.',
  },
  {
    title: 'Minimal Data Retention',
    description: 'Analytics are aggregated and anonymized. Personal data is retained only as long as necessary.',
  },
  {
    title: 'Data Portability',
    description: 'Export your data at any time in standard formats. No vendor lock-in, ever.',
  },
]

const complianceItems = [
  {
    name: 'SOC 2 Type II',
    status: 'In Progress',
    statusColor: 'text-warning-400 bg-warning-900/40 border border-warning-800/50',
    description: 'Expected certification Q2 2026',
    icon: (
      <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    name: 'GDPR',
    status: 'Compliant',
    statusColor: 'text-success-400 bg-success-900/40 border border-success-800/50',
    description: 'Full compliance with EU data regulations',
    icon: (
      <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253M3.284 14.253A8.959 8.959 0 013 12c0-1.617.428-3.13 1.157-4.418" />
      </svg>
    ),
  },
  {
    name: 'ISO 27001',
    status: 'In Progress',
    statusColor: 'text-warning-400 bg-warning-900/40 border border-warning-800/50',
    description: 'Information security management certification',
    icon: (
      <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
      </svg>
    ),
  },
  {
    name: 'CCPA',
    status: 'Compliant',
    statusColor: 'text-success-400 bg-success-900/40 border border-success-800/50',
    description: 'California Consumer Privacy Act compliance',
    icon: (
      <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
]

export default function SecurityPage() {
  return (
    <MarketingPageShell>
      <MarketingPageHero
        eyebrow="Security"
        title={<>How We <MarketingSerifAccent>Protect</MarketingSerifAccent> Your Data</>}
        lede="Industry-leading security practices, encryption, and compliance built into every layer of Flux Shield."
      >
      </MarketingPageHero>


      {/* Hero */}
      <div className="relative py-16 sm:py-20 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-accent-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative section-container text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-900/50 border border-primary-800/50 text-primary-400 text-sm font-medium mb-6">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            Enterprise-Grade Security
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400">
              Security-First
            </span>{' '}
            Platform
          </h1>
          <p className="mt-6 text-lg text-[var(--fs-txt)] max-w-3xl mx-auto">
            Your trust is our foundation. Every layer of Flux Shield is built with security as a first principle — not an afterthought. We protect your data, preserve your privacy, and maintain the highest standards of operational security.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact?subject=security-whitepaper"
              className="fs-btn fs-btn-primary fs-btn-lg no-underline px-6 py-3 transition-all inline-flex items-center gap-2"
            >
              Request Security Whitepaper
            </Link>
            <Link
              href="/contact?subject=security-consultation"
              className="border border-space-700 text-[var(--fs-txt)] hover:text-white hover:border-space-500 rounded-xl font-semibold px-6 py-3 transition-all inline-flex items-center gap-2"
            >
              Talk to Our Security Team
            </Link>
          </div>
        </div>
      </div>

      {/* Security Features Grid */}
      <div className="py-16 sm:py-20 border-t border-[var(--fs-line)]">
        <div className="section-container">
          <div className="text-center mb-16">
            <p className="fs-eyebrow mb-3">
              SECURITY ARCHITECTURE
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-ink">
              Comprehensive Security at Every Layer
            </h2>
            <p className="mt-4 text-[var(--fs-txt)] max-w-2xl mx-auto">
              Multi-layered security controls protecting your DNS infrastructure, your data, and your users.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {securityFeatures.map((feature, index) => (
              <div
                key={index}
                className="fs-card rounded-[14px] p-6 hover:border-primary-700/40 transition-all"
              >
                <div
                  className={
                    feature.variant === 'purple'
                      ? 'h-12 w-12 rounded-xl bg-primary-900/50 border border-primary-800/50 flex items-center justify-center text-primary-400 mb-4'
                      : 'h-12 w-12 rounded-xl bg-accent-900/50 border border-accent-800/50 flex items-center justify-center text-accent-400 mb-4'
                  }
                >
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-ink mb-2">
                  {feature.title}
                </h3>
                <p className="text-[var(--fs-txt)] text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data Privacy */}
      <div className="py-16 sm:py-20">
        <div className="section-container">
          <div className="text-center mb-16">
            <p className="fs-eyebrow mb-3">
              DATA PRIVACY
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-ink">
              Your Privacy is Non-Negotiable
            </h2>
            <p className="mt-4 text-[var(--fs-txt)] max-w-2xl mx-auto">
              Privacy is built into every layer of our architecture, not added as an afterthought.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {privacyCommitments.map((item, index) => (
              <div
                key={index}
                className="fs-card rounded-[14px] p-6 flex items-start gap-4"
              >
                <div className="shrink-0 mt-0.5">
                  <svg className="h-5 w-5 text-success-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                  <p className="text-[var(--fs-txt)] text-sm leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Compliance Badges */}
      <div className="py-16 sm:py-20 border-t border-[var(--fs-line)]">
        <div className="section-container">
          <div className="text-center mb-16">
            <p className="fs-eyebrow mb-3">
              COMPLIANCE
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-ink">
              Meeting the Highest Standards
            </h2>
            <p className="mt-4 text-[var(--fs-txt)] max-w-2xl mx-auto">
              Designed to meet and exceed global regulatory requirements and industry certifications.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {complianceItems.map((item, index) => (
              <div
                key={index}
                className="fs-card rounded-[14px] p-6 text-center"
              >
                <div className="h-14 w-14 rounded-xl bg-primary-900/50 border border-primary-800/50 flex items-center justify-center text-primary-400 mx-auto mb-4">
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-ink mb-2">
                  {item.name}
                </h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold mb-3 ${item.statusColor}`}>
                  {item.status}
                </span>
                <p className="text-[var(--fs-txt)] text-sm">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bug Bounty */}
      <div className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="fs-card rounded-[14px] p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <p className="fs-eyebrow mb-3">
                  BUG BOUNTY
                </p>
                <h2 className="text-3xl font-bold text-white mb-4">
                  We Reward Responsible Disclosure
                </h2>
                <p className="text-[var(--fs-txt)] mb-6 leading-relaxed">
                  We partner with the security research community to continuously improve our defenses. Report a vulnerability and we'll work with you to fix it — and compensate you for your effort.
                </p>
                <div className="space-y-3">
                  {[
                    { label: 'Critical vulnerabilities', reward: 'Up to $10,000' },
                    { label: 'High severity issues', reward: 'Up to $5,000' },
                    { label: 'Medium severity issues', reward: 'Up to $1,000' },
                    { label: 'Low severity / informational', reward: 'Up to $250' },
                  ].map((tier, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-[var(--fs-txt)]">{tier.label}</span>
                      <span className="text-white font-semibold">{tier.reward}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-8">
                  <Link
                    href="/contact?subject=bug-bounty"
                    className="fs-btn fs-btn-primary fs-btn-lg no-underline px-6 py-3 transition-all inline-flex items-center gap-2"
                  >
                    Submit a Report
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                </div>
              </div>
              <div className="bg-space-950/60 border border-space-700/50 rounded-2xl p-8 text-center">
                <div className="h-16 w-16 rounded-xl bg-primary-900/50 border border-primary-800/50 flex items-center justify-center text-primary-400 mx-auto mb-4">
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400 mb-2">
                  $10,000
                </div>
                <p className="text-[var(--fs-txt)] text-sm">maximum reward for critical vulnerabilities</p>
                <div className="mt-6 pt-6 border-t border-space-700/50 text-left space-y-2">
                  <p className="text-xs text-[var(--fs-txt)] font-semibold uppercase tracking-wider mb-3">In-scope targets</p>
                  {['api.shield.fluxlabs.net', 'app.shield.fluxlabs.net', 'DNS infrastructure', 'Authentication systems'].map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-[var(--fs-txt)]">
                      <svg className="h-3.5 w-3.5 text-success-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-16 sm:py-20 border-t border-[var(--fs-line)] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary-700/10 rounded-full blur-3xl" />
        </div>
        <div className="relative section-container text-center">
          <p className="fs-eyebrow mb-4">
            OUR FOUNDATION
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-ink mb-4">
            Security is our{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400">
              foundation
            </span>
          </h2>
          <p className="text-[var(--fs-txt)] max-w-2xl mx-auto mb-8">
            Have questions about our security posture, compliance certifications, or want to review our full security documentation? Our security team is ready to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact?subject=security-whitepaper"
              className="fs-btn fs-btn-primary fs-btn-lg no-underline px-6 py-3 transition-all inline-flex items-center gap-2"
            >
              Request Security Whitepaper
            </Link>
            <Link
              href="/contact?subject=security-consultation"
              className="border border-space-700 text-[var(--fs-txt)] hover:text-white hover:border-space-500 rounded-xl font-semibold px-6 py-3 transition-all inline-flex items-center gap-2"
            >
              Schedule a Security Review
            </Link>
          </div>
        </div>
      </div>
    </MarketingPageShell>
  )
}
