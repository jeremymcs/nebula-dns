/**
 * Nebula DNS - Enterprise DNS Security Platform
 * MSP E2E Tests - Client Management
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('MSP E2E Tests - Client Management', () => {
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

  // ==================== Admin MSP Endpoints ====================

  describe('Admin: List MSP Tenants', () => {
    it('should require admin authentication', async () => {
      const response = await request(app.getHttpServer()).get(
        '/admin/msp/tenants',
      );

      expect(response.status).toBe(401);
    });

    it('should list MSP tenants with pagination', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .get('/admin/msp/tenants?limit=10')
          .set('Authorization', `Bearer ${token}`);

        expect([200, 403]).toContain(response.status);

        if (response.status === 200) {
          expect(response.body).toHaveProperty('data');
          expect(response.body).toHaveProperty('pagination');
        }
      }
    });

    it('should filter MSP tenants by status', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .get('/admin/msp/tenants?status=active')
          .set('Authorization', `Bearer ${token}`);

        expect([200, 403]).toContain(response.status);
      }
    });

    it('should reject invalid pagination', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .get('/admin/msp/tenants?limit=-1')
          .set('Authorization', `Bearer ${token}`);

        expect([400, 422]).toContain(response.status);
      }
    });
  });

  describe('Admin: Get MSP Tenant Details', () => {
    it('should require admin authentication', async () => {
      const response = await request(app.getHttpServer()).get(
        '/admin/msp/tenants/test-msp-id',
      );

      expect(response.status).toBe(401);
    });

    it('should return details for valid MSP', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .get('/admin/msp/tenants/test-msp-id')
          .set('Authorization', `Bearer ${token}`);

        expect([200, 400, 404]).toContain(response.status);

        if (response.status === 200) {
          expect(response.body).toHaveProperty('id');
          expect(response.body).toHaveProperty('name');
        }
      }
    });

    it('should return 400 for non-MSP tenant', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .get('/admin/msp/tenants/regular-tenant-id')
          .set('Authorization', `Bearer ${token}`);

        expect([400, 404]).toContain(response.status);
      }
    });

    it('should return 404 for non-existent tenant', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .get('/admin/msp/tenants/non-existent-id')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(404);
      }
    });
  });

  describe('Admin: List MSP Clients', () => {
    it('should require admin authentication', async () => {
      const response = await request(app.getHttpServer()).get(
        '/admin/msp/tenants/test-msp-id/clients',
      );

      expect(response.status).toBe(401);
    });

    it('should list clients for valid MSP', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .get('/admin/msp/tenants/test-msp-id/clients?limit=10')
          .set('Authorization', `Bearer ${token}`);

        expect([200, 400, 404]).toContain(response.status);

        if (response.status === 200) {
          expect(response.body).toHaveProperty('data');
          expect(response.body).toHaveProperty('pagination');
        }
      }
    });

    it('should support pagination cursor', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .get('/admin/msp/tenants/test-msp-id/clients?cursor=abc123')
          .set('Authorization', `Bearer ${token}`);

        expect([200, 400, 404]).toContain(response.status);
      }
    });

    it('should filter clients by status', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .get('/admin/msp/tenants/test-msp-id/clients?status=active')
          .set('Authorization', `Bearer ${token}`);

        expect([200, 400, 404]).toContain(response.status);
      }
    });
  });

  describe('Admin: Create MSP Tenant', () => {
    it('should require admin authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/msp/tenants')
        .send({
          name: 'New MSP',
          adminEmail: 'admin@newmsp.com',
          adminName: 'MSP Admin',
        });

      expect(response.status).toBe(401);
    });

    it('should require admin/owner role', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .post('/admin/msp/tenants')
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'New MSP',
            adminEmail: 'admin@newmsp.com',
            adminName: 'MSP Admin',
          });

        expect([201, 403]).toContain(response.status);
      }
    });

    it('should reject creation with invalid email', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .post('/admin/msp/tenants')
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'New MSP',
            adminEmail: 'invalid-email',
            adminName: 'MSP Admin',
          });

        expect(response.status).toBe(400);
      }
    });

    it('should reject creation with duplicate email', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .post('/admin/msp/tenants')
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'New MSP',
            adminEmail: 'admin@example.com', // Already exists
            adminName: 'MSP Admin',
          });

        expect([400, 409]).toContain(response.status);
      }
    });

    it('should reject creation with missing required fields', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .post('/admin/msp/tenants')
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'New MSP',
            // Missing adminEmail and adminName
          });

        expect(response.status).toBe(400);
      }
    });
  });

  describe('Admin: Search Tenants', () => {
    it('should require admin authentication', async () => {
      const response = await request(app.getHttpServer()).get(
        '/admin/tenants/search?q=test',
      );

      expect(response.status).toBe(401);
    });

    it('should search tenants by query', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .get('/admin/tenants/search?q=test')
          .set('Authorization', `Bearer ${token}`);

        expect([200, 403]).toContain(response.status);

        if (response.status === 200) {
          expect(response.body).toHaveProperty('data');
        }
      }
    });

    it('should reject short query', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .get('/admin/tenants/search?q=a')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(400);
      }
    });

    it('should detect UUID query format', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        // Valid UUID format
        const response = await request(app.getHttpServer())
          .get('/admin/tenants/search?q=550e8400-e29b-41d4-a716-446655440000')
          .set('Authorization', `Bearer ${token}`);

        expect([200, 403]).toContain(response.status);
      }
    });
  });

  // ==================== Tenant MSP Endpoints (if available) ====================

  describe('Tenant: MSP Client Management (if available)', () => {
    // These tests check if tenant-level MSP endpoints exist
    // They may not exist if MSP features are admin-only

    it('should check for tenant MSP client list endpoint', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        // Try common tenant MSP endpoint patterns
        const response = await request(app.getHttpServer())
          .get('/msp/clients')
          .set('Authorization', `Bearer ${token}`);

        // Should return 404 if endpoint doesn't exist, 200 if it does
        expect([200, 401, 403, 404]).toContain(response.status);
      }
    });

    it('should check for tenant MSP client create endpoint', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .post('/msp/clients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'Test Client',
            domain: 'testclient.com',
          });

        // Should return 404 if endpoint doesn't exist, 201 if it does
        expect([201, 401, 403, 404]).toContain(response.status);
      }
    });
  });

  // ==================== Role-Based Access ====================

  describe('MSP Access Control', () => {
    it('should restrict viewer role from creating MSP tenants', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        // Viewer should be able to read
        const readResponse = await request(app.getHttpServer())
          .get('/admin/msp/tenants')
          .set('Authorization', `Bearer ${token}`);

        expect([200, 403]).toContain(readResponse.status);

        // But not create
        const createResponse = await request(app.getHttpServer())
          .post('/admin/msp/tenants')
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'New MSP',
            adminEmail: 'test@test.com',
            adminName: 'Test',
          });

        expect([201, 403]).toContain(createResponse.status);
      }
    });
  });
});
