/**
 * Nebula DNS - Accept Invite Validation Schema
 * Zod schema for admin invitation acceptance form
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import { z } from 'zod'

/**
 * Accept Invitation Schema
 * Validates name and password for invited admin account creation
 *
 * Password requirements match backend:
 * - At least 14 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character
 */
export const acceptInviteSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must not exceed 100 characters'),
    password: z
      .string()
      .min(14, 'Password must be at least 14 characters')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(
        /[!@#$%^&*(),.?":{}|<>]/,
        'Must contain at least one special character'
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

/**
 * Form data type inferred from schema
 */
export type AcceptInviteFormData = z.infer<typeof acceptInviteSchema>

/**
 * Password requirement checklist for real-time UI feedback
 */
export const PASSWORD_REQUIREMENTS = [
  { id: 'length', label: 'At least 14 characters', test: (pw: string) => pw.length >= 14 },
  { id: 'lowercase', label: 'One lowercase letter', test: (pw: string) => /[a-z]/.test(pw) },
  { id: 'uppercase', label: 'One uppercase letter', test: (pw: string) => /[A-Z]/.test(pw) },
  { id: 'number', label: 'One number', test: (pw: string) => /[0-9]/.test(pw) },
  { id: 'special', label: 'One special character (!@#$%^&*(),.?":{}|<>)', test: (pw: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pw) },
] as const
