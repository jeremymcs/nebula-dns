// Nebula DNS - Alert Provider Interface
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

/**
 * Alert severity levels
 */
export type AlertSeverity = 'critical' | 'error' | 'warning' | 'info';

/**
 * Alert event types
 */
export type AlertEventType = 'system_health' | 'billing' | 'security';

/**
 * Alert provider types
 */
export type AlertProviderType = 'slack' | 'pagerduty';

/**
 * Alert event structure
 */
export interface AlertEvent {
  id: string;
  type: AlertEventType;
  severity: AlertSeverity;
  title: string;
  message: string;
  source: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  dedupKey?: string;
}

/**
 * Alert delivery result
 */
export interface AlertDeliveryResult {
  success: boolean;
  error?: string;
  responseTime?: number;
}

/**
 * Test alert result
 */
export interface TestAlertResult {
  success: boolean;
  message: string;
  responseTimeMs?: number;
}

/**
 * Alert provider interface
 * All alert providers must implement this interface
 */
export interface AlertProvider {
  readonly type: AlertProviderType;

  /**
   * Send an alert to the provider
   * @param alert - The alert event to send
   * @param config - Provider-specific configuration (decrypted)
   */
  send(
    alert: AlertEvent,
    config: Record<string, string>,
  ): Promise<AlertDeliveryResult>;

  /**
   * Test the provider configuration
   * @param config - Provider-specific configuration (decrypted)
   */
  test(config: Record<string, string>): Promise<TestAlertResult>;

  /**
   * Validate provider configuration
   * @param config - Provider-specific configuration to validate
   */
  validateConfig(config: Record<string, unknown>): boolean;
}
