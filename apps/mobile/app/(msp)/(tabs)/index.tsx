import { Text, useColorScheme } from 'react-native';
import { Screen } from '@/src/components/ui';
import { useAgents, useMspClients } from '@/src/hooks/queries';
import { getTheme } from '@/src/theme/colors';

export default function MspDashboard() {
  const clients = useMspClients('');
  const agents = useAgents();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = getTheme(scheme);

  return (
    <Screen title="MSP home">
      <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700' }}>
        Clients: {clients.data?.data?.length ?? '—'}
      </Text>
      <Text style={{ color: theme.colors.textMuted, marginTop: 8 }}>
        Agents tracked: {agents.data?.data?.length ?? '—'}
      </Text>
    </Screen>
  );
}
