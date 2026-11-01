import { Stack } from 'expo-router';

export default function MspRootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="client/[id]" options={{ headerShown: true, title: 'Client' }} />
      <Stack.Screen name="block-domain" options={{ headerShown: true, title: 'Block domain' }} />
    </Stack>
  );
}
