// Flux Shield Marketing Website - Signup Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid'
import { API_URL, APP_URL } from '@/lib/config'
import { ProductFooterInline } from '@/components/ProductFooter'
import { MarketingPageShell, MarketingCard } from '@/components/marketing/MarketingPageShell'
import { MarketingPageHero, MarketingSerifAccent } from '@/components/marketing/MarketingPageHero'
import { MarketingCtaBand } from '@/components/marketing/MarketingCtaBand'

interface Plan {
  id: string
  name: string
  priceMonthly: number
  priceYearly: number
  description: string
}

const defaultPlans: Plan[] = [
  { id: 'free', name: 'Free', priceMonthly: 0, priceYearly: 0, description: 'Perfect for trying out' },
  { id: 'starter', name: 'Starter', priceMonthly: 9.99, priceYearly: 99.99, description: 'For small teams' },
  { id: 'pro', name: 'Professional', priceMonthly: 29.99, priceYearly: 299.99, description: 'For businesses' },
  { id: 'enterprise', name: 'Enterprise', priceMonthly: 99.99, priceYearly: 999.99, description: 'For organizations' },
]

const planFeatures: Record<string, string[]> = {
  free: ['DNS filtering & security', 'Basic reporting', '1 network location', '100K queries/month'],
  starter: ['Everything in Free', 'Email support', 'Custom block/allow lists', '3 locations, 500K queries/month'],
  pro: ['Everything in Starter', 'Advanced analytics', 'API access', 'Priority support', '10 locations, 5M queries/month'],
  enterprise: ['Everything in Professional', 'SSO/SAML integration', 'Dedicated account manager', 'Unlimited locations & queries', '99.99% uptime SLA'],
}

const stepLabels = ['Account Details', 'Company Info', 'Review & Confirm']

// --- Skeleton ---
function SignupFormSkeleton() {
  return (
    <MarketingPageShell>
      <div className="section-container py-12">
        <div className="mx-auto max-w-5xl animate-pulse">
          <div className="h-8 bg-space-800 rounded-xl w-1/2 mx-auto mb-10" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-space-900/60 border border-space-700/50 rounded-2xl p-8 space-y-6">
                <div className="h-7 bg-space-800 rounded-xl w-2/3" />
                <div className="h-12 bg-space-800 rounded-xl" />
                <div className="h-12 bg-space-800 rounded-xl" />
                <div className="h-12 bg-space-800 rounded-xl" />
              </div>
            </div>
            <div className="lg:col-span-1">
              <div className="bg-space-900/60 border border-space-700/50 rounded-2xl p-6 space-y-4">
                <div className="h-5 bg-space-800 rounded-xl w-1/2" />
                <div className="h-16 bg-space-800 rounded-xl" />
                <div className="h-16 bg-space-800 rounded-xl" />
                <div className="h-16 bg-space-800 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </MarketingPageShell>
  )
}

// --- Main Form ---
function SignupFormContent() {
  const searchParams = useSearchParams()

  const [step, setStep] = useState(1)
  const [plans, setPlans] = useState<Plan[]>(defaultPlans)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    companyName: '',
    planId: searchParams.get('plan') || 'free',
    billingCycle: (searchParams.get('billing') as 'monthly' | 'yearly') || 'monthly',
    industry: '',
    companySize: '',
    country: '',
    agreeTerms: false,
  })

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch(`${API_URL}/plans`)
        if (res.ok) {
          const data = await res.json()
          if (data.data?.length > 0) {
            setPlans(data.data)
          }
        }
      } catch {
        // Falls back to default plans if API is unavailable
      }
    }
    fetchPlans()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
    setError('')
  }

  const validateStep1 = () => {
    if (!formData.email || !formData.email.includes('@')) {
      setError('Please enter a valid email address')
      return false
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }
    return true
  }

  const validateStep2 = () => {
    if (!formData.fullName || !formData.companyName) {
      setError('Please fill in all required fields')
      return false
    }
    return true
  }

  const validateStep3 = () => {
    if (!formData.agreeTerms) {
      setError('Please agree to the terms and conditions')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return

    if (step < 3) {
      setStep(step + 1)
      return
    }

    if (!validateStep3()) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          companyName: formData.companyName,
          planId: formData.planId,
          billingCycle: formData.billingCycle,
          industry: formData.industry,
          companySize: formData.companySize,
          country: formData.country,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Signup failed')
      }

      if (data.requiresPayment) {
        const completeRes = await fetch(`${API_URL}/signup/${data.signupRequestId}/complete`, {
          method: 'POST',
        })
        if (!completeRes.ok) {
          throw new Error('Failed to complete signup')
        }
      }

      setSuccess(true)
      setTimeout(() => {
        window.location.href = APP_URL
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const selectedPlan = plans.find(p => p.id === formData.planId) || plans[0]
  const price =
    formData.billingCycle === 'yearly' ? selectedPlan.priceYearly : selectedPlan.priceMonthly
  const features = planFeatures[selectedPlan.id] || []

  // --- Success Screen ---
  if (success) {
    return (
      <MarketingPageShell>
        <div className="section-container flex min-h-[70vh] items-center justify-center py-16">
          <MarketingCard className="max-w-md w-full p-10 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--fs-success-soft)] text-[var(--fs-success)]">
              <CheckCircleIcon className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-semibold text-ink mb-3">Welcome to Flux Shield!</h2>
            <p className="text-[var(--fs-txt)] mb-6">
              Your account has been created successfully. Check your email for a welcome message with getting started instructions.
            </p>
            <p className="text-sm text-[var(--fs-mut)]">Redirecting to your dashboard...</p>
          </MarketingCard>
        </div>
      </MarketingPageShell>
    )
  }

  // --- Multi-Step Form ---
  return (
    <MarketingPageShell>
      <MarketingPageHero
        eyebrow="Get started"
        title={
          <>
            Start your <MarketingSerifAccent>free trial</MarketingSerifAccent>
          </>
        }
        lede="Create your account in a few steps. No credit card required for the 14-day trial."
      />
      <div className="section-container py-12 pb-16">
        {/* Step Indicator */}
        <div className="mb-10">
          <div className="flex items-center justify-center">
            {stepLabels.map((label, i) => {
              const s = i + 1
              const isCompleted = s < step
              const isActive = s === step
              return (
                <div key={s} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                        isCompleted
                          ? 'bg-success-600 text-white'
                          : isActive
                          ? 'bg-primary-600 text-white shadow-glow-sm'
                          : 'bg-space-700 text-[var(--fs-txt)]'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckIcon className="h-5 w-5" />
                      ) : (
                        s
                      )}
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium hidden sm:block ${
                        isActive ? 'text-white' : isCompleted ? 'text-success-400' : 'text-[var(--fs-mut)]'
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {s < 3 && (
                    <div
                      className={`w-16 sm:w-24 h-px mx-2 mb-5 transition-all ${
                        s < step ? 'bg-success-600' : 'bg-space-700'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-center text-sm text-[var(--fs-mut)] mt-1 sm:hidden">
            Step {step} of 3: {stepLabels[step - 1]}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Form Panel */}
          <div className="lg:col-span-2">
            <div className="fs-card rounded-[14px] p-8">
              <form onSubmit={handleSubmit}>
                {/* Error Banner */}
                {error && (
                  <div className="mb-6 p-4 rounded-xl bg-danger-900/30 border border-danger-700/40 flex items-start gap-3">
                    <ExclamationCircleIcon className="h-5 w-5 text-danger-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-danger-300">{error}</span>
                  </div>
                )}

                {/* Step 1: Account Details */}
                {step === 1 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-white">Create Your Account</h2>

                    <div>
                      <label className="block text-sm font-medium text-[var(--fs-txt)] mb-2">
                        Email Address <span className="text-primary-400">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="fs-input"
                        placeholder="you@company.com"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--fs-txt)] mb-2">
                        Password <span className="text-primary-400">*</span>
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="fs-input"
                        placeholder="At least 8 characters"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--fs-txt)] mb-2">
                        Confirm Password <span className="text-primary-400">*</span>
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="fs-input"
                        placeholder="Repeat your password"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Step 2: Company Info */}
                {step === 2 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-white">Tell Us About Your Organization</h2>

                    <div>
                      <label className="block text-sm font-medium text-[var(--fs-txt)] mb-2">
                        Full Name <span className="text-primary-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="fs-input"
                        placeholder="John Smith"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--fs-txt)] mb-2">
                        Company Name <span className="text-primary-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        className="fs-input"
                        placeholder="Acme Corporation"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--fs-txt)] mb-2">Industry</label>
                        <select
                          name="industry"
                          value={formData.industry}
                          onChange={handleChange}
                          className="fs-input"
                        >
                          <option value="">Select...</option>
                          <option value="technology">Technology</option>
                          <option value="healthcare">Healthcare</option>
                          <option value="finance">Finance</option>
                          <option value="education">Education</option>
                          <option value="government">Government</option>
                          <option value="retail">Retail</option>
                          <option value="manufacturing">Manufacturing</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--fs-txt)] mb-2">Company Size</label>
                        <select
                          name="companySize"
                          value={formData.companySize}
                          onChange={handleChange}
                          className="fs-input"
                        >
                          <option value="">Select...</option>
                          <option value="1-10">1-10 employees</option>
                          <option value="11-50">11-50 employees</option>
                          <option value="51-200">51-200 employees</option>
                          <option value="201-500">201-500 employees</option>
                          <option value="500+">500+ employees</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--fs-txt)] mb-2">Country</label>
                      <select
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        className="fs-input"
                      >
                        <option value="">Select...</option>
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                        <option value="GB">United Kingdom</option>
                        <option value="AU">Australia</option>
                        <option value="DE">Germany</option>
                        <option value="FR">France</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Step 3: Review & Confirm */}
                {step === 3 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-white">Review & Confirm</h2>

                    <div className="bg-space-900 border border-space-700/60 rounded-xl p-5 space-y-3">
                      {[
                        { label: 'Email', value: formData.email },
                        { label: 'Name', value: formData.fullName },
                        { label: 'Company', value: formData.companyName },
                        { label: 'Plan', value: selectedPlan.name },
                        { label: 'Billing', value: formData.billingCycle.charAt(0).toUpperCase() + formData.billingCycle.slice(1) },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between items-center text-sm">
                          <span className="text-[var(--fs-txt)]">{label}</span>
                          <span className="font-medium text-white">{value || '—'}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        name="agreeTerms"
                        id="agreeTerms"
                        checked={formData.agreeTerms}
                        onChange={handleChange}
                        className="mt-1 h-4 w-4 rounded border-space-600 bg-space-900 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
                      />
                      <label htmlFor="agreeTerms" className="text-sm text-[var(--fs-txt)]">
                        I agree to the{' '}
                        <Link href="/terms" className="text-primary-400 hover:text-primary-300 underline underline-offset-2">
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="text-primary-400 hover:text-primary-300 underline underline-offset-2">
                          Privacy Policy
                        </Link>
                      </label>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="mt-8 flex justify-between items-center">
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={() => { setStep(step - 1); setError('') }}
                      className="px-6 py-3 rounded-xl border border-space-700 text-[var(--fs-txt)] font-semibold text-sm hover:bg-space-800 hover:border-space-600 hover:text-white transition-all"
                    >
                      Back
                    </button>
                  ) : (
                    <div />
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-3 rounded-xl font-semibold text-sm transition-all bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-glow hover:shadow-glow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading
                      ? 'Processing...'
                      : step < 3
                      ? 'Continue'
                      : price > 0
                      ? 'Start Free Trial'
                      : 'Create Account'}
                  </button>
                </div>
              </form>
            </div>

            <p className="text-center mt-6 text-[var(--fs-mut)] text-sm">
              Already have an account?{' '}
              <a href={APP_URL} className="text-primary-400 font-medium hover:text-primary-300">
                Sign in
              </a>
            </p>
          </div>

          {/* Order Summary Panel */}
          <div className="lg:col-span-1">
            <div className="fs-card rounded-[14px] p-6 sticky top-24">
              <h3 className="text-base font-semibold text-white mb-5">Order Summary</h3>

              {/* Plan Selection */}
              <div className="space-y-2 mb-5">
                {plans.map((plan) => (
                  <label
                    key={plan.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      formData.planId === plan.id
                        ? 'border-primary-600/60 bg-primary-900/20'
                        : 'border-space-700/50 hover:border-space-600/60 hover:bg-space-800/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="planId"
                      value={plan.id}
                      checked={formData.planId === plan.id}
                      onChange={handleChange}
                      className="h-4 w-4 text-primary-600 border-space-600 bg-space-900 focus:ring-primary-500 focus:ring-offset-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">{plan.name}</div>
                      <div className="text-xs text-[var(--fs-mut)]">
                        {plan.priceMonthly === 0
                          ? 'Free'
                          : `$${formData.billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly}/${formData.billingCycle === 'yearly' ? 'yr' : 'mo'}`}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {/* Billing Cycle Toggle */}
              <div className="mb-5">
                <div className="bg-space-800 rounded-full p-1 flex">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, billingCycle: 'monthly' }))}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-full transition-all ${
                      formData.billingCycle === 'monthly'
                        ? 'bg-primary-600 text-white'
                        : 'text-[var(--fs-txt)] hover:text-white'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, billingCycle: 'yearly' }))}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-full transition-all ${
                      formData.billingCycle === 'yearly'
                        ? 'bg-primary-600 text-white'
                        : 'text-[var(--fs-txt)] hover:text-white'
                    }`}
                  >
                    Yearly
                  </button>
                </div>
                {formData.billingCycle === 'yearly' && (
                  <p className="text-xs text-success-400 mt-2 text-center">
                    Save up to 17% with yearly billing
                  </p>
                )}
              </div>

              {/* Feature List */}
              {features.length > 0 && (
                <div className="mb-5 pt-4 border-t border-space-700/50">
                  <ul className="space-y-2">
                    {features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-[var(--fs-txt)]">
                        <CheckIcon className="h-3.5 w-3.5 text-success-400 flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Price Breakdown */}
              <div className="border-t border-space-700/50 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--fs-txt)]">Subtotal</span>
                  <span className="text-white font-medium">
                    {price === 0 ? 'Free' : `$${price.toFixed(2)}`}
                  </span>
                </div>
                {price > 0 && (
                  <div className="flex justify-between text-sm text-success-400">
                    <span>14-day free trial</span>
                    <span>-${price.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-space-700/50">
                  <span className="text-white font-semibold">Due Today</span>
                  <span className="text-white font-bold text-lg">$0.00</span>
                </div>
              </div>

              {price > 0 && (
                <p className="text-xs text-[var(--fs-mut)] mt-4 leading-relaxed">
                  Your card will be charged ${price.toFixed(2)} after your 14-day trial ends. Cancel anytime.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      <ProductFooterInline />
    </MarketingPageShell>
  )
}

// --- Page Export ---
export default function SignupPage() {
  return (
    <Suspense fallback={<SignupFormSkeleton />}>
      <SignupFormContent />
    </Suspense>
  )
}
