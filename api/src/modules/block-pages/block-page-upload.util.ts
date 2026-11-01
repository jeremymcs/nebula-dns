import * as path from 'path';
import * as fs from 'fs/promises';
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

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const JPEG_SIG = Buffer.from([0xff, 0xd8, 0xff]);
const WEBP_RIFF = Buffer.from('RIFF');
const WEBP_MAGIC = Buffer.from('WEBP');

export function assertLogoUploadBytes(buffer: Buffer, mimetype: string): Buffer {
  if (!buffer || buffer.length < 4) {
    throw new BadRequestException('Invalid logo file');
  }
  switch (mimetype) {
    case 'image/png':
      if (!buffer.subarray(0, 4).equals(PNG_SIG)) {
        throw new BadRequestException('Logo content does not match PNG');
      }
      break;
    case 'image/jpeg':
      if (!buffer.subarray(0, 3).equals(JPEG_SIG)) {
        throw new BadRequestException('Logo content does not match JPEG');
      }
      break;
    case 'image/webp':
      if (
        buffer.length < 12 ||
        !buffer.subarray(0, 4).equals(WEBP_RIFF) ||
        !buffer.subarray(8, 12).equals(WEBP_MAGIC)
      ) {
        throw new BadRequestException('Logo content does not match WebP');
      }
      break;
    case 'image/svg+xml': {
      const head = buffer.subarray(0, 256).toString('utf8').trimStart();
      if (!head.startsWith('<') || !head.toLowerCase().includes('svg')) {
        throw new BadRequestException('Logo content does not match SVG');
      }
      break;
    }
    default:
      throw new BadRequestException('Unsupported logo type');
  }
  return buffer;
}

export async function writeValidatedLogoFile(
  storageKey: string,
  uploadRoot: string,
  buffer: Buffer,
  mimetype: string,
): Promise<void> {
  const slash = storageKey.indexOf('/');
  if (slash <= 0) {
    throw new BadRequestException('Invalid storage key');
  }
  const tenantId = storageKey.slice(0, slash);
  const filename = storageKey.slice(slash + 1);
  // codeql[js/path-injection]: storageKey is server-generated; resolveTenantUploadFile validates UUID and basename.
  const resolved = resolveTenantUploadFile(uploadRoot, tenantId, filename);
  const validated = assertLogoUploadBytes(buffer, mimetype);
  // codeql[js/path-injection]: validated image bytes written only under resolveTenantUploadFile path.
  await fs.writeFile(resolved, validated);
}
