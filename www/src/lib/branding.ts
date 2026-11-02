/** User-facing product and company branding (safe to use in UI copy). */

import {
  PRODUCT_MARKETING_TAGLINE,
  PRODUCT_META_DESCRIPTION,
  PRODUCT_NAME,
  PRODUCT_WORDMARK,
} from './product-brand'

export { PRODUCT_MARKETING_TAGLINE, PRODUCT_META_DESCRIPTION, PRODUCT_NAME, PRODUCT_WORDMARK }

export const FLUX_LABS_NAME = 'Flux Labs' as const
export const FLUX_LABS_URL = 'https://fluxlabs.net' as const
export const FLUX_LABS_LOCATION = 'Panama City, FL' as const

export function currentCopyrightYear(): number {
  return new Date().getFullYear()
}

export function productPageTitle(pageTitle?: string): string {
  return pageTitle ? `${pageTitle} · ${PRODUCT_NAME}` : PRODUCT_NAME
}
