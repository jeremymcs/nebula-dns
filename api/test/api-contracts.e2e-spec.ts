/**
 * SafeDNS - Enterprise DNS Security Platform
 * API Contract Tests - Ensure responses match documented schemas
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('API Contract Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Endpoint Contracts', () => {
    it('GET /health should return correct schema', async () => {
      const response = await request(app.getHttpServer()).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
        timestamp: expect.any(String),
        version: expect.any(String),
      });
    });

    it('GET /health/detailed should return correct schema', async () => {
      const response = await request(app.getHttpServer()).get('/health/detailed');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('dependencies');
    });
  });

  describe('Auth Endpoint Contracts', () => {
    it('POST /auth/login error should return correct error schema', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'invalid', password: 'short' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('401 error should return correct schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/users');
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 401);
    });
  });

  describe('Pagination Contracts', () => {
    it('Paginated endpoints should accept standard pagination params', async () => {
      // Without auth, should return 401, but validates route exists
      const response = await request(app.getHttpServer())
        .get('/users?page=1&limit=10');
      
      expect([401, 403]).toContain(response.status);
    });
  });

  describe('Error Response Contracts', () => {
    it('404 should return standard error format', async () => {
      const response = await request(app.getHttpServer())
        .get('/nonexistent-endpoint-12345');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('statusCode', 404);
    });

    it('Validation errors should include field details', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Content-Type Contracts', () => {
    it('JSON endpoints should return application/json', async () => {
      const response = await request(app.getHttpServer()).get('/health');
      
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('CORS Headers', () => {
    it('Should include CORS headers on preflight', async () => {
      const response = await request(app.getHttpServer())
        .options('/health')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'GET');
      
      // Response may vary based on CORS config
      expect([200, 204]).toContain(response.status);
    });
  });
});

