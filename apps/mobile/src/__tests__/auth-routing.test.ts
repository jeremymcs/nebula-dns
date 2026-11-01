import {
  canImpersonate,
  canPerformWrite,
  resolvePostLoginRoute,
} from '../types/auth';

describe('resolvePostLoginRoute', () => {
  it('routes admin to admin tabs', () => {
    expect(resolvePostLoginRoute('admin')).toBe('/(admin)/(tabs)');
  });

  it('routes MSP tenant to MSP tabs', () => {
    expect(resolvePostLoginRoute('tenant', 'msp')).toBe('/(msp)/(tabs)');
  });

  it('routes non-MSP tenants to web-only screen', () => {
    expect(resolvePostLoginRoute('tenant', 'business')).toBe('/(auth)/non-msp');
  });
});

describe('canImpersonate', () => {
  it('allows super_admin and admin', () => {
    expect(canImpersonate('super_admin')).toBe(true);
    expect(canImpersonate('admin')).toBe(true);
  });

  it('denies viewer', () => {
    expect(canImpersonate('viewer')).toBe(false);
  });
});

describe('canPerformWrite', () => {
  it('blocks compromised devices', () => {
    expect(canPerformWrite('admin', true)).toBe(false);
  });

  it('blocks readonly roles', () => {
    expect(canPerformWrite('viewer', false)).toBe(false);
    expect(canPerformWrite('readonly', false)).toBe(false);
  });
});
