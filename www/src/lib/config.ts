// Nebula DNS - Marketing Website Configuration
// Environment-based URLs for API and dashboard app
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

export const API_URL =
  typeof window === 'undefined'
    ? process.env.API_URL || 'http://localhost:4010'
    : '/backend'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.nebuladns.io'
