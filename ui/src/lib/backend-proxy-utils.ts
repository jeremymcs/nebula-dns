// Nebula DNS - Runtime API proxy helpers (Next.js-free for unit tests)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

/** Hop-by-hop and encoding headers that must not be forwarded after fetch decodes the body. */
export const STRIPPED_UPSTREAM_RESPONSE_HEADERS = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

const STRIPPED_PROXY_REQUEST_HEADERS = new Set(['connection', 'host'])

export function copyUpstreamResponseHeaders(upstream: Headers): Headers {
  const headers = new Headers()

  upstream.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (STRIPPED_UPSTREAM_RESPONSE_HEADERS.has(lower) || lower === 'set-cookie') {
      return
    }
    headers.append(key, value)
  })

  if (typeof upstream.getSetCookie === 'function') {
    for (const cookie of upstream.getSetCookie()) {
      headers.append('Set-Cookie', cookie)
    }
  }

  return headers
}

export function buildUpstreamRequestHeaders(incoming: Headers): Headers {
  const headers = new Headers()
  incoming.forEach((value, key) => {
    if (!STRIPPED_PROXY_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value)
    }
  })
  return headers
}
