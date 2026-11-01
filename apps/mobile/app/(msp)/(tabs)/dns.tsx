import { Text, useColorScheme } from 'react-native';
import { Screen, ErrorState } from '@/src/components/ui';
import { DataList } from '@/src/components/DataList';
import { useDnsZones } from '@/src/hooks/queries';
import { getTheme } from '@/src/theme/colors';

export default function MspDnsScreen() {
  const query = useDnsZones();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = getTheme(scheme);

  return (
    <Screen title="DNS zones (read-only)">
      {query.isError ? (
        <ErrorState
          message="DNS Management API requires PR #17"
          onRetry={() => query.refetch()}
        />
      ) : (
        <DataList
          data={query.data?.data ?? []}
          keyExtractor={(z) => z.id}
          refreshing={query.isFetching}
          onRefresh={() => query.refetch()}
          emptyMessage="No zones"
          renderItem={(z) => (
            <Text style={{ color: theme.colors.text }}>
              {z.name} · {z.status ?? 'active'}
            </Text>
          )}
        />
      )}
    </Screen>
  );
}
