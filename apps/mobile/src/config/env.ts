import Constants from 'expo-constants';

export function getApiBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  return (
    extra?.apiUrl ??
    process.env.EXPO_PUBLIC_API_URL ??
    'https://api.shield.fluxlabs.net'
  );
}

export function getAppVersion(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}
