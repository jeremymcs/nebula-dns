// Flux Shield - Admin Users Controller route order tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  INestApplication,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminInvitationsService } from './admin-invitations.service';
import { AdminActivityService } from './admin-activity.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { AdminRolesGuard } from './guards/admin-roles.guard';
import { AdminMfaGuard } from './guards/admin-mfa.guard';

class MockAdminAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = {
      adminId: 'admin-id',
      email: 'admin@test.local',
      name: 'Admin',
      mfaVerified: true,
      role: 'super_admin',
      jti: 'jti',
    };
    return true;
  }
}

describe('AdminUsersController', () => {
  let app: INestApplication;

  const mockInvitationsService = {
    listInvitations: jest.fn().mockResolvedValue({
      data: [],
      pagination: { cursor: null, hasMore: false, total: 0 },
    }),
  };

  const mockActivityService = {
    query: jest.fn().mockResolvedValue({
      data: [],
      pagination: { cursor: null, hasMore: false, total: 0 },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminUsersController],
      providers: [
        { provide: AdminUsersService, useValue: { listAdmins: jest.fn() } },
        { provide: AdminInvitationsService, useValue: mockInvitationsService },
        { provide: AdminActivityService, useValue: mockActivityService },
      ],
    })
      .overrideGuard(AdminAuthGuard)
      .useClass(MockAdminAuthGuard)
      .overrideGuard(AdminRolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminMfaGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('GET /admin/users/invites resolves (not swallowed by GET :id)', async () => {
    await request(app.getHttpServer()).get('/admin/users/invites').expect(200);

    expect(mockInvitationsService.listInvitations).toHaveBeenCalled();
  });

  it('GET /admin/users/activity resolves (not swallowed by GET :id)', async () => {
    await request(app.getHttpServer()).get('/admin/users/activity').expect(200);

    expect(mockActivityService.query).toHaveBeenCalled();
  });
});
