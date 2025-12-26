/**
 * SafeDNS - Enterprise DNS Security Platform
 * Policy Evaluation E2E Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Policy Evaluation E2E Tests', () => {
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

  describe('Policy CRUD Operations', () => {
    it('should require authentication for policy list', async () => {
      const response = await request(app.getHttpServer())
        .get('/policies');
      
      expect(response.status).toBe(401);
    });

    it('should require authentication for policy creation', async () => {
      const response = await request(app.getHttpServer())
        .post('/policies')
        .send({
          name: 'Test Policy',
          description: 'Test description',
          enabled: true,
        });
      
      expect(response.status).toBe(401);
    });

    it('should require authentication for policy update', async () => {
      const response = await request(app.getHttpServer())
        .patch('/policies/test-id')
        .send({ name: 'Updated Policy' });
      
      expect(response.status).toBe(401);
    });

    it('should require authentication for policy deletion', async () => {
      const response = await request(app.getHttpServer())
        .delete('/policies/test-id');
      
      expect(response.status).toBe(401);
    });
  });

  describe('Category Management', () => {
    it('should require authentication for category list', async () => {
      const response = await request(app.getHttpServer())
        .get('/policies/categories');
      
      expect([401, 404]).toContain(response.status);
    });
  });

  describe('List Management', () => {
    it('should require authentication for blocklist access', async () => {
      const response = await request(app.getHttpServer())
        .get('/lists');
      
      expect(response.status).toBe(401);
    });

    it('should require authentication for allowlist access', async () => {
      const response = await request(app.getHttpServer())
        .get('/lists?type=allow');
      
      expect(response.status).toBe(401);
    });
  });

  describe('Location-based Policies', () => {
    it('should require authentication for location list', async () => {
      const response = await request(app.getHttpServer())
        .get('/locations');
      
      expect(response.status).toBe(401);
    });

    it('should require authentication for location creation', async () => {
      const response = await request(app.getHttpServer())
        .post('/locations')
        .send({
          name: 'Test Location',
          type: 'network',
          networks: ['192.168.1.0/24'],
        });
      
      expect(response.status).toBe(401);
    });
  });

  describe('Query Logging', () => {
    it('should require authentication for query logs', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/queries');
      
      expect(response.status).toBe(401);
    });

    it('should require authentication for blocked queries', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/blocked');
      
      expect(response.status).toBe(401);
    });
  });

  describe('Block Page Configuration', () => {
    it('should require authentication for block page settings', async () => {
      const response = await request(app.getHttpServer())
        .get('/block-pages');
      
      expect(response.status).toBe(401);
    });
  });
});

