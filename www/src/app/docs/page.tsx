// Nebula DNS - Documentation Hub
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import Link from 'next/link'

export default function DocsPage() {
  const mainCategories = [
    {
      title: 'Getting Started Guide',
      description: 'Step-by-step tutorials to get up and running with Nebula DNS in minutes.',
      href: '/docs/guides',
      icon: (
        <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      ),
      topics: ['Quick Start', 'DNS Setup', 'Policy Configuration', 'Client Agents', 'Troubleshooting'],
    },
    {
      title: 'API Reference',
      description: 'Complete REST API documentation with examples and interactive playground.',
      href: '/docs/api',
      icon: (
        <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
        </svg>
      ),
      topics: ['Authentication', 'Policies API', 'Reports API', 'Webhooks', 'Rate Limits'],
    },
    {
      title: 'Blog & Articles',
      description: 'Technical articles, security insights, and product updates from our team.',
      href: '/blog',
      icon: (
        <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
        </svg>
      ),
      topics: ['DNS Security', 'Best Practices', 'Case Studies', 'Release Notes', 'Industry News'],
    },
  ]

  const quickLinks = [
    { title: 'Setup DNS Resolvers', href: '/docs/guides/setup-dns' },
    { title: 'Create Your First Policy', href: '/docs/guides/policies' },
    { title: 'Configure Block Pages', href: '/docs/guides/block-pages' },
    { title: 'View Reports & Analytics', href: '/docs/guides/reports' },
    { title: 'Install Client Agents', href: '/docs/guides/agents' },
    { title: 'SSO Integration', href: '/docs/guides/sso' },
    { title: 'API Authentication', href: '/docs/api#authentication' },
    { title: 'Webhook Setup', href: '/docs/api#webhooks' },
  ]

  const popularTopics = [
    {
      category: 'Security',
      links: [
        { title: 'Threat Intelligence Feeds', href: '/docs/security/threat-feeds' },
        { title: 'Custom Block Lists', href: '/docs/security/block-lists' },
        { title: 'Allow Lists & Exceptions', href: '/docs/security/allow-lists' },
      ],
    },
    {
      category: 'Advanced',
      links: [
        { title: 'DNS-over-HTTPS (DoH)', href: '/docs/advanced/doh' },
        { title: 'DNS-over-TLS (DoT)', href: '/docs/advanced/dot' },
        { title: 'SIEM Integration', href: '/docs/advanced/siem' },
      ],
    },
    {
      category: 'Account',
      links: [
        { title: 'Multi-Factor Authentication', href: '/docs/account/mfa' },
        { title: 'Team Management', href: '/docs/account/teams' },
        { title: 'Billing & Subscriptions', href: '/docs/account/billing' },
      ],
    },
  ]

  return (
    <div className="bg-white dark:bg-space-900 transition-colors">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-space-900 dark:text-white">
              Documentation
            </h1>
            <p className="mt-4 text-lg text-space-600 dark:text-space-300 max-w-3xl mx-auto">
              Everything you need to know to get started with Nebula DNS, configure policies,
              and integrate with your existing infrastructure.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-space-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search documentation..."
                className="w-full pl-12 pr-4 py-4 rounded-xl border border-space-200 dark:border-space-700 bg-white dark:bg-space-800 text-space-900 dark:text-white placeholder-space-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Categories */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-3 gap-8">
          {mainCategories.map((category, index) => (
            <Link
              key={index}
              href={category.href}
              className="bg-white dark:bg-space-800 rounded-2xl border border-space-200 dark:border-space-700 p-8 hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-600 transition-all group"
            >
              <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform">
                {category.icon}
              </div>
              <h3 className="text-2xl font-bold text-space-900 dark:text-white mb-3">
                {category.title}
              </h3>
              <p className="text-space-600 dark:text-space-400 mb-6">
                {category.description}
              </p>
              <ul className="space-y-2">
                {category.topics.map((topic, topicIndex) => (
                  <li key={topicIndex} className="flex items-center text-sm text-space-600 dark:text-space-400">
                    <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full mr-3"></span>
                    {topic}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex items-center text-indigo-600 dark:text-indigo-400 font-medium group-hover:translate-x-2 transition-transform">
                Explore {category.title}
                <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-space-50 dark:bg-space-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-space-900 dark:text-white">
              Quick Links
            </h2>
            <p className="mt-4 text-lg text-space-600 dark:text-space-300">
              Jump directly to the most common documentation topics.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickLinks.map((link, index) => (
              <Link
                key={index}
                href={link.href}
                className="bg-white dark:bg-space-900 rounded-lg border border-space-200 dark:border-space-700 px-4 py-3 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all group flex items-center justify-between"
              >
                <span className="text-space-900 dark:text-white font-medium">
                  {link.title}
                </span>
                <svg className="h-4 w-4 text-space-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Popular Topics */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-space-900 dark:text-white">
            Popular Topics
          </h2>
          <p className="mt-4 text-lg text-space-600 dark:text-space-300">
            Frequently accessed documentation organized by category.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {popularTopics.map((topic, index) => (
            <div
              key={index}
              className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-6"
            >
              <h3 className="text-lg font-bold text-space-900 dark:text-white mb-4 flex items-center">
                <span className="h-2 w-2 bg-indigo-500 rounded-full mr-3"></span>
                {topic.category}
              </h3>
              <ul className="space-y-3">
                {topic.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <Link
                      href={link.href}
                      className="text-space-600 dark:text-space-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center group"
                    >
                      <svg className="h-4 w-4 mr-2 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Help CTA */}
      <div className="bg-space-50 dark:bg-space-800 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Can't Find What You're Looking For?
            </h2>
            <p className="text-lg text-indigo-100 mb-8 max-w-2xl mx-auto">
              Our support team is here to help. Contact us with your questions or browse our
              community forum for answers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact?subject=documentation-help"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white text-indigo-600 font-medium hover:bg-space-100 transition-all"
              >
                Contact Support
              </Link>
              <Link
                href="/community"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-transparent border-2 border-white text-white font-medium hover:bg-white/10 transition-all"
              >
                Visit Community Forum
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Updates */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-8">
            <div className="flex items-center mb-6">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mr-4">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-space-900 dark:text-white">
                What's New
              </h3>
            </div>
            <ul className="space-y-4">
              <li className="flex items-start">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-success-100 dark:bg-success-900/50 text-success-600 dark:text-success-400 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                  v1.3
                </span>
                <div>
                  <div className="font-medium text-space-900 dark:text-white">Enhanced Analytics Dashboard</div>
                  <div className="text-sm text-space-600 dark:text-space-400">New visualizations and custom date ranges</div>
                </div>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-success-100 dark:bg-success-900/50 text-success-600 dark:text-success-400 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                  v1.2
                </span>
                <div>
                  <div className="font-medium text-space-900 dark:text-white">API Rate Limit Improvements</div>
                  <div className="text-sm text-space-600 dark:text-space-400">Higher limits for enterprise customers</div>
                </div>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-success-100 dark:bg-success-900/50 text-success-600 dark:text-success-400 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                  v1.1
                </span>
                <div>
                  <div className="font-medium text-space-900 dark:text-white">SSO/SAML Integration</div>
                  <div className="text-sm text-space-600 dark:text-space-400">Enterprise identity provider support</div>
                </div>
              </li>
            </ul>
            <Link
              href="/blog/releases"
              className="mt-6 inline-flex items-center text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-700 dark:hover:text-indigo-300"
            >
              View all releases
              <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>

          <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-8">
            <div className="flex items-center mb-6">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mr-4">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-space-900 dark:text-white">
                Learning Resources
              </h3>
            </div>
            <ul className="space-y-4">
              <li>
                <Link href="/docs/guides/quickstart" className="flex items-center text-space-600 dark:text-space-400 hover:text-indigo-600 dark:hover:text-indigo-400 group">
                  <svg className="h-5 w-5 mr-3 text-indigo-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                  </svg>
                  <span className="group-hover:underline">5-Minute Quick Start Tutorial</span>
                </Link>
              </li>
              <li>
                <Link href="/docs/guides/video-tutorials" className="flex items-center text-space-600 dark:text-space-400 hover:text-indigo-600 dark:hover:text-indigo-400 group">
                  <svg className="h-5 w-5 mr-3 text-indigo-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                  </svg>
                  <span className="group-hover:underline">Video Tutorials Library</span>
                </Link>
              </li>
              <li>
                <Link href="/blog/best-practices" className="flex items-center text-space-600 dark:text-space-400 hover:text-indigo-600 dark:hover:text-indigo-400 group">
                  <svg className="h-5 w-5 mr-3 text-indigo-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                  <span className="group-hover:underline">DNS Security Best Practices</span>
                </Link>
              </li>
              <li>
                <Link href="/docs/examples" className="flex items-center text-space-600 dark:text-space-400 hover:text-indigo-600 dark:hover:text-indigo-400 group">
                  <svg className="h-5 w-5 mr-3 text-indigo-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                  </svg>
                  <span className="group-hover:underline">Code Examples & Snippets</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
