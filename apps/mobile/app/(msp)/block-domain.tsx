import { useState } from 'react';
import { Alert, TextInput, useColorScheme } from 'react-native';
import { Screen, PrimaryButton } from '@/src/components/ui';
import { useAuth } from '@/src/context/AuthContext';
import { useLists } from '@/src/hooks/queries';
import { getTheme } from '@/src/theme/colors';
import { canPerformWrite } from '@/src/types/auth';

export default function BlockDomainScreen() {
  const [domain, setDomain] = useState('');
  const { api, compromised } = useAuth();
  const lists = useLists();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = getTheme(scheme);
  const blockList = (lists.data?.data ?? []).find(
    (l) => l.type === 'block' || l.name.toLowerCase().includes('block'),
  );

  const submit = async () => {
    if (!canPerformWrite('admin', compromised)) {
      Alert.alert('Read-only');
      return;
    }
    if (!blockList) {
      Alert.alert('No block list found');
      return;
    }
    await api.post(`/lists/${blockList.id}/entries`, {
      value: domain,
      type: 'domain',
    });
    Alert.alert('Blocked', domain);
    setDomain('');
  };

  return (
    <Screen title="Block domain now">
      <TextInput
        value={domain}
        onChangeText={setDomain}
        autoCapitalize="none"
        placeholder="evil.example.com"
        placeholderTextColor={theme.colors.textMuted}
        accessibilityLabel="Domain to block"
        style={{
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: 10,
          padding: 12,
          color: theme.colors.text,
        }}
      />
      <PrimaryButton label="Add to block list" onPress={submit} />
    </Screen>
  );
}
