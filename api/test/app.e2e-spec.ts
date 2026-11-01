/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Application E2E Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
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

  describe('Health Check', () => {
    it('/health (GET) - should return OK', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res: any) => {
          expect(['healthy', 'degraded']).toContain(res.body.status);
        });
    });

    it('/health/detailed (GET) - should return detailed status', () => {
      return request(app.getHttpServer())
        .get('/health/detailed')
        .expect(200)
        .expect((res: any) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('timestamp');
        });
    });
  });

  describe('Authentication', () => {
    it('/auth/login (POST) - should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('/auth/login (POST) - should reject malformed request', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'not-an-email',
        })
        .expect(400);
    });
  });

  describe('Protected Routes', () => {
    it('/policies (GET) - should require authentication', () => {
      return request(app.getHttpServer()).get('/policies').expect(401);
    });

    it('/users (GET) - should require authentication', () => {
      return request(app.getHttpServer()).get('/users').expect(401);
    });

    it('/locations (GET) - should require authentication', () => {
      return request(app.getHttpServer()).get('/locations').expect(401);
    });
  });

  describe('API Documentation', () => {
    // Swagger is configured in main.ts bootstrap, not in the test module
    // This test would require a full application bootstrap
    it.skip('/api/docs (GET) - should return Swagger docs', () => {
      return request(app.getHttpServer()).get('/api/docs').expect(200);
    });
  });
});
