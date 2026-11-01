import { useState } from 'react';
import { Text, useColorScheme } from 'react-native';
import { Link } from 'expo-router';
import { Screen, SearchField, ErrorState } from '@/src/components/ui';
import { DataList } from '@/src/components/DataList';
import { useAdminMsps } from '@/src/hooks/queries';
import { getTheme } from '@/src/theme/colors';

export default function AdminMspsScreen() {
  const [search, setSearch] = useState('');
  const query = useAdminMsps(search);
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = getTheme(scheme);
  const items = query.data?.data ?? [];

  return (
    <Screen title="MSPs">
      <SearchField value={search} onChangeText={setSearch} placeholder="Search MSPs" />
      {query.isError ? (
        <ErrorState message="Failed to load MSPs" onRetry={() => query.refetch()} />
      ) : (
        <DataList
          data={items}
          keyExtractor={(i) => i.id}
          refreshing={query.isFetching}
          onRefresh={() => query.refetch()}
          emptyMessage="No MSP tenants found"
          renderItem={(item) => (
            <>
              <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{item.name}</Text>
              <Link href={`/(admin)/msp/${item.id}`} accessibilityLabel={`Open ${item.name}`}>
                <Text style={{ color: theme.colors.primary }}>View details</Text>
              </Link>
            </>
          )}
        />
      )}
    </Screen>
  );
}
