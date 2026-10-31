const DEFAULT_ADMIN_ORIGIN = 'https://admin.shield.fluxlabs.net'
const DEFAULT_API_ORIGIN = 'https://api.shield.fluxlabs.net'

export const ADMIN_ORIGIN =
  process.env.NEXT_PUBLIC_ADMIN_URL?.replace(/\/$/, '') || DEFAULT_ADMIN_ORIGIN

export const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || DEFAULT_API_ORIGIN
