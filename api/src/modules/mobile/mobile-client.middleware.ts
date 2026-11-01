import {
  Injectable,
  NestMiddleware,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import {
  MOBILE_CLIENT_REQUEST_KEY,
  MobileClientContext,
} from './mobile-client.util';
import { MobileDevicesService } from './mobile-devices.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class MobileClientMiddleware implements NestMiddleware {
  constructor(private readonly mobileDevicesService: MobileDevicesService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const deviceIdHeader = req.headers['x-device-id'];
    const appVersionHeader = req.headers['x-app-version'];

    const mobileClient: MobileClientContext = {};
    if (typeof deviceIdHeader === 'string' && deviceIdHeader.length > 0) {
      mobileClient.deviceId = deviceIdHeader.slice(0, 128);
    }
    if (typeof appVersionHeader === 'string' && appVersionHeader.length > 0) {
      mobileClient.appVersion = appVersionHeader.slice(0, 64);
    }

    (req as Request & { [MOBILE_CLIENT_REQUEST_KEY]: MobileClientContext })[
      MOBILE_CLIENT_REQUEST_KEY
    ] = mobileClient;

    if (!MUTATING_METHODS.has(req.method) || !mobileClient.deviceId) {
      next();
      return;
    }

    const user = req.user as
      | { adminId?: string; id?: string }
      | undefined;

    if (!user) {
      next();
      return;
    }

    const jailbroken = await this.mobileDevicesService.isJailbrokenDevice(
      { adminId: user.adminId, userId: user.id },
      mobileClient.deviceId,
    );

    if (jailbroken) {
      throw new ForbiddenException({
        message:
          'This device is flagged as rooted or jailbroken. Write operations are blocked; use a compliant device or the web console.',
        code: 'DEVICE_JAILBROKEN_READ_ONLY',
      });
    }

    next();
  }
}
