/**
 * Nebula DNS - Enterprise DNS Security Platform
 * IP Allowlist Guard
 *
 * Restricts admin access to specific IP addresses or CIDR ranges
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { getClientIp, tryGetClientIp } from '@/common/http/client-ip';

export const REQUIRE_IP_ALLOWLIST_KEY = 'requireIpAllowlist';
export const RequireIpAllowlist = () =>
  Reflect.metadata(REQUIRE_IP_ALLOWLIST_KEY, true);

interface IpAllowlistConfig {
  enabled: boolean;
  allowedIps: string[];
  allowedCidrs: string[];
}

@Injectable()
export class IpAllowlistGuard implements CanActivate {
  private config: IpAllowlistConfig;

  constructor(private reflector: Reflector) {
    this.config = {
      enabled: process.env.IP_ALLOWLIST_ENABLED === 'true',
      allowedIps: (process.env.ADMIN_ALLOWED_IPS || '')
        .split(',')
        .filter(Boolean),
      allowedCidrs: (process.env.ADMIN_ALLOWED_CIDRS || '')
        .split(',')
        .filter(Boolean),
    };
  }

  canActivate(context: ExecutionContext): boolean {
    // Check if this route requires IP allowlisting
    const requireAllowlist = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_IP_ALLOWLIST_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requireAllowlist || !this.config.enabled) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = tryGetClientIp(request);

    if (!clientIp) {
      throw new ForbiddenException('Unable to determine client IP address');
    }

    if (this.isIpAllowed(clientIp)) {
      return true;
    }

    throw new ForbiddenException('Access denied: IP address not in allowlist');
  }

  private isIpAllowed(ip: string): boolean {
    // Check exact IP match
    if (this.config.allowedIps.includes(ip)) {
      return true;
    }

    // Normalize IPv6-mapped IPv4 addresses
    const normalizedIp = ip.replace(/^::ffff:/, '');
    if (this.config.allowedIps.includes(normalizedIp)) {
      return true;
    }

    // Check CIDR ranges
    for (const cidr of this.config.allowedCidrs) {
      if (this.isIpInCidr(normalizedIp, cidr)) {
        return true;
      }
    }

    return false;
  }

  private isIpInCidr(ip: string, cidr: string): boolean {
    const [range, bits] = cidr.split('/');
    const mask = parseInt(bits, 10);

    if (isNaN(mask)) return false;

    try {
      const ipNum = this.ipToNumber(ip);
      const rangeNum = this.ipToNumber(range);
      const maskNum = (-1 << (32 - mask)) >>> 0;

      return (ipNum & maskNum) === (rangeNum & maskNum);
    } catch {
      return false;
    }
  }

  private ipToNumber(ip: string): number {
    const parts = ip.split('.');
    if (parts.length !== 4) {
      throw new Error('Invalid IPv4 address');
    }

    return (
      parts.reduce((acc, part, i) => {
        const num = parseInt(part, 10);
        if (isNaN(num) || num < 0 || num > 255) {
          throw new Error('Invalid IPv4 address');
        }
        return acc + (num << (24 - i * 8));
      }, 0) >>> 0
    );
  }
}

// Common internal/private CIDR ranges
export const PRIVATE_CIDRS = [
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '127.0.0.0/8',
];

// Localhost addresses
export const LOCALHOST_IPS = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
