import type { Config } from 'tailwindcss'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { fluxLabsThemeExtend } = require('./lib/flux-labs-tailwind-theme.js') as {
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
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
