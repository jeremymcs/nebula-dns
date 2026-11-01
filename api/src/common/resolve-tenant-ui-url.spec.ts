import { resolveTenantUiOrigin } from '../../../shared/resolve-tenant-ui-url';

describe('resolveTenantUiOrigin', () => {
  it('uses TENANT_UI_URL when set', () => {
    expect(
      resolveTenantUiOrigin({
        tenantUiUrl: 'https://custom.example.com/',
        nodeEnv: 'production',
      }),
    ).toBe('https://custom.example.com');
  });

  it('falls back to Flux Shield app URL in production when unset', () => {
    expect(
      resolveTenantUiOrigin({
        nodeEnv: 'production',
      }),
    ).toBe('https://shield.fluxlabs.net');
  });

  it('falls back to Flux Shield app URL on Vercel production when unset', () => {
    expect(
      resolveTenantUiOrigin({
        nodeEnv: 'development',
        vercelEnv: 'production',
      }),
    ).toBe('https://shield.fluxlabs.net');
  });

  it('uses localhost only in non-production dev', () => {
    expect(
      resolveTenantUiOrigin({
        nodeEnv: 'development',
      }),
    ).toBe('http://localhost:4011');
  });
});
