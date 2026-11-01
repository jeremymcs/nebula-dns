import type { AuthMode, AdminRole, TenantTier } from '../constants/config';

export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  status: string;
  mfaSetupComplete: boolean;
  role: AdminRole;
  mfaVerified?: boolean;
}

export interface TenantUserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface TenantInfo {
  id: string;
  name: string;
  tier: TenantTier;
  slug?: string;
}

export interface AdminLoginResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  admin: AdminProfile;
  mfaRequired?: boolean;
  mfaEnrollmentRequired?: boolean;
}

export interface TenantLoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: TenantUserProfile;
  tenant: TenantInfo;
  mfaRequired?: boolean;
}

export interface MfaRequiredResponse {
  mfaRequired: true;
  mfaToken: string;
}

export interface ImpersonationState {
  active: boolean;
  tenantId: string;
  tenantName: string;
  token: string;
  reason: string;
  startedAt: string;
}

export interface SessionSnapshot {
  mode: AuthMode;
  admin?: AdminProfile;
  tenant?: TenantInfo;
  user?: TenantUserProfile;
  mfaVerified: boolean;
}

export function resolvePostLoginRoute(
  mode: AuthMode,
  tenantTier?: TenantTier,
): '/(admin)/(tabs)' | '/(msp)/(tabs)' | '/(auth)/non-msp' {
  if (mode === 'admin') {
    return '/(admin)/(tabs)';
  }
  if (tenantTier === 'msp') {
    return '/(msp)/(tabs)';
  }
  return '/(auth)/non-msp';
}

export function canImpersonate(role: AdminRole | undefined): boolean {
  return role === 'super_admin' || role === 'admin';
}

export function canPerformWrite(
  role: AdminRole | string | undefined,
  compromised: boolean,
): boolean {
  if (compromised) {
    return false;
  }
  if (role === 'viewer' || role === 'readonly') {
    return false;
  }
  return true;
}
