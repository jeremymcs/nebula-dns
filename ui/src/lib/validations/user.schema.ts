// Nebula DNS - UI User Management Validation Schemas
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { z } from 'zod'
import { emailSchema } from './auth.schema'

// User role enum
export const userRoleSchema = z.enum(['owner', 'admin', 'analyst', 'readonly'])

// User invite schema
export const userInviteSchema = z.object({
  email: emailSchema,
  role: userRoleSchema,
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .trim()
    .optional(),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .trim()
    .optional(),
  sendEmail: z.boolean().default(true),
  expiresInDays: z
    .number()
    .int('Must be a whole number')
    .min(1, 'Minimum 1 day')
    .max(30, 'Maximum 30 days')
    .default(7),
})

export type UserInviteFormData = z.infer<typeof userInviteSchema>

// User update schema
export const userUpdateSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .trim()
    .optional(),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .trim()
    .optional(),
  role: userRoleSchema.optional(),
  enabled: z.boolean().optional(),
})

export type UserUpdateFormData = z.infer<typeof userUpdateSchema>

// User profile schema
export const userProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .trim(),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .trim(),
  email: emailSchema,
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .optional()
    .nullable(),
  timezone: z.string().optional(),
  language: z.enum(['en', 'es', 'fr', 'de', 'ja', 'zh']).default('en').optional(),
})

export type UserProfileFormData = z.infer<typeof userProfileSchema>

// Bulk user action schema
export const bulkUserActionSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, 'Select at least one user'),
  action: z.enum(['enable', 'disable', 'delete', 'changeRole']),
  newRole: userRoleSchema.optional(),
  confirmDelete: z.boolean().optional(),
})

export type BulkUserActionFormData = z.infer<typeof bulkUserActionSchema>

// User filter schema
export const userFilterSchema = z.object({
  search: z.string().optional(),
  role: userRoleSchema.optional(),
  enabled: z.boolean().optional(),
  sortBy: z.enum(['name', 'email', 'role', 'created', 'lastLogin']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

export type UserFilterFormData = z.infer<typeof userFilterSchema>

// Team member schema (for organization/tenant settings)
export const teamMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  role: userRoleSchema,
  permissions: z
    .array(
      z.enum([
        'policies.read',
        'policies.write',
        'locations.read',
        'locations.write',
        'lists.read',
        'lists.write',
        'reports.read',
        'users.read',
        'users.write',
        'settings.read',
        'settings.write',
        'billing.read',
        'billing.write',
      ])
    )
    .optional(),
})

export type TeamMemberFormData = z.infer<typeof teamMemberSchema>
