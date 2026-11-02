// Flux Shield - API Reference Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import Link from 'next/link'
import { MarketingPageShell, MarketingCard } from '@/components/marketing/MarketingPageShell'
import { MarketingPageHero, MarketingSerifAccent } from '@/components/marketing/MarketingPageHero'
import { MarketingCtaBand } from '@/components/marketing/MarketingCtaBand'

function MethodBadge({ method }: { method: string }) {
  const styles: Record<string, string> = {
    GET: 'bg-success-900/50 text-success-300 border border-success-800/50',
    POST: 'bg-primary-500/10 text-brand border border-primary-500/30',
    PATCH: 'bg-warning-900/50 text-warning-300 border border-warning-800/50',
    DELETE: 'bg-danger-900/50 text-danger-300 border border-danger-800/50',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono flex-shrink-0 ${styles[method] || styles.GET}`}>
      {method}
    </span>
  )
}

export default function ApiReferencePage() {
  const endpointGroups = [
    {
      title: 'Authentication',
      description: 'User authentication, token management, and session handling.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
        </svg>
      ),
      color: 'from-primary-600 to-primary-500',
      endpoints: [
        { method: 'POST', path: '/auth/login', description: 'Authenticate user and receive token' },
        { method: 'POST', path: '/auth/logout', description: 'Invalidate authentication token' },
        { method: 'POST', path: '/auth/refresh', description: 'Refresh expired access token' },
        { method: 'GET', path: '/auth/me', description: 'Get current user information' },
      ],
    },
    {
      title: 'Tenants',
      description: 'Manage tenant organizations and settings.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
        </svg>
      ),
      color: 'from-accent-600 to-accent-500',
      endpoints: [
        { method: 'GET', path: '/tenants', description: 'List all accessible tenants' },
        { method: 'GET', path: '/tenants/:id', description: 'Get tenant details' },
        { method: 'PATCH', path: '/tenants/:id', description: 'Update tenant settings' },
        { method: 'GET', path: '/tenants/:id/usage', description: 'Get tenant usage statistics' },
      ],
    },
    {
      title: 'Users',
      description: 'User management and team member administration.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
      color: 'from-primary-600 to-primary-500',
      endpoints: [
        { method: 'GET', path: '/users', description: 'List all users in tenant' },
        { method: 'POST', path: '/users', description: 'Create new user' },
        { method: 'GET', path: '/users/:id', description: 'Get user details' },
        { method: 'PATCH', path: '/users/:id', description: 'Update user' },
        { method: 'DELETE', path: '/users/:id', description: 'Delete user' },
      ],
    },
    {
      title: 'Policies',
      description: 'DNS filtering policies and rule management.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
      color: 'from-accent-600 to-accent-500',
      endpoints: [
        { method: 'GET', path: '/policies', description: 'List all policies' },
        { method: 'POST', path: '/policies', description: 'Create new policy' },
        { method: 'GET', path: '/policies/:id', description: 'Get policy details' },
        { method: 'PATCH', path: '/policies/:id', description: 'Update policy' },
        { method: 'DELETE', path: '/policies/:id', description: 'Delete policy' },
      ],
    },
    {
      title: 'Locations',
      description: 'Network locations and DNS resolver configuration.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
      ),
      color: 'from-primary-600 to-primary-500',
      endpoints: [
        { method: 'GET', path: '/locations', description: 'List all locations' },
        { method: 'POST', path: '/locations', description: 'Create new location' },
        { method: 'GET', path: '/locations/:id', description: 'Get location details' },
        { method: 'PATCH', path: '/locations/:id', description: 'Update location' },
        { method: 'DELETE', path: '/locations/:id', description: 'Delete location' },
      ],
    },
    {
      title: 'Lists',
      description: 'Custom block lists and allow lists.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      ),
      color: 'from-accent-600 to-accent-500',
      endpoints: [
        { method: 'GET', path: '/lists', description: 'List all custom lists' },
        { method: 'POST', path: '/lists', description: 'Create new list' },
        { method: 'GET', path: '/lists/:id', description: 'Get list details' },
        { method: 'POST', path: '/lists/:id/entries', description: 'Add entries to list' },
        { method: 'DELETE', path: '/lists/:id/entries/:entryId', description: 'Remove entry from list' },
      ],
    },
    {
      title: 'Reports',
      description: 'Analytics, reporting, and query logs.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
      color: 'from-primary-600 to-primary-500',
      endpoints: [
        { method: 'GET', path: '/reports/summary', description: 'Get summary statistics' },
        { method: 'GET', path: '/reports/queries', description: 'Get DNS query logs' },
        { method: 'GET', path: '/reports/threats', description: 'Get blocked threats' },
        { method: 'GET', path: '/reports/categories', description: 'Get category statistics' },
        { method: 'POST', path: '/reports/export', description: 'Export report data' },
      ],
    },
    {
      title: 'Agents',
      description: 'Client agent management and deployment.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
        </svg>
      ),
      color: 'from-accent-600 to-accent-500',
      endpoints: [
        { method: 'GET', path: '/agents', description: 'List all agents' },
        { method: 'POST', path: '/agents', description: 'Register new agent' },
        { method: 'GET', path: '/agents/:id', description: 'Get agent status' },
        { method: 'DELETE', path: '/agents/:id', description: 'Deregister agent' },
      ],
    },
  ]

  const rateLimits = [
    { plan: 'Free', badge: 'F', badgeColor: 'bg-panel text-[var(--fs-txt)] border-line', limit: '100 requests/hour' },
    { plan: 'Pro', badge: 'P', badgeColor: 'bg-primary-500/10 text-brand border-primary-500/30', limit: '1,000 requests/hour' },
    { plan: 'Enterprise', badge: 'E', badgeColor: 'bg-accent-900/50 text-accent-300 border-accent-800/50', limit: '10,000 requests/hour' },
  ]

  return (
    <MarketingPageShell>
      <MarketingPageHero
        eyebrow="REST API v1"
        title={<><MarketingSerifAccent>API</MarketingSerifAccent> Reference</>}
        lede="Complete REST API documentation for integrating Flux Shield into your applications, automation workflows, and custom security tools."
      >
      </MarketingPageHero>

      {/* Info Cards: Base URL + Auth */}
      <div className="section-container py-16">
        <div className="grid lg:grid-cols-2 gap-6 mb-10">
          {/* Base URL */}
          <div className="fs-card rounded-[14px] p-8">
            <h2 className="text-xl font-bold text-ink mb-4 flex items-center gap-2">
              <svg className="h-5 w-5 text-accent-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
              Base URL
            </h2>
            <div className="bg-canvas border border-line rounded-xl p-4 font-mono text-accent-400 text-sm mb-4 overflow-x-auto">
              https://api.shield.fluxlabs.net/v1
            </div>
            <p className="text-[var(--fs-txt)] text-sm">
              All API requests should be made to this base URL. All requests must use HTTPS.
            </p>
          </div>

          {/* Response Format */}
          <div className="fs-card rounded-[14px] p-8">
            <h2 className="text-xl font-bold text-ink mb-4 flex items-center gap-2">
              <svg className="h-5 w-5 text-brand" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
              </svg>
              Response Format
            </h2>
            <div className="bg-canvas border border-line rounded-xl p-4 font-mono text-accent-400 text-sm mb-4">
              Content-Type: application/json
            </div>
            <p className="text-[var(--fs-txt)] text-sm">
              All responses return JSON with consistent structure, HTTP status codes, and detailed error messages.
            </p>
          </div>
        </div>

        {/* Authentication Block */}
        <div className="bg-canvas backdrop-blur-sm border border-primary-500/30 rounded-2xl p-8">
          <div className="flex items-start gap-5">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center text-white flex-shrink-0">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-ink mb-3">Authentication</h2>
              <p className="text-[var(--fs-txt)] mb-5">
                The Flux Shield API uses Bearer token authentication. Include your API token in the{' '}
                <code className="bg-canvas border border-line px-1.5 py-0.5 rounded text-xs text-accent-400 font-mono">Authorization</code>{' '}
                header of every request.
              </p>
              <div className="bg-canvas border border-line rounded-xl overflow-hidden">
                <div className="bg-canvas px-4 py-2 border-b border-line flex items-center justify-between">
                  <span className="text-xs text-[var(--fs-txt)] font-mono">HTTP Header</span>
                  <span className="text-xs text-[var(--fs-mut)]">Required on all requests</span>
                </div>
                <div className="p-4">
                  <pre className="text-sm text-accent-400 font-mono">
                    <code>Authorization: Bearer YOUR_API_TOKEN</code>
                  </pre>
                </div>
              </div>
              <p className="mt-4 text-sm text-[var(--fs-mut)]">
                Generate API tokens from your dashboard under{' '}
                <Link href="/dashboard/settings/api-keys" className="text-brand hover:text-brand underline underline-offset-2">
                  Settings &rsaquo; API Keys
                </Link>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Endpoint Groups */}
      <div className="border-t border-line py-16">
        <div className="section-container">
          <div className="text-center mb-12">
            <p className="fs-eyebrow mb-3">ENDPOINTS</p>
            <h2 className="text-3xl font-bold text-ink mb-3">
              API Endpoints
            </h2>
            <p className="text-[var(--fs-txt)]">
              Organized by resource type for easy navigation.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            {endpointGroups.map((group, index) => (
              <div
                key={index}
                className="fs-card rounded-[14px] p-6 hover:border-primary-500/50 transition-all"
              >
                <div className="flex items-start gap-4 mb-5">
                  <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${group.color} flex items-center justify-center text-white flex-shrink-0`}>
                    {group.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-ink mb-0.5">{group.title}</h3>
                    <p className="text-[var(--fs-mut)] text-sm">{group.description}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {group.endpoints.map((endpoint, endpointIndex) => (
                    <div
                      key={endpointIndex}
                      className="flex items-center gap-3 bg-canvas border border-line rounded-xl px-3 py-2.5 hover:border-line transition-colors"
                    >
                      <MethodBadge method={endpoint.method} />
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-sm text-ink">{endpoint.path}</span>
                        <span className="text-[var(--fs-mut)] text-xs ml-3 hidden sm:inline">{endpoint.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Example Request + Response */}
      <div className="section-container py-16">
        <div className="text-center mb-12">
          <p className="fs-eyebrow mb-3">EXAMPLES</p>
          <h2 className="text-3xl font-bold text-ink mb-3">Example Request</h2>
          <p className="text-[var(--fs-txt)]">A quick end-to-end example to get you started.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Request */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <MethodBadge method="GET" />
              <span className="font-mono text-sm text-ink">/policies</span>
            </div>
            <p className="text-[var(--fs-txt)] text-sm mb-4">
              Retrieve all DNS filtering policies for your tenant.
            </p>
            <div className="bg-canvas border border-line rounded-xl overflow-hidden">
              <div className="bg-canvas px-4 py-2.5 border-b border-line flex items-center justify-between">
                <span className="text-xs text-[var(--fs-txt)] font-mono">curl</span>
                <button className="text-xs text-brand hover:text-brand transition-colors">
                  Copy
                </button>
              </div>
              <div className="p-4 overflow-x-auto">
                <pre className="text-sm text-[var(--fs-txt)] font-mono leading-relaxed">
                  <code>{`curl -X GET \\
  https://api.shield.fluxlabs.net/v1/policies \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Content-Type: application/json"`}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* Response */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-900/50 text-success-300 border border-success-800/50">
                200 OK
              </span>
              <span className="text-[var(--fs-mut)] text-sm">JSON response</span>
            </div>
            <p className="text-[var(--fs-txt)] text-sm mb-4">
              Policy array with metadata returned as JSON.
            </p>
            <div className="bg-canvas border border-line rounded-xl overflow-hidden">
              <div className="bg-canvas px-4 py-2.5 border-b border-line flex items-center justify-between">
                <span className="text-xs text-[var(--fs-txt)] font-mono">application/json</span>
              </div>
              <div className="p-4 overflow-x-auto">
                <pre className="text-sm text-[var(--fs-txt)] font-mono leading-relaxed">
                  <code>{`{
  "success": true,
  "data": [
    {
      "id": "pol_abc123",
      "name": "Default Policy",
      "enabled": true,
      "categories_blocked": [
        "malware",
        "phishing"
      ],
      "created_at": "2026-01-15T10:30:00Z"
    }
  ]
}`}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rate Limits + Resources */}
      <div className="border-t border-line py-16">
        <div className="section-container">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Rate Limits */}
            <div className="fs-card rounded-[14px] p-8">
              <h3 className="text-xl font-bold text-ink mb-2">Rate Limits</h3>
              <p className="text-[var(--fs-txt)] text-sm mb-6">
                API rate limits are applied per API token based on your subscription plan:
              </p>
              <div className="space-y-4">
                {rateLimits.map((tier, i) => (
                  <div key={i} className="flex items-center gap-4 bg-canvas border border-line rounded-xl p-4">
                    <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold border ${tier.badgeColor}`}>
                      {tier.badge}
                    </span>
                    <div>
                      <span className="text-ink font-medium text-sm">{tier.plan}</span>
                      <span className="text-[var(--fs-mut)] text-sm ml-2">&mdash; {tier.limit}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-xs text-[var(--fs-mut)]">
                Rate limit headers (<code className="text-[var(--fs-mut)] font-mono">X-RateLimit-Remaining</code>,{' '}
                <code className="text-[var(--fs-mut)] font-mono">X-RateLimit-Reset</code>) are included in all responses.
                Contact sales for custom limits.
              </p>
            </div>

            {/* Additional Resources */}
            <div className="fs-card rounded-[14px] p-8">
              <h3 className="text-xl font-bold text-ink mb-6">Additional Resources</h3>
              <ul className="space-y-4">
                {[
                  {
                    href: 'https://api.shield.fluxlabs.net/docs',
                    external: true,
                    label: 'Interactive Swagger UI',
                    description: 'Try endpoints directly in the browser',
                  },
                  {
                    href: '/docs/guides/api-quickstart',
                    external: false,
                    label: 'API Quick Start Guide',
                    description: 'Get your first API call working in minutes',
                  },
                  {
                    href: '/docs/examples',
                    external: false,
                    label: 'Code Examples & SDKs',
                    description: 'Ready-to-use code snippets in multiple languages',
                  },
                  {
                    href: '/docs/webhooks',
                    external: false,
                    label: 'Webhooks Documentation',
                    description: 'React to events in real time with webhooks',
                  },
                ].map((resource, i) => (
                  <li key={i}>
                    <Link
                      href={resource.href}
                      target={resource.external ? '_blank' : undefined}
                      rel={resource.external ? 'noopener noreferrer' : undefined}
                      className="flex items-start gap-3 group"
                    >
                      <div className="h-8 w-8 rounded-lg bg-panel border border-line flex items-center justify-center flex-shrink-0 group-hover:border-primary-700 transition-colors mt-0.5">
                        <svg className="h-4 w-4 text-brand" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-ink text-sm font-medium group-hover:text-primary-300 transition-colors">
                          {resource.label}
                          {resource.external && (
                            <svg className="h-3 w-3 inline ml-1 opacity-50" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                            </svg>
                          )}
                        </div>
                        <div className="text-[var(--fs-mut)] text-xs mt-0.5">{resource.description}</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="section-container pb-24">
        <div className="fs-card rounded-[14px] p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <p className="fs-eyebrow mb-4">START BUILDING</p>
            <h2 className="text-3xl font-bold text-ink mb-4">Ready to Start Building?</h2>
            <p className="text-[var(--fs-txt)] mb-8 max-w-xl mx-auto">
              Generate your first API token and start integrating Flux Shield into your
              applications and automation workflows today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard/settings/api-keys"
                className="fs-btn fs-btn-primary fs-btn-lg no-underline px-6 py-3 transition-all inline-flex items-center gap-2 justify-center"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
                Generate API Token
              </Link>
              <Link
                href="https://api.shield.fluxlabs.net/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="fs-btn rounded-[10px] px-6 py-3 transition-all inline-flex items-center gap-2 justify-center"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                </svg>
                Try in Swagger
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MarketingPageShell>
  )
}
