/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Authentication E2E Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Authentication E2E Tests', () => {
  let app: INestApplication;
  let authToken: string;
  let refreshToken: string;

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

  describe('Login Flow', () => {
    it('should reject login with missing email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ password: 'password123' });

      expect(response.status).toBe(400);
    });

    it('should reject login with missing password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
    });

    it('should reject login with invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'not-an-email', password: 'password123' });

      expect(response.status).toBe(400);
    });

    it('should reject login with non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password123' });

      expect(response.status).toBe(401);
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'wrongpassword' });

      expect(response.status).toBe(401);
    });
  });

  describe('Token Refresh Flow', () => {
    it('should reject refresh with missing token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
    });
  });

  describe('Logout Flow', () => {
    it('should reject logout without auth token', async () => {
      const response = await request(app.getHttpServer()).post('/auth/logout');

      expect(response.status).toBe(401);
    });
  });

  describe('Password Reset Flow', () => {
    it('should accept password reset request for any email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' });

      // Should return 200 even for non-existent emails (security)
      expect([200, 201, 202]).toContain(response.status);
    });

    it('should reject password reset with missing email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should reject password reset confirmation with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'invalid-token', password: 'newpassword123' });

      expect([400, 401]).toContain(response.status);
    });
  });

  describe('MFA Flow', () => {
    it('should reject MFA verification without session', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/mfa/verify')
        .send({ code: '123456' });

      expect(response.status).toBe(401);
    });

    it('should reject MFA setup without auth', async () => {
      const response = await request(app.getHttpServer()).post(
        '/auth/mfa/setup',
      );

      expect(response.status).toBe(401);
    });
  });
});
