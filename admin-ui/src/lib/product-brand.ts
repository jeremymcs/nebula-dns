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

/** Full legal/marketing lockup. */
export const PRODUCT_LOCKUP = 'Flux Shield by Flux Labs' as const

export const PRODUCT_TAGLINE = 'Security platform by Flux Labs' as const

export const PRODUCT_LOGIN_HERO_ACCENT = 'Enterprise DNS filtering' as const

export const PRODUCT_META_DESCRIPTION =
  'Flux Shield — modular security platform. DNS Filter for threat blocking and content filtering; more modules coming soon.' as const

export const PRODUCT_MARKETING_TAGLINE =
  'Modular security platform — DNS Filter today, DMARC next' as const

/** Platform modules (nav / IA). */
export const PRODUCT_MODULE_DNS_FILTER = 'DNS Filter' as const
export const PRODUCT_MODULE_DMARC = 'DMARC' as const

export const ADMIN_PORTAL_NAME = 'Admin Console' as const
