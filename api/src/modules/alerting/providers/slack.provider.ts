// Nebula DNS - Slack Alert Provider
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import {
  AlertProvider,
  AlertEvent,
  AlertDeliveryResult,
  TestAlertResult,
  AlertProviderType,
  AlertSeverity,
} from '../interfaces/alert-provider.interface';

/**
 * Slack Block Kit message structure
 */
interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  elements?: Array<{ type: string; text: string }>;
}

/**
 * Slack webhook payload
 */
interface SlackPayload {
  text: string;
  blocks?: SlackBlock[];
}

/**
 * Slack alert provider
 * Sends alerts via Slack incoming webhooks using Block Kit formatting
 */
@Injectable()
export class SlackProvider implements AlertProvider {
  private readonly logger = new Logger(SlackProvider.name);
  readonly type: AlertProviderType = 'slack';

  private readonly SEVERITY_EMOJI: Record<AlertSeverity, string> = {
    critical: ':rotating_light:',
    error: ':x:',
    warning: ':warning:',
    info: ':information_source:',
  };

  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  /**
   * Send an alert to Slack
   */
  async send(
    alert: AlertEvent,
    config: Record<string, string>,
  ): Promise<AlertDeliveryResult> {
    const startTime = Date.now();

    try {
      const webhookUrl = config.webhookUrl;
      if (!webhookUrl) {
        return {
          success: false,
          error: 'Missing webhookUrl in configuration',
        };
      }

      const payload = this.toSlackPayload(alert);
      const body = JSON.stringify(payload);

      const response = await this.httpPost(webhookUrl, body);

      const responseTime = Date.now() - startTime;

      if (response.statusCode === 200) {
        this.logger.log(
          `Slack alert sent successfully: ${alert.title} (${responseTime}ms)`,
        );
        return { success: true, responseTime };
      } else {
        this.logger.error(
          `Slack webhook returned non-200 status: ${response.statusCode}`,
        );
        return {
          success: false,
          error: `HTTP ${response.statusCode}: ${response.body}`,
          responseTime,
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send Slack alert: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        responseTime,
      };
    }
  }

  /**
   * Test Slack webhook configuration
   */
  async test(config: Record<string, string>): Promise<TestAlertResult> {
    const testAlert: AlertEvent = {
      id: 'test-alert',
      type: 'system_health',
      severity: 'info',
      title: 'Nebula DNS Test Alert',
      message:
        'This is a test alert from Nebula DNS. If you see this, your Slack integration is working!',
      source: 'nebula-dns-test',
      timestamp: new Date(),
    };

    const result = await this.send(testAlert, config);

    return {
      success: result.success,
      message: result.success
        ? 'Test alert sent successfully'
        : result.error || 'Failed to send test alert',
      responseTimeMs: result.responseTime,
    };
  }

  /**
   * Validate Slack webhook configuration
   */
  validateConfig(config: Record<string, unknown>): boolean {
    if (typeof config.webhookUrl !== 'string') {
      return false;
    }

    const webhookUrl = config.webhookUrl as string;

    // Slack webhook URLs must start with https://hooks.slack.com/
    if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
      return false;
    }

    return true;
  }

  /**
   * Convert alert event to Slack Block Kit payload
   */
  private toSlackPayload(alert: AlertEvent): SlackPayload {
    const emoji = this.SEVERITY_EMOJI[alert.severity];

    return {
      text: `${alert.severity.toUpperCase()}: ${alert.title}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} ${alert.title}`,
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: alert.message,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `*Source:* ${alert.source}`,
            },
            {
              type: 'mrkdwn',
              text: `*Time:* ${alert.timestamp.toISOString()}`,
            },
            {
              type: 'mrkdwn',
              text: `*Type:* ${alert.type}`,
            },
          ],
        },
      ],
    };
  }

  /**
   * HTTP POST using native Node.js https module
   * Pattern from webhooks.service.ts
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
