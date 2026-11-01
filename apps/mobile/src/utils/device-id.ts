import { v4 as uuidv4 } from 'uuid';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants/config';

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(STORAGE_KEYS.deviceId);
  if (existing) {
    return existing;
  }
  const id = uuidv4();
  await SecureStore.setItemAsync(STORAGE_KEYS.deviceId, id);
  return id;
}

export async function resetDeviceIdForTests(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEYS.deviceId);
}
