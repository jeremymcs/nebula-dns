import { Alert, Text, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { Screen, PrimaryButton } from '@/src/components/ui';
import { useAuth } from '@/src/context/AuthContext';
import { useMobileDevices, useNotificationPrefs } from '@/src/hooks/queries';
import { getTheme } from '@/src/theme/colors';
import { registerPushDevice } from '@/src/services/push-registration';
import { setBiometricEnabled, isBiometricEnabled } from '@/src/auth/session';
import { canUseBiometrics, authenticateWithBiometrics } from '@/src/auth/biometric';

export default function MspSettingsScreen() {
  const { signOut, api, compromised } = useAuth();
  const devices = useMobileDevices('tenant');
  const prefs = useNotificationPrefs('tenant');
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = getTheme(scheme);

  return (
    <Screen title="Settings" footer>
      {compromised ? (
        <Text style={{ color: theme.colors.accent }}>Read-only — compromised device</Text>
      ) : null}
      <PrimaryButton
        label="Switch back to MSP root"
        variant="secondary"
        onPress={async () => {
          await api.post('/msp/switch-back');
        }}
      />
      <PrimaryButton
        label="Enable biometric unlock"
        onPress={async () => {
          if (!(await canUseBiometrics())) {
            Alert.alert('Unavailable');
            return;
          }
          const ok = await authenticateWithBiometrics();
          if (ok) {
            await setBiometricEnabled(true);
          }
        }}
      />
      <PrimaryButton label="Register push" onPress={() => registerPushDevice('tenant')} />
      {(prefs.data?.data ?? []).map((p) => (
        <Text key={p.channel} style={{ color: theme.colors.textMuted }}>
          {p.channel}: {p.enabled ? 'on' : 'off'}
        </Text>
      ))}
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
