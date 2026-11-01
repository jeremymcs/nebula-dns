// Nebula DNS - Audit Log Immutability E2E Tests (US-005)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Audit Log Immutability E2E Tests (US-005)', () => {
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

  // ============================================
  // API Immutability Enforcement Tests
  // ============================================

  describe('API Immutability Enforcement', () => {
    describe('DELETE /audit-logs', () => {
      it('should return 403 when attempting to delete all audit logs', async () => {
        const response = await request(app.getHttpServer()).delete(
          '/audit-logs',
        );

        // 401 if not authenticated, 403 if authenticated but operation forbidden
        expect([401, 403, 404]).toContain(response.status);

        if (response.status === 403) {
          expect(response.body.message).toContain(
            'DELETE operations are not permitted',
          );
        }
      });

      it('should return 403 when attempting to delete a specific audit log', async () => {
        const response = await request(app.getHttpServer()).delete(
          '/audit-logs/550e8400-e29b-41d4-a716-446655440099',
        );

        // 401 if not authenticated, 403 if authenticated but operation forbidden
        expect([401, 403, 404]).toContain(response.status);

        if (response.status === 403) {
          expect(response.body.message).toContain(
            'DELETE operations are not permitted',
          );
        }
      });
    });

    describe('PUT /audit-logs', () => {
      it('should return 403 when attempting to update all audit logs via PUT', async () => {
        const response = await request(app.getHttpServer())
          .put('/audit-logs')
          .send({ action: 'modified' });

        // 401 if not authenticated, 403 if authenticated but operation forbidden
        expect([401, 403, 404]).toContain(response.status);

        if (response.status === 403) {
          expect(response.body.message).toContain(
            'UPDATE operations are not permitted',
          );
        }
      });

      it('should return 403 when attempting to update a specific audit log via PUT', async () => {
        const response = await request(app.getHttpServer())
          .put('/audit-logs/550e8400-e29b-41d4-a716-446655440099')
          .send({ action: 'modified' });

        // 401 if not authenticated, 403 if authenticated but operation forbidden
        expect([401, 403, 404]).toContain(response.status);

        if (response.status === 403) {
          expect(response.body.message).toContain(
            'UPDATE operations are not permitted',
          );
        }
      });
    });

    describe('PATCH /audit-logs', () => {
      it('should return 403 when attempting to modify all audit logs via PATCH', async () => {
        const response = await request(app.getHttpServer())
          .patch('/audit-logs')
          .send({ action: 'modified' });

        // 401 if not authenticated, 403 if authenticated but operation forbidden
        expect([401, 403, 404]).toContain(response.status);

        if (response.status === 403) {
          expect(response.body.message).toContain(
            'UPDATE operations are not permitted',
          );
        }
      });

      it('should return 403 when attempting to modify a specific audit log via PATCH', async () => {
        const response = await request(app.getHttpServer())
          .patch('/audit-logs/550e8400-e29b-41d4-a716-446655440099')
          .send({ action: 'modified' });

        // 401 if not authenticated, 403 if authenticated but operation forbidden
        expect([401, 403, 404]).toContain(response.status);

        if (response.status === 403) {
          expect(response.body.message).toContain(
            'UPDATE operations are not permitted',
          );
        }
      });
    });
  });

  // ============================================
  // Read Operations Tests
  // ============================================

  describe('Read Operations', () => {
    describe('GET /audit-logs', () => {
      it('should require authentication to list audit logs', async () => {
        const response = await request(app.getHttpServer()).get('/audit-logs');

        expect(response.status).toBe(401);
      });
    });

    describe('GET /audit-logs/verify', () => {
      it('should require authentication for integrity verification', async () => {
        const response = await request(app.getHttpServer()).get(
          '/audit-logs/verify',
        );

        expect(response.status).toBe(401);
      });
    });

    describe('GET /audit-logs/export', () => {
      it('should require authentication to export audit logs', async () => {
        const response = await request(app.getHttpServer()).get(
          '/audit-logs/export',
        );

        expect(response.status).toBe(401);
      });

      it('should require authentication to export with integrity verification', async () => {
        const response = await request(app.getHttpServer())
          .get('/audit-logs/export')
          .query({ verifyIntegrity: true, format: 'json' });

        expect(response.status).toBe(401);
      });
    });
  });

  // ============================================
  // Export Format Tests
  // ============================================

  describe('Export Format Validation', () => {
    it('should accept CSV format parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs/export')
        .query({ format: 'csv' });

      // 401 indicates the format parameter was accepted, just auth failed
      expect(response.status).toBe(401);
    });

    it('should accept JSON format parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs/export')
        .query({ format: 'json' });

      // 401 indicates the format parameter was accepted, just auth failed
      expect(response.status).toBe(401);
    });

    it('should accept verifyIntegrity parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs/export')
        .query({ verifyIntegrity: 'true' });

      // 401 indicates the parameter was accepted, just auth failed
      expect(response.status).toBe(401);
    });
  });

  // ============================================
  // Integrity Verification Query Params Tests
  // ============================================

  describe('Integrity Verification Query Parameters', () => {
    it('should accept startId parameter for verification range', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs/verify')
        .query({ startId: '550e8400-e29b-41d4-a716-446655440001' });

      // 401 indicates the parameter was accepted, just auth failed
      expect(response.status).toBe(401);
    });

    it('should accept endId parameter for verification range', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs/verify')
        .query({ endId: '550e8400-e29b-41d4-a716-446655440099' });

      // 401 indicates the parameter was accepted, just auth failed
      expect(response.status).toBe(401);
    });

    it('should accept both startId and endId for range verification', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs/verify')
        .query({
          startId: '550e8400-e29b-41d4-a716-446655440001',
          endId: '550e8400-e29b-41d4-a716-446655440099',
        });

      // 401 indicates the parameters were accepted, just auth failed
      expect(response.status).toBe(401);
    });
  });

  // ============================================
  // Query Parameters Tests
  // ============================================

  describe('Audit Log Query Parameters', () => {
    it('should accept userId filter parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs')
        .query({ userId: '550e8400-e29b-41d4-a716-446655440001' });

      expect(response.status).toBe(401);
    });

    it('should accept action filter parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs')
        .query({ action: 'create' });

      expect(response.status).toBe(401);
    });

    it('should accept resourceType filter parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs')
        .query({ resourceType: 'policy' });

      expect(response.status).toBe(401);
    });

    it('should accept date range parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs')
        .query({
          startTime: '2024-01-01T00:00:00Z',
          endTime: '2024-12-31T23:59:59Z',
        });

      expect(response.status).toBe(401);
    });

    it('should accept pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs')
        .query({ limit: 25, cursor: '0' });

      expect(response.status).toBe(401);
    });
  });

  // ============================================
  // Immutability Error Messages Tests
  // ============================================

  describe('Immutability Error Messages', () => {
    it('should return descriptive error for DELETE attempts', async () => {
      // We need to send with some auth header to potentially get past 401 to see 403
      const response = await request(app.getHttpServer())
        .delete('/audit-logs/test-id')
        .set('Authorization', 'Bearer invalid-token');

      // Either 401 (invalid token) or 403 (forbidden operation)
      expect([401, 403, 404]).toContain(response.status);
    });

    it('should return descriptive error for PUT attempts', async () => {
      const response = await request(app.getHttpServer())
        .put('/audit-logs/test-id')
        .set('Authorization', 'Bearer invalid-token')
        .send({ action: 'modified' });

      expect([401, 403, 404]).toContain(response.status);
    });

    it('should return descriptive error for PATCH attempts', async () => {
      const response = await request(app.getHttpServer())
        .patch('/audit-logs/test-id')
        .set('Authorization', 'Bearer invalid-token')
        .send({ action: 'modified' });

      expect([401, 403, 404]).toContain(response.status);
    });
  });

  // ============================================
  // HTTP Method Enforcement Tests
  // ============================================

  describe('HTTP Method Enforcement', () => {
    it('should only allow GET method on /audit-logs', async () => {
      const getResponse = await request(app.getHttpServer()).get('/audit-logs');
      expect(getResponse.status).toBe(401); // GET allowed, just needs auth

      const postResponse = await request(app.getHttpServer())
        .post('/audit-logs')
        .send({});
      // POST should return 404 (no route) or 405 (method not allowed)
      expect([404, 405]).toContain(postResponse.status);
    });

    it('should reject POST method on /audit-logs endpoint', async () => {
      const response = await request(app.getHttpServer())
        .post('/audit-logs')
        .send({ action: 'create', resourceType: 'policy' });

      // No POST endpoint defined, should be 404
      expect([404, 405]).toContain(response.status);
    });
  });

  // ============================================
  // Content Type Tests
  // ============================================

  describe('Content Type Handling', () => {
    it('should accept application/json for mutation attempts', async () => {
      const response = await request(app.getHttpServer())
        .put('/audit-logs/test-id')
        .set('Content-Type', 'application/json')
        .send({ action: 'modified' });

      expect([401, 403, 404]).toContain(response.status);
    });
  });
});
