/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Settings Page Component
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  BuildingOfficeIcon,
  BellIcon,
  ShieldCheckIcon,
  KeyIcon,
  GlobeAltIcon,
  CreditCardIcon,
  UsersIcon,
  LinkIcon,
  FingerPrintIcon,
} from '@heroicons/react/24/outline'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general')

  const settingsSections = [
    { href: '/dashboard/settings/team', name: 'Team Members', description: 'Manage users and invitations', icon: UsersIcon },
    { href: '/dashboard/settings/api-keys', name: 'API Keys', description: 'Manage API access tokens', icon: KeyIcon },
    { href: '/dashboard/settings/integrations', name: 'Integrations', description: 'SIEM, webhooks, and third-party apps', icon: LinkIcon },
    { href: '/dashboard/settings/security', name: 'Security', description: 'MFA, sessions, and access control', icon: FingerPrintIcon },
    { href: '/dashboard/settings/sso', name: 'Single Sign-On', description: 'Configure SAML and OIDC', icon: ShieldCheckIcon },
  ]

  const tabs = [
    { id: 'general', name: 'General', icon: BuildingOfficeIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'dns', name: 'DNS Settings', icon: GlobeAltIcon },
    { id: 'billing', name: 'Billing', icon: CreditCardIcon },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-2 text-sm text-gray-700">
          Manage your organization settings and preferences
        </p>
      </div>

      {/* Quick Links to Settings Sub-Pages */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {settingsSections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="card p-4 hover:border-primary-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-50 rounded-lg group-hover:bg-primary-100 transition-colors">
                <section.icon className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{section.name}</h3>
                <p className="text-sm text-gray-500">{section.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <nav className="lg:w-64 flex-shrink-0">
          <div className="card p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon className={`h-5 w-5 mr-3 ${
                  activeTab === tab.id ? 'text-primary-600' : 'text-gray-400'
                }`} />
                {tab.name}
              </button>
            ))}
          </div>
        </nav>

        {/* Content Area */}
        <div className="flex-1">
          {activeTab === 'general' && (
            <div className="card p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">General Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Organization Name</label>
                  <input type="text" className="input mt-1" defaultValue="Demo Company" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Organization Slug</label>
                  <input type="text" className="input mt-1" defaultValue="demo" disabled />
                  <p className="mt-1 text-xs text-gray-500">Used in URLs and API calls</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Email</label>
                  <input type="email" className="input mt-1" defaultValue="admin@demo.local" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Timezone</label>
                  <select className="input mt-1">
                    <option>UTC</option>
                    <option>America/New_York</option>
                    <option>America/Los_Angeles</option>
                    <option>Europe/London</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button className="btn-primary">Save Changes</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="card p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Notification Preferences</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Threat Alerts</h3>
                    <p className="text-sm text-gray-500">Get notified about security threats</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-primary-600 transition-colors duration-200 ease-in-out">
                    <span className="translate-x-5 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Weekly Reports</h3>
                    <p className="text-sm text-gray-500">Receive weekly summary emails</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-primary-600 transition-colors duration-200 ease-in-out">
                    <span className="translate-x-5 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">System Updates</h3>
                    <p className="text-sm text-gray-500">Notifications about system maintenance</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 transition-colors duration-200 ease-in-out">
                    <span className="translate-x-0 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Alert Email</label>
                  <input type="email" className="input mt-1" defaultValue="admin@demo.local" />
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button className="btn-primary">Save Preferences</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dns' && (
            <div className="space-y-6">
              <div className="card p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-6">DNS Configuration</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">DNS Resolver Addresses</h3>
                    <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
                      <p className="text-gray-700">Primary: <span className="text-primary-600">dns1.nebuladns.io</span></p>
                      <p className="text-gray-700">Secondary: <span className="text-primary-600">dns2.nebuladns.io</span></p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">DoH Endpoint</h3>
                    <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
                      <p className="text-gray-700 break-all">https://doh.nebuladns.io/dns-query?token=YOUR_TOKEN</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">DoT Endpoint</h3>
                    <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
                      <p className="text-gray-700">dot.nebuladns.io:853</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Global DNS Settings</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">DNSSEC Validation</h3>
                      <p className="text-sm text-gray-500">Validate DNS responses with DNSSEC</p>
                    </div>
                    <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-primary-600 transition-colors duration-200 ease-in-out">
                      <span className="translate-x-5 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Log All Queries</h3>
                      <p className="text-sm text-gray-500">Store all DNS queries for analytics</p>
                    </div>
                    <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-primary-600 transition-colors duration-200 ease-in-out">
                      <span className="translate-x-5 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <div className="card p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-6">Current Plan</h2>
                
                <div className="flex items-center justify-between p-4 bg-primary-50 rounded-lg">
                  <div>
                    <h3 className="text-lg font-semibold text-primary-900">Pro Plan</h3>
                    <p className="text-sm text-primary-700">Up to 10 locations, 1M queries/month</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary-900">$49/mo</p>
                    <button className="mt-2 text-sm text-primary-600 hover:text-primary-500">Change plan</button>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">3</p>
                    <p className="text-sm text-gray-500">Locations</p>
                    <p className="text-xs text-gray-400">of 10</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">125K</p>
                    <p className="text-sm text-gray-500">Queries</p>
                    <p className="text-xs text-gray-400">of 1M</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">4</p>
                    <p className="text-sm text-gray-500">Users</p>
                    <p className="text-xs text-gray-400">unlimited</p>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Payment Method</h2>
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="h-8 w-12 bg-gray-100 rounded flex items-center justify-center text-xs font-bold text-gray-600">
                      VISA
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">•••• •••• •••• 4242</p>
                      <p className="text-xs text-gray-500">Expires 12/25</p>
                    </div>
                  </div>
                  <button className="text-sm text-primary-600 hover:text-primary-500">Update</button>
                </div>
              </div>

              <div className="card p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Billing History</h2>
                <div className="space-y-3">
                  {[
                    { date: 'Jan 1, 2024', amount: '$49.00', status: 'Paid' },
                    { date: 'Dec 1, 2023', amount: '$49.00', status: 'Paid' },
                    { date: 'Nov 1, 2023', amount: '$49.00', status: 'Paid' },
                  ].map((invoice, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{invoice.date}</p>
                        <p className="text-xs text-gray-500">{invoice.amount}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          {invoice.status}
                        </span>
                        <button className="text-sm text-primary-600 hover:text-primary-500">Download</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
