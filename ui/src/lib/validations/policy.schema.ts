// Nebula DNS - UI Policy Validation Schemas
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { z } from 'zod'

// Policy action enum
export const policyActionSchema = z.enum(['allow', 'block', 'redirect'])

// Policy priority validation
export const policyPrioritySchema = z
  .number()
  .int('Priority must be a whole number')
  .min(1, 'Priority must be at least 1')
  .max(100, 'Priority cannot exceed 100')

// Schedule time validation
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)')

// Day of week validation
const dayOfWeekSchema = z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])

// Policy schedule schema
export const policyScheduleSchema = z.object({
  enabled: z.boolean(),
  timezone: z.string().optional(),
  rules: z
    .array(
      z.object({
        days: z.array(dayOfWeekSchema).min(1, 'Select at least one day'),
        startTime: timeSchema,
        endTime: timeSchema,
      })
    )
    .optional(),
})

// Category selection schema
export const categoriesSchema = z
  .array(z.string())
  .min(1, 'Select at least one category')
  .max(50, 'Cannot select more than 50 categories')

// Policy create/edit schema
export const policySchema = z.object({
  name: z
    .string()
    .min(3, 'Policy name must be at least 3 characters')
    .max(100, 'Policy name must be less than 100 characters')
    .trim()
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Policy name can only contain letters, numbers, spaces, hyphens, and underscores'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  action: policyActionSchema,
  priority: policyPrioritySchema.default(50),
  enabled: z.boolean().default(true),
  locationIds: z.array(z.string().uuid('Invalid location ID')).optional(),
  categories: categoriesSchema.optional(),
  customListIds: z.array(z.string().uuid('Invalid list ID')).optional(),
  blockPageId: z.string().uuid('Invalid block page ID').optional().nullable(),
  redirectUrl: z.string().url('Invalid redirect URL').optional().nullable(),
  schedule: policyScheduleSchema.optional(),
  safesearch: z.boolean().default(false),
  logging: z.boolean().default(true),
})

export type PolicyFormData = z.infer<typeof policySchema>

// Policy template application schema
export const applyTemplateSchema = z.object({
  templateId: z.string().uuid('Invalid template ID'),
  name: z.string().min(3, 'Policy name is required'),
  locationIds: z.array(z.string().uuid('Invalid location ID')).min(1, 'Select at least one location'),
  enabled: z.boolean().default(true),
})

export type ApplyTemplateFormData = z.infer<typeof applyTemplateSchema>

// Bulk policy action schema
export const bulkPolicyActionSchema = z.object({
  policyIds: z.array(z.string().uuid()).min(1, 'Select at least one policy'),
  action: z.enum(['enable', 'disable', 'delete']),
  confirmDelete: z.boolean().optional(),
})

export type BulkPolicyActionFormData = z.infer<typeof bulkPolicyActionSchema>

// Policy search/filter schema
export const policyFilterSchema = z.object({
  search: z.string().optional(),
  action: policyActionSchema.optional(),
  enabled: z.boolean().optional(),
  locationId: z.string().uuid().optional(),
  sortBy: z.enum(['name', 'priority', 'created', 'updated']).default('priority'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

export type PolicyFilterFormData = z.infer<typeof policyFilterSchema>
