import { Stack } from 'expo-router';
import { View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ImpersonationBanner } from '@/src/components/ui';
import { useAuth } from '@/src/context/AuthContext';
import { STORAGE_KEYS } from '@/src/constants/config';
import {
  getAccessToken,
  popSavedAdminToken,
  setImpersonation,
} from '@/src/auth/session';
import { getApiBaseUrl, getAppVersion } from '@/src/config/env';
import { getOrCreateDeviceId } from '@/src/utils/device-id';

export default function AdminLayout() {
  const { impersonation, reloadProfile } = useAuth();

  const endImpersonation = async () => {
    if (!impersonation?.active) {
      return;
    }
    const token = await getAccessToken();
    await fetch(`${getApiBaseUrl()}/admin/impersonate/end`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Device-Id': await getOrCreateDeviceId(),
        'X-App-Version': getAppVersion(),
      },
    }).catch(() => undefined);
    const saved = await popSavedAdminToken();
    if (saved) {
      await SecureStore.setItemAsync(STORAGE_KEYS.adminAccess, saved);
    }
    await setImpersonation(null);
    await reloadProfile();
  };

  return (
    <View style={{ flex: 1 }}>
      {impersonation?.active ? (
        <ImpersonationBanner
          tenantName={impersonation.tenantName}
          onEnd={endImpersonation}
        />
      ) : null}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="msp/[id]" options={{ headerShown: true, title: 'MSP' }} />
        <Stack.Screen name="tenant/[id]" options={{ headerShown: true, title: 'Tenant' }} />
      </Stack>
    </View>
  );
}
