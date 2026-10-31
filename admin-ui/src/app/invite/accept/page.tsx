/**
 * Nebula DNS - Accept Invitation Page
 * Public page for invited admins to accept invitation and create account
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useState, useEffect, useContext, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ThemeContext } from '@/contexts/ThemeContext'
import { acceptAdminInvitation } from '@/hooks/useApi'
import {
  acceptInviteSchema,
  AcceptInviteFormData,
  PASSWORD_REQUIREMENTS,
} from '@/lib/validations/accept-invite.schema'
import {
  SunIcon,
  MoonIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'
import { ADMIN_PORTAL_NAME, PRODUCT_NAME } from '@/lib/branding'
import { ProductFooter } from '@/components/ProductFooter'

/**
 * Theme toggle button for light/dark mode
 */
function ThemeToggle() {
  const context = useContext(ThemeContext)
  if (!context) return null
  const { resolvedTheme, toggleTheme } = context

  return (
    <button
      onClick={toggleTheme}
      className="absolute top-6 right-6 z-20 p-2.5 rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20 hover:bg-white/20 transition-all"
      aria-label="Toggle theme"
    >
      {resolvedTheme === 'dark' ? (
        <SunIcon className="w-5 h-5 text-warning-400" />
      ) : (
        <MoonIcon className="w-5 h-5 text-space-700" />
      )}
    </button>
  )
}

/**
 * Password requirement item with check/x icon
 */
function RequirementItem({
  met,
  label,
}: {
  met: boolean
  label: string
}) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {met ? (
        <CheckCircleIcon className="w-4 h-4 text-success-500 flex-shrink-0" />
      ) : (
        <XCircleIcon className="w-4 h-4 text-space-400 flex-shrink-0" />
      )}
      <span className={met ? 'text-success-600 dark:text-success-400' : 'text-space-500 dark:text-space-400'}>
        {label}
      </span>
    </li>
  )
}

/**
 * Success state content
 */
function SuccessState() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push('/login')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

  return (
    <div className="text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mb-6">
        <CheckIcon className="w-8 h-8 text-success-600 dark:text-success-400" />
      </div>
      <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-2">
        Account Created Successfully!
      </h2>
      <p className="text-space-500 dark:text-space-400 mb-6">
        {countdown > 0
          ? `Redirecting to login in ${countdown} second${countdown !== 1 ? 's' : ''}...`
          : 'Redirecting...'}
      </p>
      <Link
        href="/login"
        className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
      >
        Go to Login Now
      </Link>
    </div>
  )
}

/**
 * Invalid token error state
 */
function InvalidTokenState() {
  return (
    <div className="text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center mb-6">
        <XCircleIcon className="w-8 h-8 text-danger-600 dark:text-danger-400" />
      </div>
      <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-2">
        Invalid Invitation Link
      </h2>
      <p className="text-space-500 dark:text-space-400 mb-6">
        This invitation link is invalid or missing the required token.
        Please check your email for the correct link or contact your administrator.
      </p>
      <Link
        href="/login"
        className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
      >
        Return to Login
      </Link>
    </div>
  )
}

/**
 * Accept invitation form content (wrapped in Suspense for useSearchParams)
 */
function AcceptInviteContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AcceptInviteFormData>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: {
      name: '',
      password: '',
      confirmPassword: '',
    },
  })

  const password = watch('password', '')

  // Show invalid token state if no token
  if (!token) {
    return <InvalidTokenState />
  }

  // Show success state
  if (success) {
    return <SuccessState />
  }

  const onSubmit = async (data: AcceptInviteFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      await acceptAdminInvitation({
        token,
        name: data.name,
        password: data.password,
      })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Form Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-space-900 dark:text-white">
          Complete Your Account
        </h2>
        <p className="mt-2 text-space-500 dark:text-space-400">
          Enter your name and create a password to finish setting up your admin account
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20 ring-1 ring-danger-200 dark:ring-danger-800">
          <p className="text-sm text-danger-700 dark:text-danger-300">{error}</p>
        </div>
      )}

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        {/* Name Input */}
        <div>
          <label htmlFor="name" className="label">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            {...register('name')}
            className={`input ${errors.name ? 'input-error' : ''}`}
            placeholder="Enter your full name"
            disabled={isSubmitting}
          />
          {errors.name && (
            <p className="mt-1.5 text-sm text-danger-600 dark:text-danger-400">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Password Input */}
        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              {...register('password')}
              className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
              placeholder="Create a strong password"
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-space-400 hover:text-space-600 dark:hover:text-space-300"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeSlashIcon className="w-5 h-5" />
              ) : (
                <EyeIcon className="w-5 h-5" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-sm text-danger-600 dark:text-danger-400">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Password Requirements Checklist */}
        <div className="p-4 rounded-xl bg-space-50 dark:bg-space-800/50 ring-1 ring-space-200 dark:ring-space-700">
          <p className="text-sm font-medium text-space-700 dark:text-space-300 mb-3">
            Password Requirements
          </p>
          <ul className="space-y-2">
            {PASSWORD_REQUIREMENTS.map((req) => (
              <RequirementItem
                key={req.id}
                met={req.test(password)}
                label={req.label}
              />
            ))}
          </ul>
        </div>

        {/* Confirm Password Input */}
        <div>
          <label htmlFor="confirmPassword" className="label">
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              {...register('confirmPassword')}
              className={`input pr-10 ${errors.confirmPassword ? 'input-error' : ''}`}
              placeholder="Confirm your password"
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-space-400 hover:text-space-600 dark:hover:text-space-300"
              tabIndex={-1}
            >
              {showConfirmPassword ? (
                <EyeSlashIcon className="w-5 h-5" />
              ) : (
                <EyeIcon className="w-5 h-5" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1.5 text-sm text-danger-600 dark:text-danger-400">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full py-3"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Creating Account...
            </span>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      {/* Already have account link */}
      <p className="mt-6 text-center text-sm text-space-500 dark:text-space-400">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
        >
          Sign in
        </Link>
      </p>
    </>
  )
}

/**
 * Accept Invitation Page (public - no auth required)
 * URL: /invite/accept?token=xxx
 */
export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Cosmic Gradient Background */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-space-900 via-primary-900 to-accent-900">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

        {/* Content overlay */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-8">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-warning-500 to-danger-500 flex items-center justify-center shadow-2xl shadow-warning-500/30">
              <ShieldCheckIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{PRODUCT_NAME}</h1>
              <p className="text-warning-300 font-medium">{ADMIN_PORTAL_NAME}</p>
            </div>
          </div>

          {/* Tagline */}
          <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
            Welcome to the<br />
            <span className="bg-gradient-to-r from-warning-400 to-danger-400 bg-clip-text text-transparent">
              Team
            </span>
          </h2>

          <p className="text-lg text-space-300 max-w-md mb-10">
            You&apos;ve been invited to join the {PRODUCT_NAME} administrative team.
            Complete your account setup to get started.
          </p>

          {/* Features */}
          <div className="space-y-4">
            {[
              'Manage MSPs and tenants',
              'Monitor system health',
              'Access administrative tools',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-space-200">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-warning-500/20 flex items-center justify-center">
                  <svg className="w-3 h-3 text-warning-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Accept Invitation Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-12 xl:px-20 bg-white dark:bg-space-900 relative">
        <ThemeToggle />

        {/* Mobile Logo */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-warning-500 to-danger-500 flex items-center justify-center shadow-lg shadow-warning-500/25">
            <ShieldCheckIcon className="h-7 w-7 text-white" />
          </div>
          <div>
            <span className="text-2xl font-bold text-space-900 dark:text-white">{PRODUCT_NAME}</span>
            <span className="block text-sm text-warning-500 font-medium">{ADMIN_PORTAL_NAME}</span>
          </div>
        </div>

        <div className="w-full max-w-sm mx-auto lg:mx-0">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
              </div>
            }
          >
            <AcceptInviteContent />
          </Suspense>
        </div>

        {/* Security Notice */}
        <p className="mt-8 text-xs text-center text-space-500 dark:text-space-400 max-w-sm mx-auto lg:mx-0">
          This is a restricted area. Your account credentials will be used to access administrative functions.
        </p>

        <ProductFooter variant="auth" className="max-w-sm mx-auto lg:mx-0" />
      </div>
    </div>
  )
}
