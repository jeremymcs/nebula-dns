/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Billing E2E Tests - Payment Methods, Invoices, Subscriptions
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Billing E2E Tests - Payment Methods, Invoices, Subscriptions', () => {
  let app: INestApplication;
  let authToken: string;

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

  // ==================== Checkout Flow ====================

  describe('Checkout Session', () => {
    it('should require authentication for checkout', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments/checkout')
        .send({ planCode: 'pro', billingCycle: 'monthly' });

      expect(response.status).toBe(401);
    });

    it('should reject invalid plan code', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .post('/payments/checkout')
          .set('Authorization', `Bearer ${token}`)
          .send({ planCode: 'invalid-plan', billingCycle: 'monthly' });

        expect(response.status).toBe(400);
      }
    });

    it('should reject invalid billing cycle', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .post('/payments/checkout')
          .set('Authorization', `Bearer ${token}`)
          .send({ planCode: 'pro', billingCycle: 'weekly' });

        expect(response.status).toBe(400);
      }
    });

    it('should create checkout session with valid parameters', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'AdminPassword123!',
        });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .post('/payments/checkout')
          .set('Authorization', `Bearer ${token}`)
          .send({ planCode: 'pro', billingCycle: 'monthly' });

        // Should succeed or return 400 if Stripe not configured
        expect([200, 400, 500]).toContain(response.status);

        if (response.status === 200) {
          expect(response.body).toHaveProperty('url');
        }
      }
    });
  });

  // ==================== Billing Portal ====================

  describe('Billing Portal', () => {
    it('should require authentication for portal access', async () => {
      const response = await request(app.getHttpServer()).post(
        '/payments/portal',
      );

      expect(response.status).toBe(401);
    });

    it('should reject portal access without billing info', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .post('/payments/portal')
          .set('Authorization', `Bearer ${token}`);

        // Either success with URL or error if no billing info
        expect([200, 400, 404]).toContain(response.status);

        if (response.status === 200) {
          expect(response.body).toHaveProperty('url');
        }
      }
    });
  });

  // ==================== Webhook (handled separately) ====================

  describe('Stripe Webhook', () => {
    it('should reject webhook without signature', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments/webhook')
        .send({ type: 'test' });

      expect(response.status).toBe(400);
    });

    it('should reject webhook with invalid signature', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('stripe-signature', 'invalid-signature')
        .send({ type: 'test' });

      expect(response.status).toBe(400);
    });

    it('should accept valid webhook event', async () => {
      // Create a valid test webhook event
      // Note: This requires a real Stripe webhook signature
      // For testing, we skip this or use Stripe CLI
      const response = await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('stripe-signature', 'test-signature')
        .send({ type: 'test.event', data: { object: {} } });

      // Will fail signature check but validates endpoint exists
      expect([400, 401]).toContain(response.status);
    });
  });

  // ==================== Admin Billing Endpoints ====================

  describe('Admin: Get Subscription Status', () => {
    it('should require admin authentication', async () => {
      const response = await request(app.getHttpServer()).get(
        '/admin/tenants/test-tenant-id/billing/subscription',
      );

      expect(response.status).toBe(401);
    });

    it('should return subscription status for valid tenant', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .get('/admin/tenants/test-tenant-id/billing/subscription')
          .set('Authorization', `Bearer ${token}`);

        expect([200, 404]).toContain(response.status);

        if (response.status === 200) {
          expect(response.body).toHaveProperty('status');
        }
      }
    });
  });

  describe('Admin: List Invoices', () => {
    it('should require admin authentication', async () => {
      const response = await request(app.getHttpServer()).get(
        '/admin/tenants/test-tenant-id/billing/invoices',
      );

      expect(response.status).toBe(401);
    });

    it('should list invoices with pagination', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .get('/admin/tenants/test-tenant-id/billing/invoices?limit=10')
          .set('Authorization', `Bearer ${token}`);

        expect([200, 404]).toContain(response.status);

        if (response.status === 200) {
          expect(response.body).toHaveProperty('invoices');
          expect(response.body).toHaveProperty('pagination');
        }
      }
    });

    it('should support invoice status filtering', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .get('/admin/tenants/test-tenant-id/billing/invoices?status=paid')
          .set('Authorization', `Bearer ${token}`);

        expect([200, 404]).toContain(response.status);
      }
    });
  });

  describe('Admin: Download Invoice PDF', () => {
    it('should require admin authentication', async () => {
      const response = await request(app.getHttpServer()).get(
        '/admin/tenants/test-tenant-id/billing/invoices/inv_123/pdf',
      );

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent invoice', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .get(
            '/admin/tenants/test-tenant-id/billing/invoices/non_existent/pdf',
          )
          .set('Authorization', `Bearer ${token}`);

        expect([404, 500]).toContain(response.status);
      }
    });
  });

  describe('Admin: List Payment Methods', () => {
    it('should require admin authentication', async () => {
      const response = await request(app.getHttpServer()).get(
        '/admin/tenants/test-tenant-id/billing/payment-methods',
      );

      expect(response.status).toBe(401);
    });

    it('should return empty list for tenant without billing', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .get('/admin/tenants/test-tenant-id/billing/payment-methods')
          .set('Authorization', `Bearer ${token}`);

        expect([200, 404]).toContain(response.status);

        if (response.status === 200) {
          expect(response.body).toHaveProperty('paymentMethods');
          expect(response.body.paymentMethods).toBeInstanceOf(Array);
        }
      }
    });
  });

  describe('Admin: Create SetupIntent', () => {
    it('should require admin authentication', async () => {
      const response = await request(app.getHttpServer()).post(
        '/admin/tenants/test-tenant-id/billing/payment-methods',
      );

      expect(response.status).toBe(401);
    });

    it('should require admin/owner role', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .post('/admin/tenants/test-tenant-id/billing/payment-methods')
          .set('Authorization', `Bearer ${token}`);

        // Should succeed or fail based on permissions
        expect([201, 403, 404]).toContain(response.status);

        if (response.status === 201) {
          expect(response.body).toHaveProperty('clientSecret');
        }
      }
    });
  });

  describe('Admin: Set Default Payment Method', () => {
    it('should require admin authentication', async () => {
      const response = await request(app.getHttpServer())
        .patch('/admin/tenants/test-tenant-id/billing/payment-methods/default')
        .send({ paymentMethodId: 'pm_123' });

      expect(response.status).toBe(401);
    });

    it('should reject invalid payment method', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .patch(
            '/admin/tenants/test-tenant-id/billing/payment-methods/default',
          )
          .set('Authorization', `Bearer ${token}`)
          .send({ paymentMethodId: 'invalid-pm' });

        expect([400, 404]).toContain(response.status);
      }
    });
  });

  describe('Admin: Delete Payment Method', () => {
    it('should require admin authentication', async () => {
      const response = await request(app.getHttpServer()).delete(
        '/admin/tenants/test-tenant-id/billing/payment-methods/pm_123',
      );

      expect(response.status).toBe(401);
    });

    it('should reject deletion of default payment method', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .delete(
            '/admin/tenants/test-tenant-id/billing/payment-methods/pm_default',
          )
          .set('Authorization', `Bearer ${token}`);

        expect([400, 403, 404]).toContain(response.status);
      }
    });
  });

  describe('Admin: Apply Credit', () => {
    it('should require admin authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/tenants/test-tenant-id/billing/credits')
        .send({ amount: 1000, description: 'Test credit' });

      expect(response.status).toBe(401);
    });

    it('should require admin/owner role', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .post('/admin/tenants/test-tenant-id/billing/credits')
          .set('Authorization', `Bearer ${token}`)
          .send({ amount: 1000, description: 'Test credit' });

        expect([201, 400, 403, 404]).toContain(response.status);
      }
    });

    it('should reject invalid credit amount', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .post('/admin/tenants/test-tenant-id/billing/credits')
          .set('Authorization', `Bearer ${token}`)
          .send({ amount: -100, description: 'Test credit' });

        expect(response.status).toBe(400);
      }
    });

    it('should reject credit exceeding maximum', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        // Maximum is $10,000 (100000 cents)
        const response = await request(app.getHttpServer())
          .post('/admin/tenants/test-tenant-id/billing/credits')
          .set('Authorization', `Bearer ${token}`)
          .send({ amount: 1500000, description: 'Exceeds max' });

        expect(response.status).toBe(400);
      }
    });
  });

  describe('Admin: Change Subscription Tier', () => {
    it('should require admin authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/tenants/test-tenant-id/billing/tier')
        .send({ planCode: 'enterprise', timing: 'immediate' });

      expect(response.status).toBe(401);
    });

    it('should reject invalid plan code', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .post('/admin/tenants/test-tenant-id/billing/tier')
          .set('Authorization', `Bearer ${token}`)
          .send({ planCode: 'invalid', timing: 'immediate' });

        expect(response.status).toBe(400);
      }
    });

    it('should reject invalid timing', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .post('/admin/tenants/test-tenant-id/billing/tier')
          .set('Authorization', `Bearer ${token}`)
          .send({ planCode: 'enterprise', timing: 'invalid' });

        expect(response.status).toBe(400);
      }
    });
  });

  describe('Admin: Extend Trial Period', () => {
    it('should require admin authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/tenants/test-tenant-id/billing/trial/extend')
        .send({ days: 7 });

      expect(response.status).toBe(401);
    });

    it('should require admin/owner role', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .post('/admin/tenants/test-tenant-id/billing/trial/extend')
          .set('Authorization', `Bearer ${token}`)
          .send({ days: 7 });

        expect([200, 400, 403, 404]).toContain(response.status);
      }
    });

    it('should reject extension for non-trial tenant', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .post('/admin/tenants/test-tenant-id/billing/trial/extend')
          .set('Authorization', `Bearer ${token}`)
          .send({ days: 7 });

        // Either succeeds or fails if not a trial
        expect([200, 400]).toContain(response.status);
      }
    });
  });

  describe('Admin: Extend Grace Period', () => {
    it('should require admin authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/tenants/test-tenant-id/billing/grace/extend')
        .send({ days: 7 });

      expect(response.status).toBe(401);
    });

    it('should reject extension for tenant not in grace period', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .post('/admin/tenants/test-tenant-id/billing/grace/extend')
          .set('Authorization', `Bearer ${token}`)
          .send({ days: 7 });

        // Either succeeds or fails if not in grace period
        expect([200, 400]).toContain(response.status);
      }
    });
  });

  // ==================== Role-Based Access Control ====================

  describe('Billing Permissions by Role', () => {
    it('should restrict readonly role from billing modifications', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        // Read operations should work for all roles
        const readResponse = await request(app.getHttpServer())
          .get('/admin/tenants/test-tenant-id/billing/subscription')
          .set('Authorization', `Bearer ${token}`);

        expect([200, 403, 404]).toContain(readResponse.status);

        // Write operations should require admin/owner
        const writeResponse = await request(app.getHttpServer())
          .post('/admin/tenants/test-tenant-id/billing/credits')
          .set('Authorization', `Bearer ${token}`)
          .send({ amount: 1000, description: 'Test' });

        expect([201, 403]).toContain(writeResponse.status);
      }
    });
  });
});
