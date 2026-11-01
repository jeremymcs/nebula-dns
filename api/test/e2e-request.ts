/**
 * Supertest helper for API E2E tests.
 * Uses a unique client IP per call so strict login rate limits do not flake across suites.
 */

import * as request from 'supertest';

let ipCounter = 0;

export function e2eRequest(server: Parameters<typeof request>[0]) {
  ipCounter += 1;
  const octet = (ipCounter % 200) + 1;
  return request(server).set('X-Forwarded-For', `203.0.113.${octet}`);
}
