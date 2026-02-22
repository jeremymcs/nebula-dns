// Nebula DNS - Enterprise Offering Page
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
    },
    {
      title: 'Custom SLAs',
      description: 'Tailored service level agreements with 99.99% uptime guarantee, defined response times, and financial credits for downtime.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
      ),
    },
    {
      title: 'SSO & SAML Integration',
      description: 'Enterprise identity provider integration with Okta, Azure AD, Google Workspace, and custom SAML/OIDC providers.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
        </svg>
      ),
    },
    {
      title: 'Volume Licensing',
      description: 'Flexible licensing models with unlimited users, locations, and queries. Multi-year contracts with discounted pricing available.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
        </svg>
      ),
    },
    {
      title: 'Custom Branding',
      description: 'White-label options with custom block pages, branded portals, and personalized DNS resolver hostnames for your organization.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
        </svg>
      ),
    },
    {
      title: 'Priority Onboarding',
      description: 'Dedicated onboarding team to migrate your existing infrastructure, train your team, and ensure smooth deployment at scale.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
      ),
    },
    {
      title: 'Advanced API Access',
      description: 'Full REST API access with higher rate limits, webhook integrations, and SIEM connectors for centralized security monitoring.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
        </svg>
      ),
    },
    {
      title: 'Compliance Support',
      description: 'Assistance with HIPAA, PCI-DSS, SOC 2, and other compliance requirements. Regular compliance reports and audit support.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
    },
  ]

  const testimonials = [
    {
      quote: "Nebula DNS has transformed our security posture. The enterprise support team is phenomenal and the platform scales effortlessly across our global infrastructure.",
      author: "Sarah Chen",
      role: "CISO",
      company: "TechCorp Global",
      logo: "TC",
    },
    {
      quote: "We migrated from our legacy DNS security solution in under 48 hours. The custom SLA and dedicated support gave us confidence to make the switch.",
      author: "Michael Rodriguez",
      role: "VP of Infrastructure",
      company: "FinanceHub",
      logo: "FH",
    },
    {
      quote: "The SSO integration and compliance support were game-changers. Nebula DNS understood our regulatory requirements and delivered exactly what we needed.",
      author: "Dr. Emily Watson",
      role: "Head of IT Security",
      company: "HealthFirst Medical",
      logo: "HF",
    },
  ]

  const comparisonItems = [
    { feature: 'Locations', pro: '10', enterprise: 'Unlimited' },
    { feature: 'DNS Queries/Month', pro: '5M', enterprise: 'Unlimited' },
    { feature: 'Team Members', pro: '25', enterprise: 'Unlimited' },
    { feature: 'Support Response Time', pro: '24 hours', enterprise: '1 hour (critical)' },
    { feature: 'Uptime SLA', pro: '99.9%', enterprise: '99.99%' },
    { feature: 'SSO/SAML', pro: '-', enterprise: 'Included' },
    { feature: 'Custom Branding', pro: '-', enterprise: 'Included' },
    { feature: 'Dedicated Account Manager', pro: '-', enterprise: 'Included' },
  ]

  return (
    <div className="bg-white dark:bg-space-900 transition-colors">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-medium mb-6">
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
              </svg>
              Enterprise Solutions
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-space-900 dark:text-white">
              DNS Security for Enterprise
            </h1>
            <p className="mt-4 text-lg text-space-600 dark:text-space-300 max-w-3xl mx-auto">
              Scale-ready DNS security with enterprise-grade features, dedicated support, and custom SLAs.
              Protect thousands of users across global locations with confidence.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact?subject=enterprise-sales"
                className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 transition-all"
              >
                Talk to Sales
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-white dark:bg-space-800 text-space-900 dark:text-white border border-space-200 dark:border-space-700 font-medium hover:bg-space-50 dark:hover:bg-space-700 transition-all"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Enterprise Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-space-900 dark:text-white">
            Everything You Need at Enterprise Scale
          </h2>
          <p className="mt-4 text-lg text-space-600 dark:text-space-300 max-w-2xl mx-auto">
            Built for organizations that require maximum reliability, security, and customization.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {enterpriseFeatures.map((feature, index) => (
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
              <p className="text-sm text-space-600 dark:text-space-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div className="bg-space-50 dark:bg-space-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-space-900 dark:text-white">
              Trusted by Enterprise Teams Worldwide
            </h2>
            <p className="mt-4 text-lg text-space-600 dark:text-space-300">
              See what our enterprise customers have to say.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white dark:bg-space-900 rounded-xl border border-space-200 dark:border-space-700 p-8"
              >
                <div className="flex items-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                    {testimonial.logo}
                  </div>
                  <div className="ml-4">
                    <div className="font-semibold text-space-900 dark:text-white">
                      {testimonial.author}
                    </div>
                    <div className="text-sm text-space-500 dark:text-space-400">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
                <p className="text-space-600 dark:text-space-300 italic">
                  "{testimonial.quote}"
                </p>
                <div className="mt-4 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                  {testimonial.company}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pro vs Enterprise Comparison */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-space-900 dark:text-white">
            Professional vs Enterprise
          </h2>
          <p className="mt-4 text-lg text-space-600 dark:text-space-300">
            See how Enterprise compares to our Professional plan.
          </p>
        </div>

        <div className="bg-white dark:bg-space-800 rounded-2xl border border-space-200 dark:border-space-700 overflow-hidden">
          <div className="grid grid-cols-3 gap-px bg-space-200 dark:bg-space-700">
            <div className="bg-white dark:bg-space-800 p-6">
              <h3 className="font-semibold text-space-900 dark:text-white">Feature</h3>
            </div>
            <div className="bg-white dark:bg-space-800 p-6 text-center">
              <h3 className="font-semibold text-space-900 dark:text-white">Professional</h3>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-6 text-center">
              <h3 className="font-semibold text-indigo-700 dark:text-indigo-300">Enterprise</h3>
            </div>
          </div>

          {comparisonItems.map((item, index) => (
            <div key={index} className="grid grid-cols-3 gap-px bg-space-200 dark:bg-space-700">
              <div className="bg-white dark:bg-space-800 p-4">
                <span className="text-space-900 dark:text-white">{item.feature}</span>
              </div>
              <div className="bg-white dark:bg-space-800 p-4 text-center">
                <span className="text-space-600 dark:text-space-400">{item.pro}</span>
              </div>
              <div className="bg-white dark:bg-space-800 p-4 text-center">
                <span className="font-medium text-indigo-600 dark:text-indigo-400">{item.enterprise}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
          >
            See full feature comparison
            <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Migration Support */}
      <div className="bg-space-50 dark:bg-space-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-space-900 dark:text-white mb-6">
                Seamless Migration from Legacy Solutions
              </h2>
              <p className="text-space-600 dark:text-space-400 mb-6">
                Our enterprise onboarding team has migrated hundreds of organizations from legacy DNS security
                providers. We handle the complexity so your team can focus on what matters.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <svg className="h-6 w-6 text-success-500 flex-shrink-0 mr-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <strong className="text-space-900 dark:text-white">Policy Migration:</strong>
                    <span className="text-space-600 dark:text-space-400"> Automated import of existing policies and block lists</span>
                  </div>
                </li>
                <li className="flex items-start">
                  <svg className="h-6 w-6 text-success-500 flex-shrink-0 mr-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <strong className="text-space-900 dark:text-white">Zero Downtime:</strong>
                    <span className="text-space-600 dark:text-space-400"> Phased rollout with parallel operation during transition</span>
                  </div>
                </li>
                <li className="flex items-start">
                  <svg className="h-6 w-6 text-success-500 flex-shrink-0 mr-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <strong className="text-space-900 dark:text-white">Team Training:</strong>
                    <span className="text-space-600 dark:text-space-400"> Comprehensive onboarding sessions for your security team</span>
                  </div>
                </li>
                <li className="flex items-start">
                  <svg className="h-6 w-6 text-success-500 flex-shrink-0 mr-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <strong className="text-space-900 dark:text-white">Post-Migration Support:</strong>
                    <span className="text-space-600 dark:text-space-400"> 90-day enhanced support period after go-live</span>
                  </div>
                </li>
              </ul>
            </div>
            <div className="bg-white dark:bg-space-900 rounded-2xl border border-space-200 dark:border-space-700 p-8">
              <h3 className="text-xl font-bold text-space-900 dark:text-white mb-6 text-center">
                Migration Timeline
              </h3>
              <div className="space-y-6">
                {[
                  { week: 'Week 1', task: 'Discovery & Planning', description: 'Assess current setup and plan migration' },
                  { week: 'Week 2', task: 'Policy Import & Testing', description: 'Import policies and test in staging' },
                  { week: 'Week 3', task: 'Phased Rollout', description: 'Deploy to pilot locations, monitor performance' },
                  { week: 'Week 4', task: 'Full Production', description: 'Complete rollout and decommission legacy' },
                ].map((phase, index) => (
                  <div key={index} className="flex items-start">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="ml-4">
                      <div className="font-semibold text-space-900 dark:text-white">
                        {phase.week}: {phase.task}
                      </div>
                      <div className="text-sm text-space-600 dark:text-space-400">
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

      {/* CTA */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Secure Your Enterprise?
          </h2>
          <p className="text-lg text-indigo-100 mb-8 max-w-2xl mx-auto">
            Talk to our enterprise sales team to discuss your requirements, get a custom quote,
            and schedule a personalized demo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact?subject=enterprise-demo"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-white text-indigo-600 font-medium hover:bg-space-100 transition-all"
            >
              Schedule a Demo
            </Link>
            <Link
              href="/contact?subject=enterprise-quote"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-transparent border-2 border-white text-white font-medium hover:bg-white/10 transition-all"
            >
              Request Quote
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
