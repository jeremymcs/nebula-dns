import { Alert, Text, useColorScheme } from 'react-native';
import { Screen, PrimaryButton } from '@/src/components/ui';
import { DataList } from '@/src/components/DataList';
import { useAgents } from '@/src/hooks/queries';
import { useAuth } from '@/src/context/AuthContext';
import { getTheme } from '@/src/theme/colors';
import { canPerformWrite } from '@/src/types/auth';

export default function MspDevicesScreen() {
  const query = useAgents();
  const { api, compromised } = useAuth();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = getTheme(scheme);
  const canWrite = canPerformWrite('admin', compromised);

  return (
    <Screen title="Devices & agents">
      <DataList
        data={query.data?.data ?? []}
        keyExtractor={(i) => i.id}
        refreshing={query.isFetching}
        onRefresh={() => query.refetch()}
        emptyMessage="No agents registered"
        renderItem={(item) => (
          <>
            <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{item.name}</Text>
            <Text style={{ color: theme.colors.textMuted }}>
              {item.status ?? 'unknown'} · {item.lastSeenAt ?? 'never'}
            </Text>
            <PrimaryButton
              label="Revoke"
              variant="danger"
              disabled={!canWrite}
              onPress={async () => {
                if (!canWrite) {
                  Alert.alert('Read-only device');
                  return;
                }
                await api.delete(`/agents/${item.id}`);
                await query.refetch();
              }}
            />
          </>
        )}
      />
    </Screen>
  );
}
