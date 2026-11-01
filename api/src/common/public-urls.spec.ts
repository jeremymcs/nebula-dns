import { resolveAppUrl, defaultCorsOrigins } from './public-urls';
import {
  DEFAULT_APP_URL,
  DEFAULT_WWW_ORIGIN,
  DEFAULT_ADMIN_URL,
} from './product-branding';

describe('resolveAppUrl', () => {
  it('prefers APP_URL over FRONTEND_URL', () => {
    expect(
      resolveAppUrl({
        APP_URL: 'https://app.example.com/',
        FRONTEND_URL: 'https://other.example.com',
      }),
    ).toBe('https://app.example.com');
  });

  it('uses FRONTEND_URL when APP_URL is unset', () => {
    expect(
      resolveAppUrl({ FRONTEND_URL: 'https://app.example.com/' }),
    ).toBe('https://app.example.com');
  });

  it('defaults to app subdomain in production', () => {
    expect(resolveAppUrl({})).toBe(DEFAULT_APP_URL);
    expect(DEFAULT_APP_URL).toBe('https://app.shield.fluxlabs.net');
  });
});

describe('defaultCorsOrigins', () => {
  it('includes marketing www and tenant app hosts', () => {
    const origins = defaultCorsOrigins();
    expect(origins).toContain(DEFAULT_WWW_ORIGIN);
    expect(origins).toContain(DEFAULT_APP_URL);
    expect(origins).toContain(DEFAULT_ADMIN_URL);
  });
});
