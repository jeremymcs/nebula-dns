/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Settings Page Component
 */

'use client'

import { useState } from 'react'
import { 
  BuildingOfficeIcon,
  BellIcon,
  ShieldCheckIcon,
  KeyIcon,
  GlobeAltIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general')

  const tabs = [
    { id: 'general', name: 'General', icon: BuildingOfficeIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'api', name: 'API Keys', icon: KeyIcon },
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

      <div className="mt-6 flex flex-col lg:flex-row gap-6">
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

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="card p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-6">Security Settings</h2>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h3>
                      <p className="text-sm text-gray-500">Require 2FA for all users</p>
                    </div>
                    <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 transition-colors duration-200 ease-in-out">
                      <span className="translate-x-0 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Session Timeout</h3>
                      <p className="text-sm text-gray-500">Auto-logout after inactivity</p>
                    </div>
                    <select className="input w-32">
                      <option>15 minutes</option>
                      <option>30 minutes</option>
                      <option>1 hour</option>
                      <option>4 hours</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">IP Allowlist</h3>
                      <p className="text-sm text-gray-500">Restrict dashboard access by IP</p>
                    </div>
                    <button className="btn-secondary text-sm">Configure</button>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Audit Log</h2>
                <p className="text-sm text-gray-500 mb-4">Recent security events</p>
                <div className="space-y-3">
                  {[
                    { action: 'User login', user: 'admin@demo.local', time: '2 minutes ago', ip: '192.168.1.1' },
                    { action: 'Policy updated', user: 'admin@demo.local', time: '1 hour ago', ip: '192.168.1.1' },
                    { action: 'User invited', user: 'admin@demo.local', time: '2 hours ago', ip: '192.168.1.1' },
                  ].map((event, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{event.action}</p>
                        <p className="text-xs text-gray-500">{event.user} • {event.ip}</p>
                      </div>
                      <span className="text-xs text-gray-400">{event.time}</span>
                    </div>
                  ))}
                </div>
                <button className="mt-4 text-sm text-primary-600 hover:text-primary-500">View all audit logs →</button>
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

          {activeTab === 'api' && (
            <div className="card p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">API Keys</h2>
              
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-4">
                  API keys allow you to access the Nebula DNS API programmatically. Keep your keys secure.
                </p>
                <button className="btn-primary">Generate New API Key</button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key Prefix</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Used</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900">Production Key</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-500">sk_live_xxxx...xxxx</td>
                      <td className="px-4 py-3 text-sm text-gray-500">Jan 1, 2024</td>
                      <td className="px-4 py-3 text-sm text-gray-500">Today</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <button className="text-red-600 hover:text-red-800">Revoke</button>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900">Development Key</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-500">sk_test_xxxx...xxxx</td>
                      <td className="px-4 py-3 text-sm text-gray-500">Jan 5, 2024</td>
                      <td className="px-4 py-3 text-sm text-gray-500">Yesterday</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <button className="text-red-600 hover:text-red-800">Revoke</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
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
