/**
 * Flux Labs × Nebula DNS — shared Tailwind theme extension.
 * Sampled from fluxlabs.net brand (salmon #FF6E62, blue #4B7CBB, navy #1E3B78).
 */

const FLUX = {
  salmon: '#FF6E62',
  blue: '#4B7CBB',
  navy: '#1E3B78',
  navyDeep: '#003388',
  ink: '#0B1530',
  txt: '#3B4763',
  mut: '#7A849B',
  line: '#E6E9F0',
  canvas: '#FBFBFD',
  surface: '#F7F8FB',
  text: '#0B1530',
  muted: '#7A849B',
  white: '#FFFFFF',
  chartViolet: '#7d8dff',
  chartAmber: '#ffb84d',
  chartPink: '#ff4f81',
}

/** @type {import('tailwindcss').Config['theme']} */
const fluxLabsThemeExtend = {
  colors: {
    // Flux blue — primary actions, links, focus
    primary: {
      50: '#eef4fb',
      100: '#dceaf7',
      200: '#b9d5ef',
      300: '#8bb8e3',
      400: '#6a9fd4',
      500: FLUX.blue,
      600: '#3d6a9f',
      700: FLUX.navy,
      800: '#182f61',
      900: '#122548',
      950: '#0c1424',
    },
    // Salmon/coral — highlight CTAs, accents
    accent: {
      50: '#fff1f0',
      100: '#ffe4e1',
      200: '#ffc9c4',
      300: '#ffa399',
      400: '#ff8579',
      500: FLUX.salmon,
      600: '#e85a4f',
      700: '#c44a41',
      800: '#9f3d37',
      900: '#823631',
      950: '#452019',
    },
    // Neutrals — Design C (premium minimal)
    space: {
      50: FLUX.canvas,
      100: '#f4f5f9',
      200: FLUX.line,
      300: '#dce0ea',
      400: '#9aa3b8',
      500: FLUX.mut,
      600: FLUX.txt,
      700: '#2a3347',
      800: '#151b2b',
      900: FLUX.ink,
      950: '#0c111d',
    },
    flux: FLUX,
    ink: FLUX.ink,
    txt: FLUX.txt,
    mut: FLUX.mut,
    line: FLUX.line,
    canvas: FLUX.canvas,
    surface: FLUX.surface,
    success: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: FLUX.chartAmber,
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    danger: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: FLUX.chartPink,
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
  },
  backgroundImage: {
    'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
    'nebula-gradient': `linear-gradient(135deg, ${FLUX.navy} 0%, ${FLUX.blue} 55%, ${FLUX.salmon} 100%)`,
    'nebula-gradient-dark': `linear-gradient(135deg, #0c1424 0%, ${FLUX.navy} 45%, ${FLUX.blue} 100%)`,
    'flux-hero': `linear-gradient(145deg, ${FLUX.navyDeep} 0%, ${FLUX.navy} 40%, ${FLUX.blue} 100%)`,
    'glass-gradient':
      'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)',
  },
  boxShadow: {
    'glow-sm': '0 0 10px rgba(75, 124, 187, 0.35)',
    glow: '0 0 20px rgba(75, 124, 187, 0.45)',
    'glow-lg': '0 0 30px rgba(75, 124, 187, 0.5)',
    'glow-accent': '0 0 20px rgba(255, 110, 98, 0.45)',
    'glow-cyan': '0 0 20px rgba(125, 141, 255, 0.35)',
    'inner-glow': 'inset 0 0 20px rgba(30, 59, 120, 0.25)',
  },
  animation: {
    'fade-in': 'fadeIn 0.3s ease-out',
    'slide-up': 'slideUp 0.3s ease-out',
    'slide-down': 'slideDown 0.3s ease-out',
    'scale-in': 'scaleIn 0.2s ease-out',
    'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    shimmer: 'shimmer 2s linear infinite',
    float: 'float 6s ease-in-out infinite',
    'glow-pulse': 'glowPulse 2s ease-in-out infinite',
  },
  keyframes: {
    fadeIn: {
      '0%': { opacity: '0' },
      '100%': { opacity: '1' },
    },
    slideUp: {
      '0%': { opacity: '0', transform: 'translateY(10px)' },
      '100%': { opacity: '1', transform: 'translateY(0)' },
    },
    slideDown: {
      '0%': { opacity: '0', transform: 'translateY(-10px)' },
      '100%': { opacity: '1', transform: 'translateY(0)' },
    },
    scaleIn: {
      '0%': { opacity: '0', transform: 'scale(0.95)' },
      '100%': { opacity: '1', transform: 'scale(1)' },
    },
    shimmer: {
      '0%': { backgroundPosition: '-200% 0' },
      '100%': { backgroundPosition: '200% 0' },
    },
    float: {
      '0%, 100%': { transform: 'translateY(0)' },
      '50%': { transform: 'translateY(-10px)' },
    },
    glowPulse: {
      '0%, 100%': { boxShadow: '0 0 20px rgba(75, 124, 187, 0.4)' },
      '50%': { boxShadow: '0 0 30px rgba(75, 124, 187, 0.55)' },
    },
    subtleBounce: {
      '0%, 100%': { transform: 'translateY(0)' },
      '50%': { transform: 'translateY(-2px)' },
    },
  },
  borderRadius: {
    '2xl': '1rem',
    '3xl': '1.5rem',
  },
}

module.exports = { FLUX, fluxLabsThemeExtend }
