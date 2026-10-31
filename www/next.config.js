// Nebula DNS - Marketing Website Next.js Configuration
// Configures MDX support and standalone build output
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

const withMDX = require('@next/mdx')({
  extension: /\.mdx?$/,
  options: {},
})

const path = require('path')
const brandModule = path.join(__dirname, '../shared/product-brand.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
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
};

module.exports = withMDX(nextConfig);
