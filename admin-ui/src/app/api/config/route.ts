// Nebula DNS - Admin UI Runtime Configuration API
// Exposes server-side environment variables to client components
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    apiUrl: process.env.API_URL || 'http://localhost:4010',
    tenantUiUrl: process.env.TENANT_UI_URL || 'http://localhost:4011',
  });
}
