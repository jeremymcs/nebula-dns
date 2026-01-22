/**
 * Nebula DNS - Alerting Configuration Types
 * TypeScript types for alerting API
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

// ============================================
// Alert Type Definitions
// ============================================

/**
 * Alert severity levels
 * Matches backend AlertSeverity type exactly
 */
export type AlertSeverity = 'critical' | 'error' | 'warning' | 'info';

/**
 * Alert event types
 * Matches backend AlertEventType type exactly
 */
export type AlertEventType = 'system_health' | 'billing' | 'security';

/**
 * Alert provider types
 * Matches backend AlertProviderType type exactly
 */
export type AlertProviderType = 'slack' | 'pagerduty';

// ============================================
// Alert Configuration Response
// ============================================

/**
 * Alert configuration response from backend
 * Matches AlertConfigResponseDto structure
 * Does not include encrypted credentials
 */
export interface AlertConfigResponse {
  id: string;
  name: string;
  providerType: AlertProviderType;
  isEnabled: boolean;
  severityFilter: AlertSeverity[];
  eventTypes: AlertEventType[];
  lastSentAt: string | null;
  lastError: string | null;
  errorCount: number;
  createdAt: string;
}

// ============================================
// Create Configuration Request Types
// ============================================

/**
 * Request payload for creating Slack configuration
 * Matches CreateSlackConfigDto structure
 */
export interface CreateSlackConfigRequest {
  name: string;
  webhookUrl: string;
  severityFilter?: AlertSeverity[];
  eventTypes?: AlertEventType[];
}

/**
 * Request payload for creating PagerDuty configuration
 * Matches CreatePagerDutyConfigDto structure
 */
export interface CreatePagerDutyConfigRequest {
  name: string;
  routingKey: string;
  severityFilter?: AlertSeverity[];
  eventTypes?: AlertEventType[];
}

// ============================================
// Update Configuration Request Type
// ============================================

/**
 * Request payload for updating alert configuration
 * All fields optional - matches UpdateAlertConfigDto
 * Note: Cannot update credentials after creation
 */
export interface UpdateAlertConfigRequest {
  name?: string;
  isEnabled?: boolean;
  severityFilter?: AlertSeverity[];
  eventTypes?: AlertEventType[];
}

// ============================================
// Response Types
// ============================================

/**
 * Test alert response
 * Matches TestAlertResponseDto structure
 */
export interface TestAlertResponse {
  success: boolean;
  message: string;
  responseTimeMs?: number;
}

/**
 * Generic message response
 * Used by enable/disable endpoints
 */
export interface MessageResponse {
  message: string;
}
