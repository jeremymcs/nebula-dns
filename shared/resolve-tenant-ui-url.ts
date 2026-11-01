import { DEFAULT_APP_ORIGIN } from './public-url-defaults'

const LOCAL_TENANT_UI_ORIGIN = 'http://localhost:4011'

export type TenantUiUrlEnv = {
  tenantUiUrl?: string
  nextPublicTenantUiUrl?: string
  nodeEnv?: string
  vercelEnv?: string
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, '')
}

/**
 * Customer app origin for admin impersonation redirects.
 * Prefers explicit env; uses Flux Shield production URL when deployed; localhost in dev only.
 */
export function resolveTenantUiOrigin(env: TenantUiUrlEnv = {}): string {
  const explicit =
    env.tenantUiUrl ??
    env.nextPublicTenantUiUrl ??
    process.env.TENANT_UI_URL ??
    process.env.NEXT_PUBLIC_TENANT_UI_URL

  if (explicit) {
    return stripTrailingSlash(explicit)
  }

  const nodeEnv = env.nodeEnv ?? process.env.NODE_ENV
  const vercelEnv = env.vercelEnv ?? process.env.VERCEL_ENV

  if (nodeEnv === 'production' || vercelEnv === 'production') {
    return DEFAULT_APP_ORIGIN
  }

  return LOCAL_TENANT_UI_ORIGIN
}
