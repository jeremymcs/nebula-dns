// Flux Shield Marketing Website - Pricing Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/solid'
import { API_URL } from '@/lib/config'
import { MarketingPageShell, MarketingCard } from '@/components/marketing/MarketingPageShell'
import { MarketingPageHero, MarketingSerifAccent } from '@/components/marketing/MarketingPageHero'
import { MarketingCtaBand } from '@/components/marketing/MarketingCtaBand'

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
    <MarketingPageShell>
      <MarketingPageHero
        eyebrow="Pricing"
        title={
          <>
            Simple, <MarketingSerifAccent>Transparent</MarketingSerifAccent> Pricing
          </>
        }
        lede="Choose the plan that fits your needs. All plans include a 14-day free trial with no credit card required."
      />

      <div className="section-container pb-8">
        <div className="flex items-center justify-center">
          <div className="fs-segment inline-flex">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={billingCycle === 'monthly' ? 'fs-segment-item-active' : 'fs-segment-item'}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={`${billingCycle === 'yearly' ? 'fs-segment-item-active' : 'fs-segment-item'} flex items-center gap-2`}
            >
              Yearly
              <span className="rounded-full bg-[var(--fs-success-soft)] px-2 py-0.5 text-xs font-medium text-[var(--fs-success)]">
                Save {yearlyDiscount}%
              </span>
            </button>
          </div>
        </div>
      </div>

        {/* Pricing Cards */}
        <div className="section-container pb-24">
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
                  className={`relative flex flex-col rounded-[14px] transition-all fs-card ${
                    isPopular ? 'ring-2 ring-[var(--fs-blue)]/35 shadow-[0_8px_30px_-12px_rgba(30,59,120,0.35)]' : ''
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-[var(--fs-navy)] px-4 py-1 text-xs font-semibold text-white">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="p-6 flex flex-col flex-1">
                    <div>
                      <h3 className="text-xl font-bold text-ink">{plan.name}</h3>
                      <p className="mt-2 text-sm text-[var(--fs-txt)] min-h-[2.5rem]">{plan.description}</p>
                    </div>

                    <div className="mt-6">
                      {isEnterprise ? (
                        <div className="flex items-baseline">
                          <span className="text-4xl font-bold text-ink">Custom</span>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold text-ink">
                            ${price === 0 ? '0' : price}
                          </span>
                          {price > 0 && (
                            <span className="text-[var(--fs-mut)] text-sm">
                              /{billingCycle === 'yearly' ? 'yr' : 'mo'}
                            </span>
                          )}
                        </div>
                      )}
                      {monthlyEquivalent && !isEnterprise && (
                        <p className="mt-1 text-xs text-[var(--fs-mut)]">
                          ${monthlyEquivalent}/month billed annually
                        </p>
                      )}
                      {isEnterprise && (
                        <p className="mt-1 text-xs text-[var(--fs-mut)]">Contact us for a quote</p>
                      )}
                    </div>

                    {/* CTA Button */}
                    {isEnterprise ? (
                      <Link
                        href="/contact"
                        className="mt-6 w-full inline-flex justify-center items-center px-4 py-3 rounded-xl font-semibold text-sm transition-all bg-panel border border-line text-ink hover:bg-surface hover:border-line"
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
                        className="mt-6 w-full inline-flex justify-center items-center px-4 py-3 rounded-xl font-semibold text-sm transition-all bg-panel border border-line text-[var(--fs-txt)] hover:bg-surface hover:border-line hover:text-ink"
                      >
                        Get Started Free
                      </Link>
                    ) : (
                      <Link
                        href={`/signup?plan=${plan.id}&billing=${billingCycle}`}
                        className="mt-6 w-full inline-flex justify-center items-center px-4 py-3 rounded-xl font-semibold text-sm transition-all bg-primary-500/10 border border-primary-500/30 text-brand hover:bg-primary-500/15 hover:border-primary-500/50 hover:text-ink"
                      >
                        Start Free Trial
                      </Link>
                    )}

                    {/* Limits */}
                    <div className="mt-6 pt-6 border-t border-line">
                      <ul className="space-y-3">
                        {Object.entries(plan.limits).map(([key, value]) => (
                          <li key={key} className="flex items-center justify-between text-sm">
                            <span className="text-[var(--fs-txt)]">{limitLabels[key]}</span>
                            <span className="font-semibold text-ink">{formatLimit(value)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Features */}
                    <div className="mt-6 pt-6 border-t border-line flex-1">
                      <ul className="space-y-3">
                        {Object.entries(plan.features).map(([key, enabled]) => (
                          <li key={key} className="flex items-start text-sm gap-2">
                            {enabled ? (
                              <CheckIcon className="h-4 w-4 text-[var(--fs-success)] flex-shrink-0 mt-0.5" />
                            ) : (
                              <XMarkIcon className="h-4 w-4 text-[var(--fs-mut)] flex-shrink-0 mt-0.5" />
                            )}
                            <span className={enabled ? 'text-[var(--fs-txt)]' : 'text-[var(--fs-mut)]'}>
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
        <div className="border-t border-line py-24">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <p className="text-brand text-xs tracking-widest uppercase mb-3 font-medium">FAQ</p>
              <h2 className="text-3xl font-bold text-ink">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="fs-card rounded-[14px] p-6"
                >
                  <h3 className="text-base font-semibold text-ink mb-2">{faq.q}</h3>
                  <p className="text-[var(--fs-txt)] text-sm leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <section className="section-container pb-16 sm:pb-24">
        <MarketingCtaBand
          title={
            <>
              Need a custom <MarketingSerifAccent>solution?</MarketingSerifAccent>
            </>
          }
          description="Contact our sales team for custom pricing, volume discounts, and enterprise features tailored to your organization."
          primaryHref="/contact"
          primaryLabel="Contact sales"
          secondaryHref="/enterprise"
          secondaryLabel="Enterprise overview"
        />
        </section>
    </MarketingPageShell>
  )
}
