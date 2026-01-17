// Nebula DNS - UI Authentication Validation Schemas
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { z } from 'zod'

// Password requirements
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/

// Email validation schema
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .toLowerCase()
  .trim()

// Password validation schema
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .regex(
    PASSWORD_REGEX,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  )

// Login form schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export type LoginFormData = z.infer<typeof loginSchema>

// Signup form schema
export const signupSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    fullName: z
      .string()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name must be less than 100 characters')
      .trim(),
    companyName: z
      .string()
      .min(2, 'Company name must be at least 2 characters')
      .max(100, 'Company name must be less than 100 characters')
      .trim(),
    planId: z.string().min(1, 'Please select a plan'),
    billingCycle: z.enum(['monthly', 'yearly']),
    industry: z.string().optional(),
    companySize: z.string().optional(),
    country: z.string().optional(),
    agreeTerms: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the terms and conditions',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type SignupFormData = z.infer<typeof signupSchema>

// MFA verification schema
export const mfaSchema = z.object({
  code: z
    .string()
    .min(6, 'MFA code must be at least 6 characters')
    .max(8, 'MFA code must be at most 8 characters')
    .regex(/^[0-9A-Za-z]+$/, 'MFA code must contain only letters and numbers'),
})

export type MfaFormData = z.infer<typeof mfaSchema>

// Password reset request schema
export const passwordResetRequestSchema = z.object({
  email: emailSchema,
})

export type PasswordResetRequestFormData = z.infer<typeof passwordResetRequestSchema>

// Password reset schema
export const passwordResetSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type PasswordResetFormData = z.infer<typeof passwordResetSchema>

// Change password schema
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  })

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
