import { useState } from 'react';
import { Alert, Text, TextInput, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { Screen, PrimaryButton } from '@/src/components/ui';
import { PRODUCT_NAME } from '@/src/constants/config';
import { getTheme } from '@/src/theme/colors';
import { getApiBaseUrl } from '@/src/config/env';
import { getOrCreateDeviceId } from '@/src/utils/device-id';
import { getAppVersion } from '@/src/config/env';
import {
  persistAdminSession,
  persistTenantSession,
  setAuthMode,
} from '@/src/auth/session';
import type {
  AdminLoginResponse,
  MfaRequiredResponse,
  TenantLoginResponse,
} from '@/src/types/auth';
import { resolvePostLoginRoute } from '@/src/types/auth';
import { useAuth } from '@/src/context/AuthContext';

type LoginMode = 'admin' | 'tenant';

export default function LoginScreen() {
  const [mode, setMode] = useState<LoginMode>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = getTheme(scheme);
  const { reloadProfile } = useAuth();

  const submit = async () => {
    setLoading(true);
    try {
      const deviceId = await getOrCreateDeviceId();
      const headers = {
        'Content-Type': 'application/json',
        'X-Device-Id': deviceId,
        'X-App-Version': getAppVersion(),
      };
      if (mode === 'admin') {
        await setAuthMode('admin');
        const res = await fetch(`${getApiBaseUrl()}/admin/login`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          throw new Error('Invalid admin credentials');
        }
        const data = (await res.json()) as AdminLoginResponse;
        const mfaOk = !data.mfaRequired;
        await persistAdminSession(data, mfaOk);
        await reloadProfile();
        if (data.mfaEnrollmentRequired) {
          router.replace('/(auth)/mfa-enroll');
          return;
        }
        if (data.mfaRequired) {
          router.replace('/(auth)/admin-mfa');
          return;
        }
        router.replace(resolvePostLoginRoute('admin'));
      } else {
        await setAuthMode('tenant');
        const res = await fetch(`${getApiBaseUrl()}/auth/login`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          throw new Error('Invalid credentials');
        }
        const data = (await res.json()) as TenantLoginResponse | MfaRequiredResponse;
        if ('mfaRequired' in data && data.mfaRequired && !('accessToken' in data)) {
          router.replace('/(auth)/tenant-mfa');
          return;
        }
        const login = data as TenantLoginResponse;
        await persistTenantSession(login, !login.mfaRequired);
        await reloadProfile();
        if (login.mfaRequired) {
          router.replace('/(auth)/tenant-mfa');
          return;
        }
        router.replace(resolvePostLoginRoute('tenant', login.tenant.tier));
      }
    } catch (e) {
      Alert.alert('Sign in failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen footer>
      <Text style={{ color: theme.colors.text, fontSize: 28, fontWeight: '700' }}>
        {PRODUCT_NAME}
      </Text>
      <Text style={{ color: theme.colors.textMuted, marginBottom: 16 }}>
        Platform admin or MSP organization
      </Text>
      <PrimaryButton
        label="Platform admin"
        variant={mode === 'admin' ? 'primary' : 'secondary'}
        onPress={() => setMode('admin')}
      />
      <PrimaryButton
        label="MSP / organization"
        variant={mode === 'tenant' ? 'primary' : 'secondary'}
        onPress={() => setMode('tenant')}
      />
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        placeholderTextColor={theme.colors.textMuted}
        accessibilityLabel="Email"
        style={{
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: 10,
          padding: 12,
          color: theme.colors.text,
          marginBottom: 8,
        }}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Password"
        placeholderTextColor={theme.colors.textMuted}
        accessibilityLabel="Password"
        style={{
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: 10,
          padding: 12,
          color: theme.colors.text,
          marginBottom: 8,
        }}
      />
      <PrimaryButton label="Sign in" onPress={submit} loading={loading} />
    </Screen>
  );
}
