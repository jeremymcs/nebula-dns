/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Playwright E2E Test Configuration
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import { defineConfig, devices } from '@playwright/test'

const mockApiServer = {
  command: 'node scripts/e2e-mock-api.mjs',
  url: 'http://127.0.0.1:4010/health/healthz',
  reuseExistingServer: !process.env.CI,
  timeout: 30_000,
}

const uiDevServer = {
  command: 'npm run dev',
  url: 'http://localhost:4011',
  reuseExistingServer: !process.env.CI,
  timeout: 120 * 1000,
  env: {
    API_URL: 'http://127.0.0.1:4010',
  },
}

const uiProdServer = {
  command: 'npm run build && npm run start -- -p 4011',
  url: 'http://localhost:4011',
  reuseExistingServer: !process.env.CI,
  timeout: 180 * 1000,
  env: {
    API_URL: 'http://127.0.0.1:4010',
    NEXT_PUBLIC_API_URL: 'http://127.0.0.1:4010',
  },
}

const uiServer =
  process.env.CI && process.env.PLAYWRIGHT_USE_PROD_SERVER === '1'
    ? uiProdServer
    : uiDevServer

export default defineConfig({
  testDir: './e2e',
  testIgnore: process.env.PLAYWRIGHT_FULL_SUITE === '1' ? ['**/edge/**', '**/security/**'] : undefined,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }], ['json', { outputFile: 'test-results/results.json' }], ['github']]
    : [['html']],
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:4011',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: process.env.CI ? [mockApiServer, uiServer] : uiDevServer,
})
