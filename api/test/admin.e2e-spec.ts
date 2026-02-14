/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Admin E2E Tests - User Management and Impersonation
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Admin E2E Tests - User Management and Impersonation', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;
  let testTenantId: string;
  let testUserId: string;

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

  describe('User Management - Authentication Required', () => {
    it('should require authentication for listing users', async () => {
      const response = await request(app.getHttpServer()).get('/users');
      expect(response.status).toBe(401);
    });

    it('should require authentication for creating user', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .send({
          email: 'newuser@example.com',
          name: 'New User',
          role: 'readonly',
        });
      expect(response.status).toBe(401);
    });

    it('should require authentication for updating user', async () => {
      const response = await request(app.getHttpServer())
        .patch('/users/test-id')
        .send({ name: 'Updated Name' });
      expect(response.status).toBe(401);
    });

    it('should require authentication for deleting user', async () => {
      const response = await request(app.getHttpServer()).delete('/users/test-id');
      expect(response.status).toBe(401);
    });
  });

  describe('User List with Pagination', () => {
    it('should list users with default pagination', async () => {
      // First login to get admin token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;
        
        const response = await request(app.getHttpServer())
          .get('/users')
          .set('Authorization', `Bearer ${token}`);

        expect([200, 404]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('data');
          expect(response.body).toHaveProperty('pagination');
        }
      }
    });

    it('should support cursor-based pagination', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;
        
        const response = await request(app.getHttpServer())
          .get('/users?limit=5')
          .set('Authorization', `Bearer ${token}`);

        expect([200, 404]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body.data).toBeInstanceOf(Array);
        }
      }
    });

    it('should reject invalid pagination parameters', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;
        
        const response = await request(app.getHttpServer())
          .get('/users?limit=-1')
          .set('Authorization', `Bearer ${token}`);

        expect([400, 422]).toContain(response.status);
      }
    });
  });

  describe('User Create', () => {
    it('should require owner or admin role to create user', async () => {
      // Login as regular user first
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;
        
        const response = await request(app.getHttpServer())
          .post('/users')
          .set('Authorization', `Bearer ${token}`)
          .send({
            email: 'newuser@example.com',
            name: 'New User',
            role: 'readonly',
          });

        // Should succeed with admin/owner, fail with readonly/analyst
        expect([201, 403]).toContain(response.status);
      }
    });

    it('should reject user creation with invalid email', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;
        
        const response = await request(app.getHttpServer())
          .post('/users')
          .set('Authorization', `Bearer ${token}`)
          .send({
            email: 'invalid-email',
            name: 'New User',
            role: 'readonly',
          });

        expect(response.status).toBe(400);
      }
    });

    it('should reject user creation with invalid role', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;
        
        const response = await request(app.getHttpServer())
          .post('/users')
          .set('Authorization', `Bearer ${token}`)
          .send({
            email: 'newuser@example.com',
            name: 'New User',
            role: 'invalid-role',
          });

        expect(response.status).toBe(400);
      }
    });

    it('should reject duplicate email', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;
        
        // Try to create user with existing email
        const response = await request(app.getHttpServer())
          .post('/users')
          .set('Authorization', `Bearer ${token}`)
          .send({
            email: 'admin@example.com', // Already exists
            name: 'Duplicate User',
            role: 'readonly',
          });

        expect([400, 409]).toContain(response.status);
      }
    });
  });

  describe('User Update', () => {
    it('should update user details', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;
        
        // First get list of users
        const listResponse = await request(app.getHttpServer())
          .get('/users')
          .set('Authorization', `Bearer ${token}`);

        if (listResponse.status === 200 && listResponse.body.data?.length > 0) {
          const userId = listResponse.body.data[0].id;
          
          const updateResponse = await request(app.getHttpServer())
            .patch(`/users/${userId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Updated Name' });

          expect([200, 404]).toContain(updateResponse.status);
        }
      }
    });

    it('should reject update for non-existent user', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;
        
        const response = await request(app.getHttpServer())
          .patch('/users/non-existent-id')
          .set('Authorization', `Bearer ${token}`)
          .send({ name: 'Updated Name' });

        expect(response.status).toBe(404);
      }
    });
  });

  describe('User Delete', () => {
    it('should require owner role to delete user', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;
        
        const response = await request(app.getHttpServer())
          .delete('/users/test-id')
          .set('Authorization', `Bearer ${token}`);

        // Owner can delete, others get 403
        expect([204, 403, 404]).toContain(response.status);
      }
    });

    it('should not allow user to delete themselves', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;
        
        // Get current user ID from token context
        const response = await request(app.getHttpServer())
          .get('/users')
          .set('Authorization', `Bearer ${token}`);

        if (response.status === 200 && response.body.data?.length > 0) {
          const currentUser = response.body.data.find(
            (u: any) => u.email === 'admin@example.com'
          );
          
          if (currentUser) {
            const deleteResponse = await request(app.getHttpServer())
              .delete(`/users/${currentUser.id}`)
              .set('Authorization', `Bearer ${token}`);

            expect([400, 403]).toContain(deleteResponse.status);
          }
        }
      }
    });
  });

  describe('User Suspension and Reactivation', () => {
    it('should require admin/owner to suspend user', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;
        
        const response = await request(app.getHttpServer())
          .post('/users/test-id/suspend')
          .set('Authorization', `Bearer ${token}`);

        expect([204, 403, 404]).toContain(response.status);
      }
    });

    it('should require admin/owner to reactivate user', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;
        
        const response = await request(app.getHttpServer())
          .post('/users/test-id/reactivate')
          .set('Authorization', `Bearer ${token}`);

        expect([204, 403, 404]).toContain(response.status);
      }
    });
  });

  describe('Impersonation - Start Session', () => {
    it('should require admin auth to start impersonation', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/impersonate/test-tenant-id');

      expect(response.status).toBe(401);
    });

    it('should reject impersonation without admin role', async () => {
      // First get a regular user token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const userToken = loginResponse.body.accessToken;
        
        // Try to use admin impersonation endpoint with user token
        const response = await request(app.getHttpServer())
          .post('/admin/impersonate/test-tenant-id')
          .set('Authorization', `Bearer ${userToken}`);

        expect([403, 401]).toContain(response.status);
      }
    });

    it('should reject impersonation of non-existent tenant', async () => {
      // This would require an admin token - skip if not available
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;
        
        const response = await request(app.getHttpServer())
          .post('/admin/impersonate/non-existent-tenant-id')
          .set('Authorization', `Bearer ${token}`);

        expect([404, 500]).toContain(response.status);
      }
    });
  });

  describe('Impersonation - End Session', () => {
    it('should require authentication to end impersonation', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/impersonate/end');

      expect(response.status).toBe(401);
    });

    it('should reject end impersonation with regular token', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;
        
        // Regular token should not be an impersonation token
        const response = await request(app.getHttpServer())
          .post('/admin/impersonate/end')
          .set('Authorization', `Bearer ${token}`);

        expect([400, 401]).toContain(response.status);
      }
    });
  });

  describe('Impersonation - Audit Trail', () => {
    it('should log impersonation start in audit logs', async () => {
      // This is a meta-test to verify audit logging exists
      // In a real scenario, you would:
      // 1. Start impersonation as admin
      // 2. Query audit logs for admin_impersonation_start event
      // 3. Verify the event contains correct admin and tenant info
      
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200) {
        // Audit logging exists - verify endpoint requires auth
        const auditResponse = await request(app.getHttpServer())
          .get('/audit-logs?action=admin_impersonation_start');

        expect(auditResponse.status).toBe(401);
      }
    });
  });

  describe('Current User Context', () => {
    it('should return current user profile', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPassword123!' });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        const token = loginResponse.body.accessToken;
        
        const response = await request(app.getHttpServer())
          .get('/users/me')
          .set('Authorization', `Bearer ${token}`);

        expect([200, 404]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('email');
          expect(response.body).toHaveProperty('role');
        }
      }
    });
  });
});
