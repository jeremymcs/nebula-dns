import { useLocalSearchParams } from 'expo-router';
import { Text, useColorScheme } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen, PrimaryButton } from '@/src/components/ui';
import { useAuth } from '@/src/context/AuthContext';
import { getTheme } from '@/src/theme/colors';

export default function MspDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = getTheme(scheme);
  const detail = useQuery({
    queryKey: ['admin', 'msp', id],
    queryFn: () => api.get<Record<string, unknown>>(`/admin/msp/tenants/${id}`),
  });
  const clients = useQuery({
    queryKey: ['admin', 'msp', id, 'clients'],
    queryFn: () =>
      api.get<{ data: Array<{ id: string; name: string }> }>(
        `/admin/msp/tenants/${id}/clients`,
      ),
  });

  return (
    <Screen title="MSP detail">
      <Text style={{ color: theme.colors.textMuted, marginBottom: 12 }}>
        {detail.isLoading ? 'Loading…' : JSON.stringify(detail.data, null, 2)}
      </Text>
      <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Clients</Text>
      {(clients.data?.data ?? []).map((c) => (
        <Text key={c.id} style={{ color: theme.colors.text }}>
          {c.name}
        </Text>
      ))}
      <PrimaryButton label="Refresh" onPress={() => clients.refetch()} variant="secondary" />
    </Screen>
  );
}
