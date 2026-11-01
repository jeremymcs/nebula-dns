import { router } from 'expo-router';
import { Text, useColorScheme } from 'react-native';
import { Screen, PrimaryButton } from '@/src/components/ui';
import { getTheme } from '@/src/theme/colors';
import { useAuth } from '@/src/context/AuthContext';
import { resolvePostLoginRoute } from '@/src/types/auth';

export default function UnlockScreen() {
  const { unlock, mode, tenantTier } = useAuth();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = getTheme(scheme);

  const onUnlock = async () => {
    const ok = await unlock();
    if (ok && mode) {
      router.replace(resolvePostLoginRoute(mode, tenantTier ?? undefined));
    }
  };

  return (
    <Screen title="Unlock">
      <Text style={{ color: theme.colors.textMuted, marginBottom: 12 }}>
        Use Face ID, fingerprint, or device passcode to continue.
      </Text>
      <PrimaryButton label="Unlock" onPress={onUnlock} accessibilityLabel="Unlock app" />
      <PrimaryButton
        label="Sign in again"
        variant="secondary"
        onPress={() => router.replace('/(auth)/login')}
      />
    </Screen>
  );
}
