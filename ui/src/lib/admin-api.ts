/**
 * Nebula DNS - Admin API Helpers
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Typed API functions for admin authentication and profile management.
 * Used by AdminAuthContext for Mission Control authentication.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

/**
 * Admin user object returned from authentication and profile endpoints
 */
export interface AdminUser {
  id: string
  email: string
  name: string
  status: 'active' | 'suspended' | 'pending_mfa'
  mfaSetupComplete: boolean
  lastLoginAt: Date | null
}

/**
 * Response from successful admin login
 */
export interface AdminLoginResponse {
  accessToken: string
  expiresIn: number // seconds (28800 = 8 hours)
  admin: AdminUser
}

/**
 * Authenticate an admin user with email and password
 * @param email - Admin email address
 * @param password - Admin password (14+ characters required)
 * @returns Login response with access token and admin profile
 * @throws Error with message from API on authentication failure
 */
export async function adminLogin(
  email: string,
  password: string
): Promise<AdminLoginResponse> {
  const res = await fetch(`${API_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Invalid credentials' }))
    throw new Error(error.message || 'Invalid credentials')
  }

  return res.json()
}

/**
 * Logout the current admin session
 * @param token - Admin JWT token
 * @returns void - Always clears local state even if API call fails
 */
export async function adminLogout(token: string): Promise<void> {
  try {
    await fetch(`${API_URL}/admin/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
  } catch {
    // Silently fail - we'll clear local state regardless
  }
}

/**
 * Get the current admin's profile to validate session
 * @param token - Admin JWT token
 * @returns Admin user profile
 * @throws Error if session is invalid or expired
 */
export async function getAdminProfile(token: string): Promise<AdminUser> {
  const res = await fetch(`${API_URL}/admin/me`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    throw new Error('Session expired')
  }

  const data = await res.json()

  // Convert lastLoginAt string to Date if present
  return {
    ...data,
    lastLoginAt: data.lastLoginAt ? new Date(data.lastLoginAt) : null,
  }
}
