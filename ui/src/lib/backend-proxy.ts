// Nebula DNS - Runtime API proxy helpers
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { NextRequest, NextResponse } from 'next/server'
import {
  buildUpstreamRequestHeaders,
  copyUpstreamResponseHeaders,
} from './backend-proxy-utils'

export {
  STRIPPED_UPSTREAM_RESPONSE_HEADERS,
  buildUpstreamRequestHeaders,
  copyUpstreamResponseHeaders,
} from './backend-proxy-utils'

export type BackendProxyOptions = {
  apiUrl: string
  timeoutMs?: number
}

export async function proxyBackendRequest(
  req: NextRequest,
  pathSegments: string[],
  options: BackendProxyOptions,
): Promise<NextResponse> {
  const { apiUrl, timeoutMs = 30_000 } = options
  const url = `${apiUrl.replace(/\/$/, '')}/${pathSegments.join('/')}${req.nextUrl.search}`
  const headers = buildUpstreamRequestHeaders(req.headers)
  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : req.body

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    const upstream = await fetch(url, {
      method: req.method,
      headers,
      body,
      // @ts-expect-error - duplex required for streaming request body
      duplex: 'half',
      signal: controller.signal,
    })

    clearTimeout(timeout)

    const responseHeaders = copyUpstreamResponseHeaders(upstream.headers)
    const responseBody = await upstream.arrayBuffer()

    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: responseHeaders,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Gateway timeout' }, { status: 504 })
    }
    console.error(`Proxy error for ${req.method} ${url}:`, error)
    return NextResponse.json({ error: 'Bad gateway' }, { status: 502 })
  }
}
