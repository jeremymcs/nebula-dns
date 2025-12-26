/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Settings Page Component - Cosmic Security Theme
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
import { Card, Button, Badge, Input } from '@/components/ui'

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
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-space-900 dark:text-white">Settings</h1>
        <p className="mt-2 text-space-500 dark:text-space-400">
          Manage your organization settings and preferences
        </p>
      </div>

      {/* Quick Links to Settings Sub-Pages */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {settingsSections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group"
          >
            <Card
              variant="solid"
              padding="md"
              className="hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-primary-500/10 to-primary-600/10 rounded-xl group-hover:from-primary-500/20 group-hover:to-primary-600/20 transition-colors">
                  <section.icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="font-medium text-space-900 dark:text-white">{section.name}</h3>
                  <p className="text-sm text-space-500 dark:text-space-400">{section.description}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <nav className="lg:w-64 flex-shrink-0">
          <Card variant="solid" padding="sm">
            <div className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-primary-500/10 to-primary-600/10 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800'
                      : 'text-space-600 dark:text-space-400 hover:bg-space-100 dark:hover:bg-space-700/50'
                  }`}
                >
                  <tab.icon className={`h-5 w-5 mr-3 ${
                    activeTab === tab.id ? 'text-primary-600 dark:text-primary-400' : 'text-space-400'
                  }`} />
                  {tab.name}
                </button>
              ))}
            </div>
          </Card>
        </nav>

        {/* Content Area */}
        <div className="flex-1">
          {activeTab === 'general' && (
            <Card variant="solid" padding="lg">
              <h2 className="text-lg font-semibold text-space-900 dark:text-white mb-6">General Settings</h2>

              <div className="space-y-6">
                <Input
                  label="Organization Name"
                  defaultValue="Demo Company"
                />

                <div>
                  <Input
                    label="Organization Slug"
                    defaultValue="demo"
                    disabled
                  />
                  <p className="mt-1 text-xs text-space-500 dark:text-space-400">Used in URLs and API calls</p>
                </div>

                <Input
                  label="Contact Email"
                  type="email"
                  defaultValue="admin@demo.local"
                />

                <div>
                  <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">Timezone</label>
                  <select className="w-full px-4 py-3 rounded-xl border border-space-200 dark:border-space-600 bg-white dark:bg-space-800 text-space-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all">
                    <option>UTC</option>
                    <option>America/New_York</option>
                    <option>America/Los_Angeles</option>
                    <option>Europe/London</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-space-200 dark:border-space-700">
                  <Button variant="primary">Save Changes</Button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card variant="solid" padding="lg">
              <h2 className="text-lg font-semibold text-space-900 dark:text-white mb-6">Notification Preferences</h2>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-space-50 dark:bg-space-800/50">
                  <div>
                    <h3 className="text-sm font-medium text-space-900 dark:text-white">Threat Alerts</h3>
                    <p className="text-sm text-space-500 dark:text-space-400">Get notified about security threats</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-primary-600 transition-colors duration-200 ease-in-out">
                    <span className="translate-x-5 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-space-50 dark:bg-space-800/50">
                  <div>
                    <h3 className="text-sm font-medium text-space-900 dark:text-white">Weekly Reports</h3>
                    <p className="text-sm text-space-500 dark:text-space-400">Receive weekly summary emails</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-primary-600 transition-colors duration-200 ease-in-out">
                    <span className="translate-x-5 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-space-50 dark:bg-space-800/50">
                  <div>
                    <h3 className="text-sm font-medium text-space-900 dark:text-white">System Updates</h3>
                    <p className="text-sm text-space-500 dark:text-space-400">Notifications about system maintenance</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-space-200 dark:bg-space-600 transition-colors duration-200 ease-in-out">
                    <span className="translate-x-0 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" />
                  </button>
                </div>

                <Input
                  label="Alert Email"
                  type="email"
                  defaultValue="admin@demo.local"
                />

                <div className="pt-4 border-t border-space-200 dark:border-space-700">
                  <Button variant="primary">Save Preferences</Button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'dns' && (
            <div className="space-y-6">
              <Card variant="solid" padding="lg">
                <h2 className="text-lg font-semibold text-space-900 dark:text-white mb-6">DNS Configuration</h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-space-900 dark:text-white mb-2">DNS Resolver Addresses</h3>
                    <div className="bg-space-50 dark:bg-space-800 rounded-xl p-4 font-mono text-sm border border-space-200 dark:border-space-700">
                      <p className="text-space-700 dark:text-space-300">Primary: <span className="text-primary-600 dark:text-primary-400">dns1.nebuladns.io</span></p>
                      <p className="text-space-700 dark:text-space-300">Secondary: <span className="text-primary-600 dark:text-primary-400">dns2.nebuladns.io</span></p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-space-900 dark:text-white mb-2">DoH Endpoint</h3>
                    <div className="bg-space-50 dark:bg-space-800 rounded-xl p-4 font-mono text-sm border border-space-200 dark:border-space-700">
                      <p className="text-space-700 dark:text-space-300 break-all">https://doh.nebuladns.io/dns-query?token=YOUR_TOKEN</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-space-900 dark:text-white mb-2">DoT Endpoint</h3>
                    <div className="bg-space-50 dark:bg-space-800 rounded-xl p-4 font-mono text-sm border border-space-200 dark:border-space-700">
                      <p className="text-space-700 dark:text-space-300">dot.nebuladns.io:853</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card variant="solid" padding="lg">
                <h2 className="text-lg font-semibold text-space-900 dark:text-white mb-4">Global DNS Settings</h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-space-50 dark:bg-space-800/50">
                    <div>
                      <h3 className="text-sm font-medium text-space-900 dark:text-white">DNSSEC Validation</h3>
                      <p className="text-sm text-space-500 dark:text-space-400">Validate DNS responses with DNSSEC</p>
                    </div>
                    <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-primary-600 transition-colors duration-200 ease-in-out">
                      <span className="translate-x-5 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-space-50 dark:bg-space-800/50">
                    <div>
                      <h3 className="text-sm font-medium text-space-900 dark:text-white">Log All Queries</h3>
                      <p className="text-sm text-space-500 dark:text-space-400">Store all DNS queries for analytics</p>
                    </div>
                    <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-primary-600 transition-colors duration-200 ease-in-out">
                      <span className="translate-x-5 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" />
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <Card variant="solid" padding="lg">
                <h2 className="text-lg font-semibold text-space-900 dark:text-white mb-6">Current Plan</h2>

                <div className="flex items-center justify-between p-6 bg-gradient-to-r from-primary-500/10 to-primary-600/10 rounded-2xl border border-primary-200 dark:border-primary-800">
                  <div>
                    <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-200">Pro Plan</h3>
                    <p className="text-sm text-primary-700 dark:text-primary-300">Up to 10 locations, 1M queries/month</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary-900 dark:text-primary-200">$49/mo</p>
                    <Button variant="ghost" size="sm" className="mt-2">Change plan</Button>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-space-50 dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700">
                    <p className="text-2xl font-bold text-space-900 dark:text-white">3</p>
                    <p className="text-sm text-space-500 dark:text-space-400">Locations</p>
                    <p className="text-xs text-space-400">of 10</p>
                  </div>
                  <div className="text-center p-4 bg-space-50 dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700">
                    <p className="text-2xl font-bold text-space-900 dark:text-white">125K</p>
                    <p className="text-sm text-space-500 dark:text-space-400">Queries</p>
                    <p className="text-xs text-space-400">of 1M</p>
                  </div>
                  <div className="text-center p-4 bg-space-50 dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700">
                    <p className="text-2xl font-bold text-space-900 dark:text-white">4</p>
                    <p className="text-sm text-space-500 dark:text-space-400">Users</p>
                    <p className="text-xs text-space-400">unlimited</p>
                  </div>
                </div>
              </Card>

              <Card variant="solid" padding="lg">
                <h2 className="text-lg font-semibold text-space-900 dark:text-white mb-4">Payment Method</h2>
                <div className="flex items-center justify-between p-4 border border-space-200 dark:border-space-700 rounded-xl">
                  <div className="flex items-center">
                    <div className="h-8 w-12 bg-space-100 dark:bg-space-700 rounded-lg flex items-center justify-center text-xs font-bold text-space-600 dark:text-space-300">
                      VISA
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-space-900 dark:text-white">•••• •••• •••• 4242</p>
                      <p className="text-xs text-space-500 dark:text-space-400">Expires 12/25</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">Update</Button>
                </div>
              </Card>

              <Card variant="solid" padding="lg">
                <h2 className="text-lg font-semibold text-space-900 dark:text-white mb-4">Billing History</h2>
                <div className="space-y-3">
                  {[
                    { date: 'Jan 1, 2024', amount: '$49.00', status: 'Paid' },
                    { date: 'Dec 1, 2023', amount: '$49.00', status: 'Paid' },
                    { date: 'Nov 1, 2023', amount: '$49.00', status: 'Paid' },
                  ].map((invoice, idx) => (
                    <div key={idx} className="flex items-center justify-between py-3 px-4 rounded-xl bg-space-50 dark:bg-space-800/50">
                      <div>
                        <p className="text-sm font-medium text-space-900 dark:text-white">{invoice.date}</p>
                        <p className="text-xs text-space-500 dark:text-space-400">{invoice.amount}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant="success" size="sm">{invoice.status}</Badge>
                        <Button variant="ghost" size="sm">Download</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
