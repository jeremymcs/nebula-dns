// Nebula DNS - PagerDuty Alert Provider
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import {
  AlertProvider,
  AlertEvent,
  AlertDeliveryResult,
  TestAlertResult,
  AlertProviderType,
} from '../interfaces/alert-provider.interface';

/**
 * PagerDuty Events API v2 trigger event structure
 */
interface PagerDutyTriggerEvent {
  routing_key: string;
  event_action: 'trigger' | 'acknowledge' | 'resolve';
  dedup_key: string;
  payload: {
    summary: string;
    source: string;
    severity: 'critical' | 'error' | 'warning' | 'info';
    timestamp?: string;
    component?: string;
    group?: string;
    class?: string;
    custom_details?: Record<string, unknown>;
  };
  client?: string;
  client_url?: string;
  links?: Array<{ href: string; text: string }>;
}

/**
 * PagerDuty provider for sending alerts via Events API v2
 * Implements incident deduplication and severity-based routing
 */
@Injectable()
export class PagerDutyProvider implements AlertProvider {
  private readonly logger = new Logger(PagerDutyProvider.name);
  readonly type: AlertProviderType = 'pagerduty';

  private readonly EVENTS_API_URL = 'https://events.pagerduty.com/v2/enqueue';
  private readonly REQUEST_TIMEOUT = 30000;

  /**
   * Send an alert to PagerDuty
   * ALERT-07: Skips warning severity alerts (PagerDuty is for critical/error only)
   */
  async send(
    alert: AlertEvent,
    config: Record<string, string>,
  ): Promise<AlertDeliveryResult> {
    const startTime = Date.now();

    try {
      // ALERT-07: Skip warning severity - PagerDuty is for critical/error only
      if (alert.severity === 'warning') {
        this.logger.debug(
          `Skipping warning severity alert for PagerDuty: ${alert.id}`,
        );
        return { success: true, responseTime: Date.now() - startTime };
      }

      const { routingKey } = config;
      const dedupKey = this.generateDedupKey(alert);
      const payload = this.toPagerDutyPayload(alert, routingKey, dedupKey);

      const response = await this.httpPost(
        this.EVENTS_API_URL,
        JSON.stringify(payload),
      );

      const responseTime = Date.now() - startTime;

      if (response.statusCode === 202) {
        this.logger.log(
          `PagerDuty alert sent successfully: ${alert.id} (dedup_key: ${dedupKey})`,
        );
        return { success: true, responseTime };
      } else {
        const error = `PagerDuty API returned status ${response.statusCode}: ${response.body}`;
        this.logger.error(error);
        return { success: false, error, responseTime };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send PagerDuty alert: ${alert.id} - ${errorMessage}`,
      );
      return {
        success: false,
        error: errorMessage,
        responseTime,
      };
    }
  }

  /**
   * Test PagerDuty configuration
   * ALERT-09: Creates and immediately resolves a test incident
   */
  async test(config: Record<string, string>): Promise<TestAlertResult> {
    const startTime = Date.now();

    try {
      const { routingKey } = config;
      const dedupKey = `nebuladns:test:${Date.now()}`;

      // Send trigger event
      const triggerPayload: PagerDutyTriggerEvent = {
        routing_key: routingKey,
        event_action: 'trigger',
        dedup_key: dedupKey,
        payload: {
          summary: 'Nebula DNS Test Alert',
          source: 'test',
          severity: 'info',
          timestamp: new Date().toISOString(),
          component: 'Nebula DNS',
          class: 'test',
          custom_details: {
            message: 'This is a test alert to verify PagerDuty integration.',
          },
        },
        client: 'Nebula DNS',
        client_url: process.env.APP_URL || 'https://app.nebuladns.com',
      };

      const triggerResponse = await this.httpPost(
        this.EVENTS_API_URL,
        JSON.stringify(triggerPayload),
      );

      if (triggerResponse.statusCode !== 202) {
        const responseTimeMs = Date.now() - startTime;
        return {
          success: false,
          message: `Failed to trigger test incident: ${triggerResponse.body}`,
          responseTimeMs,
        };
      }

      // Immediately resolve the test incident
      const resolvePayload: PagerDutyTriggerEvent = {
        routing_key: routingKey,
        event_action: 'resolve',
        dedup_key: dedupKey,
        payload: {
          summary: 'Nebula DNS Test Alert',
          source: 'test',
          severity: 'info',
        },
      };

      const resolveResponse = await this.httpPost(
        this.EVENTS_API_URL,
        JSON.stringify(resolvePayload),
      );

      const responseTimeMs = Date.now() - startTime;

      if (resolveResponse.statusCode === 202) {
        return {
          success: true,
          message: 'Test incident created and resolved',
          responseTimeMs,
        };
      } else {
        return {
          success: false,
          message: `Test incident created but failed to resolve: ${resolveResponse.body}`,
          responseTimeMs,
        };
      }
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Test failed: ${errorMessage}`,
        responseTimeMs,
      };
    }
  }

  /**
   * Validate PagerDuty configuration
   * Checks that routingKey exists and is exactly 32 characters
   */
  validateConfig(config: Record<string, unknown>): boolean {
    const { routingKey } = config;

    if (!routingKey || typeof routingKey !== 'string') {
      return false;
    }

    // PagerDuty integration keys are exactly 32 characters
    if (routingKey.length !== 32) {
      return false;
    }

    return true;
  }

  /**
   * Generate consistent dedup_key to prevent incident explosion
   * ALERT-10: Same alert = same key = deduplicated incident
   * Format: nebuladns:{source}:{type}:{identifier}
   */
  private generateDedupKey(alert: AlertEvent): string {
    const identifier = alert.metadata?.identifier || alert.id;
    return `nebuladns:${alert.source}:${alert.type}:${identifier}`;
  }

  /**
   * Convert AlertEvent to PagerDuty Events API v2 payload
   */
  private toPagerDutyPayload(
    alert: AlertEvent,
    routingKey: string,
    dedupKey: string,
  ): PagerDutyTriggerEvent {
    return {
      routing_key: routingKey,
      event_action: 'trigger',
      dedup_key: dedupKey,
      payload: {
        summary: alert.title.substring(0, 1024), // PagerDuty max length
        source: alert.source,
        severity: alert.severity,
        timestamp: alert.timestamp.toISOString(),
        component: 'Nebula DNS',
        class: alert.type,
        custom_details: {
          message: alert.message,
          ...alert.metadata,
        },
      },
      client: 'Nebula DNS',
      client_url: process.env.APP_URL || 'https://app.nebuladns.com',
    };
  }

  /**
   * HTTP POST to PagerDuty Events API
   * Based on existing webhooks.service.ts httpPost pattern
   */
  private async httpPost(
    url: string,
    body: string,
  ): Promise<{ statusCode: number; body: string }> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: this.REQUEST_TIMEOUT,
      };

      const req = https.request(options, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 0,
            body: responseBody,
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(body);
      req.end();
    });
  }
}
