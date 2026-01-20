// Nebula DNS - MSP Onboarding Validation Schemas
// Zod schemas for admin MSP tenant creation wizard
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { z } from 'zod'

/**
 * Step 1: Company Info Schema
 * Validates MSP organization details
 */
export const mspCompanyInfoSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name must not exceed 255 characters'),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .min(2, 'Slug must be at least 2 characters')
    .max(100, 'Slug must not exceed 100 characters')
    .optional()
    .or(z.literal('')),
  contactEmail: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  contactPhone: z
    .string()
    .max(50, 'Phone must not exceed 50 characters')
    .optional()
    .or(z.literal('')),
})

/**
 * Step 2: Admin User Schema
 * Validates initial admin user details
 */
export const mspAdminUserSchema = z.object({
  adminEmail: z
    .string()
    .min(1, 'Admin email is required')
    .email('Admin email must be a valid email address'),
  adminName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name must not exceed 255 characters')
    .optional()
    .or(z.literal('')),
})

/**
 * Step 3: Settings Schema
 * Validates MSP limits and configuration
 */
export const mspSettingsSchema = z.object({
  locationLimit: z
    .number()
    .int('Location limit must be a whole number')
    .min(1, 'Location limit must be at least 1')
    .max(10000, 'Location limit must not exceed 10000')
    .optional()
    .nullable(),
  clientLimit: z
    .number()
    .int('Client limit must be a whole number')
    .min(1, 'Client limit must be at least 1')
    .max(10000, 'Client limit must not exceed 10000')
    .optional()
    .nullable(),
})

/**
 * Full MSP Onboarding Schema
 * Combined schema for final form validation before submission
 */
export const mspOnboardingSchema = mspCompanyInfoSchema
  .merge(mspAdminUserSchema)
  .merge(mspSettingsSchema)

/**
 * Form data type inferred from schema
 */
export type MspOnboardingFormData = z.infer<typeof mspOnboardingSchema>

/**
 * Field names grouped by wizard step for step-based validation
 */
export const STEP_FIELDS: Record<number, (keyof MspOnboardingFormData)[]> = {
  0: ['name', 'slug', 'contactEmail', 'contactPhone'],
  1: ['adminEmail', 'adminName'],
  2: ['locationLimit', 'clientLimit'],
  3: [], // Review step - no validation needed
}
