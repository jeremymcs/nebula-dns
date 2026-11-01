// Nebula DNS - Runtime API proxy helpers
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { NextRequest, NextResponse } from 'next/server'
import {
  buildUpstreamRequestHeaders,
  copyUpstreamResponseHeaders,
  applySignedFluxClientIpHeaders,
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
  const { apiUrl } = options
  const url = `${apiUrl.replace(/\/$/, '')}/${pathSegments.join('/')}${req.nextUrl.search}`
  const headers = buildUpstreamRequestHeaders(req.headers)
  applySignedFluxClientIpHeaders(
    headers,
    req.headers,
    process.env.FLUX_CLIENT_IP_SECRET,
  )
  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : req.body

  const upstream = await fetch(url, {
    method: req.method,
    headers,
    body,
    // @ts-expect-error - duplex required for streaming request body
    duplex: 'half',
  })

  const responseHeaders = copyUpstreamResponseHeaders(upstream.headers)
  const responseBody = await upstream.arrayBuffer()

  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: responseHeaders,
  })
}
