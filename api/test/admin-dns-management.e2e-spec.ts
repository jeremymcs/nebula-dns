/**
 * Admin DNS Management API E2E tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Admin DNS Management API', () => {
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

  const paths = [
    { method: 'get' as const, path: '/admin/dns-management/connection' },
    { method: 'get' as const, path: '/admin/dns-management/zones' },
    { method: 'post' as const, path: '/admin/dns-management/zones/sync' },
  ];

  it.each(paths)('requires auth for $method $path', async ({ method, path }) => {
    const res = await request(app.getHttpServer())[method](path);
    expect(res.status).toBe(401);
  });
});
