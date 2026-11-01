import { useState } from 'react';
import { Text, useColorScheme } from 'react-native';
import { Screen, SearchField } from '@/src/components/ui';
import { DataList } from '@/src/components/DataList';
import { useQueryLogs } from '@/src/hooks/queries';
import { getTheme } from '@/src/theme/colors';

export default function MspLogsScreen() {
  const [search, setSearch] = useState('');
  const query = useQueryLogs(search);
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = getTheme(scheme);

  return (
    <Screen title="Query logs">
      <SearchField value={search} onChangeText={setSearch} placeholder="Search domain (2+ chars)" />
      <DataList
        data={(query.data?.data ?? []) as Array<{ id?: string; domain?: string }>}
        keyExtractor={(item, index) => item.id ?? `row-${index}`}
        refreshing={query.isFetching}
        onRefresh={() => query.refetch()}
        emptyMessage={search.length < 2 ? 'Enter a domain to search' : 'No log rows'}
        renderItem={(item) => (
          <Text style={{ color: theme.colors.text }}>{JSON.stringify(item)}</Text>
        )}
      />
    </Screen>
  );
}
