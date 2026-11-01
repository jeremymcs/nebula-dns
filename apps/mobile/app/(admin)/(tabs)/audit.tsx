import { useState } from 'react';
import { Text, useColorScheme } from 'react-native';
import { Screen, SearchField, ErrorState } from '@/src/components/ui';
import { DataList } from '@/src/components/DataList';
import { useAdminAudit } from '@/src/hooks/queries';
import { getTheme } from '@/src/theme/colors';

export default function AdminAuditScreen() {
  const [search, setSearch] = useState('');
  const query = useAdminAudit(search);
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = getTheme(scheme);
  const items = query.data?.data ?? [];

  return (
    <Screen title="Audit">
      <SearchField value={search} onChangeText={setSearch} placeholder="Search audit logs" />
      {query.isError ? (
        <ErrorState
          message="Audit API unavailable until PR #21 merges"
          onRetry={() => query.refetch()}
        />
      ) : (
        <DataList
          data={items}
          keyExtractor={(i) => i.id}
          refreshing={query.isFetching}
          onRefresh={() => query.refetch()}
          emptyMessage="No audit entries"
          renderItem={(item) => (
            <>
              <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{item.action}</Text>
              <Text style={{ color: theme.colors.textMuted }}>{item.createdAt}</Text>
            </>
          )}
        />
      )}
    </Screen>
  );
}
