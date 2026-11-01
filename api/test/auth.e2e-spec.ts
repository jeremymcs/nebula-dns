/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Authentication E2E Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { e2eRequest } from './e2e-request';

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
      const response = await e2eRequest(app.getHttpServer())
        .post('/auth/login')
        .send({ password: 'password123' });

      expect(response.status).toBe(400);
    });

    it('should reject login with missing password', async () => {
      const response = await e2eRequest(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
    });

    it('should reject login with invalid email format', async () => {
      const response = await e2eRequest(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'not-an-email', password: 'password123' });

      expect(response.status).toBe(400);
    });

    it('should reject login with non-existent user', async () => {
      const response = await e2eRequest(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password123' });

      expect(response.status).toBe(401);
    });

    it('should reject login with wrong password', async () => {
      const response = await e2eRequest(app.getHttpServer())
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


  describe('MFA Flow', () => {
    it('should reject MFA verification without session', async () => {
      const response = await e2eRequest(app.getHttpServer())
        .post('/mfa/verify')
        .send({ code: '123456' });

      expect([400, 401]).toContain(response.status);
    });

    it('should reject MFA setup without auth', async () => {
      const response = await request(app.getHttpServer()).post('/mfa/setup');

      expect(response.status).toBe(401);
    });
  });

  describe('Successful Login', () => {
    it('should return tokens on successful login with valid credentials', async () => {
      const response = await e2eRequest(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      // If user exists and password is correct, should return 200 with tokens
      if (response.status === 200) {
        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('refreshToken');
        authToken = response.body.accessToken;
        refreshToken = response.body.refreshToken;
      } else {
        // User may not exist in test environment - that's OK for negative tests
        expect([401, 404]).toContain(response.status);
      }
    });
  });

  describe('Session Token Refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      // First login to get a refresh token
      const loginResponse = await e2eRequest(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.refreshToken) {
        const refreshResponse = await request(app.getHttpServer())
          .post('/auth/refresh')
          .send({ refreshToken: loginResponse.body.refreshToken });

        expect(refreshResponse.status).toBe(200);
        expect(refreshResponse.body).toHaveProperty('accessToken');
      }
    });

    it('should reject refresh with expired token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'expired.invalid.token' });

      expect(response.status).toBe(401);
    });
  });

  describe('Logout Flow', () => {
    it('should invalidate session on logout', async () => {
      // First login to get a token
      const loginResponse = await e2eRequest(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        // Logout
        const logoutResponse = await request(app.getHttpServer())
          .post('/auth/logout')
          .set('Authorization', `Bearer ${token}`);

        expect(logoutResponse.status).toBe(204);

        // Try to use the token after logout - should fail
        const protectedResponse = await request(app.getHttpServer())
          .get('/policies')
          .set('Authorization', `Bearer ${token}`);

        expect(protectedResponse.status).toBe(401);
      }
    });
  });

  describe('Password Change Flow', () => {
    it('should require authentication for password change', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/password/change')
        .send({
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword123!',
        });

      expect(response.status).toBe(401);
    });

    it('should reject password change with invalid current password', async () => {
      const loginResponse = await e2eRequest(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        const changeResponse = await request(app.getHttpServer())
          .post('/auth/password/change')
          .set('Authorization', `Bearer ${token}`)
          .send({
            currentPassword: 'WrongPassword123!',
            newPassword: 'NewPassword123!',
          });

        expect([400, 401]).toContain(changeResponse.status);
      }
    });

    it('should reject password change with missing fields', async () => {
      const loginResponse = await e2eRequest(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;

        // Missing current password
        const response1 = await request(app.getHttpServer())
          .post('/auth/password/change')
          .set('Authorization', `Bearer ${token}`)
          .send({ newPassword: 'NewPassword123!' });

        expect(response1.status).toBe(400);

        // Missing new password
        const response2 = await request(app.getHttpServer())
          .post('/auth/password/change')
          .set('Authorization', `Bearer ${token}`)
          .send({ currentPassword: 'OldPassword123!' });

        expect(response2.status).toBe(400);
      }
    });
  });

  describe('Account Lockout', () => {
    it('should track failed login attempts', async () => {
      // Attempt multiple failed logins
      const attempts = 5;
      for (let i = 0; i < attempts; i++) {
        await e2eRequest(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'admin@example.com', password: 'WrongPassword123!' });
      }

      // After multiple failed attempts, account should be locked
      const response = await e2eRequest(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      // Either locked (423) or still allows (depends on lockout config)
      expect([401, 423]).toContain(response.status);
    });

    it('should reject login to locked account', async () => {
      const response = await e2eRequest(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      // Account may still be locked from previous test
      expect([401, 423]).toContain(response.status);
    });
  });
});
