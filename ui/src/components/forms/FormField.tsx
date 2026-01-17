// Nebula DNS - UI Form Field Components
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, forwardRef } from 'react'
import { ExclamationCircleIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'

// Form Field Wrapper
interface FormFieldProps {
  label?: string
  error?: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}

export function FormField({ label, error, hint, required, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-space-700 dark:text-space-300">
          {label}
          {required && <span className="text-danger-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="text-xs text-space-500 dark:text-space-400">{hint}</p>
      )}
      {error && (
        <div className="flex items-center gap-1 text-danger-600 dark:text-danger-400">
          <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}

// Text Input
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={clsx(
          'w-full px-3 py-2 rounded-lg border transition-colors',
          'bg-white dark:bg-space-800',
          'text-space-900 dark:text-white',
          'placeholder:text-space-400 dark:placeholder:text-space-500',
          'focus:outline-none focus:ring-2',
          error
            ? 'border-danger-300 dark:border-danger-700 focus:border-danger-500 focus:ring-danger-500/20'
            : 'border-space-300 dark:border-space-600 focus:border-primary-500 focus:ring-primary-500/20',
          'disabled:bg-space-50 dark:disabled:bg-space-900 disabled:cursor-not-allowed disabled:opacity-60',
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

// Textarea
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={clsx(
          'w-full px-3 py-2 rounded-lg border transition-colors resize-vertical min-h-[100px]',
          'bg-white dark:bg-space-800',
          'text-space-900 dark:text-white',
          'placeholder:text-space-400 dark:placeholder:text-space-500',
          'focus:outline-none focus:ring-2',
          error
            ? 'border-danger-300 dark:border-danger-700 focus:border-danger-500 focus:ring-danger-500/20'
            : 'border-space-300 dark:border-space-600 focus:border-primary-500 focus:ring-primary-500/20',
          'disabled:bg-space-50 dark:disabled:bg-space-900 disabled:cursor-not-allowed disabled:opacity-60',
          className
        )}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

// Select
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={clsx(
          'w-full px-3 py-2 rounded-lg border transition-colors',
          'bg-white dark:bg-space-800',
          'text-space-900 dark:text-white',
          'focus:outline-none focus:ring-2',
          error
            ? 'border-danger-300 dark:border-danger-700 focus:border-danger-500 focus:ring-danger-500/20'
            : 'border-space-300 dark:border-space-600 focus:border-primary-500 focus:ring-primary-500/20',
          'disabled:bg-space-50 dark:disabled:bg-space-900 disabled:cursor-not-allowed disabled:opacity-60',
          className
        )}
        {...props}
      >
        {children}
      </select>
    )
  }
)
Select.displayName = 'Select'

// Checkbox
interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <label className="flex items-start gap-2 cursor-pointer group">
        <input
          ref={ref}
          type="checkbox"
          className={clsx(
            'mt-0.5 h-4 w-4 rounded border-space-300 dark:border-space-600',
            'text-primary-600 focus:ring-2 focus:ring-primary-500/20',
            'disabled:cursor-not-allowed disabled:opacity-60',
            'transition-colors',
            className
          )}
          {...props}
        />
        <span className="text-sm text-space-700 dark:text-space-300 group-hover:text-space-900 dark:group-hover:text-white transition-colors">
          {label}
        </span>
      </label>
    )
  }
)
Checkbox.displayName = 'Checkbox'

// Radio
interface RadioProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <label className="flex items-start gap-2 cursor-pointer group">
        <input
          ref={ref}
          type="radio"
          className={clsx(
            'mt-0.5 h-4 w-4 border-space-300 dark:border-space-600',
            'text-primary-600 focus:ring-2 focus:ring-primary-500/20',
            'disabled:cursor-not-allowed disabled:opacity-60',
            'transition-colors',
            className
          )}
          {...props}
        />
        <span className="text-sm text-space-700 dark:text-space-300 group-hover:text-space-900 dark:group-hover:text-white transition-colors">
          {label}
        </span>
      </label>
    )
  }
)
Radio.displayName = 'Radio'
