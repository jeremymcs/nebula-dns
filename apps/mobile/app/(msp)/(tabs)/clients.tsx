import { useState } from 'react';
import { Text, useColorScheme } from 'react-native';
import { Link } from 'expo-router';
import { Screen, SearchField } from '@/src/components/ui';
import { DataList } from '@/src/components/DataList';
import { useMspClients } from '@/src/hooks/queries';
import { getTheme } from '@/src/theme/colors';

export default function MspClientsScreen() {
  const [search, setSearch] = useState('');
  const query = useMspClients(search);
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = getTheme(scheme);

  return (
    <Screen title="Clients">
      <SearchField value={search} onChangeText={setSearch} placeholder="Search clients" />
      <DataList
        data={query.data?.data ?? []}
        keyExtractor={(i) => i.id}
        refreshing={query.isFetching}
        onRefresh={() => query.refetch()}
        emptyMessage="No clients yet"
        renderItem={(item) => (
          <>
            <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{item.name}</Text>
            <Link href={`/(msp)/client/${item.id}`}>
              <Text style={{ color: theme.colors.primary }}>Open</Text>
            </Link>
          </>
        )}
      />
    </Screen>
  );
}
