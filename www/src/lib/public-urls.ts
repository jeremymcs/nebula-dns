const DEFAULT_WWW_ORIGIN = 'https://shield.fluxlabs.net'
const DEFAULT_APP_ORIGIN = 'https://app.shield.fluxlabs.net'
const DEFAULT_API_ORIGIN = 'https://api.shield.fluxlabs.net'
const DEFAULT_DNS1_HOST = 'dns1.shield.fluxlabs.net'
const DEFAULT_DNS2_HOST = 'dns2.shield.fluxlabs.net'

/** Keep in sync with `shared/public-url-defaults.ts` (monorepo source of truth). */

export const WWW_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || DEFAULT_WWW_ORIGIN

export const APP_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || DEFAULT_APP_ORIGIN

export const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || DEFAULT_API_ORIGIN

export const DNS1_HOST = process.env.NEXT_PUBLIC_DNS1_HOST || DEFAULT_DNS1_HOST
export const DNS2_HOST = process.env.NEXT_PUBLIC_DNS2_HOST || DEFAULT_DNS2_HOST
