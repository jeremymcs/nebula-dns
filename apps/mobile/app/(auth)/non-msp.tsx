import { Text, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { Screen, PrimaryButton } from '@/src/components/ui';
import { getTheme } from '@/src/theme/colors';
import { clearSession } from '@/src/auth/session';

export default function NonMspScreen() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = getTheme(scheme);

  return (
    <Screen title="Use web dashboard" footer>
      <Text style={{ color: theme.colors.text, marginBottom: 8 }}>
        Flux Shield mobile v1 supports platform admins and MSP organizations only.
      </Text>
      <Text style={{ color: theme.colors.textMuted, marginBottom: 16 }}>
        Sign in at shield.fluxlabs.net on the web for Home and Business tenants.
      </Text>
      <PrimaryButton
        label="Switch login mode"
        onPress={async () => {
          await clearSession();
          router.replace('/(auth)/login');
        }}
      />
    </Screen>
  );
}
