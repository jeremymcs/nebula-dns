/**
 * Nebula DNS - Client IP resolution (trusted proxies + signed Vercel proxy header)
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';

const IPV4_OCTET = '(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)';
const IPV4_PATTERN = new RegExp(
  `^${IPV4_OCTET}\\.${IPV4_OCTET}\\.${IPV4_OCTET}\\.${IPV4_OCTET}$`,
);

/** Default trusts Docker bridge / private ranges where Caddy and sidecars connect from. */
export const DEFAULT_TRUSTED_PROXY_CIDRS = [
  '127.0.0.1',
  '::1',
  '172.16.0.0/12',
  '10.0.0.0/8',
];

export function parseTrustedProxyCidrs(
  raw: string | undefined,
): string[] | false {
  if (raw === undefined || raw.trim() === '') {
    return DEFAULT_TRUSTED_PROXY_CIDRS;
  }
  const trimmed = raw.trim();
  if (trimmed === 'false' || trimmed === '0' || trimmed === 'off') {
    return false;
  }
  return trimmed
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function getExpressTrustProxySetting(
  raw: string | undefined = process.env.TRUSTED_PROXY_CIDRS,
): string | string[] | false {
  const cidrs = parseTrustedProxyCidrs(raw);
  if (cidrs === false) {
    return false;
  }
  return cidrs;
}

export function isPlausibleClientIp(value: string): boolean {
  if (IPV4_PATTERN.test(value)) {
    return true;
  }
  if (value.includes(':')) {
    return /^[\da-f:.]+$/i.test(value);
  }
  return false;
}

/** Strip IPv4-mapped IPv6 prefix so Postgres inet and allowlists see dotted-quad form. */
export function normalizeClientIp(
  ip: string | undefined | null,
): string | undefined {
  if (ip == null) {
    return undefined;
  }
  const trimmed = ip.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.startsWith('::ffff:')) {
    const mapped = trimmed.slice('::ffff:'.length);
    if (IPV4_PATTERN.test(mapped)) {
      return mapped;
    }
  }
  return trimmed;
}

export function fluxClientIpSignature(
  clientIp: string,
  secret: string,
): string {
  return createHmac('sha256', secret).update(clientIp, 'utf8').digest('hex');
}

function readHeader(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  if (value == null) {
    return undefined;
  }
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw.trim();
  return trimmed || undefined;
}

/**
 * Accept X-Flux-Client-IP only when X-Flux-Client-IP-Signature matches FLUX_CLIENT_IP_SECRET.
 * Used for browser traffic proxied through Vercel /backend → Caddy → API.
 */
export function getVerifiedFluxClientIp(
  req: Request,
  secret: string | undefined = process.env.FLUX_CLIENT_IP_SECRET,
): string | undefined {
  if (!secret) {
    return undefined;
  }

  const candidate = normalizeClientIp(readHeader(req, 'x-flux-client-ip'));
  const signature = readHeader(req, 'x-flux-client-ip-signature');
  if (!candidate || !signature || !isPlausibleClientIp(candidate)) {
    return undefined;
  }

  const expected = fluxClientIpSignature(candidate, secret);
  const sigBuf = Buffer.from(signature, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');
  if (
    sigBuf.length !== expectedBuf.length ||
    !timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return undefined;
  }

  return candidate;
}

export type GetClientIpOptions = {
  /** When omitted and IP cannot be resolved, returns undefined instead of a fallback. */
  fallback?: string;
};

function resolveClientIp(req: Request): string | undefined {
  const fluxIp = getVerifiedFluxClientIp(req);
  if (fluxIp) {
    return fluxIp;
  }

  const fromExpress = normalizeClientIp(req.ip);
  if (fromExpress && isPlausibleClientIp(fromExpress)) {
    return fromExpress;
  }

  const fromSocket = normalizeClientIp(req.socket?.remoteAddress);
  if (fromSocket && isPlausibleClientIp(fromSocket)) {
    return fromSocket;
  }

  return undefined;
}

/**
 * Resolve the client IP for auditing, rate limits, and allowlists.
 * Relies on Express trust proxy for X-Forwarded-For from Caddy; never reads XFF directly.
 */
export function getClientIp(
  req: Request,
  options: GetClientIpOptions = {},
): string {
  const resolved = resolveClientIp(req);
  if (resolved) {
    return resolved;
  }
  if (options.fallback !== undefined) {
    return options.fallback;
  }
  return 'unknown';
}

/** Same as getClientIp but returns undefined when the address cannot be resolved. */
export function tryGetClientIp(req: Request): string | undefined {
  return resolveClientIp(req);
}
