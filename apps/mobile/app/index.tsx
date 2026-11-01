import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import { resolvePostLoginRoute } from '@/src/types/auth';

export default function Index() {
  const { loading, mode, mfaVerified, tenantTier, locked } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!mode) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!mfaVerified) {
    return (
      <Redirect
        href={mode === 'admin' ? '/(auth)/admin-mfa' : '/(auth)/tenant-mfa'}
      />
    );
  }

  if (locked) {
    return <Redirect href="/(auth)/unlock" />;
  }

  const route = resolvePostLoginRoute(mode, tenantTier ?? undefined);
  return <Redirect href={route} />;
}
