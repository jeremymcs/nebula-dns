// Nebula DNS - UI Settings Validation Schemas
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { z } from 'zod'

// Organization/Tenant settings schema
export const organizationSettingsSchema = z.object({
  name: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name must be less than 100 characters')
    .trim(),
  domain: z
    .string()
    .regex(
      /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
      'Invalid domain name'
    )
    .optional(),
  industry: z.string().max(50).optional(),
  size: z.enum(['1-10', '11-50', '51-200', '201-500', '500+']).optional(),
  country: z.string().length(2, 'Country code must be 2 characters').optional(),
  timezone: z.string().default('UTC'),
  defaultLanguage: z.enum(['en', 'es', 'fr', 'de', 'ja', 'zh']).default('en'),
})

export type OrganizationSettingsFormData = z.infer<typeof organizationSettingsSchema>

// API Key creation schema
export const apiKeySchema = z.object({
  name: z
    .string()
    .min(3, 'API key name must be at least 3 characters')
    .max(100, 'API key name must be less than 100 characters')
    .trim(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  expiresInDays: z
    .number()
    .int('Must be a whole number')
    .min(1, 'Minimum 1 day')
    .max(365, 'Maximum 365 days')
    .optional()
    .nullable(),
  scopes: z
    .array(
      z.enum([
        'policies:read',
        'policies:write',
        'locations:read',
        'locations:write',
        'lists:read',
        'lists:write',
        'reports:read',
        'logs:read',
        'agents:read',
        'agents:write',
      ])
    )
    .min(1, 'Select at least one scope'),
  ipWhitelist: z
    .array(
      z.string().regex(
        /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/([0-9]|[1-2][0-9]|3[0-2]))?$/,
        'Invalid IP address or CIDR'
      )
    )
    .optional(),
})

export type ApiKeyFormData = z.infer<typeof apiKeySchema>

// SSO configuration schema
export const ssoConfigSchema = z.object({
  provider: z.enum(['saml', 'oidc']),
  enabled: z.boolean().default(false),
  // SAML settings
  entityId: z.string().url('Invalid entity ID URL').optional(),
  ssoUrl: z.string().url('Invalid SSO URL').optional(),
  certificate: z.string().min(1, 'Certificate is required for SAML').optional(),
  // OIDC settings
  clientId: z.string().min(1, 'Client ID is required for OIDC').optional(),
  clientSecret: z.string().min(1, 'Client secret is required for OIDC').optional(),
  issuer: z.string().url('Invalid issuer URL').optional(),
  // Common settings
  autoProvision: z.boolean().default(false),
  defaultRole: z.enum(['admin', 'analyst', 'readonly']).default('readonly'),
  domainHint: z
    .string()
    .regex(
      /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
      'Invalid domain'
    )
    .optional(),
})

export type SsoConfigFormData = z.infer<typeof ssoConfigSchema>

// Webhook configuration schema
export const webhookSchema = z.object({
  name: z
    .string()
    .min(3, 'Webhook name must be at least 3 characters')
    .max(100, 'Webhook name must be less than 100 characters')
    .trim(),
  url: z.string().url('Invalid webhook URL'),
  secret: z
    .string()
    .min(16, 'Secret must be at least 16 characters')
    .max(100, 'Secret must be less than 100 characters')
    .optional(),
  events: z
    .array(
      z.enum([
        'policy.created',
        'policy.updated',
        'policy.deleted',
        'location.created',
        'location.updated',
        'location.deleted',
        'threat.detected',
        'user.created',
        'user.updated',
        'user.deleted',
      ])
    )
    .min(1, 'Select at least one event'),
  enabled: z.boolean().default(true),
  retryOnFailure: z.boolean().default(true),
  maxRetries: z
    .number()
    .int('Must be a whole number')
    .min(0)
    .max(10)
    .default(3),
})

export type WebhookFormData = z.infer<typeof webhookSchema>

// SIEM integration schema
export const siemIntegrationSchema = z.object({
  provider: z.enum(['splunk', 'elastic', 'datadog', 'sentinel', 'sumo', 'custom']),
  enabled: z.boolean().default(false),
  endpoint: z.string().url('Invalid endpoint URL'),
  apiKey: z.string().min(1, 'API key is required').optional(),
  token: z.string().min(1, 'Token is required').optional(),
  customHeaders: z
    .array(
      z.object({
        key: z.string().min(1, 'Header key is required'),
        value: z.string().min(1, 'Header value is required'),
      })
    )
    .optional(),
  batchSize: z
    .number()
    .int('Must be a whole number')
    .min(1, 'Minimum batch size is 1')
    .max(1000, 'Maximum batch size is 1000')
    .default(100),
  flushIntervalSeconds: z
    .number()
    .int('Must be a whole number')
    .min(1, 'Minimum 1 second')
    .max(300, 'Maximum 5 minutes')
    .default(30),
})

export type SiemIntegrationFormData = z.infer<typeof siemIntegrationSchema>

// Block page customization schema
export const blockPageSchema = z.object({
  name: z
    .string()
    .min(3, 'Block page name must be at least 3 characters')
    .max(100, 'Block page name must be less than 100 characters')
    .trim(),
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters'),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(1000, 'Message must be less than 1000 characters'),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color code'),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color code'),
  logoUrl: z.string().url('Invalid logo URL').optional().nullable(),
  contactEmail: z.string().email('Invalid contact email').optional().nullable(),
  showCategories: z.boolean().default(true),
  customCss: z.string().max(5000, 'Custom CSS must be less than 5000 characters').optional(),
  customHtml: z.string().max(10000, 'Custom HTML must be less than 10000 characters').optional(),
})

export type BlockPageFormData = z.infer<typeof blockPageSchema>

// Notification preferences schema
export const notificationPreferencesSchema = z.object({
  email: z.object({
    enabled: z.boolean().default(true),
    threatDetection: z.boolean().default(true),
    policyChanges: z.boolean().default(true),
    systemAlerts: z.boolean().default(true),
    weeklyReports: z.boolean().default(true),
    monthlyReports: z.boolean().default(false),
  }),
  slack: z.object({
    enabled: z.boolean().default(false),
    webhookUrl: z.string().url('Invalid Slack webhook URL').optional(),
    threatDetection: z.boolean().default(true),
    policyChanges: z.boolean().default(false),
    systemAlerts: z.boolean().default(true),
  }),
})

export type NotificationPreferencesFormData = z.infer<typeof notificationPreferencesSchema>
