// Nebula DNS - Marketing Website Next.js Configuration
// Configures MDX support and standalone build output
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

const path = require('path')

const withMDX = require('@next/mdx')({
  extension: /\.mdx?$/,
  options: {},
})

const workspaceRoot = path.join(__dirname, '..')
const {
  buildWwwLegacyAppRedirects,
  buildLegacyMarketingHostRedirects,
  resolveAppOrigin,
} = require('./lib/legacy-app-redirects.js')

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  experimental: {
    externalDir: true,
  },
  turbopack: {
    root: workspaceRoot,
  },
  async redirects() {
    const appOrigin = resolveAppOrigin()
    return [
      ...buildLegacyMarketingHostRedirects(),
      ...buildWwwLegacyAppRedirects(appOrigin),
    ]
  },
};

module.exports = withMDX(nextConfig);
