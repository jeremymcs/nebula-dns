// Nebula DNS - Admin UI Runtime API Proxy Route Handler
// Proxies /backend/* to API_URL at request time (env vars unavailable at build time in standalone mode)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { NextRequest } from 'next/server'
import { proxyBackendRequest } from '@/lib/backend-proxy'

const API_URL = process.env.API_URL || 'http://localhost:4010'

async function proxy(req: NextRequest, params: Promise<{ path: string[] }>) {
  const { path } = await params
  return proxyBackendRequest(req, path, { apiUrl: API_URL })
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
