import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, title: 'Flux Shield' }}>
      <Stack.Screen name="login" options={{ title: 'Sign in' }} />
      <Stack.Screen name="admin-mfa" options={{ title: 'Admin MFA' }} />
      <Stack.Screen name="tenant-mfa" options={{ title: 'MFA' }} />
      <Stack.Screen name="mfa-enroll" options={{ title: 'Set up MFA' }} />
      <Stack.Screen name="unlock" options={{ title: 'Unlock' }} />
      <Stack.Screen name="non-msp" options={{ title: 'Web only' }} />
    </Stack>
  );
}
