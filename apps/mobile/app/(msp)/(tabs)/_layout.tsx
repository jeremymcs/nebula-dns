import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { getTheme } from '@/src/theme/colors';

export default function MspTabs() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = getTheme(scheme);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.tabInactive,
        headerStyle: { backgroundColor: theme.colors.navy },
        headerTintColor: '#fff',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="clients" options={{ title: 'Clients' }} />
      <Tabs.Screen name="devices" options={{ title: 'Devices' }} />
      <Tabs.Screen name="policies" options={{ title: 'Policies' }} />
      <Tabs.Screen name="logs" options={{ title: 'Logs' }} />
      <Tabs.Screen name="dns" options={{ title: 'DNS' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
