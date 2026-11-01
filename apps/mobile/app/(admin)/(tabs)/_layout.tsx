import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { getTheme } from '@/src/theme/colors';

export default function AdminTabs() {
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
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarAccessibilityLabel: 'Dashboard tab' }} />
      <Tabs.Screen name="msps" options={{ title: 'MSPs', tabBarAccessibilityLabel: 'MSPs tab' }} />
      <Tabs.Screen name="tenants" options={{ title: 'Tenants', tabBarAccessibilityLabel: 'Tenants tab' }} />
      <Tabs.Screen name="health" options={{ title: 'Health', tabBarAccessibilityLabel: 'Health tab' }} />
      <Tabs.Screen name="audit" options={{ title: 'Audit', tabBarAccessibilityLabel: 'Audit tab' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarAccessibilityLabel: 'Settings tab' }} />
    </Tabs>
  );
}
