// Nebula DNS - Admin UI Next.js Configuration
// Configures rewrites for API proxy and build options
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // Proxy API requests to the backend in development
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4010/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
