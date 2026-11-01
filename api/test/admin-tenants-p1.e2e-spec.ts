/**
 * Flux Shield - Admin tenant management E2E tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Admin Tenants API (auth)', () => {
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

  const tenantPaths = [
    '/admin/tenants',
    '/admin/tenants/11111111-1111-1111-1111-111111111111',
    '/admin/tenants/11111111-1111-1111-1111-111111111111/suspend',
    '/admin/msp/tenants/11111111-1111-1111-1111-111111111111/usage-timeseries',
  ];

  it.each(tenantPaths)('requires auth for %s', async (path) => {
    const method = path.includes('suspend') ? 'post' : 'get';
    const res = await request(app.getHttpServer())[method](path);
    expect(res.status).toBe(401);
  });
});

describe('Admin Platform Audit API (auth)', () => {
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

  it('requires auth for audit logs', async () => {
    const res = await request(app.getHttpServer()).get('/admin/audit/logs');
    expect(res.status).toBe(401);
  });

  it('requires auth for certificate expiry', async () => {
    const res = await request(app.getHttpServer()).get(
      '/admin/system/certificates',
    );
    expect(res.status).toBe(401);
  });
});
