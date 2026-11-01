// Nebula DNS - Runtime API proxy helpers (Next.js-free for unit tests)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { createHmac } from 'crypto'

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

const IPV4_OCTET = '(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)'
const IPV4_PATTERN = new RegExp(
  `^${IPV4_OCTET}\\.${IPV4_OCTET}\\.${IPV4_OCTET}\\.${IPV4_OCTET}$`,
)

export function normalizeProxyClientIp(ip: string | null | undefined): string | undefined {
  if (ip == null) {
    return undefined
  }
  const trimmed = ip.trim()
  if (!trimmed) {
    return undefined
  }
  if (trimmed.startsWith('::ffff:')) {
    const mapped = trimmed.slice('::ffff:'.length)
    if (IPV4_PATTERN.test(mapped)) {
      return mapped
    }
  }
  return trimmed
}

/** Resolve the browser IP from Vercel / edge headers at the Next.js route handler. */
export function resolveIncomingBrowserClientIp(headers: Headers): string | undefined {
  const vercelForwarded = headers.get('x-vercel-forwarded-for')
  if (vercelForwarded) {
    const first = vercelForwarded.split(',')[0]?.trim()
    const normalized = normalizeProxyClientIp(first)
    if (normalized) {
      return normalized
    }
  }

  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    const normalized = normalizeProxyClientIp(first)
    if (normalized) {
      return normalized
    }
  }

  const realIp = headers.get('x-real-ip')
  return normalizeProxyClientIp(realIp)
}

export function signFluxClientIpHeader(clientIp: string, secret: string): string {
  return createHmac('sha256', secret).update(clientIp, 'utf8').digest('hex')
}

export function applySignedFluxClientIpHeaders(
  headers: Headers,
  incoming: Headers,
  secret: string | undefined,
): void {
  if (!secret) {
    return
  }
  const clientIp = resolveIncomingBrowserClientIp(incoming)
  if (!clientIp) {
    return
  }
  headers.set('X-Flux-Client-IP', clientIp)
  headers.set('X-Flux-Client-IP-Signature', signFluxClientIpHeader(clientIp, secret))
}
