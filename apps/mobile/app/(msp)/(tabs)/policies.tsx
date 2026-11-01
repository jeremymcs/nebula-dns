import { Text, useColorScheme } from 'react-native';
import { Link } from 'expo-router';
import { Screen } from '@/src/components/ui';
import { DataList } from '@/src/components/DataList';
import { useLists, usePolicies } from '@/src/hooks/queries';
import { getTheme } from '@/src/theme/colors';

export default function MspPoliciesScreen() {
  const policies = usePolicies();
  const lists = useLists();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = getTheme(scheme);

  return (
    <Screen title="Policies & lists">
      <Link href="/(msp)/block-domain">
        <Text style={{ color: theme.colors.primary, marginBottom: 12, fontWeight: '600' }}>
          Block domain now →
        </Text>
      </Link>
      <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Policies</Text>
      <DataList
        data={policies.data?.data ?? []}
        keyExtractor={(i) => i.id}
        emptyMessage="No policies"
        renderItem={(item) => (
          <Text style={{ color: theme.colors.text }}>
            {item.name} {item.enabled === false ? '(disabled)' : ''}
          </Text>
        )}
      />
      <Text style={{ color: theme.colors.text, fontWeight: '700', marginTop: 12 }}>Lists</Text>
      <DataList
        data={lists.data?.data ?? []}
        keyExtractor={(i) => i.id}
        emptyMessage="No lists"
        renderItem={(item) => (
          <Text style={{ color: theme.colors.text }}>
            {item.name} ({item.type})
          </Text>
        )}
      />
    </Screen>
  );
}
