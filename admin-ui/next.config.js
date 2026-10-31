// Nebula DNS - Admin UI Next.js Configuration
// Configures rewrites for API proxy and build options
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

const path = require('path')

const brandModule = path.join(__dirname, '../shared/product-brand.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    externalDir: true,
  },
  webpack: (config) => {
    config.resolve.alias['@nebula/brand'] = brandModule
    return config
  },
};

module.exports = nextConfig;
