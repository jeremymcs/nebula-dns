/**
 * Nebula DNS - Impersonation storage unit tests
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import {
  clearImpersonation,
  getImpersonationInfo,
  isImpersonating,
  storeImpersonation,
} from '../impersonation'

describe('clearImpersonation', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('removes impersonation session, auth token, user, and mspInfo', () => {
    storeImpersonation('imp-token', {
      tenantId: 't-1',
      tenantName: 'Tenant',
      tenantTier: 'enterprise',
    })
    localStorage.setItem('user', JSON.stringify({ id: 'u-1' }))
    localStorage.setItem('mspInfo', JSON.stringify({ isMsp: false }))
    localStorage.setItem('admin_token', 'admin-should-stay')

    clearImpersonation()

    expect(isImpersonating()).toBe(false)
    expect(getImpersonationInfo()).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
    expect(localStorage.getItem('mspInfo')).toBeNull()
    expect(localStorage.getItem('admin_token')).toBe('admin-should-stay')
  })
})
