import { useLocalSearchParams } from 'expo-router';
import { Text, useColorScheme } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen, PrimaryButton } from '@/src/components/ui';
import { useAuth } from '@/src/context/AuthContext';
import { getTheme } from '@/src/theme/colors';

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = getTheme(scheme);
  const detail = useQuery({
    queryKey: ['msp', 'client', id],
    queryFn: () => api.get<Record<string, unknown>>(`/msp/clients/${id}`),
  });

  return (
    <Screen title="Client">
      <Text style={{ color: theme.colors.textMuted, marginBottom: 12 }}>
        {detail.isLoading ? 'Loading…' : JSON.stringify(detail.data, null, 2)}
      </Text>
      <PrimaryButton
        label="Manage this client"
        onPress={async () => {
          await api.post(`/msp/clients/${id}/switch`);
        }}
      />
    </Screen>
  );
}
