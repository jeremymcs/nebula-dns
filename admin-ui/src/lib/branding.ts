/** User-facing product and company branding (safe to use in UI copy). */

export const PRODUCT_NAME = 'Nebula DNS' as const
export const FLUX_LABS_NAME = 'Flux Labs' as const
export const FLUX_LABS_URL = 'https://fluxlabs.net' as const
export const FLUX_LABS_LOCATION = 'Panama City Beach, FL' as const
export const COPYRIGHT_HOLDER = FLUX_LABS_NAME

export function currentCopyrightYear(): number {
  return new Date().getFullYear()
}
