// Flux Shield - Enterprise Offering Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import Link from 'next/link'

export default function EnterprisePage() {
  const enterpriseFeatures = [
    {
      title: 'Dedicated Support',
      description: 'Assigned customer success manager with direct contact. Priority support with guaranteed response times and 24/7 emergency assistance.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
      color: 'from-primary-600 to-primary-500',
    },
    {
      title: 'Custom SLAs',
      description: 'Tailored service level agreements with 99.99% uptime guarantee, defined response times, and financial credits for downtime.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
      ),
      color: 'from-accent-600 to-accent-500',
    },
    {
      title: 'SSO & SAML Integration',
      description: 'Enterprise identity provider integration with Okta, Azure AD, Google Workspace, and custom SAML/OIDC providers.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
        </svg>
      ),
      color: 'from-primary-600 to-primary-500',
    },
    {
      title: 'Volume Licensing',
      description: 'Flexible licensing models with unlimited users, locations, and queries. Multi-year contracts with discounted pricing available.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
        </svg>
      ),
      color: 'from-accent-600 to-accent-500',
    },
    {
      title: 'Custom Branding',
      description: 'White-label options with custom block pages, branded portals, and personalized DNS resolver hostnames for your organization.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
        </svg>
      ),
      color: 'from-primary-600 to-primary-500',
    },
    {
      title: 'Priority Onboarding',
      description: 'Dedicated onboarding team to migrate your existing infrastructure, train your team, and ensure smooth deployment at scale.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
      ),
      color: 'from-accent-600 to-accent-500',
    },
    {
      title: 'Advanced API Access',
      description: 'Full REST API access with higher rate limits, webhook integrations, and SIEM connectors for centralized security monitoring.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
        </svg>
      ),
      color: 'from-primary-600 to-primary-500',
    },
    {
      title: 'Compliance Support',
      description: 'Assistance with HIPAA, PCI-DSS, SOC 2, and other compliance requirements. Regular compliance reports and audit support.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
      color: 'from-accent-600 to-accent-500',
    },
  ]

  const testimonials = [
    {
      quote: "Flux Shield has transformed our security posture. The enterprise support team is phenomenal and the platform scales effortlessly across our global infrastructure.",
      author: "Sarah Chen",
      role: "CISO",
      company: "TechCorp Global",
      initials: "SC",
    },
    {
      quote: "We migrated from our legacy DNS security solution in under 48 hours. The custom SLA and dedicated support gave us confidence to make the switch.",
      author: "Michael Rodriguez",
      role: "VP of Infrastructure",
      company: "FinanceHub",
      initials: "MR",
    },
    {
      quote: "The SSO integration and compliance support were game-changers. Flux Shield understood our regulatory requirements and delivered exactly what we needed.",
      author: "Dr. Emily Watson",
      role: "Head of IT Security",
      company: "HealthFirst Medical",
      initials: "EW",
    },
  ]

  const comparisonItems = [
    { feature: 'Locations', pro: '10', enterprise: 'Unlimited' },
    { feature: 'DNS Queries/Month', pro: '5M', enterprise: 'Unlimited' },
    { feature: 'Team Members', pro: '25', enterprise: 'Unlimited' },
    { feature: 'Support Response Time', pro: '24 hours', enterprise: '1 hour (critical)' },
    { feature: 'Uptime SLA', pro: '99.9%', enterprise: '99.99%' },
    { feature: 'SSO/SAML', pro: false, enterprise: true },
    { feature: 'Custom Branding', pro: false, enterprise: true },
    { feature: 'Dedicated Account Manager', pro: false, enterprise: true },
  ]

  const migrationPhases = [
    { week: 'Week 1', task: 'Discovery & Planning', description: 'Assess current setup and plan migration strategy' },
    { week: 'Week 2', task: 'Policy Import & Testing', description: 'Import policies and validate in staging environment' },
    { week: 'Week 3', task: 'Phased Rollout', description: 'Deploy to pilot locations and monitor performance' },
    { week: 'Week 4', task: 'Full Production', description: 'Complete rollout and decommission legacy systems' },
  ]

  return (
    <div className="bg-space-950 min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden py-24">
        {/* Nebula orbs */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-900/50 text-primary-300 border border-primary-800/50 mb-6">
            Enterprise Solutions
          </span>
          <h1 className="text-5xl sm:text-6xl font-bold mb-6 leading-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400">
              Enterprise-Grade
            </span>
            <br />
            <span className="text-white">DNS Security</span>
          </h1>
          <p className="text-xl text-space-400 max-w-3xl mx-auto mb-10">
            Scale-ready DNS security with dedicated support, custom SLAs, and full enterprise integrations.
            Protect thousands of users across global locations with confidence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact?subject=enterprise-demo"
              className="bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-glow hover:shadow-glow-lg rounded-xl font-semibold px-6 py-3 transition-all inline-flex items-center gap-2 justify-center"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
              Request Demo
            </Link>
            <Link
              href="/contact?subject=enterprise-sales"
              className="bg-space-800 border border-space-700 text-white hover:bg-space-700 rounded-xl font-semibold px-6 py-3 transition-all inline-flex items-center gap-2 justify-center"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
              Talk to Sales
            </Link>
          </div>

          {/* Trust signals */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-8 text-space-500 text-sm">
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 text-success-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              99.99% SLA uptime
            </span>
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 text-success-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              SOC 2 Type II certified
            </span>
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 text-success-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              1-hour critical response
            </span>
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 text-success-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              HIPAA &amp; PCI-DSS ready
            </span>
          </div>
        </div>
      </div>

      {/* Enterprise Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <p className="text-primary-400 text-xs font-semibold tracking-widest uppercase mb-3">CAPABILITIES</p>
          <h2 className="text-4xl font-bold text-white mb-4">
            Everything You Need at Enterprise Scale
          </h2>
          <p className="text-space-400 text-lg max-w-2xl mx-auto">
            Built for organizations that require maximum reliability, security, and customization.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {enterpriseFeatures.map((feature, index) => (
            <div
              key={index}
              className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6 flex gap-5 hover:border-primary-700/50 transition-all"
            >
              <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white flex-shrink-0`}>
                {feature.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-space-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div className="border-t border-space-800/50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-primary-400 text-xs font-semibold tracking-widest uppercase mb-3">TESTIMONIALS</p>
            <h2 className="text-4xl font-bold text-white mb-4">
              Trusted by Enterprise Teams Worldwide
            </h2>
            <p className="text-space-400 text-lg">
              See what our enterprise customers have to say.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-8 flex flex-col"
              >
                {/* Large quote mark */}
                <div className="text-6xl font-serif text-primary-800 leading-none mb-4 select-none">&ldquo;</div>
                <p className="text-space-300 leading-relaxed flex-1 mb-6">
                  {testimonial.quote}
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-space-800">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {testimonial.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">{testimonial.author}</div>
                    <div className="text-space-500 text-xs">{testimonial.role} &middot; {testimonial.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pro vs Enterprise Comparison */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <p className="text-primary-400 text-xs font-semibold tracking-widest uppercase mb-3">COMPARISON</p>
          <h2 className="text-4xl font-bold text-white mb-4">
            Professional vs Enterprise
          </h2>
          <p className="text-space-400 text-lg">
            See how Enterprise compares to our Professional plan.
          </p>
        </div>

        <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-3 border-b border-space-800">
            <div className="p-5">
              <span className="text-space-400 text-sm font-medium">Feature</span>
            </div>
            <div className="p-5 text-center border-l border-space-800">
              <span className="text-white font-semibold">Professional</span>
            </div>
            <div className="p-5 text-center border-l border-space-800 bg-primary-900/20">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400 font-semibold">Enterprise</span>
            </div>
          </div>

          {comparisonItems.map((item, index) => (
            <div
              key={index}
              className={`grid grid-cols-3 border-b border-space-800/50 last:border-b-0 ${index % 2 === 1 ? 'bg-space-900/30' : ''}`}
            >
              <div className="p-4 flex items-center">
                <span className="text-space-300 text-sm">{item.feature}</span>
              </div>
              <div className="p-4 text-center border-l border-space-800/50 flex items-center justify-center">
                {typeof item.pro === 'boolean' ? (
                  item.pro ? (
                    <svg className="h-5 w-5 text-success-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-space-700 text-lg">—</span>
                  )
                ) : (
                  <span className="text-space-400 text-sm">{item.pro}</span>
                )}
              </div>
              <div className="p-4 text-center border-l border-space-800/50 bg-primary-900/10 flex items-center justify-center">
                {typeof item.enterprise === 'boolean' ? (
                  item.enterprise ? (
                    <svg className="h-5 w-5 text-success-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-space-700 text-lg">—</span>
                  )
                ) : (
                  <span className="text-primary-300 text-sm font-medium">{item.enterprise}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1 text-primary-400 hover:text-primary-300 font-medium transition-colors"
          >
            See full feature comparison
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Migration Timeline */}
      <div className="border-t border-space-800/50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Migration benefits */}
            <div>
              <p className="text-primary-400 text-xs font-semibold tracking-widest uppercase mb-3">MIGRATION</p>
              <h2 className="text-4xl font-bold text-white mb-6">
                Seamless Migration from Legacy Solutions
              </h2>
              <p className="text-space-400 mb-8 leading-relaxed">
                Our enterprise onboarding team has migrated hundreds of organizations from legacy DNS security
                providers. We handle the complexity so your team can focus on what matters.
              </p>
              <ul className="space-y-5">
                {[
                  { label: 'Policy Migration', detail: 'Automated import of existing policies and block lists' },
                  { label: 'Zero Downtime', detail: 'Phased rollout with parallel operation during transition' },
                  { label: 'Team Training', detail: 'Comprehensive onboarding sessions for your security team' },
                  { label: 'Post-Migration Support', detail: '90-day enhanced support period after go-live' },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-success-900/50 border border-success-700/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="h-3.5 w-3.5 text-success-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-white font-medium">{item.label}:</span>
                      <span className="text-space-400"> {item.detail}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Migration timeline card */}
            <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-white mb-8 text-center">
                Migration Timeline
              </h3>
              <div className="space-y-0">
                {migrationPhases.map((phase, index) => (
                  <div key={index} className="flex items-start gap-4 relative">
                    {/* Connector line */}
                    {index < migrationPhases.length - 1 && (
                      <div className="absolute left-5 top-10 bottom-0 w-px bg-space-700" />
                    )}
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-600 to-primary-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 relative z-10">
                      {index + 1}
                    </div>
                    <div className="pb-8">
                      <div className="font-semibold text-white text-sm">
                        {phase.week}: {phase.task}
                      </div>
                      <div className="text-space-400 text-sm mt-1">
                        {phase.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24">
        <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-12 text-center relative overflow-hidden">
          {/* Orb */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <p className="text-primary-400 text-xs font-semibold tracking-widest uppercase mb-4">GET STARTED</p>
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Secure Your Enterprise?
            </h2>
            <p className="text-space-400 text-lg mb-8 max-w-2xl mx-auto">
              Talk to our enterprise sales team to discuss your requirements, get a custom quote,
              and schedule a personalized demo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact?subject=enterprise-demo"
                className="bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-glow hover:shadow-glow-lg rounded-xl font-semibold px-6 py-3 transition-all inline-flex items-center gap-2 justify-center"
              >
                Schedule a Demo
              </Link>
              <Link
                href="/contact?subject=enterprise-quote"
                className="bg-space-800 border border-space-700 text-white hover:bg-space-700 rounded-xl font-semibold px-6 py-3 transition-all inline-flex items-center gap-2 justify-center"
              >
                Request a Quote
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
