// Nebula DNS - Marketing Website Next.js Configuration
// Configures MDX support and standalone build output
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

const withMDX = require('@next/mdx')({
  extension: /\.mdx?$/,
  options: {},
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  turbopack: {
    root: __dirname,
  },
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

module.exports = withMDX(nextConfig);
