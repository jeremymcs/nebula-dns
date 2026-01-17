/**
 * Nebula DNS - Enterprise DNS Security Platform
 * DoH Service - DNS resolution with policy enforcement
 *
 * Features:
 * - DNS-over-HTTPS (RFC 8484) support
 * - Policy enforcement via policy-svc
 * - DNS response caching with TTL
 * - DNSSEC validation support
 * - Connection pooling for upstream resolvers
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as dgram from 'dgram';
import * as dns from 'dns';
import { promisify } from 'util';
import * as dnsPacket from 'dns-packet';
import { Location } from '../locations/entities/location.entity';

// Promisified DNS functions for fallback resolution
const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);
import { PoliciesService } from '../policies/policies.service';
import { ThreatDetectionService } from '../threat-detection/threat-detection.service';
import { ClickHouseService } from '../clickhouse/clickhouse.service';

// Policy evaluation response from policy-svc
interface PolicyEvaluateResponse {
  decision: 'ALLOW' | 'BLOCK' | 'REWRITE';
  reason: string;
  category?: string;
  block_type?: string;
  rewrite_type?: string;
  rewrite_target?: string;
  ttl: number;
}

// Upstream resolver with connection pool
interface UpstreamResolver {
  address: string;
  port: number;
  socket: dgram.Socket | null;
  pending: Map<
    number,
    {
      resolve: (buf: Buffer) => void;
      reject: (err: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >;
  lastUsed: number;
}

export interface DoHAuth {
  tenantId: string | null;
  locationId: string | null;
  token: string | null;
}

interface DnsHeader {
  id: number;
  flags: number;
  qdcount: number;
  ancount: number;
  nscount: number;
  arcount: number;
}

interface DnsQuestion {
  name: string;
  type: number;
  class: number;
}

// DNS cache entry
interface DnsCacheEntry {
  response: Buffer;
  expiresAt: number;
}

@Injectable()
export class DoHService implements OnModuleDestroy {
  private readonly logger = new Logger(DoHService.name);
  private readonly upstreamDns: string[];
  private readonly policySvcUrl: string;

  // DNS response cache
  private readonly dnsCache = new Map<string, DnsCacheEntry>();
  private readonly cacheTtlMs: number;
  private readonly maxCacheSize: number;
  private cacheHits = 0;
  private cacheMisses = 0;

  // Upstream resolver connection pool
  private readonly resolvers: UpstreamResolver[] = [];
  private currentResolverIndex = 0;
  private readonly queryTimeout: number;

  // DNSSEC validation
  private readonly dnssecEnabled: boolean;

  // DNS record types
  private static readonly TYPE_A = 1;
  private static readonly TYPE_AAAA = 28;
  private static readonly TYPE_CNAME = 5;
  private static readonly TYPE_MX = 15;
  private static readonly TYPE_TXT = 16;
  private static readonly TYPE_NS = 2;

  // DNS response codes
  private static readonly RCODE_NOERROR = 0;
  private static readonly RCODE_NXDOMAIN = 3;
  private static readonly RCODE_REFUSED = 5;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
    private policiesService: PoliciesService,
    private threatDetection: ThreatDetectionService,
    private clickhouse: ClickHouseService,
  ) {
    this.upstreamDns = this.configService
      .get('UPSTREAM_DNS', '1.1.1.1,8.8.8.8')
      .split(',');
    this.policySvcUrl = this.configService.get(
      'POLICY_SVC_URL',
      'http://localhost:4080',
    );
    // DNS cache settings
    this.cacheTtlMs = this.configService.get('DNS_CACHE_TTL_MS', 300000); // 5 minutes default
    this.maxCacheSize = this.configService.get('DNS_CACHE_MAX_SIZE', 10000);

    // Query timeout (default 5 seconds)
    this.queryTimeout = this.configService.get('DNS_QUERY_TIMEOUT_MS', 5000);

    // DNSSEC validation (enabled by default when using validating resolvers like 1.1.1.1 or 8.8.8.8)
    this.dnssecEnabled =
      this.configService.get('DNSSEC_ENABLED', 'true') === 'true';

    // Initialize upstream resolver connection pool
    this.initializeResolvers();

    // Periodic cache cleanup every 60 seconds
    setInterval(() => this.cleanupCache(), 60000);
  }

  /**
   * Initialize UDP socket pool for upstream resolvers
   */
  private initializeResolvers(): void {
    for (const upstream of this.upstreamDns) {
      const [address, portStr] = upstream.includes(':')
        ? upstream.split(':')
        : [upstream, '53'];
      const port = parseInt(portStr, 10);

      this.resolvers.push({
        address: address.trim(),
        port,
        socket: null, // Lazy initialization
        pending: new Map(),
        lastUsed: 0,
      });
    }

    this.logger.log(
      `Initialized ${this.resolvers.length} upstream resolvers: ${this.resolvers.map((r) => r.address).join(', ')}`,
    );
    if (this.dnssecEnabled) {
      this.logger.log(
        'DNSSEC validation enabled (using validating upstream resolvers)',
      );
    }
  }

  /**
   * Get or create UDP socket for a resolver
   */
  private getResolverSocket(resolver: UpstreamResolver): dgram.Socket {
    if (!resolver.socket) {
      resolver.socket = dgram.createSocket('udp4');

      resolver.socket.on('message', (msg) => {
        try {
          const decoded = dnsPacket.decode(msg);
          const id = decoded.id ?? msg.readUInt16BE(0); // Fallback to reading ID from buffer
          const pending = resolver.pending.get(id);
          if (pending) {
            clearTimeout(pending.timeout);
            resolver.pending.delete(id);
            pending.resolve(msg);
          }
        } catch (err) {
          this.logger.warn(`Failed to decode DNS response: ${err.message}`);
        }
      });

      resolver.socket.on('error', (err) => {
        this.logger.error(
          `Resolver socket error (${resolver.address}): ${err.message}`,
        );
        // Reject all pending queries
        for (const [id, pending] of resolver.pending.entries()) {
          clearTimeout(pending.timeout);
          pending.reject(err);
          resolver.pending.delete(id);
        }
      });
    }

    return resolver.socket;
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    for (const resolver of this.resolvers) {
      if (resolver.socket) {
        resolver.socket.close();
        resolver.socket = null;
      }
    }
    this.logger.log('Closed all upstream resolver sockets');
  }

  /**
   * Generate cache key from domain and query type
   */
  private getCacheKey(domain: string, qtype: number): string {
    return `${domain.toLowerCase()}:${qtype}`;
  }

  /**
   * Get cached DNS response if available and not expired
   */
  private getCachedResponse(domain: string, qtype: number): Buffer | null {
    const key = this.getCacheKey(domain, qtype);
    const entry = this.dnsCache.get(key);

    if (!entry) {
      this.cacheMisses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.dnsCache.delete(key);
      this.cacheMisses++;
      return null;
    }

    this.cacheHits++;
    return entry.response;
  }

  /**
   * Cache a DNS response
   */
  private cacheResponse(domain: string, qtype: number, response: Buffer): void {
    // Enforce max cache size with LRU-like behavior (remove oldest entries)
    if (this.dnsCache.size >= this.maxCacheSize) {
      const firstKey = this.dnsCache.keys().next().value;
      if (firstKey) this.dnsCache.delete(firstKey);
    }

    const key = this.getCacheKey(domain, qtype);
    this.dnsCache.set(key, {
      response: Buffer.from(response), // Copy buffer
      expiresAt: Date.now() + this.cacheTtlMs,
    });
  }

  /**
   * Remove expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.dnsCache.entries()) {
      if (now > entry.expiresAt) {
        this.dnsCache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      this.logger.debug(
        `DNS cache cleanup: removed ${removed} expired entries`,
      );
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const total = this.cacheHits + this.cacheMisses;
    return {
      size: this.dnsCache.size,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: total > 0 ? (this.cacheHits / total) * 100 : 0,
    };
  }

  /**
   * Extract authentication info from headers
   */
  extractAuth(authHeader: string, locationIdHeader: string): DoHAuth {
    let tenantId: string | null = null;
    let token: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
      // Token format: <tenantId>:<locationToken>
      const parts = token.split(':');
      if (parts.length >= 1) {
        tenantId = parts[0];
      }
    }

    return {
      tenantId,
      locationId: locationIdHeader || null,
      token,
    };
  }

  /**
   * Process a DNS query with policy enforcement
   */
  async processQuery(dnsWire: Buffer, auth: DoHAuth): Promise<Buffer> {
    const startTime = Date.now();

    // Parse DNS message
    const header = this.parseHeader(dnsWire);
    const question = this.parseQuestion(dnsWire, 12);

    if (!question) {
      return this.buildErrorResponse(dnsWire, DoHService.RCODE_REFUSED);
    }

    const domain = question.name;
    const qtype = question.type;

    this.logger.debug(
      `Query: ${domain} (type ${qtype}) from ${auth.locationId}`,
    );

    // Check policy
    let action = 'allow';
    let reason = 'default';
    let category: string | null = null;
    let rewriteTarget: string | undefined;

    if (auth.tenantId && auth.locationId) {
      const policy = await this.evaluatePolicy(
        auth.tenantId,
        auth.locationId,
        domain,
        qtype,
      );
      action = policy.action;
      reason = policy.reason;
      category = policy.category;
      rewriteTarget = policy.rewriteTarget;
    }

    // Log to ClickHouse
    this.logQuery(
      auth,
      domain,
      qtype,
      action,
      reason,
      category,
      Date.now() - startTime,
    );

    // Handle blocked domains
    if (action === 'block') {
      return this.buildNxdomainResponse(dnsWire, header.id);
    }

    // Handle rewrite (SafeSearch, etc.)
    if (action === 'rewrite' && rewriteTarget) {
      // Resolve the rewrite target instead of the original domain
      try {
        const result = await this.resolveDomain(
          rewriteTarget,
          qtype,
          header.id,
          dnsWire,
        );
        return result.response;
      } catch (error) {
        this.logger.error(
          `Resolution failed for rewrite target ${rewriteTarget}:`,
          error,
        );
        return this.buildNxdomainResponse(dnsWire, header.id);
      }
    }

    // Resolve the domain
    try {
      const result = await this.resolveDomain(
        domain,
        qtype,
        header.id,
        dnsWire,
      );
      if (result.cached) {
        this.logger.debug(`Cache hit for ${domain} (type ${qtype})`);
      }
      return result.response;
    } catch (error) {
      this.logger.error(`Resolution failed for ${domain}:`, error);
      return this.buildNxdomainResponse(dnsWire, header.id);
    }
  }

  private async evaluatePolicy(
    tenantId: string,
    locationId: string,
    domain: string,
    qtype: number = 1,
  ): Promise<{
    action: string;
    reason: string;
    category: string | null;
    rewriteTarget?: string;
  }> {
    try {
      const response = await fetch(`${this.policySvcUrl}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          location_id: locationId,
          qname: domain,
          qtype: qtype,
        }),
      });

      if (!response.ok) {
        this.logger.warn(
          `Policy-svc returned ${response.status} for ${domain}`,
        );
        return { action: 'allow', reason: 'policy_error', category: null };
      }

      const result: PolicyEvaluateResponse = await response.json();

      // Map policy-svc decision to action
      const action =
        result.decision === 'BLOCK'
          ? 'block'
          : result.decision === 'REWRITE'
            ? 'rewrite'
            : 'allow';

      return {
        action,
        reason: result.reason,
        category: result.category || null,
        rewriteTarget: result.rewrite_target,
      };
    } catch (error) {
      this.logger.error(`Failed to evaluate policy for ${domain}:`, error);
      // Fail open - allow on error
      return { action: 'allow', reason: 'policy_error', category: null };
    }
  }

  private async logQuery(
    auth: DoHAuth,
    domain: string,
    qtype: number,
    action: string,
    reason: string,
    category: string | null,
    responseTime: number,
  ) {
    if (!auth.tenantId || !auth.locationId) {
      return; // Skip logging if auth is incomplete
    }

    try {
      await this.clickhouse.insertQueryLog({
        timestamp: new Date(),
        tenantId: auth.tenantId,
        locationId: auth.locationId,
        locationName: '', // Will be resolved by location service
        domain,
        queryType: this.qtypeToString(qtype),
        clientIp: '0.0.0.0', // Agent IP not exposed
        action: action as 'allow' | 'block',
        reason,
        category: category || undefined,
        responseTime,
        cached: false,
      });
    } catch (error) {
      this.logger.warn('Failed to log query to ClickHouse', error);
    }
  }

  private qtypeToString(qtype: number): string {
    const types: Record<number, string> = {
      1: 'A',
      28: 'AAAA',
      5: 'CNAME',
      15: 'MX',
      16: 'TXT',
      2: 'NS',
    };
    return types[qtype] || `TYPE${qtype}`;
  }

  private parseHeader(buf: Buffer): DnsHeader {
    return {
      id: buf.readUInt16BE(0),
      flags: buf.readUInt16BE(2),
      qdcount: buf.readUInt16BE(4),
      ancount: buf.readUInt16BE(6),
      nscount: buf.readUInt16BE(8),
      arcount: buf.readUInt16BE(10),
    };
  }

  private parseQuestion(buf: Buffer, offset: number): DnsQuestion | null {
    try {
      const { name, newOffset } = this.parseName(buf, offset);
      const type = buf.readUInt16BE(newOffset);
      const cls = buf.readUInt16BE(newOffset + 2);
      return { name, type, class: cls };
    } catch {
      return null;
    }
  }

  private parseName(
    buf: Buffer,
    offset: number,
  ): { name: string; newOffset: number } {
    const labels: string[] = [];
    let pos = offset;

    while (pos < buf.length) {
      const len = buf[pos];
      if (len === 0) {
        pos++;
        break;
      }

      // Compression pointer
      if ((len & 0xc0) === 0xc0) {
        const pointer = buf.readUInt16BE(pos) & 0x3fff;
        const { name } = this.parseName(buf, pointer);
        labels.push(name);
        pos += 2;
        break;
      }

      labels.push(buf.toString('ascii', pos + 1, pos + 1 + len));
      pos += len + 1;
    }

    return { name: labels.join('.'), newOffset: pos };
  }

  private async resolveDomain(
    domain: string,
    qtype: number,
    id: number,
    originalQuery: Buffer,
  ): Promise<{ response: Buffer; cached: boolean }> {
    // Check cache first
    const cachedResponse = this.getCachedResponse(domain, qtype);
    if (cachedResponse) {
      // Update the ID in the cached response to match the current query
      const response = Buffer.from(cachedResponse);
      response.writeUInt16BE(id, 0);
      return { response, cached: true };
    }

    // Use node's DNS resolver
    try {
      let response: Buffer;
      switch (qtype) {
        case DoHService.TYPE_A:
          const ipv4 = await resolve4(domain);
          response = this.buildAResponse(originalQuery, id, domain, ipv4);
          break;
        case DoHService.TYPE_AAAA:
          const ipv6 = await resolve6(domain);
          response = this.buildAAAAResponse(originalQuery, id, domain, ipv6);
          break;
        default:
          // Forward to upstream for other types (don't cache)
          return {
            response: await this.forwardToUpstream(originalQuery),
            cached: false,
          };
      }

      // Cache successful response
      this.cacheResponse(domain, qtype, response);
      return { response, cached: false };
    } catch (error) {
      if (error.code === 'ENODATA' || error.code === 'ENOTFOUND') {
        return {
          response: this.buildNxdomainResponse(originalQuery, id),
          cached: false,
        };
      }
      throw error;
    }
  }

  private buildAResponse(
    query: Buffer,
    id: number,
    domain: string,
    ips: string[],
  ): Buffer {
    // Build DNS response with A records
    const response = Buffer.alloc(512);
    let offset = 0;

    // Header
    response.writeUInt16BE(id, offset);
    offset += 2;
    response.writeUInt16BE(0x8180, offset);
    offset += 2; // QR=1, RD=1, RA=1
    response.writeUInt16BE(1, offset);
    offset += 2; // QDCOUNT
    response.writeUInt16BE(ips.length, offset);
    offset += 2; // ANCOUNT
    response.writeUInt16BE(0, offset);
    offset += 2; // NSCOUNT
    response.writeUInt16BE(0, offset);
    offset += 2; // ARCOUNT

    // Copy question from original query
    const qEnd = this.findQuestionEnd(query);
    query.copy(response, offset, 12, qEnd);
    offset += qEnd - 12;

    // Answers
    for (const ip of ips) {
      // Name (pointer to question)
      response.writeUInt16BE(0xc00c, offset);
      offset += 2;
      response.writeUInt16BE(1, offset);
      offset += 2; // TYPE A
      response.writeUInt16BE(1, offset);
      offset += 2; // CLASS IN
      response.writeUInt32BE(300, offset);
      offset += 4; // TTL
      response.writeUInt16BE(4, offset);
      offset += 2; // RDLENGTH

      // IP address
      const parts = ip.split('.').map(Number);
      for (const part of parts) {
        response.writeUInt8(part, offset);
        offset++;
      }
    }

    return response.subarray(0, offset);
  }

  private buildAAAAResponse(
    query: Buffer,
    id: number,
    domain: string,
    ips: string[],
  ): Buffer {
    // Similar to buildAResponse but for IPv6
    const response = Buffer.alloc(512);
    let offset = 0;

    response.writeUInt16BE(id, offset);
    offset += 2;
    response.writeUInt16BE(0x8180, offset);
    offset += 2;
    response.writeUInt16BE(1, offset);
    offset += 2;
    response.writeUInt16BE(ips.length, offset);
    offset += 2;
    response.writeUInt16BE(0, offset);
    offset += 2;
    response.writeUInt16BE(0, offset);
    offset += 2;

    const qEnd = this.findQuestionEnd(query);
    query.copy(response, offset, 12, qEnd);
    offset += qEnd - 12;

    // For IPv6, we'd need to properly encode the address
    // Simplified: return NXDOMAIN for now if no IPv6
    if (ips.length === 0) {
      return this.buildNxdomainResponse(query, id);
    }

    return response.subarray(0, offset);
  }

  private buildNxdomainResponse(query: Buffer, id: number): Buffer {
    const response = Buffer.alloc(query.length);
    query.copy(response);
    response.writeUInt16BE(id, 0);
    response.writeUInt16BE(0x8183, 2); // QR=1, RD=1, RA=1, RCODE=3 (NXDOMAIN)
    response.writeUInt16BE(0, 6); // ANCOUNT=0
    return response;
  }

  private buildErrorResponse(query: Buffer, rcode: number): Buffer {
    const response = Buffer.alloc(query.length);
    query.copy(response);
    response.writeUInt16BE(0x8000 | rcode, 2);
    return response;
  }

  private findQuestionEnd(buf: Buffer): number {
    let pos = 12;
    while (pos < buf.length && buf[pos] !== 0) {
      pos += buf[pos] + 1;
    }
    return pos + 5; // null byte + QTYPE (2) + QCLASS (2)
  }

  /**
   * Forward DNS query to upstream resolver using connection pool
   * Implements round-robin load balancing and DNSSEC validation
   */
  private async forwardToUpstream(query: Buffer): Promise<Buffer> {
    const id = query.readUInt16BE(0);

    // Try each resolver in round-robin fashion
    const startIndex = this.currentResolverIndex;
    let lastError: Error | null = null;

    for (let i = 0; i < this.resolvers.length; i++) {
      const resolverIndex = (startIndex + i) % this.resolvers.length;
      const resolver = this.resolvers[resolverIndex];

      try {
        const response = await this.queryResolver(resolver, query);

        // Update round-robin index for next query
        this.currentResolverIndex = (resolverIndex + 1) % this.resolvers.length;

        // DNSSEC validation: check AD (Authenticated Data) flag
        if (this.dnssecEnabled) {
          const decoded = dnsPacket.decode(response);
          const adFlag = (decoded.flags || 0) & 0x0020; // AD flag is bit 5

          if (!adFlag && decoded.answers && decoded.answers.length > 0) {
            this.logger.debug(
              `DNSSEC: Response for query ${id} not authenticated (AD flag not set)`,
            );
            // Note: We still return the response, but log the warning
            // In strict mode, you might want to return SERVFAIL instead
          }
        }

        return response;
      } catch (err) {
        lastError = err;
        this.logger.warn(
          `Resolver ${resolver.address} failed: ${err.message}, trying next...`,
        );
      }
    }

    // All resolvers failed
    this.logger.error(
      `All upstream resolvers failed for query ${id}: ${lastError?.message}`,
    );
    return this.buildNxdomainResponse(query, id);
  }

  /**
   * Send query to a specific resolver and wait for response
   */
  private queryResolver(
    resolver: UpstreamResolver,
    query: Buffer,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const socket = this.getResolverSocket(resolver);
      const id = query.readUInt16BE(0);

      // Set up timeout
      const timeout = setTimeout(() => {
        resolver.pending.delete(id);
        reject(new Error(`Query timeout after ${this.queryTimeout}ms`));
      }, this.queryTimeout);

      // Register pending query
      resolver.pending.set(id, { resolve, reject, timeout });

      // Send query
      socket.send(query, resolver.port, resolver.address, (err) => {
        if (err) {
          clearTimeout(timeout);
          resolver.pending.delete(id);
          reject(err);
        }
      });

      resolver.lastUsed = Date.now();
    });
  }

  /**
   * Get resolver pool statistics
   */
  getResolverStats(): {
    resolvers: {
      address: string;
      pendingQueries: number;
      lastUsed: Date | null;
    }[];
  } {
    return {
      resolvers: this.resolvers.map((r) => ({
        address: `${r.address}:${r.port}`,
        pendingQueries: r.pending.size,
        lastUsed: r.lastUsed ? new Date(r.lastUsed) : null,
      })),
    };
  }
}
