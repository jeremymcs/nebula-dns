const DEFAULT_APP_ORIGIN = 'https://shield.fluxlabs.net'
const DEFAULT_API_ORIGIN = 'https://api.shield.fluxlabs.net'

export const APP_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || DEFAULT_APP_ORIGIN

export const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || DEFAULT_API_ORIGIN
