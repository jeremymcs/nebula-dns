import { Text, useColorScheme } from 'react-native';
import { Screen, ErrorState } from '@/src/components/ui';
import { useAdminStats, useAdminHealth } from '@/src/hooks/queries';
import { getTheme } from '@/src/theme/colors';

export default function AdminDashboard() {
  const stats = useAdminStats();
  const health = useAdminHealth();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = getTheme(scheme);

  if (stats.isError) {
    return (
      <Screen title="Dashboard">
        <ErrorState message="Could not load stats" onRetry={() => stats.refetch()} />
      </Screen>
    );
  }

  const payload = stats.data as Record<string, unknown> | undefined;

  return (
    <Screen title="Dashboard">
      <Text style={{ color: theme.colors.textMuted }} accessibilityLabel="Platform statistics">
        {stats.isLoading ? 'Loading…' : JSON.stringify(payload?.data ?? payload ?? {}, null, 2)}
      </Text>
      <Text style={{ color: theme.colors.primary, marginTop: 16, fontWeight: '600' }}>
        Health: {health.isLoading ? '…' : health.isError ? 'Unavailable' : 'OK'}
      </Text>
    </Screen>
  );
}
