// Nebula DNS - Alert Dispatcher Service
// Central alert routing service for dispatching alerts to configured channels
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Injectable, Logger } from '@nestjs/common';
import { AlertingService } from './alerting.service';
import { SlackProvider } from './providers/slack.provider';
import { PagerDutyProvider } from './providers/pagerduty.provider';
import {
  AlertEvent,
  AlertProviderType,
  AlertSeverity,
  AlertProvider,
} from './interfaces/alert-provider.interface';

/**
 * AlertDispatcherService
 *
 * Central service for routing alerts to configured channels based on:
 * - Severity filtering (critical, error, warning, info)
 * - Event type filtering (system_health, billing, security)
 * - Provider-specific rules (e.g., PagerDuty skips warnings per ALERT-07)
 *
 * Handles delivery status tracking and auto-disables failing configurations
 * after 10 consecutive errors.
 */
@Injectable()
export class AlertDispatcherService {
  private readonly logger = new Logger(AlertDispatcherService.name);
  private readonly providerMap: Map<AlertProviderType, AlertProvider>;

  constructor(
    private readonly alertingService: AlertingService,
    private readonly slackProvider: SlackProvider,
    private readonly pagerdutyProvider: PagerDutyProvider,
  ) {
    // Build provider map for fast lookup
    this.providerMap = new Map<AlertProviderType, AlertProvider>();
    this.providerMap.set('slack', this.slackProvider);
    this.providerMap.set('pagerduty', this.pagerdutyProvider);
  }

  /**
   * Dispatch alert to all matching configurations
   * Applies severity and event type filtering
   * Does not throw on individual provider failures (continues to next config)
   */
  async dispatch(alert: AlertEvent): Promise<void> {
    this.logger.log(
      `Dispatching alert: ${alert.id} (${alert.severity}/${alert.type}) - ${alert.title}`,
    );

    // Get all enabled configurations
    const configs = await this.alertingService.findEnabled();

    if (configs.length === 0) {
      this.logger.warn('No enabled alert configurations found');
      return;
    }

    // Dispatch to each matching configuration in parallel
    const promises = configs.map(async (config) => {
      try {
        // Check severity filter
        if (!config.severityFilter.includes(alert.severity)) {
          this.logger.debug(
            `Skipping config ${config.id} (${config.name}): severity ${alert.severity} not in filter [${config.severityFilter.join(', ')}]`,
          );
          return;
        }

        // Check event type filter (empty array = all types)
        if (
          config.eventTypes.length > 0 &&
          !config.eventTypes.includes(alert.type)
        ) {
          this.logger.debug(
            `Skipping config ${config.id} (${config.name}): event type ${alert.type} not in filter [${config.eventTypes.join(', ')}]`,
          );
          return;
        }

        // Get provider
        const provider = this.providerMap.get(config.providerType);
        if (!provider) {
          this.logger.error(
            `Unknown provider type: ${config.providerType} for config ${config.id}`,
          );
          await this.alertingService.updateDeliveryStatus(
            config.id,
            false,
            `Unknown provider type: ${config.providerType}`,
          );
          return;
        }

        // Get decrypted configuration
        const { decrypted } = await this.alertingService.getDecryptedConfig(
          config.id,
        );

        // Send to provider
        const result = await provider.send(alert, decrypted);

        // Update delivery status
        await this.alertingService.updateDeliveryStatus(
          config.id,
          result.success,
          result.error,
        );

        if (result.success) {
          this.logger.log(
            `Alert sent to ${config.providerType} (${config.name}) in ${result.responseTime}ms`,
          );
        } else {
          this.logger.error(
            `Failed to send alert to ${config.providerType} (${config.name}): ${result.error}`,
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Error dispatching to config ${config.id} (${config.name}): ${errorMessage}`,
        );
        await this.alertingService.updateDeliveryStatus(
          config.id,
          false,
          errorMessage,
        );
      }
    });

    // Wait for all dispatches to complete
    await Promise.all(promises);
  }

  /**
   * Test alert configuration
   * Sends test alert and returns result
   */
  async testConfig(
    configId: string,
  ): Promise<{ success: boolean; message: string; responseTimeMs?: number }> {
    // Get configuration
    const config = await this.alertingService.findOne(configId);

    // Get provider
    const provider = this.providerMap.get(config.providerType);
    if (!provider) {
      return {
        success: false,
        message: `Unknown provider type: ${config.providerType}`,
      };
    }

    // Get decrypted configuration
    const { decrypted } = await this.alertingService.getDecryptedConfig(
      configId,
    );

    // Call provider test method
    return provider.test(decrypted);
  }

  /**
   * Helper: Dispatch system health alert
   */
  async dispatchSystemHealth(
    title: string,
    message: string,
    severity: AlertSeverity,
    identifier?: string,
  ): Promise<void> {
    const alert: AlertEvent = {
      id: `health-${Date.now()}`,
      type: 'system_health',
      severity,
      title,
      message,
      source: 'admin-health-service',
      timestamp: new Date(),
      metadata: identifier ? { identifier } : undefined,
    };

    await this.dispatch(alert);
  }

  /**
   * Helper: Dispatch billing alert
   */
  async dispatchBilling(
    title: string,
    message: string,
    severity: AlertSeverity,
    identifier?: string,
  ): Promise<void> {
    const alert: AlertEvent = {
      id: `billing-${Date.now()}`,
      type: 'billing',
      severity,
      title,
      message,
      source: 'stripe',
      timestamp: new Date(),
      metadata: identifier ? { identifier } : undefined,
    };

    await this.dispatch(alert);
  }

  /**
   * Helper: Dispatch security alert
   */
  async dispatchSecurity(
    title: string,
    message: string,
    severity: AlertSeverity,
    identifier?: string,
  ): Promise<void> {
    const alert: AlertEvent = {
      id: `security-${Date.now()}`,
      type: 'security',
      severity,
      title,
      message,
      source: 'admin',
      timestamp: new Date(),
      metadata: identifier ? { identifier } : undefined,
    };

    await this.dispatch(alert);
  }
}
