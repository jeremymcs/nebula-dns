import { useEffect, useState } from 'react';
import { Alert, Switch, Text, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { Screen, PrimaryButton, ErrorState } from '@/src/components/ui';
import { useAuth } from '@/src/context/AuthContext';
import {
  useAdminSessions,
  useMobileDevices,
  useNotificationPrefs,
} from '@/src/hooks/queries';
import { getTheme } from '@/src/theme/colors';
import {
  setBiometricEnabled,
  isBiometricEnabled,
} from '@/src/auth/session';
import { canUseBiometrics, authenticateWithBiometrics } from '@/src/auth/biometric';
import { isDeviceCompromised } from '@/src/security/device-integrity';
import { registerPushDevice } from '@/src/services/push-registration';

export default function AdminSettingsScreen() {
  const { signOut, api, compromised } = useAuth();
  const sessions = useAdminSessions();
  const devices = useMobileDevices('admin');
  const prefs = useNotificationPrefs('admin');
  const [bio, setBio] = useState(false);
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = getTheme(scheme);

  useEffect(() => {
    void isBiometricEnabled().then(setBio);
  }, []);

  const toggleBio = async (value: boolean) => {
    if (value && !(await canUseBiometrics())) {
      Alert.alert('Biometrics unavailable');
      return;
    }
    if (value) {
      const ok = await authenticateWithBiometrics('Enable biometric unlock');
      if (!ok) {
        return;
      }
    }
    await setBiometricEnabled(value);
    setBio(value);
  };

  return (
    <Screen title="Settings" footer>
      {compromised || isDeviceCompromised() ? (
        <Text style={{ color: theme.colors.accent, marginBottom: 8 }}>
          Rooted/jailbroken device — read-only mode
        </Text>
      ) : null}
      <Text style={{ color: theme.colors.text, fontWeight: '600' }}>Biometric unlock</Text>
      <Switch
        value={bio}
        onValueChange={toggleBio}
        accessibilityLabel="Enable biometric unlock"
      />
      <PrimaryButton
        label="Register for push"
        onPress={async () => {
          await registerPushDevice('admin');
          Alert.alert('Registered', 'Push token sent to /admin/mobile/register');
        }}
      />
      {(prefs.data?.data ?? []).map((p) => (
        <Text key={p.channel} style={{ color: theme.colors.textMuted }}>
          {p.channel}: {p.enabled ? 'on' : 'off'}
        </Text>
      ))}
      <Text style={{ color: theme.colors.text, fontWeight: '600', marginTop: 12 }}>
        Sessions
      </Text>
      {sessions.isError ? (
        <ErrorState message="Could not load sessions" onRetry={() => sessions.refetch()} />
      ) : (
        (sessions.data?.data ?? []).map((s) => (
          <Text key={s.id} style={{ color: theme.colors.textMuted, marginBottom: 4 }}>
            {s.deviceInfo ?? s.id} {s.current ? '(current)' : ''}
          </Text>
        ))
      )}
      <PrimaryButton
        label="Revoke other sessions"
        variant="secondary"
        onPress={async () => {
          await api.post('/admin/sessions/revoke-all');
          await sessions.refetch();
        }}
      />
      <Text style={{ color: theme.colors.text, fontWeight: '600', marginTop: 12 }}>
        Devices
      </Text>
      {(devices.data?.data ?? []).map((d) => (
        <Text key={d.id} style={{ color: theme.colors.textMuted }}>
          {d.deviceName ?? d.platform}
        </Text>
      ))}
      <PrimaryButton
        label="Sign out"
        variant="danger"
        onPress={async () => {
          await signOut();
          router.replace('/(auth)/login');
        }}
      />
    </Screen>
  );
}
