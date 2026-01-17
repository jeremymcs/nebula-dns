// Nebula DNS - UI Location Validation Schemas
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { z } from 'zod'

// IP address validation
const ipv4Schema = z.string().regex(
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  'Invalid IPv4 address'
)

const ipv6Schema = z.string().regex(
  /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}|[0-9a-fA-F]{1,4}::([0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4})$/,
  'Invalid IPv6 address'
)

const ipAddressSchema = z.union([ipv4Schema, ipv6Schema])

// CIDR validation
const cidrSchema = z.string().regex(
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/([0-9]|[1-2][0-9]|3[0-2])$/,
  'Invalid CIDR notation (e.g., 192.168.1.0/24)'
)

// Domain validation
const domainSchema = z
  .string()
  .regex(
    /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
    'Invalid domain name'
  )

// Location type enum
const locationTypeSchema = z.enum(['network', 'device', 'roaming'])

// DNS server configuration schema
export const dnsServerSchema = z.object({
  ipv4Primary: ipv4Schema,
  ipv4Secondary: ipv4Schema.optional().nullable(),
  ipv6Primary: ipv6Schema.optional().nullable(),
  ipv6Secondary: ipv6Schema.optional().nullable(),
})

// Location create/edit schema
export const locationSchema = z.object({
  name: z
    .string()
    .min(3, 'Location name must be at least 3 characters')
    .max(100, 'Location name must be less than 100 characters')
    .trim()
    .regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      'Location name can only contain letters, numbers, spaces, hyphens, and underscores'
    ),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  type: locationTypeSchema.default('network'),
  enabled: z.boolean().default(true),

  // Network configuration
  sourceIps: z
    .array(z.union([ipAddressSchema, cidrSchema]))
    .min(1, 'Add at least one source IP or CIDR range')
    .optional(),

  // Device identification
  deviceId: z.string().uuid('Invalid device ID').optional().nullable(),

  // DNS settings
  defaultPolicyIds: z.array(z.string().uuid('Invalid policy ID')).optional(),

  // Rate limiting
  rateLimit: z
    .object({
      enabled: z.boolean(),
      maxQueriesPerMinute: z
        .number()
        .int('Must be a whole number')
        .min(10, 'Minimum 10 queries per minute')
        .max(10000, 'Maximum 10,000 queries per minute')
        .optional(),
    })
    .optional(),

  // Logging settings
  logging: z
    .object({
      enabled: z.boolean().default(true),
      logAllQueries: z.boolean().default(true),
      logBlockedOnly: z.boolean().default(false),
    })
    .optional(),

  // Geolocation
  country: z.string().length(2, 'Country code must be 2 characters (ISO 3166-1 alpha-2)').optional(),
  city: z.string().max(100, 'City name must be less than 100 characters').optional(),

  // Tags for organization
  tags: z
    .array(z.string().min(1).max(50))
    .max(10, 'Maximum 10 tags allowed')
    .optional(),
})

export type LocationFormData = z.infer<typeof locationSchema>

// Simplified network location schema
export const networkLocationSchema = locationSchema.extend({
  type: z.literal('network'),
  sourceIps: z
    .array(z.union([ipAddressSchema, cidrSchema]))
    .min(1, 'Add at least one source IP or CIDR range'),
})

export type NetworkLocationFormData = z.infer<typeof networkLocationSchema>

// Device location schema
export const deviceLocationSchema = locationSchema.extend({
  type: z.literal('device'),
  deviceId: z.string().uuid('Invalid device ID'),
})

export type DeviceLocationFormData = z.infer<typeof deviceLocationSchema>

// Roaming location schema
export const roamingLocationSchema = locationSchema.extend({
  type: z.literal('roaming'),
})

export type RoamingLocationFormData = z.infer<typeof roamingLocationSchema>

// Bulk location action schema
export const bulkLocationActionSchema = z.object({
  locationIds: z.array(z.string().uuid()).min(1, 'Select at least one location'),
  action: z.enum(['enable', 'disable', 'delete']),
  confirmDelete: z.boolean().optional(),
})

export type BulkLocationActionFormData = z.infer<typeof bulkLocationActionSchema>

// Location search/filter schema
export const locationFilterSchema = z.object({
  search: z.string().optional(),
  type: locationTypeSchema.optional(),
  enabled: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z.enum(['name', 'type', 'created', 'updated']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

export type LocationFilterFormData = z.infer<typeof locationFilterSchema>
