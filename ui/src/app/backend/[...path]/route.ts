// Nebula DNS - Runtime API Proxy Route Handler
// Proxies /backend/* to API_URL at request time (env vars unavailable at build time in standalone mode)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL || 'http://localhost:4010'
const PROXY_TIMEOUT_MS = 30000 // 30 seconds

async function proxy(req: NextRequest, params: Promise<{ path: string[] }>) {
  const { path } = await params
  const url = `${API_URL}/${path.join('/')}${req.nextUrl.search}`

  const headers = new Headers()
  req.headers.forEach((value, key) => {
    if (!['host', 'connection'].includes(key.toLowerCase())) {
      headers.set(key, value)
    }
  })

  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : req.body

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS)

    const res = await fetch(url, {
      method: req.method,
      headers,
      body,
      // @ts-expect-error - duplex required for streaming body
      duplex: 'half',
      signal: controller.signal,
    })

    clearTimeout(timeout)

    const resHeaders = new Headers()
    res.headers.forEach((value, key) => {
      if (!['connection', 'transfer-encoding'].includes(key.toLowerCase())) {
        resHeaders.set(key, value)
      }
    })

    return new NextResponse(res.body, { status: res.status, headers: resHeaders })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Gateway timeout' }, { status: 504 })
    }
    console.error(`Proxy error for ${req.method} ${url}:`, error)
    return NextResponse.json({ error: 'Bad gateway' }, { status: 502 })
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, params)
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, params)
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, params)
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, params)
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, params)
}
