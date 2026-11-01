/**
 * Supertest helper for API E2E tests.
 * Uses a unique client IP per HTTP verb so strict login rate limits do not flake.
 */

import * as supertestModule from 'supertest';

type SupertestFn = (app: Parameters<typeof supertestModule>[0]) => supertestModule.Test;

const supertest: SupertestFn =
  (supertestModule as unknown as { default?: SupertestFn }).default ??
  (supertestModule as unknown as SupertestFn);

let ipCounter = 0;

function clientIp(): string {
  ipCounter += 1;
  const octet = (ipCounter % 200) + 1;
  return `203.0.113.${octet}`;
}

function withIp(
  server: Parameters<SupertestFn>[0],
  method: 'get' | 'post' | 'patch' | 'put' | 'delete' | 'options',
  url: string,
) {
  const agent = supertest(server);
  return agent[method](url).set('X-Forwarded-For', clientIp());
}

/** Per-request supertest client with a unique X-Forwarded-For IP. */
export function e2eRequest(server: Parameters<SupertestFn>[0]) {
  return {
    get: (url: string) => withIp(server, 'get', url),
    post: (url: string) => withIp(server, 'post', url),
    patch: (url: string) => withIp(server, 'patch', url),
    put: (url: string) => withIp(server, 'put', url),
    delete: (url: string) => withIp(server, 'delete', url),
    options: (url: string) => withIp(server, 'options', url),
  };
}
