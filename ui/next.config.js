// Nebula DNS - Next.js Configuration
// Configures redirects and build options for the dashboard app
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

const path = require('path')

const brandModule = path.join(__dirname, '../shared/product-brand.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    externalDir: true,
  },
  turbopack: {
    root: __dirname,
    resolveAlias: {
      '@nebula/brand': brandModule,
    },
  },
  webpack: (config) => {
    config.resolve.alias['@nebula/brand'] = brandModule
    return config
  },

  // /backend/* is handled by app/backend/[...path]/route.ts at runtime
  // (rewrites bake env vars at build time in standalone mode — route handlers don't)

  // Redirect legacy partner portal routes to new dashboard locations
  // The partner portal has been deprecated in favor of the unified tier system
  // MSP users now access client management through /dashboard/clients
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/',
        permanent: false,
      },
      // Partner login redirects to main login
      {
        source: '/partner/login',
        destination: '/login',
        permanent: true,
      },
      // Partner root redirects to login
      {
        source: '/partner',
        destination: '/login',
        permanent: true,
      },
      // Partner dashboard redirects to main dashboard
      {
        source: '/partner/dashboard',
        destination: '/dashboard',
        permanent: true,
      },
      // Partner organizations redirects to MSP clients page
      {
        source: '/partner/organizations',
        destination: '/dashboard/clients',
        permanent: true,
      },
      // Partner organization detail redirects to client detail
      {
        source: '/partner/organizations/:id',
        destination: '/dashboard/clients/:id',
        permanent: true,
      },
      // Partner organization creation redirects to client creation
      {
        source: '/partner/organizations/new',
        destination: '/dashboard/clients/new',
        permanent: true,
      },
      // Partner settings redirects to dashboard settings
      {
        source: '/partner/settings',
        destination: '/dashboard/settings',
        permanent: true,
      },
      // Partner users redirects to dashboard users (MSP admins)
      {
        source: '/partner/users',
        destination: '/dashboard/users',
        permanent: true,
      },
      // Partner reports redirects to dashboard reports
      {
        source: '/partner/reports',
        destination: '/dashboard/reports',
        permanent: true,
      },
      // Catch-all for any other partner routes
      {
        source: '/partner/:path*',
        destination: '/dashboard',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
