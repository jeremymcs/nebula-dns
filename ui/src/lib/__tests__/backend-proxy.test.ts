// Nebula DNS - Backend proxy unit tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  STRIPPED_UPSTREAM_RESPONSE_HEADERS,
  buildUpstreamRequestHeaders,
  copyUpstreamResponseHeaders,
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
      host: 'app.nebuladns.io',
      connection: 'close',
      'content-type': 'application/json',
    })

    const outbound = buildUpstreamRequestHeaders(incoming)

    expect(outbound.get('host')).toBeNull()
    expect(outbound.get('connection')).toBeNull()
    expect(outbound.get('content-type')).toBe('application/json')
  })
})
