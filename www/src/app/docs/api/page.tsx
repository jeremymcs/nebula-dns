// Nebula DNS - API Reference Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import Link from 'next/link'

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
      endpoints: [
        { method: 'GET', path: '/agents', description: 'List all agents' },
        { method: 'POST', path: '/agents', description: 'Register new agent' },
        { method: 'GET', path: '/agents/:id', description: 'Get agent status' },
        { method: 'DELETE', path: '/agents/:id', description: 'Deregister agent' },
      ],
    },
  ]

  return (
    <div className="bg-white dark:bg-space-900 transition-colors">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-medium mb-6">
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
              REST API v1
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-space-900 dark:text-white">
              API Reference
            </h1>
            <p className="mt-4 text-lg text-space-600 dark:text-space-300 max-w-3xl mx-auto">
              Complete REST API documentation for integrating Nebula DNS into your applications,
              automation workflows, and custom tools.
            </p>
          </div>
        </div>
      </div>

      {/* API Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-8">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-4">
              Base URL
            </h2>
            <div className="bg-space-50 dark:bg-space-900 rounded-lg p-4 font-mono text-sm text-space-900 dark:text-white border border-space-200 dark:border-space-700">
              https://api.nebuladns.io/api/v1
            </div>
            <p className="mt-4 text-space-600 dark:text-space-400">
              All API requests should be made to this base URL. Requests must use HTTPS.
            </p>
          </div>

          <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-8">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-4">
              Response Format
            </h2>
            <div className="bg-space-50 dark:bg-space-900 rounded-lg p-4 font-mono text-sm text-space-900 dark:text-white border border-space-200 dark:border-space-700">
              Content-Type: application/json
            </div>
            <p className="mt-4 text-space-600 dark:text-space-400">
              All responses are returned in JSON format with consistent structure and error codes.
            </p>
          </div>
        </div>

        {/* Authentication Section */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl border border-indigo-200 dark:border-indigo-800 p-8 mb-16">
          <div className="flex items-start">
            <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mr-4">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-4">
                Authentication
              </h2>
              <p className="text-space-600 dark:text-space-400 mb-4">
                The Nebula DNS API uses Bearer token authentication. Include your API token in the Authorization
                header of each request.
              </p>
              <div className="bg-space-900 dark:bg-black rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-space-100">
                  <code>
{`Authorization: Bearer YOUR_API_TOKEN`}
                  </code>
                </pre>
              </div>
              <p className="mt-4 text-sm text-space-600 dark:text-space-400">
                You can generate API tokens from your dashboard under Settings → API Keys.{' '}
                <Link href="/dashboard/settings/api-keys" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                  Manage API Keys
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Endpoint Groups */}
      <div className="bg-space-50 dark:bg-space-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-space-900 dark:text-white">
              API Endpoints
            </h2>
            <p className="mt-4 text-lg text-space-600 dark:text-space-300">
              Organized by resource type for easy navigation.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {endpointGroups.map((group, index) => (
              <div
                key={index}
                className="bg-white dark:bg-space-900 rounded-xl border border-space-200 dark:border-space-700 p-6 hover:shadow-lg transition-all"
              >
                <div className="flex items-start mb-4">
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mr-4 flex-shrink-0">
                    {group.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-space-900 dark:text-white mb-1">
                      {group.title}
                    </h3>
                    <p className="text-sm text-space-600 dark:text-space-400">
                      {group.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {group.endpoints.map((endpoint, endpointIndex) => (
                    <div
                      key={endpointIndex}
                      className="flex items-start bg-space-50 dark:bg-space-800 rounded-lg p-3 hover:bg-space-100 dark:hover:bg-space-700 transition-colors"
                    >
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold mr-3 flex-shrink-0 ${
                          endpoint.method === 'GET'
                            ? 'bg-success-100 dark:bg-success-900/50 text-success-700 dark:text-success-300'
                            : endpoint.method === 'POST'
                            ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                            : endpoint.method === 'PATCH'
                            ? 'bg-warning-100 dark:bg-warning-900/50 text-warning-700 dark:text-warning-300'
                            : 'bg-danger-100 dark:bg-danger-900/50 text-danger-700 dark:text-danger-300'
                        }`}
                      >
                        {endpoint.method}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm text-space-900 dark:text-white truncate">
                          {endpoint.path}
                        </div>
                        <div className="text-xs text-space-600 dark:text-space-400 mt-1">
                          {endpoint.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Example Request */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-space-900 dark:text-white">
            Example Request
          </h2>
          <p className="mt-4 text-lg text-space-600 dark:text-space-300">
            Quick example to get you started with the API.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-bold text-space-900 dark:text-white mb-4">
              List Policies
            </h3>
            <p className="text-space-600 dark:text-space-400 mb-4">
              Retrieve all DNS filtering policies for your tenant.
            </p>
            <div className="bg-space-900 dark:bg-black rounded-xl border border-space-700 overflow-hidden">
              <div className="bg-space-800 dark:bg-space-950 px-4 py-2 border-b border-space-700 flex items-center justify-between">
                <span className="text-xs font-medium text-space-300">curl</span>
                <button className="text-xs text-indigo-400 hover:text-indigo-300">
                  Copy
                </button>
              </div>
              <div className="p-4 overflow-x-auto">
                <pre className="text-sm text-space-100">
                  <code>
{`curl -X GET https://api.nebuladns.io/api/v1/policies \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Content-Type: application/json"`}
                  </code>
                </pre>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-space-900 dark:text-white mb-4">
              Response
            </h3>
            <p className="text-space-600 dark:text-space-400 mb-4">
              JSON response with policy data.
            </p>
            <div className="bg-space-900 dark:bg-black rounded-xl border border-space-700 overflow-hidden">
              <div className="bg-space-800 dark:bg-space-950 px-4 py-2 border-b border-space-700 flex items-center justify-between">
                <span className="text-xs font-medium text-space-300">JSON Response (200 OK)</span>
              </div>
              <div className="p-4 overflow-x-auto">
                <pre className="text-sm text-space-100">
                  <code>
{`{
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
}`}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rate Limits & Links */}
      <div className="bg-space-50 dark:bg-space-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-space-900 rounded-xl border border-space-200 dark:border-space-700 p-8">
              <h3 className="text-xl font-bold text-space-900 dark:text-white mb-4">
                Rate Limits
              </h3>
              <p className="text-space-600 dark:text-space-400 mb-6">
                API rate limits are based on your subscription plan:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="flex-shrink-0 h-6 w-6 rounded-full bg-space-100 dark:bg-space-800 text-space-600 dark:text-space-400 flex items-center justify-center text-xs font-bold mr-3">
                    F
                  </span>
                  <div>
                    <strong className="text-space-900 dark:text-white">Free:</strong>
                    <span className="text-space-600 dark:text-space-400"> 100 requests/hour</span>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold mr-3">
                    P
                  </span>
                  <div>
                    <strong className="text-space-900 dark:text-white">Pro:</strong>
                    <span className="text-space-600 dark:text-space-400"> 1,000 requests/hour</span>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-bold mr-3">
                    E
                  </span>
                  <div>
                    <strong className="text-space-900 dark:text-white">Enterprise:</strong>
                    <span className="text-space-600 dark:text-space-400"> 10,000 requests/hour</span>
                  </div>
                </li>
              </ul>
              <p className="mt-4 text-sm text-space-600 dark:text-space-400">
                Rate limit headers are included in all responses. Contact sales for custom limits.
              </p>
            </div>

            <div className="bg-white dark:bg-space-900 rounded-xl border border-space-200 dark:border-space-700 p-8">
              <h3 className="text-xl font-bold text-space-900 dark:text-white mb-4">
                Additional Resources
              </h3>
              <ul className="space-y-4">
                <li>
                  <Link
                    href="https://api.nebuladns.io/api/docs"
                    target="_blank"
                    className="flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 group"
                  >
                    <svg className="h-5 w-5 mr-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                    <span className="group-hover:underline">Interactive Swagger UI</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs/guides/api-quickstart"
                    className="flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 group"
                  >
                    <svg className="h-5 w-5 mr-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                    <span className="group-hover:underline">API Quick Start Guide</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs/examples"
                    className="flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 group"
                  >
                    <svg className="h-5 w-5 mr-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                    </svg>
                    <span className="group-hover:underline">Code Examples & SDKs</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs/webhooks"
                    className="flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 group"
                  >
                    <svg className="h-5 w-5 mr-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                    </svg>
                    <span className="group-hover:underline">Webhooks Documentation</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Start Building?
          </h2>
          <p className="text-lg text-indigo-100 mb-8 max-w-2xl mx-auto">
            Generate your first API token and start integrating Nebula DNS into your applications today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard/settings/api-keys"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-white text-indigo-600 font-medium hover:bg-space-100 transition-all"
            >
              Generate API Token
            </Link>
            <Link
              href="https://api.nebuladns.io/api/docs"
              target="_blank"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-transparent border-2 border-white text-white font-medium hover:bg-white/10 transition-all"
            >
              Try in Swagger
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
