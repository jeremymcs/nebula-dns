/**
 * Nebula DNS - Impersonation session bootstrap
 * Stores impersonation tokens and loads tenant user profile for AuthContext
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import { API_URL } from '@/lib/api'
import {
  ImpersonationInfo,
  storeImpersonation,
  clearImpersonation,
} from '@/lib/impersonation'

export interface ImpersonationUrlPayload {
  tenantId: string
  tenantName: string
  tenantTier: ImpersonationInfo['tenantTier']
}

export interface ParsedImpersonationParams {
  token: string
  info: ImpersonationUrlPayload
}

export function parseImpersonationParams(
  token: string | null,
  infoParam: string | null,
): ParsedImpersonationParams | { error: string } {
  if (!token) {
    return { error: 'Missing impersonation token' }
  }

  if (!infoParam) {
    return { error: 'Invalid impersonation info' }
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(infoParam)) as Partial<ImpersonationUrlPayload>

    if (!parsed?.tenantId || !parsed?.tenantName) {
      return { error: 'Invalid impersonation info' }
    }

    const tenantTier = parsed.tenantTier ?? 'home'
    if (tenantTier !== 'home' && tenantTier !== 'enterprise' && tenantTier !== 'msp') {
      return { error: 'Invalid impersonation info' }
    }

    return {
      token,
      info: {
        tenantId: parsed.tenantId,
        tenantName: parsed.tenantName,
        tenantTier,
      },
    }
  } catch {
    return { error: 'Invalid impersonation info' }
  }
}

export type ImpersonationSessionUser = {
  id: string
  email: string
  name: string
  role: 'owner' | 'admin' | 'analyst' | 'readonly'
  tenantId: string
  tenantName?: string
  tenantTier?: ImpersonationInfo['tenantTier']
  mfaEnabled?: boolean
}

type BootstrapOptions = {
  apiBaseUrl?: string
  fetchImpl?: typeof fetch
}

/**
 * Persist impersonation session and load the tenant user via /auth/me (same as login).
 */
export async function bootstrapImpersonationSession(
  token: string,
  info: ImpersonationUrlPayload,
  options: BootstrapOptions = {},
): Promise<ImpersonationSessionUser> {
  const apiBaseUrl = options.apiBaseUrl ?? API_URL
  const fetchImpl = options.fetchImpl ?? fetch

  storeImpersonation(token, info)

  const res = await fetchImpl(`${apiBaseUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    clearImpersonation()
    let message = 'Could not load tenant profile for impersonation'
    try {
      const body = (await res.json()) as { message?: string }
      if (body.message) {
        message = body.message
      }
    } catch {
      // use default message
    }
    throw new Error(message)
  }

  const user = (await res.json()) as ImpersonationSessionUser
  localStorage.setItem('user', JSON.stringify(user))
  return user
}
