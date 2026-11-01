/**
 * Smoke-test authenticated dashboard API routes against a migrated DB (demo seed).
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

interface EndpointCheck {
  method: 'get' | 'post';
  path: string;
  label: string;
}

const CHECKS: EndpointCheck[] = [
  { method: 'get', path: '/locations', label: 'locations list' },
  { method: 'get', path: '/policies', label: 'policies list' },
  { method: 'get', path: '/lists', label: 'custom DNS lists' },
  { method: 'get', path: '/users', label: 'users list' },
  { method: 'get', path: '/api-keys', label: 'API keys' },
  { method: 'get', path: '/reports/summary', label: 'reports summary' },
  { method: 'get', path: '/scheduled-reports', label: 'scheduled reports' },
  { method: 'get', path: '/block-pages', label: 'block pages' },
  { method: 'get', path: '/webhooks', label: 'webhooks' },
  { method: 'get', path: '/agents', label: 'agents' },
  {
    method: 'get',
    path: '/groups',
    label: 'user groups (404 if route unregistered)',
  },
  { method: 'get', path: '/invitations', label: 'team invitations' },
  { method: 'get', path: '/onboarding/progress', label: 'onboarding progress' },
  { method: 'get', path: '/playbooks', label: 'playbooks' },
  { method: 'get', path: '/tenants/current', label: 'current tenant' },
];

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();

  const server = app.getHttpServer();
  const login = await request(server)
    .post('/auth/login')
    .send({ email: 'admin@demo.local', password: 'Admin@12345!' });

  if (login.status !== 200 && login.status !== 201) {
    console.error('Login failed:', login.status, login.body);
    process.exit(1);
  }

  const token =
    login.body.accessToken ??
    login.body.access_token ??
    login.body.data?.accessToken;
  if (!token) {
    console.error('No access token in login response');
    process.exit(1);
  }

  const failures: string[] = [];
  for (const check of CHECKS) {
    const res = await request(server)
      [check.method](check.path)
      .set('Authorization', `Bearer ${token}`);
    if (res.status >= 500) {
      failures.push(`${check.label} (${check.path}): HTTP ${res.status}`);
    } else {
      console.log(
        `OK ${check.method.toUpperCase()} ${check.path} -> ${res.status}`,
      );
    }
  }

  await app.close();

  if (failures.length > 0) {
    console.error('\nSmoke test failures:');
    for (const f of failures) {
      console.error(`- ${f}`);
    }
    process.exit(1);
  }

  console.log(`\nAll ${CHECKS.length} smoke checks passed (no 5xx).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
