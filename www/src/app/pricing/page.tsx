/**
 * Nebula DNS Pricing Page
 * Interactive pricing with plan comparison
 */

'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/solid'
import { API_URL } from '@/lib/config'

interface Plan {
  id: string
  name: string
  description: string
  priceMonthly: number
  priceYearly: number
  features: Record<string, boolean>
  limits: Record<string, number>
}

const defaultPlans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for trying out DNS security',
    priceMonthly: 0,
    priceYearly: 0,
    features: {
      dns_filtering: true,
      basic_reporting: true,
      email_support: false,
      custom_blocklists: false,
      api_access: false,
    },
    limits: { locations: 1, queries_per_month: 100000, users: 1, policies: 1, custom_lists: 0 },
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'Great for small teams and home offices',
    priceMonthly: 9.99,
    priceYearly: 99.99,
    features: {
      dns_filtering: true,
      basic_reporting: true,
      email_support: true,
      custom_blocklists: true,
      api_access: false,
      safesearch: true,
    },
    limits: { locations: 3, queries_per_month: 500000, users: 5, policies: 3, custom_lists: 5 },
  },
  {
    id: 'pro',
    name: 'Professional',
    description: 'For growing businesses with advanced needs',
    priceMonthly: 29.99,
    priceYearly: 299.99,
    features: {
      dns_filtering: true,
      advanced_reporting: true,
      email_support: true,
      priority_support: true,
      custom_blocklists: true,
      api_access: true,
      safesearch: true,
      schedules: true,
      audit_logs: true,
    },
    limits: { locations: 10, queries_per_month: 5000000, users: 25, policies: 10, custom_lists: 25 },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Full-featured solution for large organizations',
    priceMonthly: 99.99,
    priceYearly: 999.99,
    features: {
      dns_filtering: true,
      advanced_reporting: true,
      email_support: true,
      priority_support: true,
      dedicated_support: true,
      custom_blocklists: true,
      api_access: true,
      safesearch: true,
      schedules: true,
      audit_logs: true,
      sso: true,
      custom_branding: true,
      sla: true,
    },
    limits: { locations: -1, queries_per_month: -1, users: -1, policies: -1, custom_lists: -1 },
  },
]

const featureLabels: Record<string, string> = {
  dns_filtering: 'DNS Filtering & Security',
  basic_reporting: 'Basic Reporting',
  advanced_reporting: 'Advanced Analytics',
  email_support: 'Email Support',
  priority_support: 'Priority Support',
  dedicated_support: 'Dedicated Account Manager',
  custom_blocklists: 'Custom Block/Allow Lists',
  api_access: 'API Access',
  safesearch: 'SafeSearch Enforcement',
  schedules: 'Schedule-Based Policies',
  audit_logs: 'Audit Logs',
  sso: 'SSO/SAML Integration',
  custom_branding: 'Custom Branding',
  sla: '99.99% Uptime SLA',
}

const limitLabels: Record<string, string> = {
  locations: 'Network Locations',
  queries_per_month: 'Queries/Month',
  users: 'Team Members',
  policies: 'Policies',
  custom_lists: 'Custom Lists',
}

function formatLimit(value: number): string {
  if (value === -1) return 'Unlimited'
  if (value >= 1000000) return `${value / 1000000}M`
  if (value >= 1000) return `${value / 1000}K`
  return value.toString()
}

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>(defaultPlans)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch plans from API
    async function fetchPlans() {
      try {
        const res = await fetch(`${API_URL}/plans`)
        if (res.ok) {
          const data = await res.json()
          if (data.data && data.data.length > 0) {
            setPlans(data.data)
          }
        }
      } catch {
        // Falls back to default plans if API is unavailable
      } finally {
        setLoading(false)
      }
    }
    fetchPlans()
  }, [])

  const yearlyDiscount = Math.round((1 - (99.99 / (9.99 * 12))) * 100)

  return (
    <div className="bg-white dark:bg-space-900 transition-colors">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-space-900 dark:text-white">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-4 text-lg text-space-600 dark:text-space-300 max-w-2xl mx-auto">
            Choose the plan that fits your needs. All plans include a 14-day free trial.
          </p>

          {/* Billing Toggle */}
          <div className="mt-10 flex items-center justify-center">
            <div className="bg-space-100 dark:bg-space-800 p-1 rounded-lg inline-flex">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-white dark:bg-space-700 text-space-900 dark:text-white shadow-sm'
                    : 'text-space-600 dark:text-space-400 hover:text-space-900 dark:hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  billingCycle === 'yearly'
                    ? 'bg-white dark:bg-space-700 text-space-900 dark:text-white shadow-sm'
                    : 'text-space-600 dark:text-space-400 hover:text-space-900 dark:hover:text-white'
                }`}
              >
                Yearly
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success-100 dark:bg-success-900/50 text-success-700 dark:text-success-300">
                  Save {yearlyDiscount}%
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 -mt-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, index) => {
            const isPopular = plan.id === 'pro'
            const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly
            const monthlyEquivalent = billingCycle === 'yearly' ? (plan.priceYearly / 12).toFixed(2) : null

            return (
              <div
                key={plan.id}
                className={`relative bg-white dark:bg-space-800 rounded-2xl border-2 transition-all ${
                  isPopular
                    ? 'border-indigo-500 shadow-xl scale-105'
                    : 'border-space-200 dark:border-space-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-lg'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium px-4 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="p-6">
                  <h3 className="text-xl font-bold text-space-900 dark:text-white">{plan.name}</h3>
                  <p className="mt-2 text-sm text-space-500 dark:text-space-400 h-10">{plan.description}</p>

                  <div className="mt-6">
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold text-space-900 dark:text-white">
                        ${price === 0 ? '0' : price}
                      </span>
                      {price > 0 && (
                        <span className="ml-2 text-space-500 dark:text-space-400">
                          /{billingCycle === 'yearly' ? 'year' : 'month'}
                        </span>
                      )}
                    </div>
                    {monthlyEquivalent && price > 0 && (
                      <p className="mt-1 text-sm text-space-500 dark:text-space-400">
                        ${monthlyEquivalent}/month billed annually
                      </p>
                    )}
                  </div>

                  <Link
                    href={`/signup?plan=${plan.id}&billing=${billingCycle}`}
                    className={`mt-6 w-full inline-flex justify-center items-center px-4 py-3 rounded-lg font-medium transition-all ${
                      isPopular
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                        : plan.id === 'free'
                        ? 'bg-space-100 dark:bg-space-700 text-space-900 dark:text-white hover:bg-space-200 dark:hover:bg-space-600'
                        : 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/70'
                    }`}
                  >
                    {plan.id === 'free' ? 'Get Started' : 'Start Free Trial'}
                  </Link>

                  {/* Limits */}
                  <div className="mt-6 pt-6 border-t border-space-100 dark:border-space-700">
                    <ul className="space-y-3">
                      {Object.entries(plan.limits).map(([key, value]) => (
                        <li key={key} className="flex items-center justify-between text-sm">
                          <span className="text-space-600 dark:text-space-400">{limitLabels[key]}</span>
                          <span className="font-medium text-space-900 dark:text-white">{formatLimit(value)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Features */}
                  <div className="mt-6 pt-6 border-t border-space-100 dark:border-space-700">
                    <ul className="space-y-3">
                      {Object.entries(plan.features).map(([key, value]) => (
                        <li key={key} className="flex items-start text-sm">
                          {value ? (
                            <CheckIcon className="h-5 w-5 text-success-500 flex-shrink-0 mr-2" />
                          ) : (
                            <XMarkIcon className="h-5 w-5 text-space-300 dark:text-space-600 flex-shrink-0 mr-2" />
                          )}
                          <span className={value ? 'text-space-700 dark:text-space-300' : 'text-space-400 dark:text-space-500'}>
                            {featureLabels[key] || key}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-space-50 dark:bg-space-800 py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-space-900 dark:text-white text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            {[
              {
                q: 'Can I change plans later?',
                a: 'Yes! You can upgrade or downgrade your plan at any time. When upgrading, you\'ll be charged a prorated amount. When downgrading, the new rate applies at your next billing cycle.',
              },
              {
                q: 'What happens after my free trial?',
                a: 'After your 14-day trial, you\'ll be automatically charged for your selected plan unless you cancel or switch to the Free tier. We\'ll send you a reminder 3 days before.',
              },
              {
                q: 'Is there a contract or commitment?',
                a: 'No contracts! Monthly plans can be canceled anytime. Annual plans come with a prorated refund if you need to cancel early.',
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards (Visa, Mastercard, American Express) and support payments through Stripe for maximum security.',
              },
              {
                q: 'Do you offer discounts for nonprofits or education?',
                a: 'Yes! We offer significant discounts for nonprofits, educational institutions, and open-source projects. Contact us for details.',
              },
            ].map((faq, index) => (
              <div key={index} className="bg-white dark:bg-space-900 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-space-900 dark:text-white">{faq.q}</h3>
                <p className="mt-2 text-space-600 dark:text-space-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Need a custom solution?
          </h2>
          <p className="text-lg text-indigo-100 mb-8">
            Contact our sales team for custom pricing, volume discounts, and enterprise features.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center px-6 py-3 rounded-lg bg-white text-indigo-600 font-medium hover:bg-space-100 transition-all"
          >
            Contact Sales
          </Link>
        </div>
      </div>
    </div>
  )
}
