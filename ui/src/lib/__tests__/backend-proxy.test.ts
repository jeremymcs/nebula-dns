// Nebula DNS - Backend proxy unit tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  STRIPPED_UPSTREAM_RESPONSE_HEADERS,
  applySignedFluxClientIpHeaders,
  buildUpstreamRequestHeaders,
  copyUpstreamResponseHeaders,
  resolveIncomingBrowserClientIp,
  signFluxClientIpHeader,
} from '../backend-proxy-utils'

describe('copyUpstreamResponseHeaders', () => {
  it('drops encoding and length headers that disagree with fetch-decoded bodies', () => {
    const upstream = new Headers({
      'content-type': 'application/json; charset=utf-8',
      'content-encoding': 'gzip',
      'content-length': '653',
      'transfer-encoding': 'chunked',
      connection: 'keep-alive',
      etag: 'W/"3f7-abc"',
    })

    const copied = copyUpstreamResponseHeaders(upstream)

    expect(copied.get('content-type')).toBe('application/json; charset=utf-8')
    expect(copied.get('etag')).toBe('W/"3f7-abc"')
    expect(copied.get('content-encoding')).toBeNull()
    expect(copied.get('content-length')).toBeNull()
    expect(copied.get('transfer-encoding')).toBeNull()
    expect(copied.get('connection')).toBeNull()
  })

  it('forwards Set-Cookie via getSetCookie when present', () => {
    const upstream = new Headers()
    upstream.append('Set-Cookie', 'a=1; Path=/; HttpOnly')
    upstream.append('Set-Cookie', 'b=2; Path=/; HttpOnly')

    const copied = copyUpstreamResponseHeaders(upstream)

    expect(copied.getSetCookie?.()).toEqual([
      'a=1; Path=/; HttpOnly',
      'b=2; Path=/; HttpOnly',
    ])
  })

  it('documents stripped hop-by-hop response headers', () => {
    expect(STRIPPED_UPSTREAM_RESPONSE_HEADERS.has('content-encoding')).toBe(true)
    expect(STRIPPED_UPSTREAM_RESPONSE_HEADERS.has('content-length')).toBe(true)
  })
})

describe('buildUpstreamRequestHeaders', () => {
  it('removes host and connection from the outbound proxy request', () => {
    const incoming = new Headers({
      host: 'app.shield.fluxlabs.net',
      connection: 'close',
      'content-type': 'application/json',
    })

    const outbound = buildUpstreamRequestHeaders(incoming)

    expect(outbound.get('host')).toBeNull()
    expect(outbound.get('connection')).toBeNull()
    expect(outbound.get('content-type')).toBe('application/json')
  })
})

describe('applySignedFluxClientIpHeaders', () => {
  it('adds signed flux headers for Vercel-forwarded browser IPs', () => {
    const secret = 'vercel-proxy-secret'
    const incoming = new Headers({
      'x-vercel-forwarded-for': '203.0.113.44, 70.1.2.3',
    })
    const outbound = buildUpstreamRequestHeaders(incoming)

    applySignedFluxClientIpHeaders(outbound, incoming, secret)

    expect(outbound.get('x-flux-client-ip')).toBe('203.0.113.44')
    expect(outbound.get('x-flux-client-ip-signature')).toBe(
      signFluxClientIpHeader('203.0.113.44', secret),
    )
  })

  it('does not add flux headers when secret is missing', () => {
    const incoming = new Headers({
      'x-forwarded-for': '203.0.113.44',
    })
    const outbound = buildUpstreamRequestHeaders(incoming)
    applySignedFluxClientIpHeaders(outbound, incoming, undefined)
    expect(outbound.get('x-flux-client-ip')).toBeNull()
  })

  it('normalizes IPv4-mapped addresses from edge headers', () => {
    const headers = new Headers({
      'x-real-ip': '::ffff:198.51.100.10',
    })
    expect(resolveIncomingBrowserClientIp(headers)).toBe('198.51.100.10')
  })
})
