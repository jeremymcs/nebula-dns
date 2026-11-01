// Nebula DNS - Admin UI Tailwind Configuration
// Flux Labs brand theme for Mission Control
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import type { Config } from 'tailwindcss'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { fluxLabsThemeExtend } = require('../shared/flux-labs-tailwind-theme.js') as {
  fluxLabsThemeExtend: NonNullable<Config['theme']>['extend']
}

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      ...fluxLabsThemeExtend,
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'Menlo', 'monospace'],
        serif: ['var(--font-instrument-serif)', 'Instrument Serif', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
export default config
