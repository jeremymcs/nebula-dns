import { useState } from 'react';
import { Alert, TextInput, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { Screen, PrimaryButton } from '@/src/components/ui';
import { getTheme } from '@/src/theme/colors';
import { getAccessToken, persistAdminSession, setMfaVerified } from '@/src/auth/session';
import { getApiBaseUrl, getAppVersion } from '@/src/config/env';
import { getOrCreateDeviceId } from '@/src/utils/device-id';
import type { AdminLoginResponse } from '@/src/types/auth';
import { resolvePostLoginRoute } from '@/src/types/auth';
import { useAuth } from '@/src/context/AuthContext';

export default function AdminMfaScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = getTheme(scheme);
  const { reloadProfile } = useAuth();

  const verify = async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${getApiBaseUrl()}/admin/mfa/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Device-Id': await getOrCreateDeviceId(),
          'X-App-Version': getAppVersion(),
        },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        throw new Error('Invalid MFA code');
      }
      const data = (await res.json()) as AdminLoginResponse;
      await persistAdminSession(data, true);
      await setMfaVerified(true);
      await reloadProfile();
      router.replace(resolvePostLoginRoute('admin'));
    } catch (e) {
      Alert.alert('MFA failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Admin MFA">
      <TextInput
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        placeholder="6-digit code"
        placeholderTextColor={theme.colors.textMuted}
        accessibilityLabel="TOTP code"
        style={{
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: 10,
          padding: 12,
          color: theme.colors.text,
        }}
      />
      <PrimaryButton label="Verify" onPress={verify} loading={loading} />
    </Screen>
  );
}
