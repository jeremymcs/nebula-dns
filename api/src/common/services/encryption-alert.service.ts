// Nebula DNS - Encryption Alert Service
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// Centralized service for handling encryption-related alerts and monitoring

import { Injectable, Logger } from '@nestjs/common';
import { EncryptionError } from '../utils/encryption.util';

/**
 * Alert severity levels for encryption failures
 */
export type AlertSeverity = 'warning' | 'error' | 'critical';

/**
 * Context information for decryption failure alerts
 */
export interface DecryptionFailureContext {
  /** Service or module where the failure occurred */
  service: string;
  /** Operation being performed (e.g., 'verifyMfa', 'decryptClientSecret') */
  operation: string;
  /** Entity type being decrypted (e.g., 'mfa_secret', 'oidc_client_secret') */
  entityType: string;
  /** Identifier for the entity (e.g., user ID, tenant ID) - never include sensitive data */
  entityId?: string;
  /** Whether the failure involves legacy format data */
  isLegacyFormat?: boolean;
  /** Additional metadata for debugging */
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Alert payload sent to monitoring systems
 */
export interface EncryptionAlertPayload {
  timestamp: string;
  severity: AlertSeverity;
  alertType: 'decryption_failure' | 'migration_failure' | 'key_error';
  context: DecryptionFailureContext;
  errorMessage: string;
  errorCode?: string;
}

/**
 * Statistics tracked by the alert service
 */
export interface EncryptionAlertStats {
  totalAlerts: number;
  alertsByService: Record<string, number>;
  alertsBySeverity: Record<AlertSeverity, number>;
  alertsByEntityType: Record<string, number>;
  lastAlertAt: string | null;
}

/**
 * Service for handling encryption-related alerts
 *
 * This service provides centralized logging and alerting for decryption failures,
 * enabling monitoring and alerting integrations (e.g., Sentry, DataDog, CloudWatch).
 */
@Injectable()
export class EncryptionAlertService {
  private readonly logger = new Logger(EncryptionAlertService.name);
  private readonly stats: EncryptionAlertStats;
  private readonly alertHandlers: ((payload: EncryptionAlertPayload) => void)[];

  constructor() {
    this.stats = {
      totalAlerts: 0,
      alertsByService: {},
      alertsBySeverity: { warning: 0, error: 0, critical: 0 },
      alertsByEntityType: {},
      lastAlertAt: null,
    };
    this.alertHandlers = [];
  }

  /**
   * Register an external alert handler (e.g., for Sentry, webhooks)
   *
   * @param handler - Function to call when an alert is triggered
   */
  registerAlertHandler(
    handler: (payload: EncryptionAlertPayload) => void,
  ): void {
    this.alertHandlers.push(handler);
  }

  /**
   * Report a decryption failure
   *
   * This method logs the failure, updates statistics, and notifies any registered
   * alert handlers. It should be called from services when decryption fails.
   *
   * @param error - The error that occurred
   * @param context - Context information about the failure
   * @param severity - Alert severity level (default: 'error')
   */
  reportDecryptionFailure(
    error: Error | EncryptionError,
    context: DecryptionFailureContext,
    severity: AlertSeverity = 'error',
  ): void {
    const payload: EncryptionAlertPayload = {
      timestamp: new Date().toISOString(),
      severity,
      alertType: 'decryption_failure',
      context,
      errorMessage: error.message,
      errorCode: error instanceof EncryptionError ? error.context : undefined,
    };

    // Update statistics
    this.updateStats(payload);

    // Log the failure
    this.logAlert(payload);

    // Notify external handlers
    this.notifyHandlers(payload);
  }

  /**
   * Report a migration failure (CBC to GCM re-encryption)
   *
   * @param error - The error that occurred
   * @param context - Context information about the failure
   */
  reportMigrationFailure(
    error: Error,
    context: DecryptionFailureContext,
  ): void {
    const payload: EncryptionAlertPayload = {
      timestamp: new Date().toISOString(),
      severity: 'warning',
      alertType: 'migration_failure',
      context: {
        ...context,
        isLegacyFormat: true,
      },
      errorMessage: error.message,
    };

    this.updateStats(payload);
    this.logAlert(payload);
    this.notifyHandlers(payload);
  }

  /**
   * Report a key-related error (missing or invalid encryption key)
   *
   * @param error - The error that occurred
   * @param service - The service where the error occurred
   */
  reportKeyError(error: Error, service: string): void {
    const payload: EncryptionAlertPayload = {
      timestamp: new Date().toISOString(),
      severity: 'critical',
      alertType: 'key_error',
      context: {
        service,
        operation: 'key_initialization',
        entityType: 'encryption_key',
      },
      errorMessage: error.message,
    };

    this.updateStats(payload);
    this.logAlert(payload);
    this.notifyHandlers(payload);
  }

  /**
   * Get current alert statistics
   *
   * @returns Statistics about encryption alerts
   */
  getStats(): EncryptionAlertStats {
    return { ...this.stats };
  }

  /**
   * Reset alert statistics (primarily for testing)
   */
  resetStats(): void {
    this.stats.totalAlerts = 0;
    this.stats.alertsByService = {};
    this.stats.alertsBySeverity = { warning: 0, error: 0, critical: 0 };
    this.stats.alertsByEntityType = {};
    this.stats.lastAlertAt = null;
  }

  /**
   * Update internal statistics
   */
  private updateStats(payload: EncryptionAlertPayload): void {
    this.stats.totalAlerts++;
    this.stats.lastAlertAt = payload.timestamp;

    // Track by service
    const service = payload.context.service;
    this.stats.alertsByService[service] =
      (this.stats.alertsByService[service] || 0) + 1;

    // Track by severity
    this.stats.alertsBySeverity[payload.severity]++;

    // Track by entity type
    const entityType = payload.context.entityType;
    this.stats.alertsByEntityType[entityType] =
      (this.stats.alertsByEntityType[entityType] || 0) + 1;
  }

  /**
   * Log the alert using the appropriate log level
   */
  private logAlert(payload: EncryptionAlertPayload): void {
    const logData = {
      alertType: payload.alertType,
      service: payload.context.service,
      operation: payload.context.operation,
      entityType: payload.context.entityType,
      entityId: payload.context.entityId,
      isLegacyFormat: payload.context.isLegacyFormat,
      errorCode: payload.errorCode,
      metadata: payload.context.metadata,
    };

    const message = `[ENCRYPTION_ALERT] ${payload.alertType}: ${payload.errorMessage}`;

    switch (payload.severity) {
      case 'critical':
        this.logger.error(message, JSON.stringify(logData));
        break;
      case 'error':
        this.logger.error(message, JSON.stringify(logData));
        break;
      case 'warning':
        this.logger.warn(message, JSON.stringify(logData));
        break;
    }
  }

  /**
   * Notify all registered external alert handlers
   */
  private notifyHandlers(payload: EncryptionAlertPayload): void {
    for (const handler of this.alertHandlers) {
      try {
        handler(payload);
      } catch (error) {
        this.logger.warn(
          `Failed to notify alert handler: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }
  }
}
