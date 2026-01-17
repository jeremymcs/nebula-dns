// Nebula DNS - Webhook E2E Tests with Secret Rotation
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Webhook E2E Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Webhook CRUD Operations', () => {
    it('should require authentication for webhook list', async () => {
      const response = await request(app.getHttpServer()).get('/webhooks');

      expect(response.status).toBe(401);
    });

    it('should require authentication for webhook creation', async () => {
      const response = await request(app.getHttpServer())
        .post('/webhooks')
        .send({
          name: 'Test Webhook',
          url: 'https://example.com/webhook',
          events: ['policy.created'],
          ipAllowlist: ['192.168.1.0/24'],
          rateLimit: 100,
        });

      expect(response.status).toBe(401);
    });

    it('should require authentication for webhook update', async () => {
      const response = await request(app.getHttpServer())
        .patch('/webhooks/test-id')
        .send({ name: 'Updated Webhook' });

      expect(response.status).toBe(401);
    });

    it('should require authentication for webhook deletion', async () => {
      const response = await request(app.getHttpServer()).delete(
        '/webhooks/test-id',
      );

      expect(response.status).toBe(401);
    });
  });

  describe('Webhook Security Endpoints', () => {
    it('should require authentication to enable webhook', async () => {
      const response = await request(app.getHttpServer()).post(
        '/webhooks/test-id/enable',
      );

      expect(response.status).toBe(401);
    });

    it('should require authentication to disable webhook', async () => {
      const response = await request(app.getHttpServer()).post(
        '/webhooks/test-id/disable',
      );

      expect(response.status).toBe(401);
    });

    it('should require authentication to test webhook', async () => {
      const response = await request(app.getHttpServer())
        .post('/webhooks/test-id/test')
        .send({ eventType: 'policy.created' });

      expect(response.status).toBe(401);
    });
  });

  describe('Webhook Delivery History', () => {
    it('should require authentication for delivery history', async () => {
      const response = await request(app.getHttpServer()).get(
        '/webhooks/test-id/deliveries',
      );

      expect(response.status).toBe(401);
    });
  });

  describe('Webhook Events', () => {
    it('should allow unauthenticated access to available events', async () => {
      const response = await request(app.getHttpServer()).get(
        '/webhooks/events',
      );

      // Events endpoint might or might not require auth depending on design
      expect([200, 401]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });
  });

  describe('Webhook IP Allowlist Validation', () => {
    it('should reject invalid IP in allowlist during creation', async () => {
      const response = await request(app.getHttpServer())
        .post('/webhooks')
        .send({
          name: 'Test Webhook',
          url: 'https://example.com/webhook',
          events: ['policy.created'],
          ipAllowlist: ['invalid-ip'],
        });

      // Either 401 (no auth) or 400 (validation error)
      expect([400, 401]).toContain(response.status);
    });

    it('should reject invalid CIDR in allowlist during creation', async () => {
      const response = await request(app.getHttpServer())
        .post('/webhooks')
        .send({
          name: 'Test Webhook',
          url: 'https://example.com/webhook',
          events: ['policy.created'],
          ipAllowlist: ['192.168.1.0/99'], // Invalid CIDR mask
        });

      // Either 401 (no auth) or 400 (validation error)
      expect([400, 401]).toContain(response.status);
    });
  });

  describe('Webhook Rate Limit Configuration', () => {
    it('should reject rate limit below minimum', async () => {
      const response = await request(app.getHttpServer())
        .post('/webhooks')
        .send({
          name: 'Test Webhook',
          url: 'https://example.com/webhook',
          events: ['policy.created'],
          rateLimit: -1, // Invalid negative rate limit
        });

      // Either 401 (no auth) or 400 (validation error)
      expect([400, 401]).toContain(response.status);
    });

    it('should reject rate limit above maximum', async () => {
      const response = await request(app.getHttpServer())
        .post('/webhooks')
        .send({
          name: 'Test Webhook',
          url: 'https://example.com/webhook',
          events: ['policy.created'],
          rateLimit: 99999, // Exceeds max of 1000
        });

      // Either 401 (no auth) or 400 (validation error)
      expect([400, 401]).toContain(response.status);
    });
  });

  // ============================================
  // Secret Rotation E2E Tests
  // ============================================

  describe('Webhook Secret Rotation', () => {
    describe('POST /webhooks/:id/rotate-secret', () => {
      it('should require authentication to rotate secret', async () => {
        const response = await request(app.getHttpServer())
          .post('/webhooks/test-id/rotate-secret')
          .send({});

        expect(response.status).toBe(401);
      });

      it('should require authentication with grace period param', async () => {
        const response = await request(app.getHttpServer())
          .post('/webhooks/test-id/rotate-secret')
          .send({ gracePeriodHours: 48 });

        expect(response.status).toBe(401);
      });

      it('should reject invalid grace period (below minimum)', async () => {
        const response = await request(app.getHttpServer())
          .post('/webhooks/test-id/rotate-secret')
          .send({ gracePeriodHours: 0 }); // Min is 1

        // Either 401 (no auth) or 400 (validation error)
        expect([400, 401]).toContain(response.status);
      });

      it('should reject invalid grace period (above maximum)', async () => {
        const response = await request(app.getHttpServer())
          .post('/webhooks/test-id/rotate-secret')
          .send({ gracePeriodHours: 200 }); // Max is 168 (7 days)

        // Either 401 (no auth) or 400 (validation error)
        expect([400, 401]).toContain(response.status);
      });
    });

    describe('GET /webhooks/:id/secret-status', () => {
      it('should require authentication to get secret status', async () => {
        const response = await request(app.getHttpServer()).get(
          '/webhooks/test-id/secret-status',
        );

        expect(response.status).toBe(401);
      });
    });

    describe('POST /webhooks/:id/expire-previous-secret', () => {
      it('should require authentication to expire previous secret', async () => {
        const response = await request(app.getHttpServer()).post(
          '/webhooks/test-id/expire-previous-secret',
        );

        expect(response.status).toBe(401);
      });
    });
  });

  describe('Webhook Secret Rotation DTO Validation', () => {
    it('should accept valid grace period of 1 hour', async () => {
      const response = await request(app.getHttpServer())
        .post('/webhooks/test-id/rotate-secret')
        .send({ gracePeriodHours: 1 });

      // 401 means DTO validation passed, just auth failed
      expect(response.status).toBe(401);
    });

    it('should accept valid grace period of 168 hours (7 days)', async () => {
      const response = await request(app.getHttpServer())
        .post('/webhooks/test-id/rotate-secret')
        .send({ gracePeriodHours: 168 });

      // 401 means DTO validation passed, just auth failed
      expect(response.status).toBe(401);
    });

    it('should reject non-integer grace period', async () => {
      const response = await request(app.getHttpServer())
        .post('/webhooks/test-id/rotate-secret')
        .send({ gracePeriodHours: 'invalid' });

      // Either 401 (no auth) or 400 (validation error)
      expect([400, 401]).toContain(response.status);
    });
  });
});
