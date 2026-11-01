export { PRODUCT_NAME } from '../../../../shared/product-brand';

export const POWERED_BY = 'Powered by Flux Labs' as const;

export const APP_VERSION = '1.0.0';

export type AuthMode = 'admin' | 'tenant';

export type AdminRole = 'super_admin' | 'admin' | 'viewer';

export type TenantTier = 'msp' | 'business' | 'home' | 'family' | string;

export const STORAGE_KEYS = {
  authMode: 'flux_auth_mode',
  deviceId: 'flux_device_id',
  adminAccess: 'flux_admin_access',
  adminRefresh: 'flux_admin_refresh',
  adminProfile: 'flux_admin_profile',
  adminMfaVerified: 'flux_admin_mfa_verified',
  tenantAccess: 'flux_tenant_access',
  tenantRefresh: 'flux_tenant_refresh',
  tenantProfile: 'flux_tenant_profile',
  tenantMfaVerified: 'flux_tenant_mfa_verified',
  biometricEnabled: 'flux_biometric_enabled',
  sessionLocked: 'flux_session_locked',
  impersonation: 'flux_impersonation',
  savedAdminToken: 'flux_saved_admin_token',
} as const;
