/**
 * Canonical product identity — edit this file for a rebrand, then run:
 *   ./scripts/sync-product-brand.sh
 */

export const PRODUCT_NAME = 'Flux Shield' as const

/** Gradient wordmark in nav (lead + optional accent segment). */
export const PRODUCT_WORDMARK = {
  lead: 'Flux',
  accent: 'Shield',
} as const

/** Optional subtitle under the logo (no company name). */
export const PRODUCT_TAGLINE = 'Modular security platform' as const

export const PRODUCT_LOGIN_HERO_ACCENT = 'Enterprise DNS filtering' as const

export const PRODUCT_META_DESCRIPTION =
  'Modular security platform with DNS Filter for threat blocking, content filtering, and analytics.' as const

export const PRODUCT_MARKETING_TAGLINE =
  'DNS Filter today — more modules on the roadmap' as const

/** Platform modules (nav / IA). */
export const PRODUCT_MODULE_DNS_FILTER = 'DNS Filter' as const
export const PRODUCT_MODULE_DNS_MANAGEMENT = 'DNS Management' as const
export const PRODUCT_MODULE_DMARC = 'DMARC' as const

export const ADMIN_PORTAL_NAME = 'Admin Console' as const
