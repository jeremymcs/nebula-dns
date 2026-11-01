import * as SecureStore from 'expo-secure-store';
import { refreshAccessToken, persistAdminSession } from '../auth/session';
import { STORAGE_KEYS } from '../constants/config';

describe('refreshAccessToken', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (key: string) => {
      if (key === STORAGE_KEYS.authMode) {
        return 'admin';
      }
      if (key === STORAGE_KEYS.adminRefresh) {
        return 'refresh-token';
      }
      if (key === STORAGE_KEYS.adminMfaVerified) {
        return 'true';
      }
      return null;
    });
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
  });

  it('rotates admin tokens via POST /admin/refresh', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        expiresIn: 900,
        admin: { id: '1', email: 'a@b.c', name: 'A', role: 'admin', status: 'active', mfaSetupComplete: true },
      }),
    })) as jest.Mock;

    const ok = await refreshAccessToken();
    expect(ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/admin/refresh'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      STORAGE_KEYS.adminAccess,
      'new-access',
    );
  });
});

describe('persistAdminSession', () => {
  it('stores refresh token when provided', async () => {
    await persistAdminSession(
      {
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresIn: 900,
        admin: {
          id: '1',
          email: 'x@y.z',
          name: 'X',
          status: 'active',
          mfaSetupComplete: true,
          role: 'admin',
        },
      },
      true,
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      STORAGE_KEYS.adminRefresh,
      'refresh',
    );
  });
});
