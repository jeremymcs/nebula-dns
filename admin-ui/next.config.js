// Nebula DNS - Admin UI Next.js Configuration
// Configures rewrites for API proxy and build options
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  async rewrites() {
    const apiUrl = process.env.API_URL || 'http://localhost:4010';
    return [
      {
        source: '/backend/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
