/**
 * Nebula DNS - Impersonation Storage Helpers
 * Manage admin impersonation session data in localStorage
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

const IMPERSONATION_TOKEN_KEY = 'impersonation_token'
const IMPERSONATION_INFO_KEY = 'impersonation_info'
const TOKEN_KEY = 'token'

export interface ImpersonationInfo {
  tenantId: string
  tenantName: string
  tenantTier: 'home' | 'enterprise' | 'msp'
  startedAt: string
}

/**
 * Store impersonation session data
 * - Saves impersonation token separately (preserves admin_token)
 * - Sets main token for tenant dashboard to use
 */
export function storeImpersonation(
  token: string,
  info: Omit<ImpersonationInfo, 'startedAt'>
): void {
  localStorage.setItem(IMPERSONATION_TOKEN_KEY, token)
  localStorage.setItem(IMPERSONATION_INFO_KEY, JSON.stringify({
    ...info,
    startedAt: new Date().toISOString(),
  }))
  // Set as main token so tenant dashboard reads it
  localStorage.setItem(TOKEN_KEY, token)
}

/**
 * Get current impersonation info (null if not impersonating)
 */
export function getImpersonationInfo(): ImpersonationInfo | null {
  if (typeof window === 'undefined') return null
  const info = localStorage.getItem(IMPERSONATION_INFO_KEY)
  return info ? JSON.parse(info) : null
}

/**
 * Check if currently in impersonation mode
 */
export function isImpersonating(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem(IMPERSONATION_TOKEN_KEY)
}

/**
 * Get impersonation token (for API calls during end)
 */
export function getImpersonationToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(IMPERSONATION_TOKEN_KEY)
}

/**
 * Clear all impersonation data
 * - Removes impersonation token and info
 * - Clears main token (admin_token remains)
 */
export function clearImpersonation(): void {
  localStorage.removeItem(IMPERSONATION_TOKEN_KEY)
  localStorage.removeItem(IMPERSONATION_INFO_KEY)
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem('user')
  localStorage.removeItem('mspInfo')
  // Note: admin_token is preserved
}
