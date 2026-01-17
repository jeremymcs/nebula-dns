// Nebula DNS - UI Signup Form with Validation
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signupSchema, type SignupFormData } from '@/lib/validations'
import { FormField, Input, Select, Checkbox } from '@/components/forms'
import { useToast } from '@/components/Toast'
import Link from 'next/link'

interface SignupFormProps {
  onSubmit: (data: SignupFormData) => Promise<void>
  loading?: boolean
  defaultPlanId?: string
  defaultBillingCycle?: 'monthly' | 'yearly'
}

export function SignupForm({
  onSubmit,
  loading = false,
  defaultPlanId = 'free',
  defaultBillingCycle = 'monthly',
}: SignupFormProps) {
  const { showToast } = useToast()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: 'onBlur',
    defaultValues: {
      planId: defaultPlanId,
      billingCycle: defaultBillingCycle,
      agreeTerms: false,
    },
  })

  const password = watch('password')
  const isLoading = loading || isSubmitting

  const handleFormSubmit = async (data: SignupFormData) => {
    try {
      await onSubmit(data)
      showToast('success', 'Account Created', 'Welcome to Nebula DNS!')
    } catch (error) {
      showToast('error', 'Signup Failed', error instanceof Error ? error.message : 'Please try again')
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit(handleFormSubmit)}>
      {/* Account Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-space-900 dark:text-white">Account Details</h3>

        <FormField label="Email Address" error={errors.email?.message} required>
          <Input
            {...register('email')}
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            error={!!errors.email}
            disabled={isLoading}
          />
        </FormField>

        <FormField
          label="Password"
          error={errors.password?.message}
          hint="Must contain uppercase, lowercase, number, and special character"
          required
        >
          <Input
            {...register('password')}
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            error={!!errors.password}
            disabled={isLoading}
          />
        </FormField>

        <FormField label="Confirm Password" error={errors.confirmPassword?.message} required>
          <Input
            {...register('confirmPassword')}
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            error={!!errors.confirmPassword}
            disabled={isLoading}
          />
        </FormField>
      </div>

      {/* Company Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-space-900 dark:text-white">Company Information</h3>

        <FormField label="Full Name" error={errors.fullName?.message} required>
          <Input
            {...register('fullName')}
            type="text"
            autoComplete="name"
            placeholder="John Smith"
            error={!!errors.fullName}
            disabled={isLoading}
          />
        </FormField>

        <FormField label="Company Name" error={errors.companyName?.message} required>
          <Input
            {...register('companyName')}
            type="text"
            autoComplete="organization"
            placeholder="Acme Corporation"
            error={!!errors.companyName}
            disabled={isLoading}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Industry" error={errors.industry?.message}>
            <Select {...register('industry')} error={!!errors.industry} disabled={isLoading}>
              <option value="">Select...</option>
              <option value="technology">Technology</option>
              <option value="healthcare">Healthcare</option>
              <option value="finance">Finance</option>
              <option value="education">Education</option>
              <option value="government">Government</option>
              <option value="retail">Retail</option>
              <option value="manufacturing">Manufacturing</option>
              <option value="other">Other</option>
            </Select>
          </FormField>

          <FormField label="Company Size" error={errors.companySize?.message}>
            <Select {...register('companySize')} error={!!errors.companySize} disabled={isLoading}>
              <option value="">Select...</option>
              <option value="1-10">1-10 employees</option>
              <option value="11-50">11-50 employees</option>
              <option value="51-200">51-200 employees</option>
              <option value="201-500">201-500 employees</option>
              <option value="500+">500+ employees</option>
            </Select>
          </FormField>
        </div>

        <FormField label="Country" error={errors.country?.message}>
          <Select {...register('country')} error={!!errors.country} disabled={isLoading}>
            <option value="">Select...</option>
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="GB">United Kingdom</option>
            <option value="AU">Australia</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
            <option value="other">Other</option>
          </Select>
        </FormField>
      </div>

      {/* Terms Agreement */}
      <FormField error={errors.agreeTerms?.message}>
        <Checkbox
          {...register('agreeTerms')}
          label={
            <>
              I agree to the{' '}
              <Link href="/terms" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                Privacy Policy
              </Link>
            </>
          }
          disabled={isLoading}
        />
      </FormField>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-8 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Creating Account...
          </span>
        ) : (
          'Create Account'
        )}
      </button>
    </form>
  )
}
