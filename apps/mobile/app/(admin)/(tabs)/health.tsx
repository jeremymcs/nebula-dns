import { Text, useColorScheme } from 'react-native';
import { Screen, ErrorState } from '@/src/components/ui';
import { useAdminHealth, useAdminCertificates } from '@/src/hooks/queries';
import { getTheme } from '@/src/theme/colors';

export default function AdminHealthScreen() {
  const health = useAdminHealth();
  const certs = useAdminCertificates();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = getTheme(scheme);

  return (
    <Screen title="Health">
      {health.isError ? (
        <ErrorState message="Health check failed" onRetry={() => health.refetch()} />
      ) : (
        <Text style={{ color: theme.colors.textMuted, marginBottom: 12 }}>
          {health.isLoading ? 'Loading health…' : JSON.stringify(health.data, null, 2)}
        </Text>
      )}
      <Text style={{ color: theme.colors.text, fontWeight: '700', marginBottom: 8 }}>
        Certificates
      </Text>
      {certs.isError ? (
        <Text style={{ color: theme.colors.textMuted }}>
          Certificate feed requires PR #21 (`GET /admin/system/certificates`).
        </Text>
      ) : (
        (certs.data?.data ?? []).map((c) => (
          <Text key={c.name} style={{ color: theme.colors.text, marginBottom: 6 }}>
            {c.name}: {c.daysRemaining ?? '?'} days
          </Text>
        ))
      )}
    </Screen>
  );
}
