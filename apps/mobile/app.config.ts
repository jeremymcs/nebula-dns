import type { ExpoConfig } from 'expo/config';

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://api.shield.fluxlabs.net';

const config: ExpoConfig = {
  name: 'Flux Shield',
  slug: 'flux-shield',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'fluxshield',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'net.fluxlabs.shield',
    infoPlist: {
      NSFaceIDUsageDescription:
        'Flux Shield uses Face ID to unlock your saved session.',
    },
  },
  android: {
    package: 'net.fluxlabs.shield',
    adaptiveIcon: {
      backgroundColor: '#FFFFFF',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        resizeMode: 'contain',
        imageWidth: 160,
        backgroundColor: '#FFFFFF',
      },
    ],
    'expo-secure-store',
    [
      'expo-notifications',
      {
        icon: './assets/images/icon.png',
        color: '#4B7CBB',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl,
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
};

export default config;
