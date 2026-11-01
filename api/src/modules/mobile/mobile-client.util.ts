import { Request } from 'express';

export interface MobileClientContext {
  deviceId?: string;
  appVersion?: string;
}

export const MOBILE_CLIENT_REQUEST_KEY = 'mobileClient';

export function getMobileClientContext(req: Request): MobileClientContext {
  return (
    (req as Request & { [MOBILE_CLIENT_REQUEST_KEY]?: MobileClientContext })[
      MOBILE_CLIENT_REQUEST_KEY
    ] ?? {}
  );
}

export function mobileAuditMetadata(
  req: Request,
  metadata?: Record<string, unknown>,
): Record<string, unknown> {
  const mobile = getMobileClientContext(req);
  return {
    ...(metadata ?? {}),
    ...(mobile.deviceId ? { deviceId: mobile.deviceId } : {}),
    ...(mobile.appVersion ? { appVersion: mobile.appVersion } : {}),
  };
}
