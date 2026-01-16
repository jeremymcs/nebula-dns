/**
 * Nebula DNS - E2E Test Helper Functions
 * Utilities for test setup, teardown, and common operations
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as http from 'http';
import { TEST_THRESHOLDS } from './fixtures/test-domains';

const execAsync = promisify(exec);

/**
 * Environment configuration for E2E tests
 */
export interface TestEnvironment {
  // API endpoint
  apiUrl: string;
  // DoH endpoint
  dohUrl: string;
  // Policy service endpoint
  policySvcUrl: string;
  // ClickHouse HTTP endpoint
  clickhouseUrl: string;
  // Redis connection string
  redisUrl: string;
}

/**
 * Default test environment using Docker Compose ports
 */
export const TEST_ENVIRONMENT: TestEnvironment = {
  apiUrl: process.env.API_URL || 'http://localhost:4010',
  dohUrl: process.env.DOH_URL || 'https://localhost:4443/dns-query',
  policySvcUrl: process.env.POLICY_SVC_URL || 'http://localhost:4080',
  clickhouseUrl: process.env.CLICKHOUSE_URL || 'http://localhost:4123',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:4379',
};

/**
 * API client for test setup
 */
export class TestApiClient {
  private baseUrl: string;
  private authToken?: string;

  constructor(baseUrl: string = TEST_ENVIRONMENT.apiUrl) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make HTTP request to API
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ status: number; data: T }> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);

      const options = {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(this.authToken
            ? { Authorization: `Bearer ${this.authToken}` }
            : {}),
        },
      };

      const req = http.request(options, (res) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const data = Buffer.concat(chunks).toString();
          try {
            resolve({
              status: res.statusCode || 500,
              data: data ? JSON.parse(data) : ({} as T),
            });
          } catch {
            resolve({
              status: res.statusCode || 500,
              data: data as unknown as T,
            });
          }
        });
      });

      req.on('error', reject);

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Login and get auth token
   */
  async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await this.request<{
      accessToken: string;
      refreshToken: string;
    }>('POST', '/auth/login', { email, password });

    if (response.status === 200 || response.status === 201) {
      this.authToken = response.data.accessToken;
      return response.data;
    }

    throw new Error(`Login failed: ${response.status}`);
  }

  /**
   * Create a test tenant
   */
  async createTenant(
    data: Partial<{ name: string; email: string }>,
  ): Promise<{ id: string }> {
    const response = await this.request<{ id: string }>(
      'POST',
      '/tenants',
      data,
    );
    return response.data;
  }

  /**
   * Create a test location
   */
  async createLocation(
    data: Partial<{ name: string; type: string; networks: string[] }>,
  ): Promise<{ id: string }> {
    const response = await this.request<{ id: string }>(
      'POST',
      '/locations',
      data,
    );
    return response.data;
  }

  /**
   * Create a test policy
   */
  async createPolicy(
    data: Partial<{
      name: string;
      description: string;
      enabled: boolean;
      locationId: string;
    }>,
  ): Promise<{ id: string }> {
    const response = await this.request<{ id: string }>(
      'POST',
      '/policies',
      data,
    );
    return response.data;
  }

  /**
   * Create a blocklist
   */
  async createList(
    data: Partial<{
      name: string;
      type: 'block' | 'allow';
      domains: string[];
    }>,
  ): Promise<{ id: string }> {
    const response = await this.request<{ id: string }>('POST', '/lists', data);
    return response.data;
  }

  /**
   * Update policy to use a list
   */
  async attachListToPolicy(
    policyId: string,
    listId: string,
  ): Promise<{ success: boolean }> {
    const response = await this.request<{ success: boolean }>(
      'PATCH',
      `/policies/${policyId}`,
      {
        listIds: [listId],
      },
    );
    return response.data;
  }

  /**
   * Delete a policy
   */
  async deletePolicy(policyId: string): Promise<void> {
    await this.request('DELETE', `/policies/${policyId}`);
  }

  /**
   * Delete a list
   */
  async deleteList(listId: string): Promise<void> {
    await this.request('DELETE', `/lists/${listId}`);
  }

  /**
   * Get a DNS token for a location
   */
  async getDnsToken(locationId: string): Promise<{ token: string }> {
    const response = await this.request<{ token: string }>(
      'POST',
      `/locations/${locationId}/token`,
    );
    return response.data;
  }
}

/**
 * Policy Service client for direct testing
 */
export class PolicyServiceClient {
  private baseUrl: string;

  constructor(baseUrl: string = TEST_ENVIRONMENT.policySvcUrl) {
    this.baseUrl = baseUrl;
  }

  /**
   * Check policy service health
   */
  async health(): Promise<{ status: string }> {
    return new Promise((resolve, reject) => {
      const url = new URL('/health', this.baseUrl);

      http
        .get(url.toString(), (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            const data = Buffer.concat(chunks).toString();
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve({ status: data });
            }
          });
        })
        .on('error', reject);
    });
  }

  /**
   * Evaluate a policy directly
   */
  async evaluate(request: {
    tenant_id: string;
    location_id: string;
    qname: string;
    qtype?: number;
    client_ip?: string;
  }): Promise<{
    decision: string;
    reason: string;
    category?: string;
  }> {
    return new Promise((resolve, reject) => {
      const url = new URL('/evaluate', this.baseUrl);
      const body = JSON.stringify(request);

      const req = http.request(
        url.toString(),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            const data = Buffer.concat(chunks).toString();
            try {
              resolve(JSON.parse(data));
            } catch {
              reject(new Error(`Invalid response: ${data}`));
            }
          });
        },
      );

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}

/**
 * ClickHouse client for log validation
 */
export class ClickHouseTestClient {
  private baseUrl: string;
  private username: string;
  private password: string;

  constructor(
    baseUrl: string = TEST_ENVIRONMENT.clickhouseUrl,
    username: string = 'nebula',
    password: string = 'nebula',
  ) {
    this.baseUrl = baseUrl;
    this.username = username;
    this.password = password;
  }

  /**
   * Execute a query and return results
   */
  async query<T>(sql: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const url = new URL('/', this.baseUrl);
      url.searchParams.set('query', sql + ' FORMAT JSON');

      const auth = Buffer.from(`${this.username}:${this.password}`).toString(
        'base64',
      );

      http
        .get(
          url.toString(),
          {
            headers: {
              Authorization: `Basic ${auth}`,
            },
          },
          (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
              const data = Buffer.concat(chunks).toString();
              try {
                const parsed = JSON.parse(data);
                resolve(parsed.data || []);
              } catch {
                reject(new Error(`Invalid ClickHouse response: ${data}`));
              }
            });
          },
        )
        .on('error', reject);
    });
  }

  /**
   * Query DNS logs for a specific domain and tenant
   */
  async getDnsLogs(
    tenantId: string,
    domain?: string,
    limit: number = 100,
  ): Promise<
    {
      tenant_id: string;
      location_id: string;
      qname: string;
      action: string;
      reason: string;
      category: string;
      timestamp: string;
    }[]
  > {
    let sql = `SELECT * FROM nebula_dns.dns_queries WHERE tenant_id = '${tenantId}'`;

    if (domain) {
      sql += ` AND qname LIKE '%${domain}%'`;
    }

    sql += ` ORDER BY timestamp DESC LIMIT ${limit}`;

    return this.query(sql);
  }
}

/**
 * Docker utility functions for fail-open testing
 */
export const DockerUtils = {
  /**
   * Stop a Docker container
   */
  async stopContainer(containerName: string): Promise<void> {
    await execAsync(`docker stop ${containerName}`);
  },

  /**
   * Start a Docker container
   */
  async startContainer(containerName: string): Promise<void> {
    await execAsync(`docker start ${containerName}`);
  },

  /**
   * Restart a Docker container
   */
  async restartContainer(containerName: string): Promise<void> {
    await execAsync(`docker restart ${containerName}`);
  },

  /**
   * Check if a container is running
   */
  async isContainerRunning(containerName: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        `docker inspect -f '{{.State.Running}}' ${containerName}`,
      );
      return stdout.trim() === 'true';
    } catch {
      return false;
    }
  },

  /**
   * Wait for a container to be healthy
   */
  async waitForHealthy(
    containerName: string,
    timeoutMs: number = TEST_THRESHOLDS.containerRestartTimeoutMs,
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const { stdout } = await execAsync(
          `docker inspect -f '{{.State.Health.Status}}' ${containerName}`,
        );
        if (stdout.trim() === 'healthy') {
          return true;
        }
      } catch {
        // Container might not have health check
        const running = await this.isContainerRunning(containerName);
        if (running) {
          // Give it a moment to initialize
          await sleep(1000);
          return true;
        }
      }

      await sleep(500);
    }

    return false;
  },
};

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for policy sync to propagate
 */
export async function waitForPolicySync(
  timeoutMs: number = TEST_THRESHOLDS.policySyncTimeoutMs,
): Promise<void> {
  // Wait for policy to sync from PostgreSQL -> Redis -> Policy Service
  // This is a simple delay-based approach; in production you might poll an endpoint
  await sleep(Math.min(timeoutMs, 2000));
}

/**
 * Retry a function until it succeeds or times out
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxAttempts) {
        await sleep(delayMs);
      }
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Check if Docker services are available
 */
export async function checkDockerServices(): Promise<{
  api: boolean;
  policySvc: boolean;
  dnsdist: boolean;
  clickhouse: boolean;
}> {
  const results = {
    api: false,
    policySvc: false,
    dnsdist: false,
    clickhouse: false,
  };

  // Check API
  try {
    const response = await fetch(`${TEST_ENVIRONMENT.apiUrl}/health`);
    results.api = response.ok;
  } catch {
    results.api = false;
  }

  // Check Policy Service
  try {
    const policySvc = new PolicyServiceClient();
    await policySvc.health();
    results.policySvc = true;
  } catch {
    results.policySvc = false;
  }

  // Check ClickHouse
  try {
    const response = await fetch(`${TEST_ENVIRONMENT.clickhouseUrl}/ping`);
    results.clickhouse = response.ok;
  } catch {
    results.clickhouse = false;
  }

  // Check dnsdist (via DoH endpoint)
  // This is implicit in DNS query tests

  return results;
}
