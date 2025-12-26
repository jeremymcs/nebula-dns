/**
 * Nebula DNS - Enterprise DNS Security Platform
 * DoH Service - DNS resolution with policy enforcement
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as dns from 'dns';
import { promisify } from 'util';
import { Location } from '../locations/entities/location.entity';
import { PoliciesService } from '../policies/policies.service';
import { ThreatDetectionService } from '../threat-detection/threat-detection.service';
import { ClickHouseService } from '../clickhouse/clickhouse.service';

const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);
const resolveMx = promisify(dns.resolveMx);
const resolveTxt = promisify(dns.resolveTxt);
const resolveCname = promisify(dns.resolveCname);

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

@Injectable()
export class DoHService {
  private readonly logger = new Logger(DoHService.name);
  private readonly upstreamDns: string[];

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
    this.upstreamDns = this.configService.get('UPSTREAM_DNS', '1.1.1.1,8.8.8.8').split(',');
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

    this.logger.debug(`Query: ${domain} (type ${qtype}) from ${auth.locationId}`);

    // Check policy
    let action = 'allow';
    let reason = 'default';
    let category: string | null = null;

    if (auth.tenantId && auth.locationId) {
      const policy = await this.evaluatePolicy(auth.tenantId, auth.locationId, domain);
      action = policy.action;
      reason = policy.reason;
      category = policy.category;
    }

    // Log to ClickHouse
    this.logQuery(auth, domain, qtype, action, reason, category, Date.now() - startTime);

    // Handle blocked domains
    if (action === 'block') {
      return this.buildNxdomainResponse(dnsWire, header.id);
    }

    // Resolve the domain
    try {
      const response = await this.resolveDomain(domain, qtype, header.id, dnsWire);
      return response;
    } catch (error) {
      this.logger.error(`Resolution failed for ${domain}:`, error);
      return this.buildNxdomainResponse(dnsWire, header.id);
    }
  }

  private async evaluatePolicy(
    tenantId: string,
    locationId: string,
    domain: string,
  ): Promise<{ action: string; reason: string; category: string | null }> {
    // TODO: Integrate with compiled policy from Redis
    // For now, return allow
    return { action: 'allow', reason: 'default', category: null };
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

  private parseName(buf: Buffer, offset: number): { name: string; newOffset: number } {
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

  private async resolveDomain(domain: string, qtype: number, id: number, originalQuery: Buffer): Promise<Buffer> {
    // Use node's DNS resolver
    try {
      switch (qtype) {
        case DoHService.TYPE_A:
          const ipv4 = await resolve4(domain);
          return this.buildAResponse(originalQuery, id, domain, ipv4);
        case DoHService.TYPE_AAAA:
          const ipv6 = await resolve6(domain);
          return this.buildAAAAResponse(originalQuery, id, domain, ipv6);
        default:
          // Forward to upstream for other types
          return this.forwardToUpstream(originalQuery);
      }
    } catch (error) {
      if (error.code === 'ENODATA' || error.code === 'ENOTFOUND') {
        return this.buildNxdomainResponse(originalQuery, id);
      }
      throw error;
    }
  }

  private buildAResponse(query: Buffer, id: number, domain: string, ips: string[]): Buffer {
    // Build DNS response with A records
    const response = Buffer.alloc(512);
    let offset = 0;

    // Header
    response.writeUInt16BE(id, offset); offset += 2;
    response.writeUInt16BE(0x8180, offset); offset += 2; // QR=1, RD=1, RA=1
    response.writeUInt16BE(1, offset); offset += 2; // QDCOUNT
    response.writeUInt16BE(ips.length, offset); offset += 2; // ANCOUNT
    response.writeUInt16BE(0, offset); offset += 2; // NSCOUNT
    response.writeUInt16BE(0, offset); offset += 2; // ARCOUNT

    // Copy question from original query
    const qEnd = this.findQuestionEnd(query);
    query.copy(response, offset, 12, qEnd);
    offset += qEnd - 12;

    // Answers
    for (const ip of ips) {
      // Name (pointer to question)
      response.writeUInt16BE(0xc00c, offset); offset += 2;
      response.writeUInt16BE(1, offset); offset += 2; // TYPE A
      response.writeUInt16BE(1, offset); offset += 2; // CLASS IN
      response.writeUInt32BE(300, offset); offset += 4; // TTL
      response.writeUInt16BE(4, offset); offset += 2; // RDLENGTH

      // IP address
      const parts = ip.split('.').map(Number);
      for (const part of parts) {
        response.writeUInt8(part, offset); offset++;
      }
    }

    return response.subarray(0, offset);
  }

  private buildAAAAResponse(query: Buffer, id: number, domain: string, ips: string[]): Buffer {
    // Similar to buildAResponse but for IPv6
    const response = Buffer.alloc(512);
    let offset = 0;

    response.writeUInt16BE(id, offset); offset += 2;
    response.writeUInt16BE(0x8180, offset); offset += 2;
    response.writeUInt16BE(1, offset); offset += 2;
    response.writeUInt16BE(ips.length, offset); offset += 2;
    response.writeUInt16BE(0, offset); offset += 2;
    response.writeUInt16BE(0, offset); offset += 2;

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

  private async forwardToUpstream(query: Buffer): Promise<Buffer> {
    // For production, implement UDP forwarding to upstream
    // For now, return NXDOMAIN
    const id = query.readUInt16BE(0);
    return this.buildNxdomainResponse(query, id);
  }
}

