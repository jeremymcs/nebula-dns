import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IpAllowlistGuard } from './ip-allowlist.guard';

describe('IpAllowlistGuard', () => {
  const reflector = new Reflector();
  let guard: IpAllowlistGuard;

  beforeEach(() => {
    process.env.IP_ALLOWLIST_ENABLED = 'true';
    process.env.ADMIN_ALLOWED_IPS = '203.0.113.50';
    process.env.ADMIN_ALLOWED_CIDRS = '';
    guard = new IpAllowlistGuard(reflector);
  });

  afterEach(() => {
    delete process.env.IP_ALLOWLIST_ENABLED;
    delete process.env.ADMIN_ALLOWED_IPS;
    delete process.env.ADMIN_ALLOWED_CIDRS;
  });

  function buildContext(req: Partial<Request>): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => req as Request,
      }),
    } as ExecutionContext;
  }

  it('allows req.ip from trusted proxy path and ignores spoofed XFF', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const req = {
      ip: '203.0.113.50',
      headers: {
        'x-forwarded-for': '8.8.8.8',
      },
    } as unknown as Request;

    expect(guard.canActivate(buildContext(req))).toBe(true);
  });

  it('denies when resolved IP is not on the allowlist', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const req = {
      ip: '198.51.100.2',
      headers: {},
    } as unknown as Request;

    expect(() => guard.canActivate(buildContext(req))).toThrow(
      ForbiddenException,
    );
  });
});
