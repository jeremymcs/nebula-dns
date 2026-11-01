import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  clearSession,
  getAccessToken,
  getAdminProfile,
  getAuthMode,
  getImpersonation,
  getTenantSession,
  isBiometricEnabled,
  isMfaVerified,
  isSessionLocked,
  logoutApi,
  refreshAccessToken,
  setSessionLocked,
} from '../auth/session';
import { authenticateWithBiometrics } from '../auth/biometric';
import type { AdminProfile, ImpersonationState } from '../types/auth';
import type { AuthMode } from '../constants/config';
import { createApiClient } from '../api/client';
import { getApiBaseUrl, getAppVersion } from '../config/env';
import { getOrCreateDeviceId } from '../utils/device-id';
import { isDeviceCompromised } from '../security/device-integrity';

interface AuthContextValue {
  loading: boolean;
  mode: AuthMode | null;
  admin: AdminProfile | null;
  tenantName: string | null;
  tenantTier: string | null;
  mfaVerified: boolean;
  locked: boolean;
  impersonation: ImpersonationState | null;
  compromised: boolean;
  api: ReturnType<typeof createApiClient>;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
  unlock: () => Promise<boolean>;
  reloadProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<AuthMode | null>(null);
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [tenantTier, setTenantTier] = useState<string | null>(null);
  const [mfaVerified, setMfaVerified] = useState(false);
  const [locked, setLocked] = useState(false);
  const [impersonation, setImpersonation] =
    useState<ImpersonationState | null>(null);

  const compromised = isDeviceCompromised();

  const api = useMemo(
    () =>
      createApiClient({
        baseUrl: getApiBaseUrl(),
        getAccessToken,
        getAuthMode: getAuthMode,
        getDeviceId: getOrCreateDeviceId,
        getAppVersion,
        onUnauthorized: () => {
          void refreshAccessToken();
        },
      }),
    [],
  );

  const reloadProfile = useCallback(async () => {
    const currentMode = await getAuthMode();
    setMode(currentMode);
    setMfaVerified(await isMfaVerified());
    setImpersonation(await getImpersonation());
    if (currentMode === 'admin') {
      setAdmin(await getAdminProfile());
      setTenantName(null);
      setTenantTier(null);
    } else if (currentMode === 'tenant') {
      const session = await getTenantSession();
      setAdmin(null);
      setTenantName(session?.tenant.name ?? null);
      setTenantTier(session?.tenant.tier ?? null);
    } else {
      setAdmin(null);
      setTenantName(null);
      setTenantTier(null);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    await refreshAccessToken();
    await reloadProfile();
  }, [reloadProfile]);

  const signOut = useCallback(async () => {
    await logoutApi();
    await clearSession();
    await reloadProfile();
  }, [reloadProfile]);

  const unlock = useCallback(async () => {
    const biometric = await isBiometricEnabled();
    if (biometric) {
      const ok = await authenticateWithBiometrics();
      if (!ok) {
        return false;
      }
    }
    await setSessionLocked(false);
    setLocked(false);
    await refreshAccessToken();
    return true;
  }, []);

  useEffect(() => {
    void (async () => {
      await reloadProfile();
      const token = await getAccessToken();
      if (token) {
        await refreshAccessToken();
        const bio = await isBiometricEnabled();
        setLocked(bio && (await isSessionLocked()));
      }
      setLoading(false);
    })();
  }, [reloadProfile]);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        void (async () => {
          if (await isBiometricEnabled()) {
            await setSessionLocked(true);
            setLocked(true);
          }
        })();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  const value: AuthContextValue = {
    loading,
    mode,
    admin,
    tenantName,
    tenantTier,
    mfaVerified,
    locked,
    impersonation,
    compromised,
    api,
    refreshSession,
    signOut,
    unlock,
    reloadProfile,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
