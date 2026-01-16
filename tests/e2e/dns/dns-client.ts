/**
 * Nebula DNS - DNS Client Utilities for E2E Testing
 * Provides DNS query construction and response parsing
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import * as dnsPacket from 'dns-packet';
import * as https from 'https';
import * as http from 'http';
import { DNS_QTYPES } from './fixtures/test-domains';

/**
 * Extended packet type that includes rcode which dns-packet includes
 * but isn't in the @types/dns-packet type definitions
 */
interface DecodedPacketWithRcode extends dnsPacket.DecodedPacket {
  rcode?: string;
}

/**
 * Configuration for DNS client
 */
export interface DnsClientConfig {
  // DoH endpoint URL
  dohUrl: string;
  // Bearer token for authentication
  authToken?: string;
  // Request timeout in milliseconds
  timeoutMs?: number;
  // Skip TLS certificate verification (for self-signed certs in dev)
  rejectUnauthorized?: boolean;
}

/**
 * DNS query options
 */
export interface DnsQueryOptions {
  domain: string;
  type?: keyof typeof DNS_QTYPES;
  authToken?: string;
}

/**
 * DNS response structure
 */
export interface DnsResponse {
  // Response code ('NOERROR', 'NXDOMAIN', 'SERVFAIL', etc.)
  rcode: string;
  // Answers section
  answers: DnsAnswer[];
  // Query latency in milliseconds
  latencyMs: number;
  // Raw response buffer
  rawResponse: Buffer;
  // Whether the query was blocked
  isBlocked: boolean;
  // Block reason if detected
  blockReason?: string;
}

/**
 * DNS answer record
 */
export interface DnsAnswer {
  name: string;
  type: string;
  ttl: number;
  data: string | { target?: string };
}

/**
 * Default DNS client configuration
 */
const DEFAULT_CONFIG: Partial<DnsClientConfig> = {
  dohUrl: 'https://localhost:4443/dns-query',
  timeoutMs: 5000,
  rejectUnauthorized: false, // For self-signed certs in development
};

/**
 * DNS Client for E2E testing
 * Sends DNS queries via DoH (DNS over HTTPS) and parses responses
 */
export class DnsClient {
  private config: DnsClientConfig;

  constructor(config: Partial<DnsClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config } as DnsClientConfig;
  }

  /**
   * Send a DNS query and return the response
   */
  async query(options: DnsQueryOptions): Promise<DnsResponse> {
    const startTime = Date.now();

    // Build DNS query packet
    const queryPacket = dnsPacket.encode({
      type: 'query',
      id: Math.floor(Math.random() * 65535),
      flags: dnsPacket.RECURSION_DESIRED,
      questions: [
        {
          type: options.type || 'A',
          name: options.domain,
        },
      ],
    });

    // Convert to base64url for GET request
    const queryBase64 = queryPacket
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Make DoH request
    const response = await this.makeDoHRequest(
      queryBase64,
      options.authToken || this.config.authToken,
    );

    const latencyMs = Date.now() - startTime;

    // Parse response
    const decoded = dnsPacket.decode(response) as DecodedPacketWithRcode;

    // Determine if blocked
    const isBlocked = this.isBlockedResponse(decoded);

    return {
      rcode: decoded.rcode || 'NOERROR',
      answers: (decoded.answers || []).map((answer) => ({
        name: answer.name,
        type: answer.type,
        ttl: 'ttl' in answer ? (answer.ttl || 0) : 0,
        data: (answer as { data?: string | { target?: string } }).data || '',
      })),
      latencyMs,
      rawResponse: response,
      isBlocked,
      blockReason: isBlocked ? this.getBlockReason(decoded) : undefined,
    };
  }

  /**
   * Send multiple DNS queries and measure average latency
   */
  async queryBatch(
    domains: string[],
    options: Partial<DnsQueryOptions> = {},
  ): Promise<{ responses: DnsResponse[]; averageLatencyMs: number }> {
    const responses: DnsResponse[] = [];

    for (const domain of domains) {
      const response = await this.query({ ...options, domain });
      responses.push(response);
    }

    const averageLatencyMs =
      responses.reduce((sum, r) => sum + r.latencyMs, 0) / responses.length;

    return { responses, averageLatencyMs };
  }

  /**
   * Make HTTP request to DoH endpoint
   */
  private makeDoHRequest(
    queryBase64: string,
    authToken?: string,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const url = new URL(this.config.dohUrl);
      url.searchParams.set('dns', queryBase64);

      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const requestOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        headers: {
          Accept: 'application/dns-message',
          'Content-Type': 'application/dns-message',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        rejectUnauthorized: this.config.rejectUnauthorized,
        timeout: this.config.timeoutMs,
      };

      const req = httpModule.request(requestOptions, (res) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk) => chunks.push(chunk));

        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(
              new Error(`DoH request failed with status ${res.statusCode}`),
            );
            return;
          }

          resolve(Buffer.concat(chunks));
        });
      });

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('DoH request timed out'));
      });

      req.end();
    });
  }

  /**
   * Check if response indicates a blocked domain
   */
  private isBlockedResponse(decoded: DecodedPacketWithRcode): boolean {
    // NXDOMAIN indicates blocked
    if (decoded.rcode === 'NXDOMAIN') {
      return true;
    }

    // Check for null route IP (0.0.0.0)
    const answers = decoded.answers || [];
    for (const answer of answers) {
      if (answer.type === 'A') {
        const data = (answer as { data?: string }).data;
        if (data === '0.0.0.0') {
          return true;
        }
      }
      if (answer.type === 'AAAA') {
        const data = (answer as { data?: string }).data;
        if (data === '::') {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get block reason from response
   */
  private getBlockReason(decoded: DecodedPacketWithRcode): string {
    if (decoded.rcode === 'NXDOMAIN') {
      return 'NXDOMAIN';
    }

    const answers = decoded.answers || [];
    for (const answer of answers) {
      if (answer.type === 'A') {
        const data = (answer as { data?: string }).data;
        if (data === '0.0.0.0') {
          return 'NULL_ROUTE';
        }
      }
    }

    return 'UNKNOWN';
  }

  /**
   * Check if response contains a CNAME record pointing to expected target
   */
  hasCnameToTarget(response: DnsResponse, expectedTarget: string): boolean {
    for (const answer of response.answers) {
      if (answer.type === 'CNAME') {
        const target =
          typeof answer.data === 'object' && answer.data?.target
            ? answer.data.target
            : answer.data;
        if (
          typeof target === 'string' &&
          target.toLowerCase().includes(expectedTarget.toLowerCase())
        ) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get A record IP addresses from response
   */
  getARecordIPs(response: DnsResponse): string[] {
    return response.answers
      .filter((a) => a.type === 'A')
      .map((a) => (typeof a.data === 'string' ? a.data : ''));
  }
}

/**
 * Create a DNS client with default test configuration
 */
export function createTestDnsClient(
  authToken?: string,
  config?: Partial<DnsClientConfig>,
): DnsClient {
  return new DnsClient({
    dohUrl:
      process.env.DOH_URL ||
      `https://localhost:${process.env.DOH_PORT || '4443'}/dns-query`,
    authToken,
    rejectUnauthorized: false,
    timeoutMs: 5000,
    ...config,
  });
}
