/** User-facing product and company branding (safe to use in UI copy). */

import {
  ADMIN_PORTAL_NAME,
  PRODUCT_LOCKUP,
  PRODUCT_META_DESCRIPTION,
  PRODUCT_NAME,
  PRODUCT_TAGLINE,
  PRODUCT_WORDMARK,
} from './product-brand'

export {
  ADMIN_PORTAL_NAME,
  PRODUCT_LOCKUP,
  PRODUCT_META_DESCRIPTION,
  PRODUCT_NAME,
  PRODUCT_TAGLINE,
  PRODUCT_WORDMARK,
}

export const FLUX_LABS_NAME = 'Flux Labs' as const
export const FLUX_LABS_URL = 'https://fluxlabs.net' as const
export const FLUX_LABS_LOCATION = 'Panama City Beach, FL' as const
export const COPYRIGHT_HOLDER = FLUX_LABS_NAME

export function currentCopyrightYear(): number {
  return new Date().getFullYear()
}

export function adminPortalTitle(pageTitle?: string): string {
  const base = `${PRODUCT_NAME} · ${ADMIN_PORTAL_NAME}`
  return pageTitle ? `${pageTitle} · ${PRODUCT_NAME} ${ADMIN_PORTAL_NAME}` : base
}
