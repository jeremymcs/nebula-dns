// Flux Shield - Admin MFA verification guard
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SKIP_ADMIN_MFA_KEY } from '../decorators/skip-admin-mfa.decorator';
import { AdminUser } from '../dto/admin-jwt-payload.dto';

@Injectable()
export class AdminMfaGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_ADMIN_MFA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AdminUser | undefined;
    if (!user) {
      return true;
    }

    if (!user.mfaVerified) {
      throw new UnauthorizedException({
        message: 'MFA verification required',
        code: 'MFA_REQUIRED',
      });
    }

    return true;
  }
}
