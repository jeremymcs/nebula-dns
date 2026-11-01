import { useState } from 'react';
import { Text, useColorScheme } from 'react-native';
import { Link } from 'expo-router';
import { Screen, SearchField, ErrorState } from '@/src/components/ui';
import { DataList } from '@/src/components/DataList';
import { useAdminTenants } from '@/src/hooks/queries';
import { getTheme } from '@/src/theme/colors';

export default function AdminTenantsScreen() {
  const [search, setSearch] = useState('');
  const query = useAdminTenants(search);
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = getTheme(scheme);
  const items = (query.data?.data ?? []) as Array<{ id: string; name?: string }>;

  return (
    <Screen title="Tenants">
      <SearchField value={search} onChangeText={setSearch} placeholder="Search tenants" />
      {query.isError ? (
        <ErrorState
          message="Tenant admin API unavailable until PR #21 merges"
          onRetry={() => query.refetch()}
        />
      ) : (
        <DataList
          data={items}
          keyExtractor={(i) => i.id}
          refreshing={query.isFetching}
          onRefresh={() => query.refetch()}
          emptyMessage="No tenants match your search"
          renderItem={(item) => (
            <>
              <Text style={{ color: theme.colors.text, fontWeight: '600' }}>
                {item.name ?? item.id}
              </Text>
              <Link href={`/(admin)/tenant/${item.id}`}>
                <Text style={{ color: theme.colors.primary }}>Open tenant</Text>
              </Link>
            </>
          )}
        />
      )}
    </Screen>
  );
}
