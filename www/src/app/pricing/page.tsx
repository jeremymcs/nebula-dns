// Nebula DNS Marketing Website - Pricing Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

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

const faqs = [
  {
    q: 'Can I change plans later?',
    a: "Yes! You can upgrade or downgrade your plan at any time. When upgrading, you'll be charged a prorated amount. When downgrading, the new rate applies at your next billing cycle.",
  },
  {
    q: 'What happens after my free trial?',
    a: "After your 14-day trial, you'll be automatically charged for your selected plan unless you cancel or switch to the Free tier. We'll send you a reminder 3 days before.",
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
  {
    q: 'How does the Enterprise plan pricing work?',
    a: 'Enterprise pricing is tailored to your organization\'s specific needs — volume of queries, number of locations, compliance requirements, and support level. Contact our sales team for a custom quote.',
  },
]

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>(defaultPlans)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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

  const yearlyDiscount = Math.round((1 - 99.99 / (9.99 * 12)) * 100)

  return (
    <div className="min-h-screen bg-space-950">
      {/* Atmospheric nebula orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary-700/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 bg-accent-700/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-primary-800/15 rounded-full blur-3xl" />
      </div>

      <div className="relative">
        {/* Section Header */}
        <div className="pt-24 pb-16 text-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-primary-400 text-xs tracking-widest uppercase mb-4 font-medium">
              PRICING
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400 mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-space-400 text-lg max-w-2xl mx-auto">
              Choose the plan that fits your needs. All plans include a 14-day free trial with no credit card required.
            </p>

            {/* Billing Toggle */}
            <div className="mt-10 flex items-center justify-center gap-4">
              <div className="bg-space-800 rounded-full p-1 inline-flex">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                    billingCycle === 'monthly'
                      ? 'bg-primary-600 text-white'
                      : 'text-space-400 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                    billingCycle === 'yearly'
                      ? 'bg-primary-600 text-white'
                      : 'text-space-400 hover:text-white'
                  }`}
                >
                  Yearly
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-success-600/20 text-success-400 border border-success-600/30">
                    Save {yearlyDiscount}%
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {plans.map((plan) => {
              const isPopular = plan.id === 'pro'
              const isEnterprise = plan.id === 'enterprise'
              const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly
              const monthlyEquivalent =
                billingCycle === 'yearly' && price > 0
                  ? (plan.priceYearly / 12).toFixed(2)
                  : null

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl transition-all ${
                    isPopular
                      ? 'bg-gradient-to-b from-primary-900/40 to-space-900/60 border border-primary-600/50 shadow-glow'
                      : 'bg-space-900/60 backdrop-blur-sm border border-space-700/50 hover:border-space-600/70'
                  }`}
                >
                  {/* Most Popular Badge */}
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-r from-primary-600 to-primary-500 text-white text-xs font-semibold px-4 py-1 rounded-full shadow-glow-sm">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="p-6 flex flex-col flex-1">
                    {/* Plan Name & Description */}
                    <div>
                      <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                      <p className="mt-2 text-sm text-space-400 min-h-[2.5rem]">{plan.description}</p>
                    </div>

                    {/* Price */}
                    <div className="mt-6">
                      {isEnterprise ? (
                        <div className="flex items-baseline">
                          <span className="text-4xl font-bold text-white">Custom</span>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className={`text-4xl font-bold ${plan.id === 'free' ? 'text-space-400' : 'text-white'}`}>
                            ${price === 0 ? '0' : price}
                          </span>
                          {price > 0 && (
                            <span className="text-space-500 text-sm">
                              /{billingCycle === 'yearly' ? 'yr' : 'mo'}
                            </span>
                          )}
                        </div>
                      )}
                      {monthlyEquivalent && !isEnterprise && (
                        <p className="mt-1 text-xs text-space-500">
                          ${monthlyEquivalent}/month billed annually
                        </p>
                      )}
                      {isEnterprise && (
                        <p className="mt-1 text-xs text-space-500">Contact us for a quote</p>
                      )}
                    </div>

                    {/* CTA Button */}
                    {isEnterprise ? (
                      <Link
                        href="/contact"
                        className="mt-6 w-full inline-flex justify-center items-center px-4 py-3 rounded-xl font-semibold text-sm transition-all bg-space-800 border border-space-700 text-white hover:bg-space-700 hover:border-space-600"
                      >
                        Contact Sales
                      </Link>
                    ) : isPopular ? (
                      <Link
                        href={`/signup?plan=${plan.id}&billing=${billingCycle}`}
                        className="mt-6 w-full inline-flex justify-center items-center px-6 py-3 rounded-xl font-semibold text-sm transition-all bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-glow hover:shadow-glow-lg"
                      >
                        Start Free Trial
                      </Link>
                    ) : plan.id === 'free' ? (
                      <Link
                        href={`/signup?plan=${plan.id}&billing=${billingCycle}`}
                        className="mt-6 w-full inline-flex justify-center items-center px-4 py-3 rounded-xl font-semibold text-sm transition-all bg-space-800 border border-space-700 text-space-300 hover:bg-space-700 hover:border-space-600 hover:text-white"
                      >
                        Get Started Free
                      </Link>
                    ) : (
                      <Link
                        href={`/signup?plan=${plan.id}&billing=${billingCycle}`}
                        className="mt-6 w-full inline-flex justify-center items-center px-4 py-3 rounded-xl font-semibold text-sm transition-all bg-primary-900/40 border border-primary-700/50 text-primary-300 hover:bg-primary-900/60 hover:border-primary-600/60 hover:text-white"
                      >
                        Start Free Trial
                      </Link>
                    )}

                    {/* Limits */}
                    <div className="mt-6 pt-6 border-t border-space-700/50">
                      <ul className="space-y-3">
                        {Object.entries(plan.limits).map(([key, value]) => (
                          <li key={key} className="flex items-center justify-between text-sm">
                            <span className="text-space-400">{limitLabels[key]}</span>
                            <span className="font-semibold text-white">{formatLimit(value)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Features */}
                    <div className="mt-6 pt-6 border-t border-space-700/50 flex-1">
                      <ul className="space-y-3">
                        {Object.entries(plan.features).map(([key, enabled]) => (
                          <li key={key} className="flex items-start text-sm gap-2">
                            {enabled ? (
                              <CheckIcon className="h-4 w-4 text-success-400 flex-shrink-0 mt-0.5" />
                            ) : (
                              <XMarkIcon className="h-4 w-4 text-space-600 flex-shrink-0 mt-0.5" />
                            )}
                            <span className={enabled ? 'text-space-300' : 'text-space-600'}>
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
        <div className="border-t border-space-800/60 py-24">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <p className="text-primary-400 text-xs tracking-widest uppercase mb-3 font-medium">FAQ</p>
              <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6"
                >
                  <h3 className="text-base font-semibold text-white mb-2">{faq.q}</h3>
                  <p className="text-space-400 text-sm leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="border-t border-space-800/60 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-primary-600/20 blur-3xl rounded-full" />
              <div className="relative bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl px-12 py-10 max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-white mb-3">
                  Need a custom solution?
                </h2>
                <p className="text-space-400 mb-8">
                  Contact our sales team for custom pricing, volume discounts, and enterprise features tailored to your organization.
                </p>
                <Link
                  href="/contact"
                  className="inline-flex items-center px-6 py-3 rounded-xl font-semibold transition-all bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-glow hover:shadow-glow-lg"
                >
                  Contact Sales
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
