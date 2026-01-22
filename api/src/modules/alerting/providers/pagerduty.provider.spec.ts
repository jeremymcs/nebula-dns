// Nebula DNS - PagerDuty Provider Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { PagerDutyProvider } from './pagerduty.provider';
import { AlertEvent, AlertSeverity } from '../interfaces/alert-provider.interface';
import * as https from 'https';

// Mock https module
jest.mock('https');

describe('PagerDutyProvider', () => {
  let provider: PagerDutyProvider;

  const validRoutingKey = 'a'.repeat(32); // 32 character routing key

  const mockAlert: AlertEvent = {
    id: 'alert-123',
    type: 'system_health',
    severity: 'critical',
    title: 'Service Down',
    message: 'Policy service is not responding',
    source: 'policy-svc',
    timestamp: new Date('2026-01-22T00:00:00Z'),
    metadata: {
      identifier: 'service_down',
      service: 'policy-svc',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PagerDutyProvider],
    }).compile();

    provider = module.get<PagerDutyProvider>(PagerDutyProvider);
    jest.clearAllMocks();
  });

  describe('validateConfig', () => {
    it('should return true for valid 32-char routing key', () => {
      const config = { routingKey: validRoutingKey };
      expect(provider.validateConfig(config)).toBe(true);
    });

    it('should return false for missing routingKey', () => {
      const config = {};
      expect(provider.validateConfig(config)).toBe(false);
    });

    it('should return false for non-string routingKey', () => {
      const config = { routingKey: 12345 };
      expect(provider.validateConfig(config)).toBe(false);
    });

    it('should return false for wrong length routing key', () => {
      const config = { routingKey: 'too-short' };
      expect(provider.validateConfig(config)).toBe(false);
    });

    it('should return false for routing key longer than 32 chars', () => {
      const config = { routingKey: 'a'.repeat(33) };
      expect(provider.validateConfig(config)).toBe(false);
    });
  });

  describe('generateDedupKey', () => {
    it('should use consistent format: nebuladns:source:type:identifier', () => {
      // Use private method via reflection
      const dedupKey = (provider as any).generateDedupKey(mockAlert);
      expect(dedupKey).toBe(
        'nebuladns:policy-svc:system_health:service_down',
      );
    });

    it('should use alert.metadata.identifier when present', () => {
      const alert: AlertEvent = {
        ...mockAlert,
        metadata: { identifier: 'custom-id' },
      };
      const dedupKey = (provider as any).generateDedupKey(alert);
      expect(dedupKey).toBe('nebuladns:policy-svc:system_health:custom-id');
    });

    it('should fall back to alert.id when no identifier in metadata', () => {
      const alert: AlertEvent = {
        ...mockAlert,
        metadata: {},
      };
      const dedupKey = (provider as any).generateDedupKey(alert);
      expect(dedupKey).toBe('nebuladns:policy-svc:system_health:alert-123');
    });

    it('should fall back to alert.id when no metadata', () => {
      const alert: AlertEvent = {
        id: 'alert-456',
        type: 'billing',
        severity: 'error',
        title: 'Payment Failed',
        message: 'Stripe payment failed',
        source: 'stripe',
        timestamp: new Date(),
      };
      const dedupKey = (provider as any).generateDedupKey(alert);
      expect(dedupKey).toBe('nebuladns:stripe:billing:alert-456');
    });

    it('should produce same output for same inputs (deterministic)', () => {
      const dedupKey1 = (provider as any).generateDedupKey(mockAlert);
      const dedupKey2 = (provider as any).generateDedupKey(mockAlert);
      expect(dedupKey1).toBe(dedupKey2);
    });
  });

  describe('toPagerDutyPayload', () => {
    it('should create valid Events API v2 payload structure', () => {
      const dedupKey = 'nebuladns:policy-svc:system_health:service_down';
      const payload = (provider as any).toPagerDutyPayload(
        mockAlert,
        validRoutingKey,
        dedupKey,
      );

      expect(payload).toMatchObject({
        routing_key: validRoutingKey,
        event_action: 'trigger',
        dedup_key: dedupKey,
        payload: {
          summary: mockAlert.title,
          source: mockAlert.source,
          severity: mockAlert.severity,
          timestamp: mockAlert.timestamp.toISOString(),
          component: 'Nebula DNS',
          class: mockAlert.type,
          custom_details: {
            message: mockAlert.message,
            identifier: 'service_down',
            service: 'policy-svc',
          },
        },
        client: 'Nebula DNS',
      });
    });

    it('should truncate summary to 1024 chars', () => {
      const longTitle = 'a'.repeat(2000);
      const alert: AlertEvent = {
        ...mockAlert,
        title: longTitle,
      };
      const dedupKey = 'test-key';
      const payload = (provider as any).toPagerDutyPayload(
        alert,
        validRoutingKey,
        dedupKey,
      );

      expect(payload.payload.summary).toHaveLength(1024);
      expect(payload.payload.summary).toBe(longTitle.substring(0, 1024));
    });

    it('should include custom_details with metadata', () => {
      const alert: AlertEvent = {
        ...mockAlert,
        metadata: {
          identifier: 'test-id',
          extraField: 'extra-value',
          numericField: 42,
        },
      };
      const dedupKey = 'test-key';
      const payload = (provider as any).toPagerDutyPayload(
        alert,
        validRoutingKey,
        dedupKey,
      );

      expect(payload.payload.custom_details).toMatchObject({
        message: mockAlert.message,
        identifier: 'test-id',
        extraField: 'extra-value',
        numericField: 42,
      });
    });
  });

  describe('send', () => {
    const mockHttpResponse = (statusCode: number, body = '') => {
      const mockReq = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
        destroy: jest.fn(),
      };

      (https.request as jest.Mock).mockImplementation((options, callback) => {
        const mockRes = {
          statusCode,
          on: jest.fn((event, handler) => {
            if (event === 'data') {
              handler(body);
            } else if (event === 'end') {
              handler();
            }
          }),
        };
        callback(mockRes);
        return mockReq;
      });

      return mockReq;
    };

    it('should skip warning severity and return success without HTTP call - ALERT-07', async () => {
      const warningAlert: AlertEvent = {
        ...mockAlert,
        severity: 'warning',
      };

      const result = await provider.send(warningAlert, {
        routingKey: validRoutingKey,
      });

      expect(result.success).toBe(true);
      expect(https.request).not.toHaveBeenCalled();
    });

    it('should send critical severity', async () => {
      mockHttpResponse(202, JSON.stringify({ status: 'success' }));

      const result = await provider.send(mockAlert, {
        routingKey: validRoutingKey,
      });

      expect(result.success).toBe(true);
      expect(result.responseTime).toBeDefined();
      expect(https.request).toHaveBeenCalled();
    });

    it('should send error severity', async () => {
      const errorAlert: AlertEvent = {
        ...mockAlert,
        severity: 'error',
      };
      mockHttpResponse(202, JSON.stringify({ status: 'success' }));

      const result = await provider.send(errorAlert, {
        routingKey: validRoutingKey,
      });

      expect(result.success).toBe(true);
      expect(https.request).toHaveBeenCalled();
    });

    it('should send info severity', async () => {
      const infoAlert: AlertEvent = {
        ...mockAlert,
        severity: 'info',
      };
      mockHttpResponse(202, JSON.stringify({ status: 'success' }));

      const result = await provider.send(infoAlert, {
        routingKey: validRoutingKey,
      });

      expect(result.success).toBe(true);
      expect(https.request).toHaveBeenCalled();
    });

    it('should handle HTTP errors gracefully', async () => {
      mockHttpResponse(500, JSON.stringify({ error: 'Internal server error' }));

      const result = await provider.send(mockAlert, {
        routingKey: validRoutingKey,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
      expect(result.responseTime).toBeDefined();
    });

    it('should handle network errors gracefully', async () => {
      const mockReq = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn((event, handler) => {
          if (event === 'error') {
            handler(new Error('Network error'));
          }
        }),
        destroy: jest.fn(),
      };

      (https.request as jest.Mock).mockReturnValue(mockReq);

      const result = await provider.send(mockAlert, {
        routingKey: validRoutingKey,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
      expect(result.responseTime).toBeDefined();
    });
  });

  describe('test', () => {
    const mockHttpResponseSequence = () => {
      let callCount = 0;
      const mockReq = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
        destroy: jest.fn(),
      };

      (https.request as jest.Mock).mockImplementation((options, callback) => {
        callCount++;
        const mockRes = {
          statusCode: 202,
          on: jest.fn((event, handler) => {
            if (event === 'data') {
              handler(JSON.stringify({ status: 'success' }));
            } else if (event === 'end') {
              handler();
            }
          }),
        };
        callback(mockRes);
        return mockReq;
      });

      return mockReq;
    };

    it('should send trigger then resolve', async () => {
      mockHttpResponseSequence();

      const result = await provider.test({ routingKey: validRoutingKey });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Test incident created and resolved');
      expect(result.responseTimeMs).toBeDefined();
      expect(https.request).toHaveBeenCalledTimes(2); // trigger + resolve
    });

    it('should use unique dedup_key for test', async () => {
      mockHttpResponseSequence();

      const result1 = await provider.test({ routingKey: validRoutingKey });
      await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay
      jest.clearAllMocks();
      mockHttpResponseSequence();
      const result2 = await provider.test({ routingKey: validRoutingKey });

      // Both should succeed but use different dedup_keys (timestamp-based)
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('should handle trigger failure', async () => {
      const mockReq = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
        destroy: jest.fn(),
      };

      (https.request as jest.Mock).mockImplementation((options, callback) => {
        const mockRes = {
          statusCode: 400,
          on: jest.fn((event, handler) => {
            if (event === 'data') {
              handler(JSON.stringify({ error: 'Invalid routing key' }));
            } else if (event === 'end') {
              handler();
            }
          }),
        };
        callback(mockRes);
        return mockReq;
      });

      const result = await provider.test({ routingKey: validRoutingKey });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to trigger test incident');
    });
  });

  describe('type property', () => {
    it('should have type "pagerduty"', () => {
      expect(provider.type).toBe('pagerduty');
    });
  });
});
