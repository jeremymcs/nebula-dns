import { apiRequest } from '../api/client';

describe('apiRequest', () => {
  beforeEach(() => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    })) as jest.Mock;
  });

  it('sends X-Device-Id and X-App-Version headers', async () => {
    await apiRequest('/admin/stats', {
      baseUrl: 'https://api.example.com',
      getAccessToken: async () => 'token',
      getAuthMode: async () => 'admin' as const,
      getDeviceId: async () => 'device-123',
      getAppVersion: () => '1.0.0',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/admin/stats',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Device-Id': 'device-123',
          'X-App-Version': '1.0.0',
          Authorization: 'Bearer token',
        }),
      }),
    );
  });
});
