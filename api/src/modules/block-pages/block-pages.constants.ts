export const FLUX_SHIELD_COLORS = {
  navy: '#1E3B78',
  blue: '#4B7CBB',
  coral: '#FF6E62',
} as const;

export const FLUX_SHIELD_PLATFORM_DEFAULTS = {
  title: 'Access Blocked',
  message:
    "This website has been blocked by your organization's security policy.",
  backgroundColor: '#f3f4f6',
  primaryColor: FLUX_SHIELD_COLORS.navy,
  secondaryColor: FLUX_SHIELD_COLORS.blue,
  accentColor: FLUX_SHIELD_COLORS.coral,
  textColor: '#1f2937',
  footerText: 'Powered by Flux Labs',
  showPoweredBy: true,
} as const;

export const BLOCK_CONTEXT_REDIS_PREFIX = 'blockctx:';
export const BLOCK_CONTEXT_TTL_SECONDS = 600;

export const ACCESS_REQUEST_RATE_LIMIT = {
  perIpPerHour: 10,
  perTenantPerHour: 50,
} as const;

export type BlockPageScope = 'tenant' | 'msp' | 'platform';
