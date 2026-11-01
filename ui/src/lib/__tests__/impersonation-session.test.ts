/**
 * Nebula DNS - Impersonation session unit tests
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import {
  bootstrapImpersonationSession,
  parseImpersonationParams,
} from '../impersonation-session'
import { getImpersonationInfo, isImpersonating } from '../impersonation'

describe('parseImpersonationParams', () => {
  it('returns error when token is missing', () => {
    expect(parseImpersonationParams(null, null)).toEqual({
      error: 'Missing impersonation token',
    })
  })

  it('returns error when info is missing or invalid', () => {
    expect(parseImpersonationParams('tok', null)).toEqual({
      error: 'Invalid impersonation info',
    })
    expect(parseImpersonationParams('tok', '%7Bbad')).toEqual({
      error: 'Invalid impersonation info',
    })
  })

  it('parses valid impersonation URL params', () => {
    const info = encodeURIComponent(
      JSON.stringify({
        tenantId: 'tenant-1',
        tenantName: 'Acme Corp',
        tenantTier: 'enterprise',
      }),
    )

    expect(parseImpersonationParams('imp-token', info)).toEqual({
      token: 'imp-token',
      info: {
        tenantId: 'tenant-1',
        tenantName: 'Acme Corp',
        tenantTier: 'enterprise',
      },
    })
  })
})

describe('bootstrapImpersonationSession', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('stores impersonation state and user from /auth/me', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'owner@acme.test',
      name: 'Owner',
      role: 'owner' as const,
      tenantId: 'tenant-1',
      tenantName: 'Acme Corp',
      tenantTier: 'enterprise' as const,
    }

    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUser,
    })

    const user = await bootstrapImpersonationSession(
      'test-token-for-e2e-enterprise',
      {
        tenantId: 'tenant-1',
        tenantName: 'Acme Corp',
        tenantTier: 'enterprise',
      },
      { apiBaseUrl: '/backend', fetchImpl },
    )

    expect(user).toEqual(mockUser)
    expect(fetchImpl).toHaveBeenCalledWith('/backend/auth/me', {
      headers: { Authorization: 'Bearer test-token-for-e2e-enterprise' },
    })
    expect(isImpersonating()).toBe(true)
    expect(getImpersonationInfo()?.tenantName).toBe('Acme Corp')
    expect(JSON.parse(localStorage.getItem('user')!)).toEqual(mockUser)
    expect(localStorage.getItem('token')).toBe('test-token-for-e2e-enterprise')
  })

  it('clears partial session and throws when /auth/me fails', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Token expired' }),
    })

    await expect(
      bootstrapImpersonationSession(
        'bad-token',
        {
          tenantId: 'tenant-1',
          tenantName: 'Acme Corp',
          tenantTier: 'enterprise',
        },
        { apiBaseUrl: '/backend', fetchImpl },
      ),
    ).rejects.toThrow('Token expired')

    expect(isImpersonating()).toBe(false)
    expect(localStorage.getItem('user')).toBeNull()
  })
})
