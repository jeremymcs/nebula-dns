// Nebula DNS - Slack Alert Provider Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { SlackProvider } from './slack.provider';
import {
  AlertEvent,
  AlertSeverity,
} from '../interfaces/alert-provider.interface';

describe('SlackProvider', () => {
  let provider: SlackProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SlackProvider],
    }).compile();

    provider = module.get<SlackProvider>(SlackProvider);
  });

  describe('validateConfig', () => {
    it('should return true for valid Slack webhook URL', () => {
      const config = {
        webhookUrl:
          'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX',
      };

      expect(provider.validateConfig(config)).toBe(true);
    });

    it('should return false for missing webhookUrl', () => {
      const config = {};

      expect(provider.validateConfig(config)).toBe(false);
    });

    it('should return false for non-Slack URL', () => {
      const config = {
        webhookUrl: 'https://example.com/webhook',
      };

      expect(provider.validateConfig(config)).toBe(false);
    });

    it('should return false for non-https URL', () => {
      const config = {
        webhookUrl:
          'http://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX',
      };

      expect(provider.validateConfig(config)).toBe(false);
    });

    it('should return false for non-string webhookUrl', () => {
      const config = {
        webhookUrl: 12345,
      };

      expect(provider.validateConfig(config)).toBe(false);
    });
  });

  describe('toSlackPayload', () => {
    it('should create proper Block Kit payload with severity emoji', () => {
      const alert: AlertEvent = {
        id: 'test-alert-1',
        type: 'system_health',
        severity: 'critical',
        title: 'Service Down',
        message: 'Policy service is not responding',
        source: 'policy-svc',
        timestamp: new Date('2026-01-21T12:00:00Z'),
      };

      const config = {
        webhookUrl:
          'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX',
      };

      // Access private method through send with mocked HTTP
      const mockHttpPost = jest
        .spyOn(provider as any, 'httpPost')
        .mockResolvedValue({ statusCode: 200, body: 'ok' });

      return provider.send(alert, config).then(() => {
        const callArgs = mockHttpPost.mock.calls[0];
        const payload = JSON.parse(callArgs[1] as string);

        // Check fallback text
        expect(payload.text).toBe('CRITICAL: Service Down');

        // Check blocks structure
        expect(payload.blocks).toHaveLength(3);

        // Check header with emoji
        expect(payload.blocks[0].type).toBe('header');
        expect(payload.blocks[0].text.text).toBe(
          ':rotating_light: Service Down',
        );
        expect(payload.blocks[0].text.emoji).toBe(true);

        // Check message section
        expect(payload.blocks[1].type).toBe('section');
        expect(payload.blocks[1].text.text).toBe(
          'Policy service is not responding',
        );

        // Check context
        expect(payload.blocks[2].type).toBe('context');
        expect(payload.blocks[2].elements).toHaveLength(3);
        expect(payload.blocks[2].elements[0].text).toBe('*Source:* policy-svc');
        expect(payload.blocks[2].elements[1].text).toBe(
          '*Time:* 2026-01-21T12:00:00.000Z',
        );
        expect(payload.blocks[2].elements[2].text).toBe(
          '*Type:* system_health',
        );

        mockHttpPost.mockRestore();
      });
    });

    it('should use correct emoji for each severity level', async () => {
      const mockHttpPost = jest
        .spyOn(provider as any, 'httpPost')
        .mockResolvedValue({ statusCode: 200, body: 'ok' });

      const severities: Array<{ severity: AlertSeverity; emoji: string }> = [
        { severity: 'critical', emoji: ':rotating_light:' },
        { severity: 'error', emoji: ':x:' },
        { severity: 'warning', emoji: ':warning:' },
        { severity: 'info', emoji: ':information_source:' },
      ];

      for (const { severity, emoji } of severities) {
        const alert: AlertEvent = {
          id: 'test-alert',
          type: 'system_health',
          severity,
          title: 'Test Alert',
          message: 'Test message',
          source: 'test',
          timestamp: new Date(),
        };

        const config = {
          webhookUrl:
            'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX',
        };

        await provider.send(alert, config);

        const callArgs =
          mockHttpPost.mock.calls[mockHttpPost.mock.calls.length - 1];
        const payload = JSON.parse(callArgs[1] as string);

        expect(payload.blocks[0].text.text).toContain(emoji);
      }

      mockHttpPost.mockRestore();
    });
  });

  describe('send', () => {
    it('should send alert successfully with 200 response', async () => {
      const mockHttpPost = jest
        .spyOn(provider as any, 'httpPost')
        .mockResolvedValue({ statusCode: 200, body: 'ok' });

      const alert: AlertEvent = {
        id: 'test-alert-1',
        type: 'billing',
        severity: 'error',
        title: 'Payment Failed',
        message: 'Payment processing failed for customer',
        source: 'stripe',
        timestamp: new Date(),
      };

      const config = {
        webhookUrl:
          'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX',
      };

      const result = await provider.send(alert, config);

      expect(result.success).toBe(true);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(mockHttpPost).toHaveBeenCalledWith(
        config.webhookUrl,
        expect.any(String),
      );

      mockHttpPost.mockRestore();
    });

    it('should handle non-200 response', async () => {
      const mockHttpPost = jest
        .spyOn(provider as any, 'httpPost')
        .mockResolvedValue({ statusCode: 400, body: 'invalid_payload' });

      const alert: AlertEvent = {
        id: 'test-alert-1',
        type: 'security',
        severity: 'warning',
        title: 'Failed Login',
        message: 'Multiple failed login attempts',
        source: 'auth',
        timestamp: new Date(),
      };

      const config = {
        webhookUrl:
          'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX',
      };

      const result = await provider.send(alert, config);

      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTP 400');
      expect(result.responseTime).toBeGreaterThanOrEqual(0);

      mockHttpPost.mockRestore();
    });

    it('should handle network errors', async () => {
      const mockHttpPost = jest
        .spyOn(provider as any, 'httpPost')
        .mockRejectedValue(new Error('Network error'));

      const alert: AlertEvent = {
        id: 'test-alert-1',
        type: 'system_health',
        severity: 'info',
        title: 'Test',
        message: 'Test message',
        source: 'test',
        timestamp: new Date(),
      };

      const config = {
        webhookUrl:
          'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX',
      };

      const result = await provider.send(alert, config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(result.responseTime).toBeGreaterThanOrEqual(0);

      mockHttpPost.mockRestore();
    });

    it('should handle timeout errors', async () => {
      const mockHttpPost = jest
        .spyOn(provider as any, 'httpPost')
        .mockRejectedValue(new Error('Request timeout'));

      const alert: AlertEvent = {
        id: 'test-alert-1',
        type: 'system_health',
        severity: 'critical',
        title: 'Timeout Test',
        message: 'Testing timeout handling',
        source: 'test',
        timestamp: new Date(),
      };

      const config = {
        webhookUrl:
          'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX',
      };

      const result = await provider.send(alert, config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request timeout');

      mockHttpPost.mockRestore();
    });

    it('should return error for missing webhookUrl', async () => {
      const alert: AlertEvent = {
        id: 'test-alert-1',
        type: 'system_health',
        severity: 'info',
        title: 'Test',
        message: 'Test message',
        source: 'test',
        timestamp: new Date(),
      };

      const config = {};

      const result = await provider.send(alert, config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing webhookUrl in configuration');
    });
  });

  describe('test', () => {
    it('should send test alert and return success result', async () => {
      const mockHttpPost = jest
        .spyOn(provider as any, 'httpPost')
        .mockResolvedValue({ statusCode: 200, body: 'ok' });

      const config = {
        webhookUrl:
          'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX',
      };

      const result = await provider.test(config);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Test alert sent successfully');
      expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);

      // Verify test alert was sent with correct properties
      const callArgs = mockHttpPost.mock.calls[0];
      const payload = JSON.parse(callArgs[1] as string);

      expect(payload.text).toContain('Flux Shield Test Alert');
      expect(payload.blocks[0].text.text).toContain(':information_source:');

      mockHttpPost.mockRestore();
    });

    it('should return failure result when test alert fails', async () => {
      const mockHttpPost = jest
        .spyOn(provider as any, 'httpPost')
        .mockRejectedValue(new Error('Connection refused'));

      const config = {
        webhookUrl:
          'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX',
      };

      const result = await provider.test(config);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Connection refused');
      expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);

      mockHttpPost.mockRestore();
    });
  });

  describe('type property', () => {
    it('should have type "slack"', () => {
      expect(provider.type).toBe('slack');
    });
  });
});
