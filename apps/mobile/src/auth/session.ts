import * as SecureStore from 'expo-secure-store';
import {
  STORAGE_KEYS,
  type AuthMode,
} from '../constants/config';
import type {
  AdminLoginResponse,
  AdminProfile,
  ImpersonationState,
  TenantLoginResponse,
  TenantInfo,
  TenantUserProfile,
} from '../types/auth';
import { getApiBaseUrl, getAppVersion } from '../config/env';
import { getOrCreateDeviceId } from '../utils/device-id';
import { apiRequest } from '../api/client';

async function readJson<T>(key: string): Promise<T | null> {
  const raw = await SecureStore.getItemAsync(key);
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as T;
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await SecureStore.setItemAsync(key, JSON.stringify(value));
}

export async function getAuthMode(): Promise<AuthMode | null> {
  const mode = await SecureStore.getItemAsync(STORAGE_KEYS.authMode);
  if (mode === 'admin' || mode === 'tenant') {
    return mode;
  }
  return null;
}

export async function setAuthMode(mode: AuthMode): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEYS.authMode, mode);
}

export async function getAccessToken(): Promise<string | null> {
  const impersonation = await getImpersonation();
  if (impersonation?.active) {
    return impersonation.token;
  }
  const mode = await getAuthMode();
  if (mode === 'admin') {
    return SecureStore.getItemAsync(STORAGE_KEYS.adminAccess);
  }
  if (mode === 'tenant') {
    return SecureStore.getItemAsync(STORAGE_KEYS.tenantAccess);
  }
  return null;
}

export async function getAdminRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(STORAGE_KEYS.adminRefresh);
}

export async function getTenantRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(STORAGE_KEYS.tenantRefresh);
}

export async function persistAdminSession(
  data: AdminLoginResponse,
  mfaVerified: boolean,
): Promise<void> {
  await setAuthMode('admin');
  await SecureStore.setItemAsync(STORAGE_KEYS.adminAccess, data.accessToken);
  if (data.refreshToken) {
    await SecureStore.setItemAsync(
      STORAGE_KEYS.adminRefresh,
      data.refreshToken,
    );
  }
  await writeJson(STORAGE_KEYS.adminProfile, data.admin);
  await SecureStore.setItemAsync(
    STORAGE_KEYS.adminMfaVerified,
    mfaVerified ? 'true' : 'false',
  );
}

export async function persistTenantSession(
  data: TenantLoginResponse,
  mfaVerified: boolean,
): Promise<void> {
  await setAuthMode('tenant');
  await SecureStore.setItemAsync(STORAGE_KEYS.tenantAccess, data.accessToken);
  await SecureStore.setItemAsync(
    STORAGE_KEYS.tenantRefresh,
    data.refreshToken,
  );
  await writeJson(STORAGE_KEYS.tenantProfile, {
    user: data.user,
    tenant: data.tenant,
  });
  await SecureStore.setItemAsync(
    STORAGE_KEYS.tenantMfaVerified,
    mfaVerified ? 'true' : 'false',
  );
}

export async function getAdminProfile(): Promise<AdminProfile | null> {
  return readJson<AdminProfile>(STORAGE_KEYS.adminProfile);
}

export async function getTenantSession(): Promise<{
  user: TenantUserProfile;
  tenant: TenantInfo;
} | null> {
  return readJson(STORAGE_KEYS.tenantProfile);
}

export async function isMfaVerified(): Promise<boolean> {
  const mode = await getAuthMode();
  if (mode === 'admin') {
    return (
      (await SecureStore.getItemAsync(STORAGE_KEYS.adminMfaVerified)) === 'true'
    );
  }
  if (mode === 'tenant') {
    return (
      (await SecureStore.getItemAsync(STORAGE_KEYS.tenantMfaVerified)) ===
      'true'
    );
  }
  return false;
}

export async function setMfaVerified(verified: boolean): Promise<void> {
  const mode = await getAuthMode();
  const value = verified ? 'true' : 'false';
  if (mode === 'admin') {
    await SecureStore.setItemAsync(STORAGE_KEYS.adminMfaVerified, value);
  } else if (mode === 'tenant') {
    await SecureStore.setItemAsync(STORAGE_KEYS.tenantMfaVerified, value);
  }
}

export async function clearSession(): Promise<void> {
  const keys = Object.values(STORAGE_KEYS);
  await Promise.all(keys.map((k) => SecureStore.deleteItemAsync(k)));
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(
    STORAGE_KEYS.biometricEnabled,
    enabled ? 'true' : 'false',
  );
}

export async function isBiometricEnabled(): Promise<boolean> {
  return (
    (await SecureStore.getItemAsync(STORAGE_KEYS.biometricEnabled)) === 'true'
  );
}

export async function setSessionLocked(locked: boolean): Promise<void> {
  await SecureStore.setItemAsync(
    STORAGE_KEYS.sessionLocked,
    locked ? 'true' : 'false',
  );
}

export async function isSessionLocked(): Promise<boolean> {
  return (
    (await SecureStore.getItemAsync(STORAGE_KEYS.sessionLocked)) === 'true'
  );
}

export async function saveAdminTokenForAfterImpersonation(
  token: string,
): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEYS.savedAdminToken, token);
}

export async function popSavedAdminToken(): Promise<string | null> {
  const token = await SecureStore.getItemAsync(STORAGE_KEYS.savedAdminToken);
  if (token) {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.savedAdminToken);
  }
  return token;
}

export async function setImpersonation(state: ImpersonationState | null): Promise<void> {
  if (!state) {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.impersonation);
    return;
  }
  await writeJson(STORAGE_KEYS.impersonation, state);
}

export async function getImpersonation(): Promise<ImpersonationState | null> {
  return readJson<ImpersonationState>(STORAGE_KEYS.impersonation);
}

export async function refreshAccessToken(): Promise<boolean> {
  const mode = await getAuthMode();
  const deviceId = await getOrCreateDeviceId();
  const baseUrl = getApiBaseUrl();
  const headers = {
    'X-Device-Id': deviceId,
    'X-App-Version': getAppVersion(),
    'Content-Type': 'application/json',
  };

  if (mode === 'admin') {
    const refreshToken = await getAdminRefreshToken();
    if (!refreshToken) {
      return false;
    }
    const res = await fetch(`${baseUrl}/admin/refresh`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      return false;
    }
    const data = (await res.json()) as AdminLoginResponse;
    await persistAdminSession(data, await isMfaVerified());
    return true;
  }

  if (mode === 'tenant') {
    const refreshToken = await getTenantRefreshToken();
    if (!refreshToken) {
      return false;
    }
    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      return false;
    }
    const data = (await res.json()) as TenantLoginResponse;
    await persistTenantSession(data, await isMfaVerified());
    return true;
  }

  return false;
}

export async function logoutApi(): Promise<void> {
  const mode = await getAuthMode();
  const token = await getAccessToken();
  const baseUrl = getApiBaseUrl();
  const deviceId = await getOrCreateDeviceId();
  if (!token) {
    return;
  }
  const path = mode === 'admin' ? '/admin/logout' : '/auth/logout';
  try {
    await apiRequest(path, {
      baseUrl,
      getAccessToken: async () => token,
      getAuthMode: async () => mode,
      getDeviceId: async () => deviceId,
      getAppVersion: () => getAppVersion(),
    }, { method: 'POST' });
  } catch {
    // still clear local session
  }
}
