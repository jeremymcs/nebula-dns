// Nebula DNS - UI Login Form with Validation
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginFormData } from '@/lib/validations'
import { FormField, Input } from '@/components/forms'
import { useToast } from '@/components/Toast'

interface LoginFormProps {
  onSubmit: (data: LoginFormData) => Promise<void>
  loading?: boolean
  onDemoLogin?: () => void
  onMspDemoLogin?: () => void
}

export function LoginForm({ onSubmit, loading = false, onDemoLogin, onMspDemoLogin }: LoginFormProps) {
  const { showToast } = useToast()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  })

  const handleFormSubmit = async (data: LoginFormData) => {
    try {
      await onSubmit(data)
    } catch (error) {
      showToast('error', 'Login Failed', error instanceof Error ? error.message : 'Please try again')
    }
  }

  const isLoading = loading || isSubmitting

  return (
    <form className="space-y-5" onSubmit={handleSubmit(handleFormSubmit)}>
      <FormField label="Email address" error={errors.email?.message} required>
        <Input
          {...register('email')}
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          error={!!errors.email}
          disabled={isLoading}
        />
      </FormField>

      <FormField label="Password" error={errors.password?.message} required>
        <Input
          {...register('password')}
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={!!errors.password}
          disabled={isLoading}
        />
      </FormField>

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full py-3"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Signing in...
          </span>
        ) : 'Sign in'}
      </button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-space-200 dark:border-space-700" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-white dark:bg-space-900 text-space-500">or</span>
        </div>
      </div>

      {/* Demo Login Buttons */}
      {(onDemoLogin || onMspDemoLogin) && (
        <div className="grid grid-cols-2 gap-3">
          {onDemoLogin && (
            <button
              type="button"
              onClick={onDemoLogin}
              disabled={isLoading}
              className="py-3 px-4 rounded-xl ring-1 ring-space-200 dark:ring-space-700 bg-space-50 dark:bg-space-800 hover:bg-space-100 dark:hover:bg-space-700 text-space-700 dark:text-space-300 font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">Demo</span>
            </button>
          )}
          {onMspDemoLogin && (
            <button
              type="button"
              onClick={onMspDemoLogin}
              disabled={isLoading}
              className="py-3 px-4 rounded-xl ring-1 ring-emerald-200 dark:ring-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="text-sm">MSP Demo</span>
            </button>
          )}
        </div>
      )}
    </form>
  )
}
