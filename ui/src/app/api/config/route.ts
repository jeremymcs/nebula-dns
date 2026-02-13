// Nebula DNS - Runtime Configuration API
// Exposes server-side environment variables to client components
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    apiUrl: process.env.API_URL || 'http://localhost:4010',
    appUrl: process.env.APP_URL || 'http://localhost:4011',
    adminUiUrl: process.env.ADMIN_UI_URL || 'http://localhost:4012',
  });
}
