/**
 * Nebula DNS - Alerting Configuration Validation Schemas
 * Zod schemas for alert configuration forms
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import { z } from 'zod';

// ============================================
// Constants for Form Options
// ============================================

/**
 * Severity options for form select components
 */
export const SEVERITY_OPTIONS = [
  { value: 'critical', label: 'Critical' },
  { value: 'error', label: 'Error' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
] as const;

/**
 * Event type options for form checkbox components
 */
export const EVENT_TYPE_OPTIONS = [
  { value: 'system_health', label: 'System Health' },
  { value: 'billing', label: 'Billing' },
  { value: 'security', label: 'Security' },
] as const;

// ============================================
// Shared Schema Components
// ============================================

const severityEnum = z.enum(['critical', 'error', 'warning', 'info']);
const eventTypeEnum = z.enum(['system_health', 'billing', 'security']);

// ============================================
// Slack Configuration Schema
// ============================================

/**
 * Schema for creating Slack webhook configuration
 * Validates webhook URL format to prevent misconfiguration
 */
export const slackConfigSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be 255 characters or less'),
  webhookUrl: z
    .string()
    .min(1, 'Webhook URL is required')
    .url('Must be a valid URL')
    .regex(
      /^https:\/\/hooks\.slack\.com\//,
      'Must start with https://hooks.slack.com/'
    ),
  severityFilter: z
    .array(severityEnum)
    .optional()
    .default(['critical', 'error']),
  eventTypes: z
    .array(eventTypeEnum)
    .optional()
    .default([]),
});

/**
 * Type inferred from the Slack config schema
 */
export type SlackConfigFormData = z.infer<typeof slackConfigSchema>;

// ============================================
// PagerDuty Configuration Schema
// ============================================

/**
 * Schema for creating PagerDuty configuration
 * Validates routing key length (32 characters per PagerDuty Events API v2)
 */
export const pagerDutyConfigSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be 255 characters or less'),
  routingKey: z
    .string()
    .min(1, 'Routing key is required')
    .length(32, 'Routing key must be exactly 32 characters'),
  severityFilter: z
    .array(severityEnum)
    .optional()
    .default(['critical', 'error']),
  eventTypes: z
    .array(eventTypeEnum)
    .optional()
    .default([]),
});

/**
 * Type inferred from the PagerDuty config schema
 */
export type PagerDutyConfigFormData = z.infer<typeof pagerDutyConfigSchema>;

// ============================================
// Update Configuration Schema
// ============================================

/**
 * Schema for updating existing alert configuration
 * All fields optional - cannot update credentials after creation
 */
export const updateAlertConfigSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .optional(),
  isEnabled: z
    .boolean()
    .optional(),
  severityFilter: z
    .array(severityEnum)
    .optional(),
  eventTypes: z
    .array(eventTypeEnum)
    .optional(),
});

/**
 * Type inferred from the update config schema
 */
export type UpdateAlertConfigFormData = z.infer<typeof updateAlertConfigSchema>;
