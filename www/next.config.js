// Nebula DNS - Marketing Website Next.js Configuration
// Configures MDX support and standalone build output
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

const path = require('path')

const withMDX = require('@next/mdx')({
  extension: /\.mdx?$/,
  options: {},
})

const workspaceRoot = path.join(__dirname, '..')

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  experimental: {
    externalDir: true,
  },
  turbopack: {
    root: workspaceRoot,
  },
};

module.exports = withMDX(nextConfig);
