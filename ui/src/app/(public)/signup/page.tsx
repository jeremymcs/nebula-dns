/**
 * SafeDNS Signup Page
 * Multi-step signup flow with plan selection and payment
 */

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid'

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

// Loading fallback for Suspense
function SignupFormSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto mb-8" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                <div className="space-y-6">
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                  <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>
            </div>
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
                <div className="space-y-3">
                  <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SignupFormContent() {
  const router = useRouter()
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
    // Fetch plans from API
    async function fetchPlans() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/plans`)
        if (res.ok) {
          const data = await res.json()
          if (data.data?.length > 0) {
            setPlans(data.data)
          }
        }
      } catch (error) {
        console.log('Using default plans')
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/signup`, {
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
        // For paid plans, redirect to checkout (Stripe integration)
        // For now, we'll simulate completion
        const completeRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/signup/${data.signupRequestId}/complete`, {
          method: 'POST',
        })
        
        if (!completeRes.ok) {
          throw new Error('Failed to complete signup')
        }
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/')
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const selectedPlan = plans.find(p => p.id === formData.planId) || plans[0]
  const price = formData.billingCycle === 'yearly' ? selectedPlan.priceYearly : selectedPlan.priceMonthly

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircleIcon className="h-10 w-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome to SafeDNS!</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your account has been created successfully. Check your email for a welcome message with getting started instructions.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Redirecting to login...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                    s < step
                      ? 'bg-indigo-600 text-white'
                      : s === step
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {s < step ? (
                    <CheckCircleIcon className="h-6 w-6" />
                  ) : (
                    s
                  )}
                </div>
                {s < 3 && (
                  <div
                    className={`w-20 h-1 ${
                      s < step ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Step {step} of 3:{' '}
              {step === 1 ? 'Account Details' : step === 2 ? 'Company Info' : 'Review & Confirm'}
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-start">
                    <ExclamationCircleIcon className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
                  </div>
                )}

                {/* Step 1: Account Details */}
                {step === 1 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Your Account</h2>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="you@company.com"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Password *
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="At least 8 characters"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Confirm Password *
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Repeat your password"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Step 2: Company Info */}
                {step === 2 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tell Us About Your Organization</h2>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="John Smith"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Acme Corporation"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Industry
                        </label>
                        <select
                          name="industry"
                          value={formData.industry}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Company Size
                        </label>
                        <select
                          name="companySize"
                          value={formData.companySize}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Country
                      </label>
                      <select
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Review & Confirm</h2>

                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Email</span>
                        <span className="font-medium dark:text-white">{formData.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Name</span>
                        <span className="font-medium dark:text-white">{formData.fullName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Company</span>
                        <span className="font-medium dark:text-white">{formData.companyName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Plan</span>
                        <span className="font-medium dark:text-white">{selectedPlan.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Billing</span>
                        <span className="font-medium capitalize dark:text-white">{formData.billingCycle}</span>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        name="agreeTerms"
                        id="agreeTerms"
                        checked={formData.agreeTerms}
                        onChange={handleChange}
                        className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 bg-white dark:bg-gray-700"
                      />
                      <label htmlFor="agreeTerms" className="ml-3 text-sm text-gray-600 dark:text-gray-400">
                        I agree to the{' '}
                        <Link href="/terms" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                          Privacy Policy
                        </Link>
                      </label>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="mt-8 flex justify-between">
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={() => setStep(step - 1)}
                      className="px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Back
                    </button>
                  ) : (
                    <div />
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Summary</h3>

              {/* Plan Selection */}
              <div className="space-y-3 mb-6">
                {plans.map((plan) => (
                  <label
                    key={plan.id}
                    className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.planId === plan.id
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="planId"
                      value={plan.id}
                      checked={formData.planId === plan.id}
                      onChange={handleChange}
                      className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 focus:ring-indigo-500"
                    />
                    <div className="ml-3 flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">{plan.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        ${formData.billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly}
                        /{formData.billingCycle === 'yearly' ? 'year' : 'month'}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {/* Billing Cycle Toggle */}
              <div className="mb-6">
                <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg flex">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, billingCycle: 'monthly' }))}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                      formData.billingCycle === 'monthly'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, billingCycle: 'yearly' }))}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                      formData.billingCycle === 'yearly'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    Yearly
                  </button>
                </div>
                {formData.billingCycle === 'yearly' && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2 text-center">
                    Save up to 17% with yearly billing!
                  </p>
                )}
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span className="font-medium dark:text-white">${price.toFixed(2)}</span>
                </div>
                {price > 0 && (
                  <div className="flex justify-between mb-2 text-green-600 dark:text-green-400">
                    <span>14-day free trial</span>
                    <span>-${price.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="dark:text-white">Due Today</span>
                  <span className="dark:text-white">$0.00</span>
                </div>
              </div>

              {price > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                  Your card will be charged ${price.toFixed(2)} after your 14-day trial ends.
                  Cancel anytime.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Already have an account */}
        <p className="text-center mt-8 text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link href="/" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupFormSkeleton />}>
      <SignupFormContent />
    </Suspense>
  )
}
