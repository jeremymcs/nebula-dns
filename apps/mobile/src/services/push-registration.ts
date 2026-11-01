import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { getApiBaseUrl, getAppVersion } from '../config/env';
import { getOrCreateDeviceId } from '../utils/device-id';
import { getAccessToken } from '../auth/session';
import { isDeviceCompromised } from '../security/device-integrity';

export async function registerPushDevice(mode: 'admin' | 'tenant'): Promise<void> {
  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') {
    return;
  }
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  const deviceId = await getOrCreateDeviceId();
  const access = await getAccessToken();
  const path = mode === 'admin' ? '/admin/mobile/register' : '/auth/mobile/register';
  await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${access}`,
      'X-Device-Id': deviceId,
      'X-App-Version': getAppVersion(),
    },
    body: JSON.stringify({
      deviceId,
      platform: Device.osName?.toLowerCase() ?? 'unknown',
      appVersion: getAppVersion(),
      deviceName: Device.modelName,
      expoPushToken: token,
      isJailbroken: isDeviceCompromised(),
    }),
  });
}
