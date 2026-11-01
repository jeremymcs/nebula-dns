import * as path from 'path';
import { BadRequestException } from '@nestjs/common';

const TENANT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const LOGO_EXT_RE = /^\.(png|jpe?g|webp|svg)$/i;

export function assertTenantUploadId(tenantId: string): void {
  if (!TENANT_ID_RE.test(tenantId)) {
    throw new BadRequestException('Invalid tenant id');
  }
}

export function assertSafeUploadFilename(filename: string): string {
  if (
    !filename ||
    filename.includes('..') ||
    filename.includes('/') ||
    filename.includes('\\')
  ) {
    throw new BadRequestException('Invalid filename');
  }
  const base = path.basename(filename);
  if (!base || base === '.' || base === '..') {
    throw new BadRequestException('Invalid filename');
  }
  if (base.includes('\0')) {
    throw new BadRequestException('Invalid filename');
  }
  return base;
}

export function assertAllowedLogoExtension(ext: string): string {
  const normalized = ext.toLowerCase();
  if (!LOGO_EXT_RE.test(normalized)) {
    throw new BadRequestException('Invalid logo file extension');
  }
  return normalized;
}

/** Resolve a path under uploadRoot/tenantId and reject traversal. */
export function resolveTenantUploadFile(
  uploadRoot: string,
  tenantId: string,
  filename: string,
): string {
  assertTenantUploadId(tenantId);
  const safeName = assertSafeUploadFilename(filename);
  const rootResolved = path.resolve(uploadRoot);
  const filePath = path.resolve(rootResolved, tenantId, safeName);
  const tenantRoot = path.join(rootResolved, tenantId);
  if (
    filePath !== tenantRoot &&
    !filePath.startsWith(`${tenantRoot}${path.sep}`)
  ) {
    throw new BadRequestException('Invalid upload path');
  }
  return filePath;
}

export function resolveTenantUploadKey(
  uploadRoot: string,
  tenantId: string,
  blockPageId: string,
  ext: string,
): { absolutePath: string; storageKey: string; publicFilename: string } {
  assertTenantUploadId(tenantId);
  assertTenantUploadId(blockPageId);
  const safeExt = assertAllowedLogoExtension(ext);
  const publicFilename = `${blockPageId}${safeExt}`;
  const storageKey = `${tenantId}/${publicFilename}`;
  const absolutePath = resolveTenantUploadFile(
    uploadRoot,
    tenantId,
    publicFilename,
  );
  return { absolutePath, storageKey, publicFilename };
}
