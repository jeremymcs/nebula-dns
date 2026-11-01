'use strict'

/** JS defaults for Next.js config (Vercel root = www; cannot import ../shared). */
const DEFAULT_APP_ORIGIN = 'https://app.shield.fluxlabs.net'
const DEFAULT_WWW_ORIGIN = 'https://shield.fluxlabs.net'

/**
 * App-only paths that previously lived on the marketing host (shield.fluxlabs.net).
 * Next.js `permanent: true` emits HTTP 308.
 */
const LEGACY_APP_PATH_RULES = [
  { source: '/dashboard', destination: '/dashboard' },
  { source: '/dashboard/:path*', destination: '/dashboard/:path*' },
  { source: '/invite/:path*', destination: '/invite/:path*' },
  { source: '/login', destination: '/login' },
  { source: '/signup', destination: '/signup' },
  { source: '/mfa', destination: '/mfa' },
  { source: '/mfa/:path*', destination: '/mfa/:path*' },
  { source: '/impersonate', destination: '/impersonate' },
  { source: '/impersonate/:path*', destination: '/impersonate/:path*' },
]

function stripTrailingSlash(url) {
  return url.replace(/\/$/, '')
}

function resolveAppOrigin(env = process.env) {
  return stripTrailingSlash(env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_ORIGIN)
}

function buildWwwLegacyAppRedirects(appOrigin = resolveAppOrigin()) {
  const origin = stripTrailingSlash(appOrigin)
  return LEGACY_APP_PATH_RULES.map(({ source, destination }) => ({
    source,
    destination: `${origin}${destination}`,
    permanent: true,
  }))
}

/** Host-based redirects from legacy Nebula marketing domains to Flux Shield www. */
function buildLegacyMarketingHostRedirects(wwwOrigin = DEFAULT_WWW_ORIGIN) {
  const target = stripTrailingSlash(wwwOrigin)
  const hosts = ['www.nebuladns.io', 'nebuladns.io']
  return hosts.map((value) => ({
    source: '/:path*',
    has: [{ type: 'host', value }],
    destination: `${target}/:path*`,
    permanent: true,
  }))
}

module.exports = {
  DEFAULT_APP_ORIGIN,
  DEFAULT_WWW_ORIGIN,
  LEGACY_APP_PATH_RULES,
  buildWwwLegacyAppRedirects,
  buildLegacyMarketingHostRedirects,
  resolveAppOrigin,
}
