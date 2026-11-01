/**
 * Nebula DNS - Client IP resolution tests
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import { Request } from 'express';
import {
  fluxClientIpSignature,
  getClientIp,
  getVerifiedFluxClientIp,
  normalizeClientIp,
  parseTrustedProxyCidrs,
} from './client-ip';

function mockRequest(
  partial: Partial<Request> & { headers?: Record<string, string> },
): Request {
  return {
    ip: partial.ip,
    socket: partial.socket as Request['socket'],
    headers: partial.headers ?? {},
  } as Request;
}

describe('normalizeClientIp', () => {
  it('maps IPv4-mapped IPv6 to dotted quad', () => {
    expect(normalizeClientIp('::ffff:203.0.113.50')).toBe('203.0.113.50');
  });

  it('leaves plain IPv4 unchanged', () => {
    expect(normalizeClientIp('198.51.100.2')).toBe('198.51.100.2');
  });
});

describe('getVerifiedFluxClientIp', () => {
  const secret = 'test-flux-secret';

  it('accepts a valid HMAC signature', () => {
    const ip = '203.0.113.10';
    const req = mockRequest({
      headers: {
        'x-flux-client-ip': ip,
        'x-flux-client-ip-signature': fluxClientIpSignature(ip, secret),
      },
    });

    expect(getVerifiedFluxClientIp(req, secret)).toBe(ip);
  });

  it('rejects spoofed IP without valid signature', () => {
    const req = mockRequest({
      headers: {
        'x-flux-client-ip': '203.0.113.99',
        'x-flux-client-ip-signature': 'deadbeef',
      },
    });

    expect(getVerifiedFluxClientIp(req, secret)).toBeUndefined();
  });

  it('ignores flux headers when secret is unset', () => {
    const ip = '203.0.113.10';
    const req = mockRequest({
      headers: {
        'x-flux-client-ip': ip,
        'x-flux-client-ip-signature': fluxClientIpSignature(ip, secret),
      },
    });

    expect(getVerifiedFluxClientIp(req, undefined)).toBeUndefined();
  });
});

describe('getClientIp', () => {
  const secret = 'proxy-signing-key';

  it('prefers verified flux client IP (Vercel /backend path)', () => {
    const browserIp = '198.51.100.44';
    process.env.FLUX_CLIENT_IP_SECRET = secret;
    const req = mockRequest({
      ip: '172.18.0.5',
      headers: {
        'x-forwarded-for': '198.51.100.44',
        'x-flux-client-ip': browserIp,
        'x-flux-client-ip-signature': fluxClientIpSignature(browserIp, secret),
      },
    });

    expect(getClientIp(req, { fallback: '0.0.0.0' })).toBe(browserIp);
    delete process.env.FLUX_CLIENT_IP_SECRET;
  });

  it('uses Express req.ip (trusted Caddy proxy) and ignores spoofed XFF', () => {
    const req = mockRequest({
      ip: '203.0.113.5',
      headers: {
        'x-forwarded-for': '8.8.8.8',
        'x-real-ip': '8.8.8.8',
      },
    });

    expect(getClientIp(req)).toBe('203.0.113.5');
  });

  it('falls back to socket remote address for direct connections', () => {
    const req = mockRequest({
      socket: { remoteAddress: '::ffff:192.0.2.1' } as Request['socket'],
    });

    expect(getClientIp(req)).toBe('192.0.2.1');
  });

  it('returns configured fallback when IP cannot be resolved', () => {
    const req = mockRequest({});
    expect(getClientIp(req, { fallback: '0.0.0.0' })).toBe('0.0.0.0');
  });
});

describe('parseTrustedProxyCidrs', () => {
  it('defaults to docker-friendly private ranges', () => {
    expect(parseTrustedProxyCidrs(undefined)).toEqual(
      expect.arrayContaining(['172.16.0.0/12', '10.0.0.0/8']),
    );
  });

  it('can disable trust proxy', () => {
    expect(parseTrustedProxyCidrs('false')).toBe(false);
  });
});
