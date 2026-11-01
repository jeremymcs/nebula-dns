import { Linking, Text, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { Screen, PrimaryButton } from '@/src/components/ui';
import { getTheme } from '@/src/theme/colors';

export default function MfaEnrollScreen() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = getTheme(scheme);

  const openWebEnroll = async () => {
    await Linking.openURL('https://admin.shield.fluxlabs.net/login/mfa/enroll');
  };

  return (
    <Screen title="Set up MFA">
      <Text style={{ color: theme.colors.textMuted, marginBottom: 12 }}>
        Complete TOTP enrollment in the Admin Console, then return here to verify.
      </Text>
      <PrimaryButton label="Open enrollment" onPress={openWebEnroll} />
      <PrimaryButton
        label="I finished — verify MFA"
        variant="secondary"
        onPress={() => router.replace('/(auth)/admin-mfa')}
      />
    </Screen>
  );
}
