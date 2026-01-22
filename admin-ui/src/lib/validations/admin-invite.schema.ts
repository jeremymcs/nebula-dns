/**
 * Nebula DNS - Admin Invite Validation Schema
 * Zod schema for admin invitation form
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import { z } from 'zod'

/**
 * Schema for inviting a new admin user
 * Validates email format and role selection
 */
export const inviteAdminSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  role: z.enum(['super_admin', 'admin', 'viewer'], {
    message: 'Role is required',
  }),
})

/**
 * Type inferred from the invite admin schema
 */
export type InviteAdminFormData = z.infer<typeof inviteAdminSchema>
